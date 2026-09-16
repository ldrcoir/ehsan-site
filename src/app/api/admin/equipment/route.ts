import { checkAdminPassword } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /api/admin/equipment?password=xxx
 * Returns all lab equipment (including hidden).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    const authCheck = await checkAdminPassword(password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const equipment = await db.labEquipment.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({
      ok: true,
      items: equipment.map(e => ({
        ...e,
        specs: e.specs ? JSON.parse(e.specs) : null,
      })),
    });
  } catch (err) {
    console.error("[/api/admin/equipment GET] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/equipment
 * Body: { password, action, id?, data? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    const authCheck = await checkAdminPassword(password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "create": {
        const data = body.data || {};
        if (data.specs && typeof data.specs === "object") {
          data.specs = JSON.stringify(data.specs);
        }
        const created = await db.labEquipment.create({ data });
        return NextResponse.json({ ok: true, item: created });
      }
      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const data = { ...body.data };
        if (data.specs && typeof data.specs === "object") {
          data.specs = JSON.stringify(data.specs);
        }
        delete data.id; delete data.createdAt; delete data.updatedAt;
        const updated = await db.labEquipment.update({ where: { id }, data });
        return NextResponse.json({ ok: true, item: updated });
      }
      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.labEquipment.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }
      case "toggle": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const current = await db.labEquipment.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
        const updated = await db.labEquipment.update({
          where: { id },
          data: { visible: !current.visible },
        });
        return NextResponse.json({ ok: true, item: updated });
      }
      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/equipment POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
