// ============================================================================
// route.ts — v1.0
// GET/POST /api/admin/equipment — مدیریت دستگاه‌های آزمایشگاه (وضعیت، specs، visible)
// با tab محتوا قابل واگذاری است.
// ============================================================================

import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/equipment?password=xxx
 * Returns all lab equipment (including hidden).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = ""; // V17.8: dead param removed (checkAdminAuth ignores it)

    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/equipment"]); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const equipment = await db.labEquipment.findMany({ orderBy: { order: "asc" }, take: 300 }); // v1.1.2 (hardening): cap list size
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

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/equipment"]); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    // v1.1.1 (audit Q1/P5-G8): whitelist فیلدها + اعتبارسنجی specs JSON روی create/update
    // تک‌نمونه‌ای — هم‌تراز با bulk_import (قبلاً single save بدون validate بود و
    // specs خراب به‌صورت بی‌صدا null رندر می‌شد؛ id هم از کلاینت پذیرفته می‌شد)
    const sanitizeEquipment = (raw: any): Record<string, unknown> | null => {
      if (!raw || typeof raw !== "object") return null;
      const clean: Record<string, unknown> = {};
      if (raw.name !== undefined) clean.name = String(raw.name).slice(0, 200);
      if (raw.model !== undefined) clean.model = String(raw.model).slice(0, 200);
      if (raw.category !== undefined) clean.category = String(raw.category).slice(0, 100);
      if (raw.status !== undefined) clean.status = String(raw.status).slice(0, 100);
      if (raw.description !== undefined) clean.description = String(raw.description).slice(0, 5000);
      if (raw.visible !== undefined) clean.visible = Boolean(raw.visible);
      if (raw.order !== undefined) clean.order = Math.max(0, Number(raw.order) || 0);
      if (raw.specs !== undefined) {
        if (raw.specs && typeof raw.specs === "object") {
          clean.specs = JSON.stringify(raw.specs);
        } else if (typeof raw.specs === "string" && raw.specs.trim()) {
          try { JSON.parse(raw.specs); clean.specs = raw.specs.slice(0, 10000); }
          catch { return null; // invalid specs JSON
          }
        } else {
          clean.specs = "";
        }
      }
      return clean;
    };

    switch (action) {
      case "create": {
        const data = sanitizeEquipment(body.data) as any;
        if (!data) return NextResponse.json({ ok: false, error: "invalid_specs" }, { status: 400 });
        const created = await db.labEquipment.create({ data });
        return NextResponse.json({ ok: true, item: created });
      }
      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const data = sanitizeEquipment(body.data) as any;
        if (!data) return NextResponse.json({ ok: false, error: "invalid_specs" }, { status: 400 });
        let updated;
        try {
          updated = await db.labEquipment.update({ where: { id }, data });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
          }
          throw e;
        }
        return NextResponse.json({ ok: true, item: updated });
      }
      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        try {
          await db.labEquipment.delete({ where: { id } });
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
            // V17.6: فیلدها مطابق schema.prisma (LabEquipment مدل)
            const data: any = {
              name: String(item.name || ""),
              model: String(item.model || ""),
              category: String(item.category || "general"),
              status: String(item.status || "online"),
              description: String(item.description || ""),
              visible: Boolean(item.visible ?? true),
              order: Number(item.order) || 0,
            };
            // specs — اگه object هست stringify کن
            if (item.specs && typeof item.specs === "object") {
              data.specs = JSON.stringify(item.specs);
            } else if (item.specs && typeof item.specs === "string") {
              // اعتبارسنجی JSON
              try { JSON.parse(item.specs); data.specs = item.specs; }
              catch { failed++; errors.push(`invalid specs JSON for ${data.name}`); continue; }
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
