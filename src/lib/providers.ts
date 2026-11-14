import { db } from "@/lib/db";
import { validateBaseUrlAsync } from "@/lib/ssrf";

/**
 * AI Provider management.
 * Supports multiple providers (OpenAI, Anthropic, Groq, OpenRouter, Ollama)
 * with fallback chain.
 */

type ProviderType = "openai" | "anthropic" | "ollama" | "groq" | "openrouter" | "custom";

// V18.1: validateBaseUrl moved to lib/ssrf.ts for shared use

interface ProviderConfig {
  id: string;
  type: ProviderType;
  label: string;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  priority: number;
}

/**
 * Get all enabled providers, sorted by priority (lowest first).
 */
async function getEnabledProviders(): Promise<ProviderConfig[]> {
  const providers = await db.aiProvider.findMany({
    where: { enabled: true },
    orderBy: { priority: "asc" },
  });
  return providers.map(p => ({
    id: p.id,
    type: p.name as ProviderType,
    label: p.label,
    apiKey: p.apiKey || undefined,
    baseUrl: p.baseUrl || undefined,
    model: p.model,
    priority: p.priority,
  }));
}

/**
 * Try each enabled provider in order until one succeeds.
 * Returns the response text, or throws if all fail.
 */
export async function callLLMWithFallback(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<{ text: string; providerId: string }> {
  const providers = await getEnabledProviders();

  if (providers.length === 0) {
    // No providers configured — return a friendly message
    return {
      text: "Hi! I'm a demo AI assistant. To enable real AI responses, the site admin needs to configure an AI provider (OpenAI, Anthropic, Groq, OpenRouter, or Ollama) from the admin panel → Settings → AI Providers.",
      providerId: "demo",
    };
  }

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      const text = await callProvider(provider, messages);
      return { text, providerId: provider.id };
    } catch (err) {
      console.error(`[LLM] Provider ${provider.label} failed:`, err);
      lastError = err as Error;
      // Continue to next provider
    }
  }

  throw new Error(`All providers failed. Last error: ${lastError?.message}`);
}

// v1.0 (audit W21-25 #3): خواندن bounded بدنه‌ی پاسخ — سقفِ قبلی فقط روی هدر
// content-length بود؛ پاسخ chunked بدون هدر تا سقف timeout کامل در حافظه buffer
// می‌شد. حالا هر ۴ مسیر از این helper استفاده می‌کنند: بیش از 5MB → خطا.
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
async function readBoundedJson(res: Response): Promise<unknown> {
  const lenHeader = parseInt(res.headers.get("content-length") || "0", 10);
  if (lenHeader > MAX_RESPONSE_BYTES) throw new Error("Provider response too large");
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new Error("Provider response too large");
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw new Error("Provider returned invalid JSON");
  }
}

// v1.0 (audit W21-25 #5): استثنای loopback:11434 فقط برای provider نوع ollama —
// قبلاً هر providerای می‌توانست به localhost:11434 اشاره کند (credential لو می‌رفت)
function assertNotLoopbackForNonOllama(provider: ProviderConfig): void {
  if (provider.type === "ollama") return;
  try {
    const u = new URL(provider.baseUrl || "");
    const host = u.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
    const isLoopback =
      host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" ||
      host === "::1" || host.startsWith("::ffff:127.") || host === "[::1]";
    if (isLoopback) throw new Error("Loopback baseUrl is only allowed for the ollama provider type");
  } catch (e) {
    if (e instanceof Error && e.message.includes("Loopback")) throw e;
    // URL parse error → validateBaseUrlAsync خودش رد می‌کند
  }
}

/**
 * Call a specific provider's LLM API.
 */
