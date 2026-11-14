import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/**
 * Telegram messenger integration — backup to Bale.
 * API base: https://api.telegram.org/bot<token>/<method>
 */

// v1.1.1 (audit S5-L2): replay protection — همان update دوباره پردازش نشود
const seenUpdates = new Map<number, number>(); // updateId → firstSeenTs
const SEEN_TTL_MS = 10 * 60 * 1000;
function isReplay(updateId: unknown): boolean {
  if (typeof updateId !== "number" || !isFinite(updateId)) return false;
  const now = Date.now();
  if (seenUpdates.size > 500) {
    for (const [k, ts] of seenUpdates) {
      if (now - ts > SEEN_TTL_MS) seenUpdates.delete(k);
    }
  }
  const first = seenUpdates.get(updateId);
  if (first !== undefined && now - first < SEEN_TTL_MS) return true;
  seenUpdates.set(updateId, now);
  return false;
}

// v1.1 (security): strip Markdown metacharacters — جلوگیری از تزریق لینک جعلی
// داخل نوتیفیکیشن ادمین (parse_mode: "Markdown" روی متن خام بازدیدکننده)
function mdSafe(s: string): string {
  return String(s).replace(/[_*`\[\]()]/g, " ");
}

async function getTelegramConfig() {
  const [token, chatId, enabled] = await Promise.all([
    getSetting("telegramBotToken"),
    getSetting("telegramChatId"),
    getSetting("telegramEnabled"),
  ]);
  // v1.1: از fallback env هم در بررسی enabled استفاده کن — قبلاً token خام DB چک
  // می‌شد و اگر توکن فقط در env بود، ربات هیچ‌وقت فعال نمی‌شد
  const finalToken = token || process.env.TELEGRAM_BOT_TOKEN || "";
  const finalChatId = chatId || process.env.TELEGRAM_CHAT_ID || "";
  return {
    token: finalToken,
    chatId: finalChatId,
    enabled: enabled === "true" && !!finalToken && !!finalChatId,
  };
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const config = await getTelegramConfig();
  if (!config.enabled) return false;
  try {
    const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // v1.1 (security): redirect manual + timeout — هم‌تراز با providers.ts
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "Markdown" }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (err) {
    console.error("[telegram] sendMessage error:", err);
    return false;
  }
}

export async function notifyTelegramContactMessage(msg: {
  id: string; name: string; email: string; message: string;
}) {
  const text = [
    `📨 *New Contact Message*`, ``,
    `*From:* ${mdSafe(msg.name)}`,
    `*Email:* ${mdSafe(msg.email)}`,
    `*ID:* \`${msg.id}\``,
    ``, `${mdSafe(msg.message.slice(0, 500))}`,
  ].join("\n");
  return sendTelegramMessage(text);
}

export async function notifyTelegramChat(msg: {
  sessionId: string; visitorId: string; message: string; isFirst: boolean;
}) {
  const text = [
    msg.isFirst ? `🤖 *New Chat Session*` : `💬 *Chat Message*`, ``,
    `*Visitor:* ${mdSafe(msg.visitorId)}`,
    `*Session:* \`${msg.sessionId}\``, ``,
    `${mdSafe(msg.message.slice(0, 300))}`,
  ].join("\n");
  return sendTelegramMessage(text);
}

/** Process inbound Telegram webhook */
export async function processTelegramWebhook(body: any): Promise<{ ok: boolean; reply?: string }> {
  const message = body?.message;
  if (!message || !message.text) return { ok: false };

  // v1.1.1 (audit S5-L2): replay dedup
  if (isReplay(body?.update_id)) return { ok: true, reply: undefined };

  // v1.1 (security): sender verification — فقط chat.id ادمینِ پیکربندی‌شده مجاز است
  // (هر کاربر تلگرامی که handle ربات را پیدا کند وگرنه می‌توانست /disable بزند)
  // v1.1.1 (audit S5-L3): fail-closed — بدون chatId پیکربندی‌شده هیچ فرمانی اجرا نمی‌شود
  const config = await getTelegramConfig();
  if (!config.chatId || String(message.chat?.id ?? "") !== String(config.chatId)) {
    console.error("[telegram] webhook command rejected — no configured chatId or unauthorized chat");
    return { ok: false };
  }

  const text: string = message.text.trim();
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  switch (cmd) {
    case "/list": {
      const msgs = await db.contactMessage.findMany({
        orderBy: { createdAt: "desc" }, take: 5,
        select: { id: true, name: true, message: true, createdAt: true },
      });
      if (msgs.length === 0) return { ok: true, reply: "No messages yet." };
      // v1.1.1 (audit S3-L3): mdSafe — متن بازدیدکننده Markdown parser را نشکند
      return { ok: true, reply: "*Recent messages:*\n\n" + msgs.map((m, i) =>
        `${i + 1}. ${mdSafe(m.name)} (\`${m.id}\`)\n   ${mdSafe(m.message.slice(0, 80))}...`).join("\n\n") };
    }
    case "/reply": {
      const messageId = parts[1]; const replyText = parts.slice(2).join(" ");
      if (!messageId || !replyText) return { ok: false, reply: "Usage: /reply {id} {text}" };
      const original = await db.contactMessage.findUnique({ where: { id: messageId } });
      if (!original) return { ok: false, reply: `Message ${messageId} not found.` };
      await db.messageReply.create({ data: { messageId, reply: replyText } });
      return { ok: true, reply: `✓ Reply saved for ${original.name}.` };
    }
    case "/chat": {
      const sessionId = parts[1]; const replyText = parts.slice(2).join(" ");
      if (!sessionId || !replyText) return { ok: false, reply: "Usage: /chat {sessionId} {text}" };
      const session = await db.chatSession.findUnique({ where: { id: sessionId } });
      if (!session) return { ok: false, reply: `Session ${sessionId} not found.` };
      await db.chatMessage.create({ data: { sessionId, role: "assistant", content: replyText } });
      await db.chatSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
      return { ok: true, reply: `✓ Reply injected into chat ${sessionId}.` };
    }
    case "/disable": {
      await db.siteSetting.upsert({ where: { key: "apiEnabled" }, update: { value: "false" }, create: { key: "apiEnabled", value: "false" } });
      return { ok: true, reply: "🔴 AI Chat API disabled." };
    }
    case "/enable": {
      await db.siteSetting.upsert({ where: { key: "apiEnabled" }, update: { value: "true" }, create: { key: "apiEnabled", value: "true" } });
      return { ok: true, reply: "🟢 AI Chat API enabled." };
    }
    case "/stats": {
      const [mc, cs, cm] = await Promise.all([db.contactMessage.count(), db.chatSession.count(), db.chatMessage.count({ where: { role: "user" } })]);
      const api = await db.siteSetting.findUnique({ where: { key: "apiEnabled" } });
      return { ok: true, reply: `📊 *Stats*\n\nMessages: ${mc}\nSessions: ${cs}\nChat msgs: ${cm}\nAI: ${api?.value === "false" ? "🔴 off" : "🟢 on"}` };
    }
    case "/start": case "/help":
      return { ok: true, reply: "*Telegram Admin Bot*\n\n/list /reply {id} {text}\n/chat {sid} {text}\n/disable /enable /stats" };
    default:
      return { ok: false, reply: `Unknown: ${cmd}. /help` };
  }
}
