import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /sitemap.xml
 * XML sitemap for SEO.
 * v1.1.1 (audit P2-G12/P5-G12):
 *   - بخش‌های مخفی‌شده از پنل (section.<name>.visible=false) دیگر در sitemap
 *     تبلیغ نمی‌شوند — قبلاً لیست ثابت بود و بخش مخفی را به موتور جست‌وجو نشان می‌داد
 *   - queryهای مرده (articles/tutorials/books که استفاده نمی‌شدند) حذف شدند
 */
export async function GET() {
  try {
    // V17.5: siteUrl از env متغیر (نه hardcoded placeholder)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ehsanmorad.ir";

    const settings = await db.siteSetting.findMany({
      where: { key: { startsWith: "section." } },
    });
    const isVisible = (section: string): boolean => {
      const row = settings.find(s => s.key === `section.${section}.visible`);
      return row ? row.value !== "false" : true; // default: visible
    };

    const candidates: { url: string; section: string; priority: string; changefreq: string }[] = [
      { url: "/", section: "hero", priority: "1.0", changefreq: "weekly" },
      { url: "/#about", section: "about", priority: "0.8", changefreq: "monthly" },
      { url: "/#skills", section: "skills", priority: "0.8", changefreq: "monthly" },
      { url: "/#books", section: "books", priority: "0.8", changefreq: "monthly" },
      { url: "/#articles", section: "articles", priority: "0.9", changefreq: "weekly" },
      { url: "/#tutorials", section: "tutorials", priority: "0.9", changefreq: "weekly" },
      { url: "/#chat", section: "chat", priority: "0.6", changefreq: "monthly" },
      { url: "/#contact", section: "contact", priority: "0.6", changefreq: "monthly" },
      { url: "/clips", section: "clips", priority: "0.7", changefreq: "weekly" },
    ];

    const staticPages = candidates.filter(p => isVisible(p.section));

    const urls = staticPages.map(p => `  <url>
    <loc>${siteUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new NextResponse(xml, {
      // v1.1.2: no-store — sitemap DB-driven است و نباید cache کهنه سرو شود
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[/sitemap.xml] error:", err);
    return new NextResponse("<!-- sitemap error -->", { status: 500 });
  }
}
