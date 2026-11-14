import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";

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
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/messages"]);
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

    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/messages"]);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    if (action !== "set_status" && action !== "add_note" && action !== "set_tags") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const existing = await db.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "message_not_found" }, { status: 404 });
    }

    // v1.0 (audit W16-20 #2): مدیریت note و tag — مدل‌های MessageNote/MessageTag
    // از قبل در schema بودند و GET آن‌ها را برمی‌گرداند، ولی هیچ مسیر نوشتنی و
    // هیچ UIای نداشتند (داده‌های مرده). حالا ادمین می‌تواند یادداشت بگذارد و تگ بزند.
    if (action === "add_note") {
      const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
      if (!note) {
        return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
      }
      await db.messageNote.create({ data: { messageId: id, note } });
      return NextResponse.json({ ok: true });
    }

    if (action === "set_tags") {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json({ ok: false, error: "invalid_tags" }, { status: 400 });
      }
      // حداکثر ۸ تگ، هر نام ≤ ۳۰ کاراکتر، خالی‌ها/تکراری‌ها حذف
      const names = [...new Set<string>(
        body.tags
          .map((t: unknown) => String(t).trim().slice(0, 30))
          .filter((t: string) => t.length > 0)
      )].slice(0, 8);

      // ارتباط‌های فعلی حذف و با لیست جدید جایگزین می‌شود (tags حذف نمی‌شوند —
      // ممکن است پیام‌های دیگر از آن‌ها استفاده کنند). اول upsert تگ‌ها، بعد
      // ساخت ارتباط با tagId (unchecked input — ترکیب messageId + relation
      // در یک create مجاز نیست).
      const tagRows = await db.$transaction(
        names.map(name =>
          db.messageTag.upsert({ where: { name }, create: { name }, update: {} })
        )
      );
      await db.$transaction([
        db.messageTagRelation.deleteMany({ where: { messageId: id } }),
        ...tagRows.map(t =>
          db.messageTagRelation.create({ data: { messageId: id, tagId: t.id } })
        ),
      ]);
      return NextResponse.json({ ok: true, tags: names });
    }

    const status = String(body.status || "");
    const VALID = new Set(["new", "read", "replied", "archived"]);
    if (!VALID.has(status)) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    await db.contactMessage.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[/api/messages POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
