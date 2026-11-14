import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/content
 * Public endpoint — returns all visible content for the site.
 * Including site texts (all languages) so the frontend can display them.
 */
export async function GET() {
  try {
    // v1.1.1 (audit P5-G1): aiInstructions از خروجی عمومی حذف شد — قواعد AI
    // (system prompt) داده‌ی داخلی است؛ هیچ مصرف‌کننده‌ای در فرانت‌اند ندارد و
    // فقط prompt سایت را به بازدیدکننده نشت می‌داد. سرور مستقیم از جدول می‌خواند.
    const [books, articles, tutorials, skills, equipment, navItems, texts, settings, customThemes] = await Promise.all([
      db.book.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.article.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.tutorial.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.skill.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.labEquipment.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.navItem.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.siteText.findMany(),
      db.siteSetting.findMany(),
      // V1.1: custom themes from the admin Theme Builder — ALL fields
      // (the client needs the colors to build CSS vars)
      db.customTheme.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
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
      aiInstructions: [], // v1.1.1: حذف شد — قواعد AI داخلی است (P5-G1)
      equipment: equipment.map(e => ({
        ...e,
        specs: (() => {
          if (!e.specs) return null;
          if (typeof e.specs !== "string") return e.specs;
          try { return JSON.parse(e.specs); }
          catch { return null; /* در صورت خرابی، null بده نه 500 */ }
        })(),
      })),
      navItems,
      customThemes,
      texts: textsByLang,
      // V17.7: فقط کلیدهای عمومی و امن رو برگردون (bot tokens و sensitive data رو فیلتر کن)
      // قبلاً همه SiteSetting ها (شامل baleBotToken, telegramBotToken, forwardEmail) لو می‌رفت!
      settings: Object.fromEntries(
        settings
          .filter(s => {
            // V1.1: کلیدهای عمومی — شامل تم/فونت پیش‌فرض، سوشال‌مدیا و سوییچ‌های نمایش بخش‌ها
            const PUBLIC_KEYS = new Set([
              "apiEnabled",
              "handle", "name_fa", "name_en", "name_de",
              "tagline_fa", "tagline_en", "tagline_de",
              "visitorCount",
              "defaultTheme", "defaultFont",
              "social_github", "social_linkedin", "social_devto", "social_medium",
              // v1.1 (admin-editable everything): ایمیل نمایشی از پنل (terminal contact)
              "contact_email",
            ]);
            const isPublicKey =
              PUBLIC_KEYS.has(s.key) || /^section\.[a-z]+\.visible$/.test(s.key);
            // belt-and-suspenders: هیچ کلیدی که شبیه secret/tokens باشه هرگز برنگرده
            // v1.1.1 (audit P4): پوشش کلیدها کامل‌تر شد (credentials/webhook/api_key/key)
            const looksSecret = /token|secret|password|forwardemail|apikey|api_key|credential|webhook|key/i.test(s.key);
            return isPublicKey && !looksSecret;
          })
          .map(s => [s.key, s.value])
      ),
    });
  } catch (err) {
    console.error("[/api/content] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
