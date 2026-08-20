import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /api/admin/themes?password=xxx
 * Returns all custom themes.
 * GET /api/themes (public, no password) — returns visible themes only
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    const isAdmin = password === PERSONAL.adminPassword;

    const themes = await db.customTheme.findMany({
      where: isAdmin ? {} : { visible: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ ok: true, themes });
  } catch (err) {
    console.error("[/api/admin/themes GET]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/themes
 * Body: { password, action, id?, data? }
 * Actions: create, update, delete, toggle
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "create": {
        const data = body.data || {};
        const created = await db.customTheme.create({
          data: {
            name: String(data.name || "New Theme"),
            bg: String(data.bg || "#000000"),
            bgSoft: String(data.bgSoft || "#030303"),
            bgPanel: String(data.bgPanel || "#050505"),
            bgPanel2: String(data.bgPanel2 || "#080808"),
            primary: String(data.primary || "#00ff41"),
            primaryDim: String(data.primaryDim || "#008f11"),
            primaryBright: String(data.primaryBright || "#39ff14"),
            text: String(data.text || "#c8ffc8"),
            textDim: String(data.textDim || "#4a7a4a"),
            textFaint: String(data.textFaint || "#2a4a2a"),
            border: String(data.border || "#1a3a1a"),
            borderBright: String(data.borderBright || "#2a6a2a"),
            accent: String(data.accent || "#ffb000"),
            red: String(data.red || "#ff0040"),
            cyan: String(data.cyan || "#00fff0"),
            scanlines: Boolean(data.scanlines ?? false),
            visible: Boolean(data.visible ?? true),
            order: Number(data.order) || 0,
          },
        });
        return NextResponse.json({ ok: true, theme: created });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const data = { ...body.data };
        delete data.id; delete data.createdAt; delete data.updatedAt;
        const updated = await db.customTheme.update({ where: { id }, data });
        return NextResponse.json({ ok: true, theme: updated });
      }

      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.customTheme.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      case "toggle": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const current = await db.customTheme.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
        const updated = await db.customTheme.update({
          where: { id },
          data: { visible: !current.visible },
        });
        return NextResponse.json({ ok: true, theme: updated });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/themes POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
