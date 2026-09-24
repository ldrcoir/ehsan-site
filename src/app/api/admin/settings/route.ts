import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSetting } from "@/lib/settings";

/**
 * POST /api/admin/settings
 * Body: { password, settings: { key: value, ... } }
 * Updates site settings (API kill switch, Bale config, display name, etc.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const password = String(body.password || "");
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

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
      "adminDisplayName",
      "adminTagline",
      "adminStatus",
    ];

    const updates: Promise<void>[] = [];
    for (const [key, value] of Object.entries(settings)) {
      if (allowedKeys.includes(key)) {
        updates.push(setSetting(key, String(value)));
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
 * GET /api/admin/settings?password=xxx
 * Returns current site settings.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const keys = [
      "apiEnabled",
      "baleEnabled",
      "baleBotToken",
      "baleChatId",
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

    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("[/api/admin/settings GET] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
