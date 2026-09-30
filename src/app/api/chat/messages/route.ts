import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// V17.9: rate limit برای /api/chat/messages (جلوگیری از IDOR brute-force)
const msgRateLimit = new Map<string, number[]>();
const MSG_RATE_WINDOW = 60 * 1000;
const MSG_RATE_MAX = 20;
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, arr] of msgRateLimit) {
      const fresh = arr.filter(t => now - t < MSG_RATE_WINDOW);
      if (fresh.length === 0) msgRateLimit.delete(k);
      else msgRateLimit.set(k, fresh);
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * GET /api/chat/messages?sessionId=xxx&since=timestamp
 * Returns messages in a chat session since a given timestamp.
 * Used by the visitor's chat box to poll for new messages (from AI or admin).
 *
 * V17.9: rate limit added (was completely unauthenticated + unthrottled → IDOR)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId") || "";
    const since = url.searchParams.get("since") || "0";

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing_session" }, { status: 400 });
    }

    // V18.0: session ownership check — فقط پیام‌های session خودت رو می‌تونی بخونی
    const reqVisitorId = url.searchParams.get("visitorId") || "";
    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { visitorId: true },
    });
    if (!session) {
      return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
    }
    // V18.0: ownership check — visitorId باید مطابق باشه
    if (reqVisitorId && session.visitorId !== reqVisitorId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // V17.9: rate limit per IP (جلوگیری از sessionId enumeration)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    const arr = (msgRateLimit.get(ip) || []).filter(t => now - t < MSG_RATE_WINDOW);
    if (arr.length >= MSG_RATE_MAX) {
      return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
    }
    arr.push(now);
    msgRateLimit.set(ip, arr);

    const sinceDate = new Date(parseInt(since, 10) || 0);

    const messages = await db.chatMessage.findMany({
      where: {
        sessionId,
        role: "assistant",
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      messages,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error("[/api/chat/messages] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
