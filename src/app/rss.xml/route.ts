import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /rss.xml
 * RSS feed for articles.
 * v1.1.1 (audit P2): عنوان کانال از DB (name_en) خوانده می‌شود — قبلاً همیشه
 * "Your Name — Articles" استاتیک بود و تغییر نام سایت از پنل در RSS دیده نمی‌شد.
 */
export async function GET() {
  try {
    const [articles, nameRow] = await Promise.all([
      db.article.findMany({
        where: { visible: true },
        orderBy: { date: "desc" },
        take: 20,
      }),
      db.siteSetting.findUnique({ where: { key: "name_en" } }),
    ]);

    // V17.5: siteUrl از env (نه placeholder)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ehsanmorad.ir";
    const siteName = nameRow?.value || PERSONAL.fullName.en;

    const items = articles.map(a => {
      // v1.1.1 (audit P5-G11): pubDate امن — date malformed → Invalid Date نمی‌سازد
      const parsed = new Date(`${a.date}-01T00:00:00Z`);
      const pubDate = isNaN(parsed.getTime()) ? "" : parsed.toUTCString();
      return `    <item>
      <title>${escapeXml(a.titleEn)}</title>
      <link>${siteUrl}/#articles</link>
      <description>${escapeXml(a.summaryEn || "")}</description>
      <category>${escapeXml(a.typeEn || "Article")}</category>
      <pubDate>${pubDate}</pubDate>
      <guid>${a.id}</guid>
    </item>`;
    }).join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteName)} — Articles</title>
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
