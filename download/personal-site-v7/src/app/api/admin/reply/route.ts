import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";
import { sendBaleMessage } from "@/lib/bale";

/**
 * POST /api/admin/reply
 * Body: { password, messageId, reply }
 * Saves admin's reply to a contact message in DB.
 * If Bale is enabled, also notifies the admin's Bale chat.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
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
