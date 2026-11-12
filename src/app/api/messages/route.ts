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
    const password = ""; // V17.8: dead param removed

    const authCheck = await checkAdminAuth(req);
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
