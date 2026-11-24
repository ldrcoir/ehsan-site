// ============================================================================
// route.ts — v1.0
// GET/POST /api/admin/settings — تنظیمات سایت (whitelist کلیدها؛ توکن‌های ربات ماسک
// می‌شوند؛ visitorCount فقط عدد؛ URLهای شبکه‌های اجتماعی اعتبارسنجی می‌شوند).
// ============================================================================

import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSetting, getSetting } from "@/lib/settings";
import { sendBaleMessage } from "@/lib/bale";
import { sendTelegramMessage } from "@/lib/telegram";

/**
 * POST /api/admin/settings
 *
 * Body variants:
 *  { settings: { key: value, ... } }            — bulk update multiple settings
 *  { action: "get_telegram" }                    — return Telegram config (token+chatId)
 *  { action: "set_telegram", token, chatId }     — set Telegram config
 *  { action: "test_bale" }                       — send a test message via Bale
 *  { action: "test_telegram" }                   — send a test message via Telegram
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // --- Special actions ---
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "get_telegram") {
      const [token, chatId, enabled] = await Promise.all([
        getSetting("telegramBotToken"),
        getSetting("telegramChatId"),
        getSetting("telegramEnabled"),
      ]);
      // V17.5: token رو mask می‌کنیم (security)
      const maskedToken = token ? "••••••••" + token.slice(-4) : "";
      return NextResponse.json({
        ok: true,
        telegramBotToken: maskedToken,
        telegramChatId: chatId,
        telegramEnabled: enabled,
      });
    }
    if (action === "set_telegram") {
      const token = String(body.token || "").trim();
      const chatId = String(body.chatId || "").trim();
      // v1.1.2 (hardening): cap string setting values (see bulk path below)
      if (token.length > 5000 || chatId.length > 5000) {
        return NextResponse.json({ ok: false, error: "value_too_long" }, { status: 400 });
      }
      await Promise.all([
        setSetting("telegramBotToken", token),
        setSetting("telegramChatId", chatId),
        setSetting("telegramEnabled", token ? "true" : "false"),
      ]);
      return NextResponse.json({ ok: true });
    }
    // V18.3: تست اتصال Bale — یک پیام تست به چت ادمین می‌فرسته
    if (action === "test_bale") {
      const sent = await sendBaleMessage("✅ تست از پنل ادمین / Test from admin panel");
      if (sent) return NextResponse.json({ ok: true, sent: true });
      return NextResponse.json({ ok: false, error: "send_failed" });
    }
    // V18.3: تست اتصال Telegram — یک پیام تست به چت ادمین می‌فرسته
    if (action === "test_telegram") {
      const sent = await sendTelegramMessage("✅ تست از پنل ادمین / Test from admin panel");
      if (sent) return NextResponse.json({ ok: true, sent: true });
      return NextResponse.json({ ok: false, error: "send_failed" });
    }

    // --- Default: bulk update settings ---
    const settings = body.settings;
    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { ok: false, error: "missing_settings" },
        { status: 400 }
      );
    }

    const allowedKeys = [
      "apiEnabled",
      "baleEnabled",
      "baleBotToken",
      "baleChatId",
      "telegramEnabled",
      "telegramBotToken",
      "telegramChatId",
      // V18.3: شبکه‌های اجتماعی + پیش‌فرض‌های سایت
      "social_github",
      "social_linkedin",
      "social_devto",
      "social_medium",
      "defaultTheme",
      "defaultFont",
      // v1.1 (admin-editable everything): برند و SEO
      "contact_email",     // ایمیل نمایشی (ترمینال + پرامپت AI) — جدا از forwardEmail
      "meta_description", // توضیحات متا برای موتورهای جست‌وجو
      "og_image",          // تصویر اشتراک‌گذاری (OG/Twitter)
      // v1.1.1 (audit P4-G1): تصحیح دستی شمارنده بازدید — بعد از سوءاستفاده/اسپم
      // ادمین باید بتواند visitorCount را از پنل اصلاح کند (read-only بود)
      "visitorCount",
      // v1.1.2 (hardening): reCAPTCHA site key (public — safe to expose via GET)
      "recaptcha_sitekey",
    ];
    // V18.3: هر کلیدی به شکل section.<name>.visible پذیرفته می‌شه (کنترل نمایش بخش‌های سایت)
    const isAllowedKey = (key: string): boolean =>
      allowedKeys.includes(key) || /^section\.[a-z]+\.visible$/.test(key);

    const updates: Promise<void>[] = [];
    // v1.1 (security): اعتبارسنجی سمت سرور برای URLهای شبکه‌های اجتماعی —
    // قبلاً هر رشته‌ای (شامل javascript: یا ۵۰۰KB garbage) بدون کنترل ذخیره می‌شد
    const SOCIAL_KEYS = new Set(["social_github", "social_linkedin", "social_devto", "social_medium"]);
    const safeUrl = (v: string): string | null => {
      if (!v) return "";
      try {
        const u = new URL(v);
        if (u.protocol !== "https:" && u.protocol !== "http:") return null;
        if (v.length > 300) return null;
        return v;
      } catch {
        return null;
      }
    };
    for (const [key, value] of Object.entries(settings)) {
      if (isAllowedKey(key)) {
        let strValue = String(value);
        // v1.1.2 (hardening): cap any string setting value at 5000 chars
        if (strValue.length > 5000) {
          return NextResponse.json(
            { ok: false, error: "value_too_long", key },
            { status: 400 }
          );
        }
        // v1.0 (audit W16-20 #5): visitorCount باید عدد باشد — کلید از /api/content
        // عمومی برمی‌گردد و به‌عنوان شمارنده رندر می‌شود؛ قبلاً هر رشته‌ای ذخیره می‌شد
        if (key === "visitorCount" && !/^\d{1,9}$/.test(strValue)) {
          return NextResponse.json(
            { ok: false, error: "invalid_value", key },
            { status: 400 }
          );
        }
        if (SOCIAL_KEYS.has(key)) {
          const okVal = safeUrl(strValue);
          if (okVal === null) {
            return NextResponse.json(
              { ok: false, error: "invalid_url", key },
              { status: 400 }
            );
          }
          strValue = okVal;
        }
        // V17.5: اگه bot token masked شده (مثل ••••••••1234) بود، ذخیره نکن
        // این از round-trip corruption جلوگیری می‌کنه (V17.4 bug fix)
        if ((key === "baleBotToken" || key === "telegramBotToken") && strValue.startsWith("••••••••")) {
          // skip — ادمین می‌خواد مقدار فعلی رو نگه داره
          continue;
        }
        updates.push(setSetting(key, strValue));
      }
    }
    await Promise.all(updates);

    return NextResponse.json({ ok: true, updated: updates.length });
  } catch (err) {
    console.error("[/api/admin/settings] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/settings
 * Returns current site settings (excluding secrets like API keys / bot tokens).
 * Note: Bot tokens are returned so the admin panel can populate the form;
 * they are not displayed as plaintext in the UI (input type=password).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = ""; // V17.8: dead param removed (checkAdminAuth ignores it)

    const authCheck = await checkAdminAuth(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const keys = [
      "apiEnabled",
      "baleEnabled",
      "baleBotToken",
      "baleChatId",
      "telegramEnabled",
      "telegramBotToken",
      "telegramChatId",
      // V18.3: شبکه‌های اجتماعی + پیش‌فرض‌های سایت
      "social_github",
      "social_linkedin",
      "social_devto",
      "social_medium",
      "defaultTheme",
      "defaultFont",
      // v1.1 (admin-editable everything)
      "contact_email",
      "meta_description",
      "og_image",
      // v1.1.2 (hardening): reCAPTCHA site key (public — safe to expose)
      "recaptcha_sitekey",
      // V18.3: وضعیت نمایش بخش‌ها (10 بخش شناخته‌شده)
      "section.hero.visible",
      "section.about.visible",
      "section.skills.visible",
      "section.books.visible",
      "section.articles.visible",
      "section.tutorials.visible",
      "section.lab.visible",
      "section.chat.visible",
      "section.clips.visible",
      "section.contact.visible",
      "visitorCount",
    ];
    const rows = await db.siteSetting.findMany({ where: { key: { in: keys } } });
    const settings: Record<string, string> = {};
    for (const k of keys) {
      const row = rows.find((r) => r.key === k);
      settings[k] = row ? row.value : "";
    }
    // V17.4: bot tokens رو mask می‌کنیم (security) — ادمین فقط می‌بینه تنظیم شده یا نه
    // اگه admin بخواد عوض کنه، باید مقدار جدید وارد کنه (نه مقدار فعلی رو ببینه)
    if (settings.baleBotToken) {
      settings.baleBotToken = "••••••••" + settings.baleBotToken.slice(-4);
    }
    if (settings.telegramBotToken) {
      settings.telegramBotToken = "••••••••" + settings.telegramBotToken.slice(-4);
    }

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[/api/admin/settings GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
