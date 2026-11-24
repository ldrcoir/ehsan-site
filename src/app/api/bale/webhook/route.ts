import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { processBaleWebhook } from "@/lib/bale";
import { getSetting } from "@/lib/settings";
import { getClientIpSafe } from "@/lib/ip";

/**
 * POST /api/bale/webhook — Bale calls this when admin sends a message to the bot.
 * Body is the Bale update object.
 *
 * Security:
 * - secret فقط از هدر X-Webhook-Secret خونده می‌شه (V18.3: query param حذف شد)
 * - مقایسه با timingSafeEqual (جلوگیری از timing attack)
 */
export async function POST(req: Request) {
  try {
    // v1.0 (audit W31-35 #1 — HIGH): پلتفرم هرگز هدر x-webhook-secret را نمی‌فرستد
    // مگر اینکه موقع setWebhook پارامتر secret_token ست شده باشد — و Telegram/Bale
    // مقدار آن را در هدر بومی X-Telegram-Bot-Api-Secret-Token برمی‌گردانند.
    // قبلاً فقط هدر سفارشی چک می‌شد → هیچ delivery واقعی ۴۰۳ می‌گرفت و کانال فرمان
    // ادمین عملاً کار نمی‌کرد. الان هر دو هدر پذیرفته می‌شوند (هر دو timing-safe).
    const secret =
      req.headers.get("x-telegram-bot-api-secret-token") ||
      req.headers.get("x-webhook-secret") ||
      "";
    const expectedSecret = process.env.BALE_WEBHOOK_SECRET;
    // v1.0 (audit W11-15 #6): حداقل استحکام secret — کوتاه‌تر از ۳۲ کاراکتر آنلاین
    // قابل حدس است؛ مثل MAINTENANCE_TOKEN fail-closed می‌شویم (کانال خاموش)
    if (!expectedSecret || expectedSecret.length < 32) {
      return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
    }
    // v1.1.2 (audit SEC-09): مقایسه‌ی digest SHA-256 — چک طولی قبل از
    // timingSafeEqual طول secret را از طریق timing افشا می‌کرد
    const secretBuf = crypto.createHash("sha256").update(secret).digest();
    const expBuf = crypto.createHash("sha256").update(expectedSecret).digest();
    if (!crypto.timingSafeEqual(secretBuf, expBuf)) {
      // v1.0 (audit W31-35 #2): تلاش ناموفق لاگ می‌شود (rate limit 60/min جلوی flood را می‌گیرد)
      // v1.0 rev3 (audit SEC-a LOW): IP واقعی (هدرهای کلاینت قابل جعل بودند) + سقف طول
      const { logSecurityEvent } = await import("@/lib/security");
      const ip = getClientIpSafe(req) || null;
      const safeIp = ip && ip !== "unknown" ? ip.slice(0, 45) : null;
      logSecurityEvent("webhook_bad_secret", safeIp, "bale webhook secret mismatch").catch(() => {});
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
 * GET /api/bale/setup
 * Helper: returns Bale setup instructions and current config status.
 */
export async function GET(req: Request) {
  try {
    const authCheck = await checkAdminAuth(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const [token, chatId, enabled] = await Promise.all([
      getSetting("baleBotToken"),
      getSetting("baleChatId"),
      getSetting("baleEnabled"),
    ]);

    // V17.5: token رو mask می‌کنیم — webhookUrl قبلاً توکن رو plaintext برمی‌گردوند
    return NextResponse.json({
      ok: true,
      configured: !!token && !!chatId,
      enabled: enabled === "true",
      hasToken: !!token,
      hasChatId: !!chatId,
      maskedToken: token ? "••••••••" + token.slice(-4) : null,
      webhookUrl: token ? "https://api.bale.ai/v1/bots<token>/setWebhook" : null,
      // v1.0 (audit W31-35 #1): راهنمای ثبت webhook با secret_token — بدنه‌ی درخواست
      // باید {"url": "...", "secret_token": "<BALE_WEBHOOK_SECRET از .env>"} باشد
      // تا پلتفرم مقدار را در هدر X-Telegram-Bot-Api-Secret-Token برگرداند
      setupHint: "POST body: { url, secret_token } — secret_token را از .env بخوانید (BALE_WEBHOOK_SECRET)",
    });
  } catch (err) {
    console.error("[/api/bale/webhook GET] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
