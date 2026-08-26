import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/**
 * Telegram messenger integration — backup to Bale.
 * API base: https://api.telegram.org/bot<token>/<method>
 */

async function getTelegramConfig() {
  const [token, chatId, enabled] = await Promise.all([
    getSetting("telegramBotToken"),
    getSetting("telegramChatId"),
    getSetting("telegramEnabled"),
  ]);
  return {
    token: token || process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: chatId || process.env.TELEGRAM_CHAT_ID || "",
    enabled: enabled === "true" && !!token && !!chatId,
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
    `*From:* ${msg.name}`,
    `*Email:* ${msg.email}`,
    `*ID:* \`${msg.id}\``,
    ``, `${msg.message.slice(0, 500)}`,
  ].join("\n");
  return sendTelegramMessage(text);
}

export async function notifyTelegramChat(msg: {
  sessionId: string; visitorId: string; message: string; isFirst: boolean;
}) {
  const text = [
    msg.isFirst ? `🤖 *New Chat Session*` : `💬 *Chat Message*`, ``,
    `*Visitor:* ${msg.visitorId}`,
    `*Session:* \`${msg.sessionId}\``, ``,
    `${msg.message.slice(0, 300)}`,
  ].join("\n");
  return sendTelegramMessage(text);
}

/** Process inbound Telegram webhook */
export async function processTelegramWebhook(body: any): Promise<{ ok: boolean; reply?: string }> {
  const message = body?.message;
  if (!message || !message.text) return { ok: false };
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
      return { ok: true, reply: "*Recent messages:*\n\n" + msgs.map((m, i) =>
        `${i + 1}. ${m.name} (\`${m.id}\`)\n   ${m.message.slice(0, 80)}...`).join("\n\n") };
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
