import { checkAdminAuth } from "@/lib/admin-auth";
import { getClientIpSafe } from "@/lib/ip";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL, type Lang } from "@/lib/content";
// FIX-2: مسدودسازی IP برای مسیر بازدیدکننده (named export — security.ts no default export)
import { isIpBlocked } from "@/lib/security";

// --- Rate limit (per IP) ---
const RATE_WINDOW_MS = 60 * 1000; // 1 min
const RATE_MAX = 8;
const hits = new Map<string, number[]>();
// v1.1 (security): مصرف روزانه per-IP برای سقف هزینه AI
const chatDailyUsage = new Map<string, number>();

// V17.4: پاکسازی دوره‌ای Map برای جلوگیری از memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of hits) {
      const fresh = arr.filter(t => now - t < RATE_WINDOW_MS);
      if (fresh.length === 0) hits.delete(k);
      else hits.set(k, fresh);
    }
  }, 5 * 60 * 1000).unref?.();
}

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
// V1.1: prompt is DB-driven — name/tagline/handle come from SiteSetting and
// the extra rules come from the AiInstruction table (admin "AI Rules" tab).
// PERSONAL (lib/content.ts) is only the fallback when the DB is empty.
// v1.1.1 (audit P1-G5): اگر ادمین کلید SiteText «ai.system_prompt» را ست کرده
// باشد، همان متن به‌صورت verbatim جایگزین کل پرامپت می‌شود (فقط بلوک قواعد
// سفارشی AiInstruction به انتهای آن چسبانده می‌شود) — قبلاً بدنه پرامپت
// کاملاً هاردکد بود و از پنل قابل تغییر نبود.
async function buildSystemPrompt(lang: Lang): Promise<string> {
  const [settingRows, instructions, customPromptRow] = await Promise.all([
    db.siteSetting.findMany({
      where: {
        key: {
          in: [
            "name_fa", "name_en", "name_de",
            "tagline_fa", "tagline_en", "tagline_de",
            "handle",
          ],
        },
      },
    }),
    db.aiInstruction.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
    db.siteText.findUnique({ where: { key: "ai.system_prompt" } }),
  ]);

  const settings: Record<string, string> = {};
  for (const row of settingRows) settings[row.key] = row.value;

  const name =
    settings[`name_${lang}`] || PERSONAL.fullName[lang] || PERSONAL.fullName.en;
  const tagline =
    settings[`tagline_${lang}`] || PERSONAL.tagline[lang] || PERSONAL.tagline.en;
  const handle = settings.handle || PERSONAL.handle;
  // v1.1 (admin-editable everything): ایمیل نمایشی از پنل — fallback به content.ts
  const displayEmail = settings.contact_email || PERSONAL.email;

  // Custom rules from the admin panel ("AI Rules" tab) — appended at the
  // end and marked highest priority so admins can override the defaults.
  const customRules = instructions
    .map((i) => (i.content || "").trim())
    .filter(Boolean);
  const customBlock = customRules.length
    ? `\n\nSITE OWNER'S CUSTOM RULES (highest priority — if these conflict with anything above, these win):\n${customRules
        .map((c) => `- ${c}`)
        .join("\n")}`
    : "";

  // v1.1.1 (audit P1-G5): پرامپت سفارشی ادمین — verbatim + بلوک قواعد AiInstruction
  const customPrompt = (customPromptRow?.valueEn || "").trim();
  if (customPrompt) {
    return customPrompt.slice(0, 8000) + customBlock;
  }

  return `You are the AI concierge on ${name}'s personal portfolio website.
${name} (handle: @${handle}) is: ${tagline}.

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
5. If they want to reach ${name} directly, point them to the contact form or email: ${displayEmail}.
6. If they ask technical RF/AI questions, answer helpfully but concisely. You can say ${name} would love to discuss it in depth via the contact form.

LANGUAGE: Respond in the same language the visitor uses. If they write in German, respond in German. Persian → Persian. English → English. If mixed, match the dominant language.

IMPORTANT:
- Never claim to BE ${name}. You are the site's AI assistant, not the person.
- Don't make up specific details about books/articles that you don't know. If unsure, say so and point them to the relevant section.
- Keep it conversational. No bullet lists unless explicitly asked.
- If the visitor seems uninterested or gives one-word answers, don't push too hard. Back off gracefully.${customBlock}`;
}

