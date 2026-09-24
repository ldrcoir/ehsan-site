import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

/**
 * GET /api/messages?password=xxx
 * Returns contact messages with CRM data (tags, notes, replies, status).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    const authCheck = await checkAdminAuth(req, password);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const [messages, chatCount, totalChats, tags] = await Promise.all([
      db.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          replies: { select: { id: true, reply: true, createdAt: true } },
          notes: { select: { id: true, note: true, createdAt: true } },
          tags: { include: { tag: true } },
        },
      }),
      db.chatMessage.count({ where: { role: "user" } }),
      db.chatSession.count(),
      db.messageTag.findMany(),
    ]);

    return NextResponse.json({
      ok: true,
      messages: messages.map(m => ({
        ...m,
        tags: m.tags.map(t => t.tag),
      })),
      tags,
      stats: {
        contactMessages: messages.length,
        chatMessages: chatCount,
        chatSessions: totalChats,
      },
    });
  } catch (err) {
    console.error("[/api/messages] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/messages
 * Body: { password, action, messageId, data? }
 * Actions: "set_status", "add_tag", "remove_tag", "add_note", "create_tag"
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const password = String(body.password || "");
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    const messageId = String(body.messageId || "");

    switch (action) {
      case "set_status": {
        if (!messageId) {
          return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        }
        const status = String(body.status || "new");
        const updated = await db.contactMessage.update({
          where: { id: messageId },
          data: { status },
        });
        return NextResponse.json({ ok: true, message: updated });
      }

      case "add_tag": {
        const tagId = String(body.tagId || "");
        if (!messageId || !tagId) {
          return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
        }
        await db.messageTagRelation.upsert({
          where: { messageId_tagId: { messageId, tagId } },
          update: {},
          create: { messageId, tagId },
        });
        return NextResponse.json({ ok: true });
      }

      case "remove_tag": {
        const tagId = String(body.tagId || "");
        if (!messageId || !tagId) {
          return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
        }
        await db.messageTagRelation.delete({
          where: { messageId_tagId: { messageId, tagId } },
        });
        return NextResponse.json({ ok: true });
      }

      case "add_note": {
        if (!messageId) {
          return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        }
        const note = String(body.note || "").trim().slice(0, 2000);
        if (!note) {
          return NextResponse.json({ ok: false, error: "empty_note" }, { status: 400 });
        }
        const created = await db.messageNote.create({
          data: { messageId, note },
        });
        return NextResponse.json({ ok: true, note: created });
      }

      case "create_tag": {
        const name = String(body.name || "").trim();
        const color = String(body.color || "#00ff41");
        if (!name) {
          return NextResponse.json({ ok: false, error: "empty_name" }, { status: 400 });
        }
        const tag = await db.messageTag.create({
          data: { name, color },
        });
        return NextResponse.json({ ok: true, tag });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/messages POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
