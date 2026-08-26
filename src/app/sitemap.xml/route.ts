import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /sitemap.xml
 * XML sitemap for SEO.
 */
export async function GET() {
  const siteUrl = "https://your-domain.com";

  const [articles, tutorials, books] = await Promise.all([
    db.article.findMany({ where: { visible: true }, select: { id: true, date: true } }),
    db.tutorial.findMany({ where: { visible: true }, select: { id: true } }),
    db.book.findMany({ where: { visible: true }, select: { id: true } }),
  ]);

  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "weekly" },
    { url: "/#about", priority: "0.8", changefreq: "monthly" },
    { url: "/#skills", priority: "0.8", changefreq: "monthly" },
    { url: "/#books", priority: "0.8", changefreq: "monthly" },
    { url: "/#articles", priority: "0.9", changefreq: "weekly" },
    { url: "/#tutorials", priority: "0.9", changefreq: "weekly" },
    { url: "/#chat", priority: "0.6", changefreq: "monthly" },
    { url: "/#contact", priority: "0.6", changefreq: "monthly" },
  ];

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
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
