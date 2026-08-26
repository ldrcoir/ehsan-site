import { NextResponse } from "next/server";
import { processTelegramWebhook, sendTelegramMessage } from "@/lib/telegram";

/** POST /api/telegram/webhook */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    if (expectedSecret && secret !== expectedSecret) {
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