// --- POST /api/chat ---
// Body: { sessionId?: string, message: string, lang: "en"|"de"|"fa", visitorId: string }
// Returns: { ok, sessionId, reply, messageId }
export async function POST(req: Request) {
  try {
    // V18.2: use shared IP helper (prefer x-real-ip, then last XFF entry)
    const ip = getClientIpSafe(req);
    const userAgent = req.headers.get("user-agent") || "";

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429 }
      );
    }

    // FIX-2: مسیر بازدیدکننده (POST) — قبل از هر DB write چک کن IP مسدود نشده باشد.
    // فقط مسیر visitor بلاک می‌شود؛ GET ادمین (checkAdminAuth) از این چک عبور می‌کند.
    if (ip && (await isIpBlocked(ip))) {
      return NextResponse.json(
        { ok: false, error: "ip_blocked" },
        { status: 403 }
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
    // V18.2: visitorId اجباری شد (قبلاً "anon" fallback داشت → anonymous hijack)
    const visitorId = String(body.visitorId || "").slice(0, 100);
    if (!visitorId || visitorId === "anon") {
      return NextResponse.json({ ok: false, error: "missing_visitor_id" }, { status: 400 });
    }
    let sessionId = String(body.sessionId || "").slice(0, 100);

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "empty_message" },
        { status: 400 }
      );
    }

    // --- Check API kill switch ---
    const { isApiEnabled } = await import("@/lib/settings");
    const apiEnabled = await isApiEnabled();
    if (!apiEnabled) {
      return NextResponse.json(
        {
          ok: false,
          error: "api_disabled",
          message: lang === "fa"
            ? "چت موقتاً غیرفعال است. لطفاً بعداً تلاش کنید."
            : lang === "de"
            ? "Chat ist vorübergehend deaktiviert."
            : "Chat is temporarily disabled.",
        },
        { status: 503 }
      );
    }

    // --- v1.1 (security): سقف روزانه هزینه AI — ۴۰ پیام به‌ازای هر IP در شبانه‌روز.
    // قبلاً تنها توقفِ هزینه، kill switch دستی بود؛ مهاجم می‌توانست با چرخش
    // visitorId/session توکن ارائه‌دهنده‌ها را بسوزاند.
    // v1.1.1 (audit S6-H1): سقف «سراسری» روزانه هم اضافه شد و از DB شمرده می‌شود —
    // شمارنده‌ی in-memory با هر restart صفر می‌شد و با چرخش IPv6 قابل دور زدن بود.
    // حالا تعداد پیام‌های امروز از خود جدول ChatMessage شمرده می‌شود (پایدار در برابر
    // restart) و اگر مجموع روز از GLOBAL_DAILY_CHAT_CAP گذشت، LLM کلاً خاموش می‌شود.
    const DAILY_CHAT_CAP = 40;
    const GLOBAL_DAILY_CHAT_CAP = 300;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [todayUserMsgs, todayIpMsgs] = await Promise.all([
      db.chatMessage.count({
        where: { role: "user", createdAt: { gte: dayStart } },
      }),
      ip
        ? db.chatMessage.count({
            where: { role: "user", createdAt: { gte: dayStart }, session: { ip } },
          })
        : Promise.resolve(0),
    ]);
    if (todayUserMsgs >= GLOBAL_DAILY_CHAT_CAP) {
      return NextResponse.json(
        {
          ok: false,
          error: "daily_limit",
          message: lang === "fa"
            ? "سقف پیام‌های روزانه سایت پر شده است. فردا دوباره تلاش کنید."
            : lang === "de"
            ? "Tageslimit der Website erreicht. Bitte morgen erneut versuchen."
            : "Site-wide daily limit reached. Please try again tomorrow.",
        },
        { status: 429 }
      );
    }
    const dayBucket = new Date().toISOString().slice(0, 10);
    const dailyKey = `${dayBucket}:${ip || "unknown"}`;
    // شمارنده in-memory فقط به‌عنوان fast-path؛ مرز واقعی = max(Map, DB count)
    const dailyHits = Math.max((chatDailyUsage.get(dailyKey) || 0) + 1, todayIpMsgs + 1);
    if (dailyHits > DAILY_CHAT_CAP) {
      return NextResponse.json(
        {
          ok: false,
          error: "daily_limit",
          message: lang === "fa"
            ? "سقف پیام‌های روزانه پر شده است. فردا دوباره تلاش کنید."
            : lang === "de"
            ? "Tageslimit erreicht. Bitte morgen erneut versuchen."
            : "Daily message limit reached. Please try again tomorrow.",
        },
        { status: 429 }
      );
    }
    chatDailyUsage.set(dailyKey, dailyHits);
    if (chatDailyUsage.size > 10000) {
      for (const [k] of chatDailyUsage) {
        if (!k.startsWith(dayBucket)) chatDailyUsage.delete(k);
        if (chatDailyUsage.size < 10000) break;
      }
    }

    // --- Get or create session ---
    let session;
    if (sessionId) {
      session = await db.chatSession.findUnique({
        where: { id: sessionId },
        // V17.8: bound chat history to 20 messages (prevent unbounded LLM context)
        // v1.0 (audit W21-25 #10): آخرین ۲۰ پیام (desc) — قبلاً قدیمی‌ترین ۲۰ تا
        // گرفته می‌شد و در گفتگوهای طولانی مدل همه‌ی پیام‌های اخیر را گم می‌کرد.
        // ترتیب بعداً در ساخت history به‌صورت asc بازسازی می‌شود.
        include: { messages: { orderBy: { createdAt: "desc" }, take: 20 } },
      });
      // V18.0: session ownership check — sessionId باید متعلق به همون visitorId باشه
      if (session && session.visitorId !== visitorId) {
        // هکر سعی می‌کنه به session شخص دیگه‌ای پیام تزریق کنه
        return NextResponse.json(
          { ok: false, error: "session_mismatch" },
          { status: 403 }
        );
      }
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

    // --- Send Bale notification (async, non-blocking) ---
    const isFirstMessage = session.messages.length === 0;
    import("@/lib/bale")
      .then(({ notifyNewChat }) =>
        notifyNewChat({
          sessionId,
          visitorId,
          message,
          isFirst: isFirstMessage,
        })
      )
      .catch(() => {});

    // V18.1: Send Telegram notification (was dead code — never called)
    import("@/lib/telegram")
      .then(({ notifyTelegramChat }) =>
        notifyTelegramChat({
          sessionId,
          visitorId,
          message,
          isFirst: isFirstMessage,
        })
      )
      .catch(() => {});

    // --- Build conversation for LLM ---
    const systemPrompt = await buildSystemPrompt(lang);
    // v1.0 (audit W21-25 #10): ترتیب زمانی واقعی (asc) — پیام‌ها desc گرفته شده‌اند
    const ordered = [...session.messages].reverse();
    const history = [
      ...ordered.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    // --- Call LLM with provider fallback chain ---
    let reply = "";
    let providerId = "default";
    try {
      const { callLLMWithFallback } = await import("@/lib/providers");
      // Seed providers on first use
      const { seedDefaultProviders } = await import("@/lib/providers");
      await seedDefaultProviders();

      const result = await callLLMWithFallback([
        { role: "system", content: systemPrompt },
        ...history,
      ]);
      reply = result.text;
      providerId = result.providerId;
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
    const password = ""; // V17.8: dead param removed

    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
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
          // v1.0 (audit W26-30 #4): پیام‌های هر نشست cap شد — قبلاً بدون take،
          // یک نشست بزرگ چند-MB JSON در یک پاسخ می‌ساخت
          take: 200,
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
