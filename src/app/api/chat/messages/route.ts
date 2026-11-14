import { NextResponse } from "next/server";
import { getClientIpSafe } from "@/lib/ip";
import { db } from "@/lib/db";
// FIX-2: مسدودسازی IP برای مسیر بازدیدکننده (named export — security.ts no default export)
import { isIpBlocked } from "@/lib/security";

// V17.9: rate limit برای /api/chat/messages (جلوگیری از IDOR brute-force)
const msgRateLimit = new Map<string, number[]>();
const MSG_RATE_WINDOW = 60 * 1000;
const MSG_RATE_MAX = 20;

// FIX-2: سقف سخت روی تعداد کلیدهای Map — جلوگیری از memory-DoS با چرخش IP بین
// دو پاکسازی دوره‌ای (سبک eviction مشابه src/middleware.ts checkRateLimit)
const MSG_RATE_MAP_MAX = 10000;
const MSG_RATE_EVICT_BATCH = 2000;

function evictMsgRateLimit(): void {
  if (msgRateLimit.size < MSG_RATE_MAP_MAX) return;
  const now = Date.now();
  // ۱) اول کلیدهای کاملاً منقضی را حذف کن (مثل middleware)
  for (const [k, arr] of msgRateLimit) {
    if (!arr.some((t) => now - t < MSG_RATE_WINDOW)) {
      msgRateLimit.delete(k);
      if (msgRateLimit.size < MSG_RATE_MAP_MAX) return;
    }
  }
  // ۲) هنوز پر است → قدیمی‌ترین ~۲۰۰۰ کلید را حذف کن (Map ترتیب درج را نگه می‌دارد)
  const oldest = Array.from(msgRateLimit.keys()).slice(0, MSG_RATE_EVICT_BATCH);
  for (const k of oldest) msgRateLimit.delete(k);
}

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
    // v1.1.1 (audit S2-L3/S6-L1): rate limit قبل از هر DB lookup — قبلاً
    // findUnique اول اجرا می‌شد و درخواست‌های نامعتبر DB را بی‌ throttle می‌خواندند
    const ip = getClientIpSafe(req);
    const now = Date.now();
    const arr = (msgRateLimit.get(ip) || []).filter(t => now - t < MSG_RATE_WINDOW);
    if (arr.length >= MSG_RATE_MAX) {
      return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
    }
    arr.push(now);
    if (!msgRateLimit.has(ip)) evictMsgRateLimit();
    msgRateLimit.set(ip, arr);

    // FIX-2: مسیر بازدیدکننده (GET poll) — قبل از هر DB lookup چک کن IP مسدود نشده باشد.
    // این route فقط مسیر visitor دارد (ادمین از /api/chat GET با checkAdminAuth می‌گذرد).
    if (ip && (await isIpBlocked(ip))) {
      return NextResponse.json({ ok: false, error: "ip_blocked" }, { status: 403 });
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId") || "";
    const since = url.searchParams.get("since") || "0";

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing_session" }, { status: 400 });
    }

    // V18.0: session ownership check — فقط پیام‌های session خودت رو می‌تونی بخونی
    // V18.1: visitorId اجباری شد (قبلاً empty visitorId check رو bypass می‌کرد)
    const reqVisitorId = url.searchParams.get("visitorId") || "";
    if (!reqVisitorId) {
      return NextResponse.json({ ok: false, error: "missing_visitor_id" }, { status: 400 });
    }
    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      select: { visitorId: true },
    });
    if (!session) {
      return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
    }
    // V18.1: ownership check — visitorId باید مطابق باشه (fail-closed)
    if (session.visitorId !== reqVisitorId) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

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
