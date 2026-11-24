// ============================================================================
// /api/admin/clips — مدیریت کلیپ‌های آپارات (با session ادمین)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";
import { sanitizeEmbed } from "@/lib/sanitize-embed";

// GET — لیست همه کلیپ‌ها (including hidden) — فقط ادمین
export async function GET(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/clips"]);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const clips = await db.aparatClip.findMany({
      orderBy: { order: "asc" },
      take: 200, // v1.0 rev3 (audit SEC-a LOW): هم‌مثل بقیه‌ی لیست‌ها
    });

    return NextResponse.json({ ok: true, clips });
  } catch (e) {
    console.error("[/api/admin/clips GET]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// POST — ساخت یا ویرایش کلیپ — فقط ادمین
export async function POST(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/clips"]);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = String(body.action || "");

    if (action === "create") {
      // v1.1 (robustness): embedCode در زمان نوشتن sanitize می‌شود — embed غیرمجاز
      // که قبلاً بی‌صدا ذخیره و بعد رندرِ خالی می‌شد، حالا با خطای شفاف رد می‌شود
      const rawEmbed = String(body.embedCode || "");
      const safeEmbed = sanitizeEmbed(rawEmbed);
      // v1.0 (audit W16-20 #7): create بدون embed قبلاً کلیپ خالی می‌ساخت (UI required است ولی API نه)
      if (!safeEmbed) {
        return NextResponse.json(
          { ok: false, error: "invalid_embed", detail: "Only Aparat/YouTube/Vimeo iframes are accepted" },
          { status: 400 }
        );
      }
      const clip = await db.aparatClip.create({
        data: {
          title: String(body.title || "").slice(0, 200),
          embedCode: safeEmbed,
          description: String(body.description || "").slice(0, 2000),
          category: String(body.category || "general").slice(0, 60),
          visible: body.visible !== false,
          order: Math.max(0, Number(body.order) || 0),
        },
      });
      return NextResponse.json({ ok: true, clip });
    }

    if (action === "update") {
      // v1.1.2 (hardening): id was passed through String() blindly — missing id
      // became "undefined" → Prisma error 500; stale id → P2025 → 500.
      if (!body?.id) {
        return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
      }
      const existing = await db.aparatClip.findUnique({ where: { id: String(body.id) } });
      if (!existing) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      const rawEmbed = String(body.embedCode || "");
      const safeEmbed = sanitizeEmbed(rawEmbed);
      // v1.0 (audit W16-20 #7): create بدون embed قبلاً کلیپ خالی می‌ساخت (UI required است ولی API نه)
      if (!safeEmbed) {
        return NextResponse.json(
          { ok: false, error: "invalid_embed", detail: "Only Aparat/YouTube/Vimeo iframes are accepted" },
          { status: 400 }
        );
      }
      // v1.1.1 (audit P5-G7): update patch-semantics — قبلاً full-replace بود و
      // ذخیره بدون embedCode، embed را خالی و order را صفر می‌کرد
      const data: Record<string, unknown> = {};
      if (body.title !== undefined) data.title = String(body.title).slice(0, 200);
      if (rawEmbed) data.embedCode = safeEmbed;
      if (body.description !== undefined) data.description = String(body.description).slice(0, 2000);
      if (body.category !== undefined) data.category = String(body.category).slice(0, 60);
      if (body.visible !== undefined) data.visible = Boolean(body.visible);
      if (body.order !== undefined) data.order = Math.max(0, Number(body.order) || 0);
      const clip = await db.aparatClip.update({
        where: { id: String(body.id) },
        data,
      });
      return NextResponse.json({ ok: true, clip });
    }

    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (e) {
    console.error("[/api/admin/clips POST]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// DELETE — حذف کلیپ — فقط ادمین
export async function DELETE(req: NextRequest) {
  try {
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/clips"]);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // v1.1.2 (hardening): missing id → 400, stale id (P2025) → 404 instead of 500
    if (!body?.id) {
      return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });
    }
    try {
      await db.aparatClip.delete({
        where: { id: String(body.id) },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/admin/clips DELETE]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
