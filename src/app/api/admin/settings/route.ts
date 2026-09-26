import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSetting, getSetting } from "@/lib/settings";

/**
 * POST /api/admin/settings
 *
 * Body variants:
 *  { settings: { key: value, ... } }            — bulk update multiple settings
 *  { action: "get_telegram" }                    — return Telegram config (token+chatId)
 *  { action: "set_telegram", token, chatId }     — set Telegram config
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const password = String(body.password || "");
    const authCheck = await checkAdminAuth(req, password);
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
      await Promise.all([
        setSetting("telegramBotToken", token),
        setSetting("telegramChatId", chatId),
        setSetting("telegramEnabled", token ? "true" : "false"),
      ]);
      return NextResponse.json({ ok: true });
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
      "adminDisplayName",
      "adminTagline",
      "adminStatus",
    ];

    const updates: Promise<void>[] = [];
    for (const [key, value] of Object.entries(settings)) {
      if (allowedKeys.includes(key)) {
        const strValue = String(value);
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
    const password = url.searchParams.get("password") || "";

    const authCheck = await checkAdminAuth(req, password);
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
      "adminDisplayName",
      "adminTagline",
      "adminStatus",
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
