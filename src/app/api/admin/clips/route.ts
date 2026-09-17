// ============================================================================
// /api/admin/clips — مدیریت کلیپ‌های آپارات (با session ادمین)
// ============================================================================
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminSession } from "@/lib/admin-session";

// GET — لیست همه کلیپ‌ها (including hidden) — فقط ادمین
export async function GET(req: NextRequest) {
  try {
    const authCheck = await checkAdminSession(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const clips = await db.aparatClip.findMany({
      orderBy: { order: "asc" },
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
    const authCheck = await checkAdminSession(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = String(body.action || "");

    if (action === "create") {
      const clip = await db.aparatClip.create({
        data: {
          title: String(body.title || ""),
          embedCode: String(body.embedCode || ""),
          description: String(body.description || ""),
          category: String(body.category || "general"),
          visible: body.visible !== false,
          order: Number(body.order) || 0,
        },
      });
      return NextResponse.json({ ok: true, clip });
    }

    if (action === "update") {
      const clip = await db.aparatClip.update({
        where: { id: String(body.id) },
        data: {
          title: String(body.title || ""),
          embedCode: String(body.embedCode || ""),
          description: String(body.description || ""),
          category: String(body.category || "general"),
          visible: body.visible !== false,
          order: Number(body.order) || 0,
        },
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
    const authCheck = await checkAdminSession(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await db.aparatClip.delete({
      where: { id: String(body.id) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/admin/clips DELETE]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
