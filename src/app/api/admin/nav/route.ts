import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/admin/nav?password=xxx */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    const authCheck = await checkAdminAuth(req, password); const isAdmin = authCheck.ok;
    const items = await db.navItem.findMany({
      where: isAdmin ? {} : { visible: true },
      orderBy: { order: "asc" },
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
    const password = String(body.password || "");
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
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
        const d = { ...body.data }; delete d.id; delete d.createdAt; delete d.updatedAt;
        const item = await db.navItem.update({ where: { id }, data: d });
        return NextResponse.json({ ok: true, item });
      }
      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.navItem.delete({ where: { id } });
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
