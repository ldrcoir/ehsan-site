import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL, UI, type Lang } from "@/lib/content";

// --- Rate limit (per IP) ---
const RATE_WINDOW_MS = 60 * 1000; // 1 min
const RATE_MAX = 8;
const hits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  if (process.env.NODE_ENV !== "production" && (ip === "::1" || ip === "127.0.0.1" || ip === "unknown")) {
    return true;
  }
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

// --- System prompt builder ---
function buildSystemPrompt(lang: Lang): string {
  const name = PERSONAL.fullName[lang] || PERSONAL.fullName.en;
  const tagline = PERSONAL.tagline[lang] || PERSONAL.tagline.en;

  return `You are the AI concierge on ${name}'s personal portfolio website.
${name} is: ${tagline}.

WEBSITE CONTEXT:
- The site has sections: about, skills (RF/Microwave, AI/ML, Programming, Writing), books, articles, tutorials (video), and a contact form.
- There is also an interactive terminal where visitors can type commands like 'help', 'about', 'skills'.
- The site is tri-lingual: English, German, Persian.

YOUR PERSONALITY:
- Warm, curious, slightly nerdy — like a knowledgeable friend giving a house tour.
- You're genuinely interested in who the visitor is and what brought them here.
- You ask thoughtful follow-up questions to draw them out.
- You're not a salesperson. You're a thoughtful host.
- Keep responses SHORT: 2-4 sentences usually. End with a question when natural.
- Use light humor occasionally. Be real, not robotic.

YOUR GOALS (in priority):
1. Make the visitor feel welcome and seen.
2. Understand what they're interested in (RF? AI? writing? tutorials? collaboration?).
3. Recommend relevant books/articles/tutorials from the site based on their interest.
4. Gently invite their OPINION on the work — ask what they think, what resonated, what they'd want to see more of. ${name} genuinely values visitor feedback.
5. If they want to reach ${name} directly, point them to the contact form or email: ${PERSONAL.email}.
6. If they ask technical RF/AI questions, answer helpfully but concisely. You can say ${name} would love to discuss it in depth via the contact form.

LANGUAGE: Respond in the same language the visitor uses. If they write in German, respond in German. Persian → Persian. English → English. If mixed, match the dominant language.

IMPORTANT:
- Never claim to BE ${name}. You are the site's AI assistant, not the person.
- Don't make up specific details about books/articles that you don't know. If unsure, say so and point them to the relevant section.
- Keep it conversational. No bullet lists unless explicitly asked.
- If the visitor seems uninterested or gives one-word answers, don't push too hard. Back off gracefully.`;
}

// --- POST /api/chat ---
// Body: { sessionId?: string, message: string, lang: "en"|"de"|"fa", visitorId: string }
// Returns: { ok, sessionId, reply, messageId }
export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.message !== "string") {
      return NextResponse.json(
        { ok: false, error: "invalid_body" },
        { status: 400 }
      );
    }

    const message = body.message.trim().slice(0, 2000);
    const lang: Lang = (["en", "de", "fa"].includes(body.lang) ? body.lang : "en") as Lang;
    const visitorId = String(body.visitorId || "").slice(0, 100) || "anon";
    let sessionId = String(body.sessionId || "").slice(0, 100);

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "empty_message" },
        { status: 400 }
      );
    }

    // --- Get or create session ---
    let session;
    if (sessionId) {
      session = await db.chatSession.findUnique({
        where: { id: sessionId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }
    if (!session) {
      session = await db.chatSession.create({
        data: { visitorId, ip, userAgent },
        include: { messages: true },
      });
      sessionId = session.id;
    }

    // --- Save user message ---
    await db.chatMessage.create({
      data: { sessionId, role: "user", content: message },
    });

    // --- Build conversation for LLM ---
    const systemPrompt = buildSystemPrompt(lang);
    const history = [
      ...session.messages.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // --- Call z-ai LLM ---
    let reply = "";
    try {
      // Dynamic import to avoid issues if SDK is missing in some envs
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: systemPrompt },
          ...history,
        ],
        thinking: { type: "disabled" },
      });
      reply = completion.choices[0]?.message?.content || "";
    } catch (llmErr) {
      console.error("[/api/chat] LLM error:", llmErr);
      // Fallback reply if LLM fails
      const fallbacks: Record<Lang, string> = {
        en: `I'm having trouble connecting right now. While I'm rebooting, feel free to explore the sections above — or drop ${PERSONAL.fullName.en} a direct message via the contact form below.`,
        de: `Ich habe gerade Verbindungsprobleme. Während ich neu starte, schau dich gerne in den obigen Bereichen um — oder schreib ${PERSONAL.fullName.de} direkt über das Kontaktformular unten.`,
        fa: `الان ارتباطم مشکل داره. تا دوباره بالا بیام، می‌تونی بخش‌های بالا رو بگردی — یا مستقیم به ${PERSONAL.fullName.fa} از طریق فرم تماس پایین پیام بذاری.`,
      };
      reply = fallbacks[lang];
    }

    if (!reply.trim()) {
      reply = lang === "fa" ? "..." : lang === "de" ? "..." : "...";
    }

    // --- Save assistant reply ---
    const assistantMsg = await db.chatMessage.create({
      data: { sessionId, role: "assistant", content: reply },
    });

    // --- Touch session updatedAt ---
    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      reply,
      messageId: assistantMsg.id,
    });
  } catch (err) {
    console.error("[/api/chat] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

// --- GET /api/chat?password=xxx ---
// Returns all chat sessions with messages (for admin panel)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const sessions = await db.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    console.error("[/api/chat GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
