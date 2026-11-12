import { NextResponse } from "next/server";
import crypto from "crypto";
import { processTelegramWebhook, sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/telegram/webhook — Telegram calls this when admin sends a message to the bot.
 * Security: secret فقط از هدر X-Webhook-Secret خونده می‌شه (V18.3: query param حذف شد)
 * و با timingSafeEqual بررسی می‌شه.
 */
export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-webhook-secret") || "";
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
    }
    const secretBuf = Buffer.from(secret);
    const expBuf = Buffer.from(expectedSecret);
    if (secretBuf.length !== expBuf.length || !crypto.timingSafeEqual(secretBuf, expBuf)) {
      return NextResponse.json({ ok: false, error: "invalid_secret" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    const result = await processTelegramWebhook(body);
    if (result.reply) await sendTelegramMessage(result.reply);
    return NextResponse.json({ ok: result.ok });
  } catch (err) {
    console.error("[/api/telegram/webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
