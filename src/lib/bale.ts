// ============================================================================
// bale.ts — v1.0
// bale.ts — ارسال پیام به ربات Bale (notify ادمین درباره‌ی پیام تازه) با timeout
// و خاموش‌بودن امن وقتی توکن/تنظیمات ست نیست.
// ============================================================================

import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { readBoundedJson } from "@/lib/bounded-read";

/**
 * Bale messenger integration.
 * 
 * SETUP (see /home/z/my-project/download/API_SETUP.md for full guide):
 * 1. Create a bot in Bale → get bot token
 * 2. Set BALE_BOT_TOKEN in SiteSetting (via admin panel) or .env
 * 3. Get your chat ID (message the bot, check /api/bale/getChatId)
 * 4. Set BALE_CHAT_ID in SiteSetting
 * 5. Set baleEnabled = "true" in admin panel
 * 6. Set up webhook: POST https://api.bale.ai/v1/bots/{token}/setWebhook
 *    with { url: "https://your-domain.com/api/bale/webhook",
 *           secret_token: "<BALE_WEBHOOK_SECRET>" }
 *    v1.0 (audit W31-35 #1): بدون secret_token پلتفرم هیچ هدری نمی‌فرستد و همه‌ی
 *    deliveryها 403 می‌گیرند — کانال فرمان ادمین کار نمی‌کند
 * 
 * Commands admin can send to the bot:
 *   /list          — show recent messages
 *   /reply {id} {text}  — reply to a contact message
 *   /chat {sessionId} {text}  — inject reply into AI chat
 *   /disable       — disable AI chat API
 *   /enable        — enable AI chat API
 *   /stats         — show counts
 */

const BALE_API_BASE = "https://api.bale.ai/v1/bots";

// v1.1.1 (audit S5-L2): replay protection — Bale/Telegram روی پاسخ غیر-2xx دوباره
// می‌فرستند و با secret لو رفته می‌شود ترافیک قبلی را replay کرد.
// v1.0 (audit W31-35 #3): بازطراحی — update_id فقط «بعد از» پردازش موفق mark
// می‌شود (قبلاً قبل از آن بود؛ اگر پردازش می‌شکست، redelivery پلتفرم برای همیشه
// به‌عنوان replay رد می‌شد و پیام ادمین گم می‌شد). TTL به ۲۴ ساعت (پنجره‌ی
// redelivery تلگرام) و سقف ۱۰هزار کلید با evict قدیمی‌ترین.
const seenUpdates = new Map<number, number>(); // updateId → firstSeenTs
const SEEN_TTL_MS = 24 * 60 * 60 * 1000;
const SEEN_MAX = 10000;
function hasSeen(updateId: number): boolean {
  const now = Date.now();
  const first = seenUpdates.get(updateId);
  return first !== undefined && now - first < SEEN_TTL_MS;
}
function markSeen(updateId: number): void {
  const now = Date.now();
  // پاکسازی وقتی به سقف رسید — قدیمی‌ترین (کوچک‌ترین ts) حذف می‌شود
  while (seenUpdates.size >= SEEN_MAX) {
    let victim: number | null = null;
    let victimTs = Infinity;
    for (const [k, ts] of seenUpdates) {
      if (ts < victimTs) { victimTs = ts; victim = k; }
    }
    if (victim === null) break;
    seenUpdates.delete(victim);
  }
  seenUpdates.set(updateId, now);
}
function sweepSeen(): void {
  const now = Date.now();
  for (const [k, ts] of seenUpdates) {
    if (now - ts > SEEN_TTL_MS) seenUpdates.delete(k);
  }
}

