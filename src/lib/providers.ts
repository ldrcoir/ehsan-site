import { db } from "@/lib/db";

/**
 * AI Provider management.
 * Supports multiple providers (OpenAI, Anthropic, Z.ai, Ollama, etc.)
 * with fallback chain.
 */

export type ProviderType = "zai" | "openai" | "anthropic" | "ollama" | "custom";

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
export async function getEnabledProviders(): Promise<ProviderConfig[]> {
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
    // Fallback to default z-ai-web-dev-sdk
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: messages as any,
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content || "";
      return { text, providerId: "default-zai" };
    } catch (err) {
      throw new Error(`No providers configured and default ZAI failed: ${err}`);
    }
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

/**
 * Call a specific provider's LLM API.
 */
async function callProvider(
  provider: ProviderConfig,
  messages: { role: string; content: string }[]
): Promise<string> {
  switch (provider.type) {
    case "zai":
      return callZai(provider, messages);
    case "openai":
      return callOpenAI(provider, messages);
    case "anthropic":
      return callAnthropic(provider, messages);
    case "ollama":
      return callOllama(provider, messages);
    case "custom":
      return callCustom(provider, messages);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

/** Z.ai via z-ai-web-dev-sdk */
async function callZai(_provider: ProviderConfig, messages: any[]): Promise<string> {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });
  return completion.choices[0]?.message?.content || "";
}

/** OpenAI-compatible API (also works for Azure, Together, etc.) */
async function callOpenAI(provider: ProviderConfig, messages: any[]): Promise<string> {
  const baseUrl = provider.baseUrl || "https://api.openai.com/v1";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

/** Anthropic Claude */
async function callAnthropic(provider: ProviderConfig, messages: any[]): Promise<string> {
  // Extract system message
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const convMsgs = messages.filter(m => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
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
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

/** Ollama (local, no API key needed) */
async function callOllama(provider: ProviderConfig, messages: any[]): Promise<string> {
  const baseUrl = provider.baseUrl || "http://localhost:11434";
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      messages,
      stream: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.message?.content || "";
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
      name: "zai",
      label: "Z.ai (built-in)",
      model: "glm-4.6",
      apiKey: null,
      baseUrl: null,
      enabled: true,
      priority: 0,
    },
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
  ];

  for (const p of defaults) {
    await db.aiProvider.create({ data: p });
  }
  console.log("[providers] Seeded default AI providers");
}
