import { checkAdminPassword } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * POST /api/admin/clear
 * Body: { password, target: "chat_session"|"chat_all"|"message"|"message_all", id? }
 * Clears/deletes chat sessions or contact messages.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    const authCheck = await checkAdminPassword(password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const target = String(body.target || "");
    const id = String(body.id || "");

    switch (target) {
      case "chat_session": {
        // Delete a specific chat session + all its messages
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.chatMessage.deleteMany({ where: { sessionId: id } });
        await db.chatSession.delete({ where: { id } });
        return NextResponse.json({ ok: true, message: "Chat session deleted" });
      }

      case "chat_all": {
        // Delete ALL chat sessions + messages
        await db.chatMessage.deleteMany({});
        await db.chatSession.deleteMany({});
        return NextResponse.json({ ok: true, message: "All chats cleared" });
      }

      case "message": {
        // Delete a specific contact message + replies + notes + tags
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.messageReply.deleteMany({ where: { messageId: id } });
        await db.messageNote.deleteMany({ where: { messageId: id } });
        await db.messageTagRelation.deleteMany({ where: { messageId: id } });
        await db.contactMessage.delete({ where: { id } });
        return NextResponse.json({ ok: true, message: "Message deleted" });
      }

      case "message_all": {
        // Delete ALL contact messages + replies + notes
        await db.messageReply.deleteMany({});
        await db.messageNote.deleteMany({});
        await db.messageTagRelation.deleteMany({});
        await db.contactMessage.deleteMany({});
        return NextResponse.json({ ok: true, message: "All messages cleared" });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_target" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/clear]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
