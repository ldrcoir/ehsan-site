import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

/**
 * GET /api/messages
 * Returns contact messages with CRM data (tags, notes, replies, status).
 *
 * POST /api/messages
 * v1.1.1 (audit P1-G2): تغییر وضعیت پیام — Body: { action: "set_status", id, status }
 * status ∈ new|read|replied|archived (مطابق schema). فقط ادمین.
 */
export async function GET(req: Request) {
  try {
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

// v1.1.1 (audit P1-G2): set_status — ContactMessage.status در schema بود ولی
// هیچ مسیری برای تغییرش وجود نداشت (پیام‌ها برای همیشه "new" می‌ماندند)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const authCheck = await checkAdminAuth(req);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    if (action !== "set_status") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    const id = String(body.id || "");
    const status = String(body.status || "");
    const VALID = new Set(["new", "read", "replied", "archived"]);
    if (!id || !VALID.has(status)) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const existing = await db.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "message_not_found" }, { status: 404 });
    }

    await db.contactMessage.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[/api/messages POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
