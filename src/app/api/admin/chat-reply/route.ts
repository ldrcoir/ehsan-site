import { checkAdminPassword } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * POST /api/admin/chat-reply
 * Body: { password, sessionId, reply }
 * Injects admin's reply into an AI chat session as an assistant message.
 * The visitor will see it when they next load/reload the chat.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const password = String(body.password || "");
    const authCheck = await checkAdminPassword(password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const sessionId = String(body.sessionId || "");
    const replyText = String(body.reply || "").trim().slice(0, 5000);

    if (!sessionId || !replyText) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const session = await db.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "session_not_found" },
        { status: 404 }
      );
    }

    const msg = await db.chatMessage.create({
      data: { sessionId, role: "assistant", content: replyText },
    });

    await db.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      messageId: msg.id,
      savedAt: msg.createdAt,
    });
  } catch (err) {
    console.error("[/api/admin/chat-reply] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
