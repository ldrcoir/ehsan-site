import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/admin/clear
 * Body: { password, target: "chat_session"|"chat_all"|"message"|"message_all"|"chat_message"|"stats", id? }
 * Clears/deletes chat sessions, single chat messages, contact messages, or analytics stats.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    // v1.0 (audit W16-20 #1 / W21-25 #2 — HIGH): قبلاً کل route با تب «messages» گارد می‌شد،
    // یعنی کاربر limited با فقط permission پیام‌ها می‌توانست chat_* (تب ادمین-only چت‌ها)
    // و stats (تب ادمین-only آمار) را پاک کند — overgrant. حالا target-by-target:
    //   - message/message_all → تب messages (قابل واگذاری)
    //   - chat_session/chat_all/chat_message/stats → بدون requiredTab (فقط ادمین)
    const target0 = String(body.target || "");
    const ADMIN_ONLY_TARGETS = new Set(["chat_session", "chat_all", "chat_message", "stats"]);
    const authCheck = await checkAdminAuth(
      req,
      ADMIN_ONLY_TARGETS.has(target0) ? undefined : TAB_PERMISSIONS["/api/messages"]
    ); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const target = target0;
    const id = String(body.id || "");

    switch (target) {
      case "chat_session": {
        // Delete a specific chat session + all its messages
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.chatMessage.deleteMany({ where: { sessionId: id } });
        // v1.1.2 (hardening): delete → deleteMany so a stale/double delete returns ok instead of P2025 → 500
        await db.chatSession.deleteMany({ where: { id } });
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
        // v1.1.2 (hardening): delete → deleteMany so a stale/double delete returns ok instead of P2025 → 500
        await db.contactMessage.deleteMany({ where: { id } });
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

      case "chat_message": {
        // v1.1.2 (hardening): delete a single chat message by id
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await db.chatMessage.deleteMany({ where: { id } });
        return NextResponse.json({ ok: true, message: "Chat message deleted" });
      }

      case "stats": {
        // v1.1.2 (hardening): clear analytics (page views) — keeps response shape consistent
        await db.pageView.deleteMany({});
        return NextResponse.json({ ok: true, message: "Analytics stats cleared" });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_target" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/clear]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
