import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * GET /api/admin/themes
 * v1.1 (security): fail-closed — کاربر غیرادمین → 401 (قبلاً fail-open بود)
 */
export async function GET(req: Request) {
  try {
    const authCheck = await checkAdminAuth(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const themes = await db.customTheme.findMany({
      orderBy: { order: "asc" },
      take: 100, // v1.1.2 (hardening): cap list size
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

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "create": {
        // v1.1.1 (audit S3-M1/S8-M1): create هم مثل update اعتبارسنجی hex دارد —
        // قبلاً create بدون validate بود و CSS injection روی سایت عمومی ممکن بود.
        const data = body.data || {};
        const HEX = /^#[0-9a-fA-F]{3,8}$/;
        const defaults: Record<string, string> = {
          bg: "#000000", bgSoft: "#030303", bgPanel: "#050505", bgPanel2: "#080808",
          primary: "#00ff41", primaryDim: "#008f11", primaryBright: "#39ff14",
          text: "#c8ffc8", textDim: "#4a7a4a", textFaint: "#2a4a2a",
          border: "#1a3a1a", borderBright: "#2a6a2a",
          accent: "#ffb000", red: "#ff0040", cyan: "#00fff0",
        };
        const colors: Record<string, string> = {};
        for (const f of Object.keys(defaults)) {
          const v = String(data[f] ?? defaults[f]).trim();
          if (!HEX.test(v)) {
            return NextResponse.json({ ok: false, error: "invalid_color", field: f }, { status: 400 });
          }
          colors[f] = v;
        }
        const created = await db.customTheme.create({
          data: {
            name: String(data.name || "New Theme").slice(0, 60),
            bg: colors.bg,
            bgSoft: colors.bgSoft,
            bgPanel: colors.bgPanel,
            bgPanel2: colors.bgPanel2,
            primary: colors.primary,
            primaryDim: colors.primaryDim,
            primaryBright: colors.primaryBright,
            text: colors.text,
            textDim: colors.textDim,
            textFaint: colors.textFaint,
            border: colors.border,
            borderBright: colors.borderBright,
            accent: colors.accent,
            red: colors.red,
            cyan: colors.cyan,
            scanlines: Boolean(data.scanlines ?? false),
            visible: Boolean(data.visible ?? true),
            order: Math.max(0, Number(data.order) || 0),
          },
        });
        return NextResponse.json({ ok: true, theme: created });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        // v1.1 (security): whitelist فیلدها + اعتبارسنجی hex — ورودی خام به Prisma نمی‌ره،
        // مقادیر غیررنگی نمی‌تونن CSS injection بسازن
        const d = body.data || {};
        const HEX = /^#[0-9a-fA-F]{3,8}$/;
        const colorFields = ["bg", "bgSoft", "bgPanel", "bgPanel2", "primary", "primaryDim", "primaryBright", "text", "textDim", "textFaint", "border", "borderBright", "accent", "red", "cyan"] as const;
        const data: Record<string, string | boolean | number> = {};
        if (d.name !== undefined) data.name = String(d.name).slice(0, 60);
        for (const f of colorFields) {
          if (d[f] !== undefined) {
            const v = String(d[f]).trim();
            if (!HEX.test(v)) {
              return NextResponse.json({ ok: false, error: "invalid_color", field: f }, { status: 400 });
            }
            data[f] = v;
          }
        }
        if (d.scanlines !== undefined) data.scanlines = Boolean(d.scanlines);
        if (d.visible !== undefined) data.visible = Boolean(d.visible);
        if (d.order !== undefined) data.order = Math.max(0, Number(d.order) || 0);
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
    // v1.1.2 (hardening): duplicate theme name on create/update raises P2002
    // (findUnique pre-checks elsewhere are not race-safe) → 409 instead of 500
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ ok: false, error: "theme_name_exists" }, { status: 409 });
    }
    console.error("[/api/admin/themes POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
