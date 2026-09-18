import { NextResponse } from "next/server";
import { processBaleWebhook } from "@/lib/bale";
import { getSetting } from "@/lib/settings";

/**
 * POST /api/bale/webhook
 * Bale calls this when admin sends a message to the bot.
 * Body is the Bale update object.
 */
export async function POST(req: Request) {
  try {
    // Optional: verify the request is from Bale using a secret in the URL
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = process.env.BALE_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
    }
    if (secret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "invalid_secret" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const result = await processBaleWebhook(body);

    // If there's a reply, send it back to the admin's Bale chat
    if (result.reply) {
      const { sendBaleMessage } = await import("@/lib/bale");
      await sendBaleMessage(result.reply);
    }

    return NextResponse.json({ ok: result.ok });
  } catch (err) {
    console.error("[/api/bale/webhook] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * GET /api/bale/setup?password=xxx
 * Helper: returns Bale setup instructions and current config status.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const password = url.searchParams.get("password") || "";
  const adminPassword = process.env.PERSONAL_ADMIN_PASSWORD || "admin123";

  if (password !== adminPassword) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [token, chatId, enabled] = await Promise.all([
    getSetting("baleBotToken"),
    getSetting("baleChatId"),
    getSetting("baleEnabled"),
  ]);

  return NextResponse.json({
    ok: true,
    configured: !!token && !!chatId,
    enabled: enabled === "true",
    hasToken: !!token,
    hasChatId: !!chatId,
    webhookUrl: token
      ? `https://api.bale.ai/v1/bots${token}/setWebhook`
      : null,
  });
}
