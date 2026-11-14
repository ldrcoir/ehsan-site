import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/admin/reply
 * Body: { password, messageId, reply }
 * Saves admin's reply to a contact message in DB.
 * If Bale is enabled, also notifies the admin's Bale chat.
 */
export async function POST(req: Request) {
  try {
    // v1.1.2 (audit SEC-16-L): سقف حجم بدنه قبل از parse — clamp متن بعداً انجام می‌شود
    const cl = parseInt(req.headers.get("content-length") || "0", 10);
    if (cl > 64 * 1024) {
      return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/messages"]); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const messageId = String(body.messageId || "");
    const replyText = String(body.reply || "").trim().slice(0, 5000);

    if (!messageId || !replyText) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const original = await db.contactMessage.findUnique({ where: { id: messageId } });
    if (!original) {
      return NextResponse.json(
        { ok: false, error: "message_not_found" },
        { status: 404 }
      );
    }

    const saved = await db.messageReply.create({
      data: { messageId, reply: replyText },
    });

    // v1.1.1 (audit Q4/P1): lifecycle وضعیت پیام — بعد از پاسخ ادمین، status به
    // "replied" می‌رود (قبلاً هیچ کدی هرگز status را عوض نمی‌کرد و همه پیام‌ها
    // برای همیشه "new" می‌ماندند)
    await db.contactMessage.update({
      where: { id: messageId },
      data: { status: "replied" },
    });

    return NextResponse.json({
      ok: true,
      replyId: saved.id,
      savedAt: saved.createdAt,
    });
  } catch (err) {
    console.error("[/api/admin/reply] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
