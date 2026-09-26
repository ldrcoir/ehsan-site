import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /rss.xml
 * RSS feed for articles.
 */
export async function GET() {
  try {
    const articles = await db.article.findMany({
      where: { visible: true },
      orderBy: { date: "desc" },
      take: 20,
    });

    // V17.5: siteUrl از env (نه placeholder)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ehsanmorad.ir";

    const items = articles.map(a => `    <item>
      <title>${escapeXml(a.titleEn)}</title>
      <link>${siteUrl}/#articles</link>
      <description>${escapeXml(a.summaryEn || "")}</description>
      <category>${escapeXml(a.typeEn || "Article")}</category>
      <pubDate>${new Date(a.date + "-01").toUTCString()}</pubDate>
      <guid>${a.id}</guid>
    </item>`).join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(PERSONAL.fullName.en)} — Articles</title>
    <link>${siteUrl}</link>
    <description>Latest articles and papers</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

    return new NextResponse(rss, {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/rss.xml] error:", err);
    return new NextResponse("<!-- rss error -->", { status: 500 });
  }
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] || c));
}
