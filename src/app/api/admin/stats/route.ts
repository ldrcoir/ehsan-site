import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = ""; // V17.8: dead param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalViews, viewsToday, viewsWeek, topPages, recentViews, contactCount, chatCount, chatMsgCount, tutorialCount, bookCount, articleCount] = await Promise.all([
      db.pageView.count(),
      db.pageView.count({ where: { createdAt: { gte: dayAgo } } }),
      db.pageView.count({ where: { createdAt: { gte: weekAgo } } }),
      db.pageView.groupBy({ by: ["path"], _count: true, orderBy: { _count: { path: "desc" } }, take: 10 }),
      db.pageView.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { path: true, referrer: true, lang: true, createdAt: true } }),
      db.contactMessage.count(),
      db.chatSession.count(),
      db.chatMessage.count({ where: { role: "user" } }),
      db.tutorial.count(),
      db.book.count(),
      db.article.count(),
    ]);

    // v1.2: Top referrers — PageView.referrer is nullable in the schema
    // (prisma/schema.prisma: `referrer String?`), so exclude null AND empty
    // strings, group, and take the top 10. Wrapped in its own try/catch so a
    // groupBy failure never breaks the whole stats response (→ empty array).
    let topReferrers: { referrer: string; count: number }[] = [];
    try {
      const referrerAgg = await db.pageView.groupBy({
        by: ["referrer"],
        _count: { referrer: true },
        where: { referrer: { not: null, notIn: [""] } },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      });
      topReferrers = referrerAgg.map(r => ({ referrer: r.referrer ?? "", count: r._count.referrer }));
    } catch (refErr) {
      console.error("[/api/admin/stats] topReferrers groupBy failed:", refErr);
      topReferrers = [];
    }

    return NextResponse.json({
      ok: true,
      stats: { totalViews, viewsToday, viewsWeek, topPages, recentViews, topReferrers, contactCount, chatCount, chatMsgCount, tutorialCount, bookCount, articleCount },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
