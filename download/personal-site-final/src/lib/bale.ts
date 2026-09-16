import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/**
 * Bale messenger integration.
 * 
 * SETUP (see /home/z/my-project/download/API_SETUP.md for full guide):
 * 1. Create a bot in Bale → get bot token
 * 2. Set BALE_BOT_TOKEN in SiteSetting (via admin panel) or .env
 * 3. Get your chat ID (message the bot, check /api/bale/getChatId)
 * 4. Set BALE_CHAT_ID in SiteSetting
 * 5. Set baleEnabled = "true" in admin panel
 * 6. Set up webhook: POST https://api.bale.ai/v1/bots{token}/setWebhook
 *    with { url: "https://your-domain.com/api/bale/webhook" }
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
    const url = `${BALE_API_BASE}${config.token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    const data = await res.json();
    return !!data.ok;
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
    `*From:* ${msg.name}`,
    `*Email:* ${msg.email}`,
    `*ID:* \`${msg.id}\``,
    ``,
    `${msg.message.slice(0, 500)}`,
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
    `*Visitor:* ${msg.visitorId}`,
    `*Session:* \`${msg.sessionId}\``,
    ``,
    `${msg.message.slice(0, 300)}`,
    ``,
    `_Reply with:_ /chat ${msg.sessionId} your response`,
  ].join("\n");
  return sendBaleMessage(text);
}

/** Process inbound Bale webhook (admin replying via Bale) */
export async function processBaleWebhook(body: any): Promise<{ ok: boolean; reply?: string }> {
  const message = body?.message;
  if (!message || !message.text) return { ok: false };

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
        .map((m, i) => `${i + 1}. ${m.name} (\`${m.id}\`)\n   ${m.message.slice(0, 80)}...`)
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
      return { ok: false, reply: `Unknown command: ${cmd}. Send /help for options.` };
  }
}
