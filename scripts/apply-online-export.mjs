// ============================================================================
// apply-online-export.mjs — v1.0
// اعمال خروجی export-all روی دیتابیس آفلاین با Prisma upsert — بدون لمس کاربران/لاگ‌ها.
// توکن‌های ماسک‌شده skip می‌شوند تا مقدار جعلی ذخیره نشود.
// ============================================================================

// ============================================================================
// apply-online-export.mjs — اعمال خروجی «export-all» روی دیتابیس آفلاین (v1.0)
// ============================================================================
// فایل JSON ساخته‌شده توسط scripts/sync-from-online.sh را می‌گیرد و با upsert
// رکوردها را در دیتابیس محلی (نسخه‌ی آفلاین) هم‌سان با سرور آنلاین می‌کند.
//
// استفاده:
//   node scripts/apply-online-export.mjs db/online-export-<timestamp>.json
//
// نکات امنیتی:
// - فقط جدول‌های «قابل ویرایش محتوایی» را لمس می‌کند (نه کاربران، نه لاگ‌ها،
//   نه تنظیمات محرمانه) — توکن‌های ماسک‌شده (••••) هم skip می‌شوند تا هرگز
//   مقدار جعلی جای مقدار واقعی را نگیرد.
// - upsert بر اساس کلید اصلی؛ حذف نمی‌کند (safe-sync) — رکوردی که فقط روی
//   آفلاین باشد دست‌نخورده می‌ماند.
// ============================================================================

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SECRET_KEYS = new Set(["baleBotToken", "telegramBotToken"]);

function isMasked(v) {
  return typeof v === "string" && v.startsWith("••••••••");
}

async function main() {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error("ERROR: فایل export لازم است: node scripts/apply-online-export.mjs <file.json>");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const counts = {};

  // --- SiteText ---
  if (Array.isArray(data.siteTexts)) {
    for (const t of data.siteTexts) {
      await db.siteText.upsert({
        where: { key: t.key },
        update: { valueEn: t.valueEn, valueFa: t.valueFa, valueDe: t.valueDe },
        create: { key: t.key, valueEn: t.valueEn, valueFa: t.valueFa, valueDe: t.valueDe },
      });
    }
    counts.siteTexts = data.siteTexts.length;
  }

  // --- SiteSetting (بدون راز؛ ماسک‌شده‌ها skip) ---
  if (Array.isArray(data.siteSettings)) {
    let applied = 0;
    for (const s of data.siteSettings) {
      if (SECRET_KEYS.has(s.key) || isMasked(s.value)) continue; // هرگز مقدار جعلی ننویس
      await db.siteSetting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      });
      applied++;
    }
    counts.siteSettings = applied;
  }

  // --- NavItem ---
  if (Array.isArray(data.navItems)) {
    for (const n of data.navItems) {
      await db.navItem.upsert({
        where: { id: n.id },
        update: { labelEn: n.labelEn, labelFa: n.labelFa, labelDe: n.labelDe, href: n.href, target: n.target, visible: n.visible, order: n.order },
        create: { id: n.id, labelEn: n.labelEn, labelFa: n.labelFa, labelDe: n.labelDe, href: n.href, target: n.target, visible: n.visible, order: n.order },
      });
    }
    counts.navItems = data.navItems.length;
  }

  // --- AparatClip ---
  if (Array.isArray(data.clips)) {
    for (const c of data.clips) {
      const row = {
        title: c.title, embedCode: c.embedCode, description: c.description,
        category: c.category, visible: c.visible, order: c.order,
      };
      await db.aparatClip.upsert({ where: { id: c.id }, update: row, create: { id: c.id, ...row } });
    }
    counts.clips = data.clips.length;
  }

  // --- LabEquipment ---
  if (Array.isArray(data.equipment)) {
    for (const e of data.equipment) {
      const row = {
        name: e.name, model: e.model, category: e.category, status: e.status,
        description: e.description, specs: e.specs, order: e.order, visible: e.visible,
      };
      await db.labEquipment.upsert({ where: { id: e.id }, update: row, create: { id: e.id, ...row } });
    }
    counts.equipment = data.equipment.length;
  }

  // --- Book / Article / Tutorial / Skill ---
  const contentMap = [
    ["books", db.book, (b) => ({
      titleEn: b.titleEn, titleDe: b.titleDe, titleFa: b.titleFa, year: b.year,
      publisherEn: b.publisherEn, publisherDe: b.publisherDe, publisherFa: b.publisherFa,
      descEn: b.descEn, descDe: b.descDe, descFa: b.descFa, cover: b.cover,
      link: b.link, order: b.order, visible: b.visible,
    })],
    ["articles", db.article, (a) => ({
      titleEn: a.titleEn, titleDe: a.titleDe, titleFa: a.titleFa, venueEn: a.venueEn,
      venueDe: a.venueDe, venueFa: a.venueFa, date: a.date, typeEn: a.typeEn,
      typeDe: a.typeDe, typeFa: a.typeFa, summaryEn: a.summaryEn, summaryDe: a.summaryDe,
      summaryFa: a.summaryFa, link: a.link, order: a.order, visible: a.visible,
    })],
    ["tutorials", db.tutorial, (t) => ({
      titleEn: t.titleEn, titleDe: t.titleDe, titleFa: t.titleFa, duration: t.duration,
      levelEn: t.levelEn, levelDe: t.levelDe, levelFa: t.levelFa, descEn: t.descEn,
      descDe: t.descDe, descFa: t.descFa, embedUrl: t.embedUrl, platform: t.platform,
      playlist: t.playlist, order: t.order, visible: t.visible,
    })],
    ["skills", db.skill, (s) => ({
      categoryEn: s.categoryEn, categoryDe: s.categoryDe, categoryFa: s.categoryFa,
      items: s.items, order: s.order, visible: s.visible,
    })],
  ];
  for (const [key, model, map] of contentMap) {
    if (Array.isArray(data[key])) {
      for (const r of data[key]) {
        const row = map(r);
        await model.upsert({ where: { id: r.id }, update: row, create: { id: r.id, ...row } });
      }
      counts[key] = data[key].length;
    }
  }

  // --- CustomTheme ---
  if (Array.isArray(data.themes)) {
    for (const t of data.themes) {
      const row = {
        bg: t.bg, bgSoft: t.bgSoft, bgPanel: t.bgPanel, bgPanel2: t.bgPanel2,
        primary: t.primary, primaryDim: t.primaryDim, primaryBright: t.primaryBright,
        text: t.text, textDim: t.textDim, textFaint: t.textFaint, border: t.border,
        borderBright: t.borderBright, accent: t.accent, red: t.red, cyan: t.cyan,
        scanlines: t.scanlines, visible: t.visible, order: t.order,
      };
      await db.customTheme.upsert({ where: { id: t.id }, update: row, create: { id: t.id, name: t.name, ...row } });
    }
    counts.themes = data.themes.length;
  }

  console.log("✅ export آنلاین روی دیتابیس آفلاین اعمال شد:");
  for (const [k, v] of Object.entries(counts)) console.log(`   ${k}: ${v} رکورد`);
  console.log("");
  console.log("حالا می‌توانی نسخه‌ی آفلاین را commit و push کنی (گیت هم‌سرو می‌شود).");
}

main()
  .catch((e) => { console.error("ERROR:", e); process.exit(1); })
  .finally(() => db.$disconnect());
