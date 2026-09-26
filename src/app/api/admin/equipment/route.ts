import { checkAdminAuth } from "@/lib/admin-auth";
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

    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const equipment = await db.labEquipment.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({
      ok: true,
      items: equipment.map(e => {
        // Safe JSON parse — اگر specs خراب باشه، null برمی‌گردونه
        let specs: any = null;
        if (e.specs) {
          try { specs = JSON.parse(e.specs); }
          catch { specs = null; /* در صورت خرابی، null بده نه 500 */ }
        }
        return { ...e, specs };
      }),
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
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
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
      case "bulk_import": {
        const items = Array.isArray(body.items) ? body.items : [];
        let created = 0;
        let failed = 0;
        const errors: string[] = [];
        for (const item of items) {
          try {
            const data: any = {
              nameFa: String(item.nameFa || ""),
              nameEn: String(item.nameEn || ""),
              nameDe: String(item.nameDe || ""),
              brand: String(item.brand || ""),
              model: String(item.model || ""),
              visible: Boolean(item.visible ?? true),
              order: Number(item.order) || 0,
            };
            // specs — اگه object هست stringify کن
            if (item.specs && typeof item.specs === "object") {
              data.specs = JSON.stringify(item.specs);
            } else if (item.specs && typeof item.specs === "string") {
              // اعتبارسنجی JSON
              try { JSON.parse(item.specs); data.specs = item.specs; }
              catch { failed++; errors.push(`invalid specs JSON for ${data.nameFa || data.nameEn}`); continue; }
            }
            await db.labEquipment.create({ data });
            created++;
          } catch (e: any) {
            failed++;
            errors.push(e?.message || "unknown");
          }
        }
        return NextResponse.json({ ok: true, created, failed, total: items.length, errors: errors.slice(0, 10) });
      }
      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/equipment POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