// v1.1 (security): strip Markdown metacharacters from visitor-controlled text —
// parse_mode: "Markdown" روی متن خام یعنی بازدیدکننده می‌تونه لینک جعلی داخل
// نوتیفیکیشن ادمین تزریق کنه (phishing داخل پیام‌رسان ادمین)
// v1.0 (audit W11-15 #3): خط جدید/کنترل هم حذف می‌شود — جعل ساختار پیام بسته شد
function mdSafe(s: string): string {
  return String(s)
    .replace(/[\r\n\t\u0000-\u001f\u007f]+/g, " ")
    .replace(/[_*`\[\]()]/g, " ");
}

async function getBaleConfig() {
  const [token, chatId, enabled] = await Promise.all([
    getSetting("baleBotToken"),
    getSetting("baleChatId"),
    getSetting("baleEnabled"),
  ]);
  // Fall back to env vars if DB is empty
  const finalToken = token || process.env.BALE_BOT_TOKEN || "";
  const finalChatId = chatId || process.env.BALE_CHAT_ID || "";
  return {
    token: finalToken,
    chatId: finalChatId,
    enabled: enabled === "true" && !!finalToken && !!finalChatId,
  };
}

export async function sendBaleMessage(text: string): Promise<boolean> {
  const config = await getBaleConfig();
  if (!config.enabled) return false;

  try {
    // v1.1.2 (audit CODE-01-H): اسلش بعد از /bots جا مانده بود — همه‌ی فراخوانی‌های
    // Bale با 404 پاسخ می‌دادند و نوتیفیکیشن‌ها بی‌صدا از دست می‌رفتند.
    const url = `${BALE_API_BASE}/${config.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // v1.1 (security): redirect manual + timeout — هم‌تراز با providers.ts
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    // v1.0 (audit W21-25 #4): res.ok چک + بدنه‌ی خطا هم سقف دارد
    if (!res.ok) {
      console.error("[bale] sendMessage HTTP error:", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return false;
    }
    // v1.0 (audit W11-15 #4): خواندن محدودشده — chunked بدون CL حافظه را نمی‌بلعد
    const parsed = await readBoundedJson(res);
    if (!parsed) return false; // پاسخ ربات API هرگز بزرگ نیست
    return !!(parsed.data as { ok?: boolean })?.ok;
  } catch (err) {
    console.error("[bale] sendMessage error:", err);
    return false;
  }
}

/** Notify admin about a new contact message */
export async function notifyNewContactMessage(msg: {
  id: string;
  name: string;
  email: string;
  message: string;
}) {
  const text = [
    `📨 *New Contact Message*`,
    ``,
    `*From:* ${mdSafe(msg.name)}`,
    `*Email:* ${mdSafe(msg.email)}`,
    `*ID:* \`${msg.id}\``,
    ``,
    `${mdSafe(msg.message.slice(0, 500))}`,
    ``,
    `_Reply with:_ /reply ${msg.id} your response`,
  ].join("\n");
  return sendBaleMessage(text);
}

/** Notify admin about a new chat message */
export async function notifyNewChat(msg: {
  sessionId: string;
  visitorId: string;
  message: string;
  isFirst: boolean;
}) {
  const text = [
    msg.isFirst ? `🤖 *New Chat Session*` : `💬 *Chat Message*`,
    ``,
    `*Visitor:* ${mdSafe(msg.visitorId)}`,
    `*Session:* \`${msg.sessionId}\``,
    ``,
    `${mdSafe(msg.message.slice(0, 300))}`,
    ``,
    `_Reply with:_ /chat ${msg.sessionId} your response`,
  ].join("\n");
  return sendBaleMessage(text);
}

/** Process inbound Bale webhook (admin replying via Bale) */
export async function processBaleWebhook(body: any): Promise<{ ok: boolean; reply?: string }> {
  const updateId = body?.update_id;
  sweepSeen();
  // v1.1.1 (audit S5-L2): همان update دوباره پردازش نشود
  if (typeof updateId === "number" && isFinite(updateId) && hasSeen(updateId)) {
    return { ok: true, reply: undefined };
  }
  const result = await processBaleWebhookInner(body);
  // v1.0 (audit W31-35 #3): mark فقط بعد از پردازش موفق — اگر inner پرتاب شود،
  // رد می‌شود و پلتفرم redelivery را دوباره می‌فرستد
  if (typeof updateId === "number" && isFinite(updateId)) markSeen(updateId);
  return result;
}

async function processBaleWebhookInner(body: any): Promise<{ ok: boolean; reply?: string }> {
  const message = body?.message;
  // v1.0 (audit W31-35 #4): typeof چک — متن عددی قبلاً در .trim() می‌ترکید
  if (!message || typeof message.text !== "string") return { ok: false };

  // v1.1 (security): sender verification — secret header فقط ثابت می‌کنه درخواست
  // از پلتفرم Bale اومده، نه از ادمین. هر کاربر تصادفی تلگرام/بیل که handle ربات رو
  // پیدا کنه می‌تونه /disable بفرسته و AI chat سایت رو بکشه. حالا فقط chat.id
  // ادمینِ پیکربندی‌شده مجاز به اجرای فرمان‌هاست.
  // v1.1.1 (audit S5-L3): fail-closed — اگر chatId تنظیم نشده باشد هیچ فرمانی اجرا نمی‌شود
  const config = await getBaleConfig();
  if (!config.chatId || String(message.chat?.id ?? "") !== String(config.chatId)) {
    console.error("[bale] webhook command rejected — no configured chatId or unauthorized chat");
    return { ok: false };
  }

  const text: string = message.text.trim();
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case "/list": {
      const msgs = await db.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, message: true, createdAt: true },
      });
      if (msgs.length === 0) {
        return { ok: true, reply: "No messages yet." };
      }
      const list = msgs
        // v1.1.1 (audit S3-L3): mdSafe — متن بازدیدکننده Markdown parser را نشکند
        .map((m, i) => `${i + 1}. ${mdSafe(m.name)} (\`${m.id}\`)\n   ${mdSafe(m.message.slice(0, 80))}...`)
        .join("\n\n");
      return { ok: true, reply: `*Recent messages:*\n\n${list}` };
    }

    case "/reply": {
      // /reply {messageId} {reply text...}
      const messageId = parts[1];
      const replyText = parts.slice(2).join(" ");
      if (!messageId || !replyText) {
        return { ok: false, reply: "Usage: /reply {id} {your reply}" };
      }
      const original = await db.contactMessage.findUnique({ where: { id: messageId } });
      if (!original) {
        return { ok: false, reply: `Message ${messageId} not found.` };
      }
      await db.messageReply.create({
        data: { messageId, reply: replyText },
      });
      return {
        ok: true,
        reply: `✓ Reply saved for ${original.name}.\n\nNote: Reply is stored in DB. To actually email them, set up an email service.`,
      };
    }

    case "/chat": {
      // /chat {sessionId} {reply text...}
      const sessionId = parts[1];
      const replyText = parts.slice(2).join(" ");
      if (!sessionId || !replyText) {
        return { ok: false, reply: "Usage: /chat {sessionId} {your reply}" };
      }
      const session = await db.chatSession.findUnique({ where: { id: sessionId } });
      if (!session) {
        return { ok: false, reply: `Session ${sessionId} not found.` };
      }
      await db.chatMessage.create({
        data: { sessionId, role: "assistant", content: replyText },
      });
      await db.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });
      return { ok: true, reply: `✓ Reply injected into chat ${sessionId}.` };
    }

    case "/disable": {
      await db.siteSetting.upsert({
        where: { key: "apiEnabled" },
        update: { value: "false" },
        create: { key: "apiEnabled", value: "false" },
      });
      return { ok: true, reply: "🔴 AI Chat API has been *disabled*." };
    }

    case "/enable": {
      await db.siteSetting.upsert({
        where: { key: "apiEnabled" },
        update: { value: "true" },
        create: { key: "apiEnabled", value: "true" },
      });
      return { ok: true, reply: "🟢 AI Chat API has been *enabled*." };
    }

    case "/stats": {
      const [msgCount, chatSessions, chatMsgs] = await Promise.all([
        db.contactMessage.count(),
        db.chatSession.count(),
        db.chatMessage.count({ where: { role: "user" } }),
      ]);
      const apiEnabled = await db.siteSetting.findUnique({ where: { key: "apiEnabled" } });
      return {
        ok: true,
        reply: [
          `📊 *Site Stats*`,
          ``,
          `Contact messages: ${msgCount}`,
          `Chat sessions: ${chatSessions}`,
          `Chat messages: ${chatMsgs}`,
          `AI API: ${apiEnabled?.value === "false" ? "🔴 disabled" : "🟢 enabled"}`,
        ].join("\n"),
      };
    }

    case "/start":
    case "/help": {
      return {
        ok: true,
        reply: [
          `*Portfolio Admin Bot*`,
          ``,
          `Commands:`,
          `/list — recent contact messages`,
          `/reply {id} {text} — reply to a message`,
          `/chat {sessionId} {text} — reply in AI chat`,
          `/disable — disable AI chat API`,
          `/enable — enable AI chat API`,
          `/stats — site statistics`,
        ].join("\n"),
      };
    }

    default:
      return { ok: false, reply: `Unknown command: ${mdSafe(cmd)}. Send /help for options.` };
  }
}
