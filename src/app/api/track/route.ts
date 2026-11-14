import { NextResponse } from "next/server";
import { getClientIpSafe } from "@/lib/ip";
import { isIpBlocked } from "@/lib/security";
import { db } from "@/lib/db";
import crypto from "crypto";

/**
 * POST /api/track
 * Body: { path, referrer, lang }
 * Records a page view for analytics.
 *
 * v1.1 (security pass 2) — abuse hardening:
 *  - route-level rate limit (10/min/IP) — قبلاً فقط middleware limit بود که با
 *    چرخش هدر قابل دورزدن بود
 *  - dedup: یک بازدید به‌ازای هر (IP+UA+path) در هر ۳۰ دقیقه — جلوگیری از
 *    تورم آمار بازدید پنل ادمین و پر شدن دیسک SQLite
 *  - شمارنده global فقط بعد از dedup و به‌صورت atomic (prisma increment)
 */

const TRACK_WINDOW_MS = 60 * 1000;
const TRACK_MAX_PER_WINDOW = 10;
const DEDUP_WINDOW_MS = 30 * 60 * 1000;

// (ip + path) → expiry
const recentKeys = new Map<string, number>();
// ip → [timestamps]
const trackHits = new Map<string, number[]>();

function sweep(now: number) {
  for (const [k, exp] of recentKeys) if (exp < now) recentKeys.delete(k);
  for (const [k, arr] of trackHits) {
    const kept = arr.filter(t => now - t < TRACK_WINDOW_MS);
    if (kept.length === 0) trackHits.delete(k);
    else trackHits.set(k, kept);
  }
}

export async function POST(req: Request) {
  try {
    // v1.1.2 (audit CODE-02): req.json() می‌تواند null برگرداند (بدنه‌ی JSON literal "null")
    // — در این حالت body.path پرتاب می‌شد و به‌جای {ok:true,tracked:false} خطای 500 می‌داد.
    const body = (await req.json().catch(() => null)) ?? {};
    const rawIp = getClientIpSafe(req);
    const ip = rawIp === "unknown" ? null : rawIp;
    // v1.0 (audit W16-20 #3): IPهای مسدودشده دیگر PageView تولید نمی‌کنند —
    // قبلاً فقط login و chat چک می‌شد و BlockedIp می‌توانست analytics را آلوده کند
    if (ip && (await isIpBlocked(ip))) {
      return NextResponse.json({ ok: true, tracked: false });
    }
    // v1.1.2 (audit SEC-06): clamp طول user-agent — هدر تا 16KB می‌تواند باشد
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 300) || null;
    const now = Date.now();

    // Don't track bots
    if (userAgent && /bot|crawl|spider|slurp/i.test(userAgent) && userAgent.length < 80) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    // v1.1: route-level rate limit (10/min/IP)
    const hits = (trackHits.get(rawIp) || []).filter(t => now - t < TRACK_WINDOW_MS);
    if (hits.length >= TRACK_MAX_PER_WINDOW) {
      return NextResponse.json({ ok: true, tracked: false });
    }
    hits.push(now);
    trackHits.set(rawIp, hits);
    if ((recentKeys.size + trackHits.size) % 500 === 0) sweep(now);

    // validate + clamp inputs
    const rawPath = body.path;
    const path =
      typeof rawPath === "string" && rawPath.startsWith("/") && rawPath.length <= 200
        ? rawPath
        : "/";
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 200) : null;
    const lang = typeof body.lang === "string" ? body.lang.slice(0, 200) : null;

    // v1.1: dedup per (IP + UA + path) در پنجره‌ی ۳۰ دقیقه
    const dedupKey = `${rawIp}|${crypto
      .createHash("sha256")
      .update(userAgent || "")
      .digest("hex")
      .slice(0, 12)}|${path}`;
    const lastSeen = recentKeys.get(dedupKey);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
      return NextResponse.json({ ok: true, tracked: false, deduped: true });
    }
    recentKeys.set(dedupKey, now + DEDUP_WINDOW_MS);
    if (recentKeys.size > 20000) sweep(now);

    await db.pageView.create({
      data: {
        path,
        referrer,
        lang,
        ip,
        userAgent,
      },
    });

    // v1.1: فقط بازدید dedup-shده شمرده می‌شه
    // v1.1.1 (audit Q4): increment اتمیک — قبلاً read-modify-write بود و با درخواست‌های
    // همزمان lost-update داشت؛ حالا در یک SQL اتمیک انجام می‌شود
    try {
      await db.$executeRaw`
        INSERT INTO SiteSetting (key, value, updatedAt)
        VALUES ('visitorCount', '1', ${new Date()})
        ON CONFLICT(key) DO UPDATE SET
          value = CAST(CAST(SiteSetting.value AS INTEGER) + 1 AS TEXT),
          updatedAt = ${new Date()}
      `;
    } catch {}

    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
