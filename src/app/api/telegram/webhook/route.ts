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
    // v1.0 (audit W31-35 #1 — HIGH): هدر بومی پلتفرم هم پذیرفته می‌شود — Telegram
    // موقع setWebhook با secret_token، مقدار را در X-Telegram-Bot-Api-Secret-Token
    // برمی‌گرداند؛ قبلاً فقط هدر سفارشی چک می‌شد و هیچ delivery واقعی رد نمی‌شد ۴۰۳
    // نمی‌گرفت و کانال فرمان ادمین کار نمی‌کرد.
    const secret =
      req.headers.get("x-telegram-bot-api-secret-token") ||
      req.headers.get("x-webhook-secret") ||
      "";
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    // v1.0 (audit W11-15 #6): حداقل استحکام secret — کوتاه‌تر از ۳۲ کاراکتر آنلاین
    // قابل حدس است؛ مثل MAINTENANCE_TOKEN fail-closed می‌شویم (کانال خاموش)
    if (!expectedSecret || expectedSecret.length < 32) {
      return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
    }
    // v1.1.2 (audit SEC-09): مقایسه‌ی digest SHA-256 به‌جای مقایسه‌ی مستقیم —
    // چک طولی قبل از timingSafeEqual طول secret را از طریق timing افشا می‌کرد؛
    // hash هر دو مقدار همیشه 32 بایت است و طول دیگر لو نمی‌رود.
    const secretBuf = crypto.createHash("sha256").update(secret).digest();
    const expBuf = crypto.createHash("sha256").update(expectedSecret).digest();
    if (!crypto.timingSafeEqual(secretBuf, expBuf)) {
      // v1.0 (audit W31-35 #2): تلاش ناموفق لاگ می‌شود
      const { logSecurityEvent } = await import("@/lib/security");
      const ip = req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",").pop()?.trim() || null;
      logSecurityEvent("webhook_bad_secret", ip && ip !== "unknown" ? ip : null, "telegram webhook secret mismatch").catch(() => {});
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