async function callProvider(
  provider: ProviderConfig,
  messages: { role: string; content: string }[]
): Promise<string> {
  assertNotLoopbackForNonOllama(provider);
  switch (provider.type) {
    case "openai":
      return callOpenAI(provider, messages);
    case "anthropic":
      return callAnthropic(provider, messages);
    case "ollama":
      return callOllama(provider, messages);
    case "groq":
      return callGroq(provider, messages);
    case "openrouter":
      return callOpenAI(provider, messages);
    case "custom":
      return callCustom(provider, messages);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

/** OpenAI-compatible API (also works for Azure, Together, etc.) */
async function callOpenAI(provider: ProviderConfig, messages: any[]): Promise<string> {
  const baseUrl = provider.baseUrl || "https://api.openai.com/v1";
  // V17.9: SSRF protection — v1.1.2 (SEC-08): async + DNS pre-resolve
  const baseUrlCheck = await validateBaseUrlAsync(baseUrl);
  if (!baseUrlCheck.valid) throw new Error("Invalid or blocked baseUrl");
  const res = await fetch(`${baseUrl}/chat/completions`, {signal: AbortSignal.timeout(30000), // V17.8: 30s timeout
    redirect: "manual", // V18.3 (security): stop redirect-follow SSRF (302 → 169.254.169.254); 3xx → res.ok=false → error → fallback chain
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // v1.0 (audit W21-25 #9): provider بدون apiKey دیگر "Bearer undefined" نمی‌فرستد
      ...(provider.apiKey ? { "Authorization": `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    // v1.1.1 (audit S5-L5): بدنه‌ی خطا هم سقف دارد — پاسخ چند-گیگابایتی حافظه را نمی‌بلعد
    const err = (await res.text()).slice(0, 2000);
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }
  // v1.0 (audit W21-25 #3): bounded read — سقف 5MB روی کل بدنه (نه فقط هدر)
  const data = (await readBoundedJson(res)) as { choices?: { message?: { content?: string } }[] };
  return data?.choices?.[0]?.message?.content || "";
}

/** Anthropic Claude */
async function callAnthropic(provider: ProviderConfig, messages: any[]): Promise<string> {
  // Extract system message
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const convMsgs = messages.filter(m => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {signal: AbortSignal.timeout(30000), // V17.8: 30s timeout
    redirect: "manual", // V18.3 (security): stop redirect-follow SSRF; 3xx → res.ok=false → error → fallback chain
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1000,
      system: systemMsg,
      messages: convMsgs.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 2000); // v1.1.1 (S5-L5): سقف بدنه خطا
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  // v1.0 (audit W21-25 #3): bounded read — سقف 5MB روی کل بدنه
  const data = (await readBoundedJson(res)) as { content?: { text?: string }[] };
  return data?.content?.[0]?.text || "";
}

/** Ollama (local, no API key needed) */
async function callOllama(provider: ProviderConfig, messages: any[]): Promise<string> {
  const baseUrl = provider.baseUrl || "http://localhost:11434";
  // V17.9: SSRF protection (localhost:11434 is allowed for Ollama)
  // v1.1.2 (SEC-08): async + DNS pre-resolve
  const baseUrlCheck = await validateBaseUrlAsync(baseUrl);
  if (!baseUrlCheck.valid) throw new Error("Invalid or blocked baseUrl");
  const res = await fetch(`${baseUrl}/api/chat`, {signal: AbortSignal.timeout(30000), // V17.8: 30s timeout
    redirect: "manual", // V18.3 (security): stop redirect-follow SSRF; 3xx → res.ok=false → error → fallback chain
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages,
      stream: false,
    }),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 2000); // v1.1.1 (S5-L5): سقف بدنه خطا
    throw new Error(`Ollama API error: ${res.status} ${err}`);
  }
  // v1.0 (audit W21-25 #3): bounded read — سقف 5MB روی کل بدنه
  const data = (await readBoundedJson(res)) as { message?: { content?: string } };
  return data?.message?.content || "";
}

/** Groq — ultra-fast inference (Llama, Mixtral) */
async function callGroq(provider: ProviderConfig, messages: any[]): Promise<string> {
  const baseUrl = provider.baseUrl || "https://api.groq.com/openai/v1";
  // V17.9: SSRF protection
  // v1.1.2 (SEC-08): async + DNS pre-resolve
  const baseUrlCheck = await validateBaseUrlAsync(baseUrl);
  if (!baseUrlCheck.valid) throw new Error("Invalid or blocked baseUrl");
  const res = await fetch(`${baseUrl}/chat/completions`, {signal: AbortSignal.timeout(30000), // V17.8: 30s timeout
    redirect: "manual", // V18.3 (security): stop redirect-follow SSRF (302 → 169.254.169.254); 3xx → res.ok=false → error → fallback chain
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // v1.0 (audit W21-25 #9): بدون apiKey هدر Authorization فرستاده نمی‌شود
      ...(provider.apiKey ? { "Authorization": `Bearer ${provider.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = (await res.text()).slice(0, 2000); // v1.1.1 (S5-L5): سقف بدنه خطا
    throw new Error(`Groq error: ${res.status} ${err}`);
  }
  // v1.0 (audit W21-25 #3): bounded read — سقف 5MB روی کل بدنه
  const data = (await readBoundedJson(res)) as { choices?: { message?: { content?: string } }[] };
  return data?.choices?.[0]?.message?.content || "";
}

/** Custom OpenAI-compatible endpoint */
async function callCustom(provider: ProviderConfig, messages: any[]): Promise<string> {
  return callOpenAI(provider, messages);
}

/**
 * Seed default providers if none exist.
 * Called on first run.
 */
export async function seedDefaultProviders() {
  const count = await db.aiProvider.count();
  if (count > 0) return;

  const defaults = [
    {
      name: "openai",
      label: "OpenAI",
      model: "gpt-4o-mini",
      apiKey: null,
      baseUrl: null,
      enabled: false,
      priority: 1,
    },
    {
      name: "anthropic",
      label: "Anthropic Claude",
      model: "claude-3-5-sonnet-20241022",
      apiKey: null,
      baseUrl: null,
      enabled: false,
      priority: 2,
    },
    {
      name: "ollama",
      label: "Ollama (local)",
      model: "llama3.2",
      apiKey: null,
      baseUrl: "http://localhost:11434",
      enabled: false,
      priority: 3,
    },
    {
      name: "groq",
      label: "Groq (ultra-fast)",
      model: "llama-3.3-70b-versatile",
      apiKey: null,
      baseUrl: "https://api.groq.com/openai/v1",
      enabled: false,
      priority: 4,
    },
  ];

  for (const p of defaults) {
    await db.aiProvider.create({ data: p });
  }
  // V18.3: console.log removed (was in production code)
  if (process.env.NODE_ENV !== "production") console.log("[providers] Seeded default AI providers");
}
