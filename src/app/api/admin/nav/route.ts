import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/admin/nav — v1.1 (security): fail-closed؛ کاربر غیرادمین → 401 */
export async function GET(req: Request) {
  try {
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/nav"]);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const items = await db.navItem.findMany({
      orderBy: { order: "asc" },
      take: 200, // v1.1.2 (hardening): cap list size
    });
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/** POST /api/admin/nav { password, action, id?, data? } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/nav"]); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const action = String(body.action || "");
    switch (action) {
      case "create": {
        const d = body.data || {};
        const item = await db.navItem.create({ data: {
          labelEn: String(d.labelEn || "new"), labelFa: String(d.labelFa || ""),
          labelDe: String(d.labelDe || ""), href: String(d.href || "#"),
          target: String(d.target || "_self"), visible: Boolean(d.visible ?? true),
          order: Number(d.order) || 99,
        }});
        return NextResponse.json({ ok: true, item });
      }
      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        // v1.1.2 (hardening): update previously passed raw body.data to Prisma —
        // unknown fields → PrismaClientValidationError 500 and id/timestamps could
        // be injected. Whitelist exactly the fields the "create" branch accepts.
        const d = body.data || {};
        const data: Record<string, unknown> = {};
        if (d.labelEn !== undefined) data.labelEn = String(d.labelEn);
        if (d.labelFa !== undefined) data.labelFa = String(d.labelFa);
        if (d.labelDe !== undefined) data.labelDe = String(d.labelDe);
        if (d.href !== undefined) data.href = String(d.href);
        if (d.target !== undefined) data.target = String(d.target);
        if (d.visible !== undefined) data.visible = Boolean(d.visible);
        if (d.order !== undefined) data.order = Number(d.order) || 99;
        let item;
        try {
          item = await db.navItem.update({ where: { id }, data });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
          }
          throw e;
        }
        return NextResponse.json({ ok: true, item });
      }
      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        try {
          await db.navItem.delete({ where: { id } });
        } catch (e) {
          // v1.0 (audit W16-20 #6): id قدیمی/حذف‌شده → 404 شفاف (قبلاً 500 می‌داد)
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
          }
          throw e;
        }
        return NextResponse.json({ ok: true });
      }
      case "toggle": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const cur = await db.navItem.findUnique({ where: { id } });
        if (!cur) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
        const item = await db.navItem.update({ where: { id }, data: { visible: !cur.visible } });
        return NextResponse.json({ ok: true, item });
      }
      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/nav]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
