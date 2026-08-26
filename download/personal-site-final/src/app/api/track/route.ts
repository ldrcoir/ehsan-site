import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/track
 * Body: { path, referrer, lang }
 * Records a page view for analytics.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    // Don't track bots
    if (userAgent && /bot|crawl|spider|slurp/i.test(userAgent) && userAgent.length < 80) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    await db.pageView.create({
      data: {
        path: String(body.path || "/"),
        referrer: body.referrer || null,
        lang: body.lang || null,
        ip,
        userAgent,
      },
    });

    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
