import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/content
 * Public endpoint — returns all visible content for the site.
 * Including site texts (all languages) so the frontend can display them.
 */
export async function GET() {
  try {
    const [books, articles, tutorials, skills, instructions, equipment, navItems, texts, settings] = await Promise.all([
      db.book.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.article.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.tutorial.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.skill.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.aiInstruction.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
      db.labEquipment.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.navItem.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.siteText.findMany(),
      db.siteSetting.findMany(),
    ]);

    // تبدیل متن‌ها به فرمت مناسب برای frontend
    // برای هر زبان، یه object جدا می‌سازیم
    const textsByLang: Record<string, Record<string, string>> = {
      en: {},
      fa: {},
      de: {},
    };
    for (const t of texts) {
      textsByLang.en[t.key] = t.valueEn || t.valueFa || t.valueDe || "";
      textsByLang.fa[t.key] = t.valueFa || t.valueEn || t.valueDe || "";
      textsByLang.de[t.key] = t.valueDe || t.valueEn || t.valueFa || "";
    }

    return NextResponse.json({
      ok: true,
      books,
      articles,
      tutorials,
      skills: skills.map(s => ({
        ...s,
        items: s.items.split(",").map((i: string) => i.trim()).filter(Boolean),
      })),
      aiInstructions: instructions,
      equipment: equipment.map(e => ({
        ...e,
        specs: e.specs ? (typeof e.specs === "string" ? JSON.parse(e.specs) : e.specs) : null,
      })),
      navItems,
      texts: textsByLang,
      settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
    });
  } catch (err) {
    console.error("[/api/content] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
