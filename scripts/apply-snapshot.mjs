// ============================================================================
// apply-snapshot.mjs — apply snapshot.json to local database (v1.0 rev5)
// ============================================================================
// این اسکریپت snapshot.json را که از کانال نگهداری سرور گرفته شده و در
// شاخه‌ی server-state در GitHub ذخیره شده، می‌خواند و در دیتابیس لوکال
// اعمال می‌کند. به این ترتیب نسخه‌ی آفلاین دقیقاً مشابه نسخه‌ی آنلاین
// می‌شود (به جز رازهایی مثل bot tokens که در snapshot ماسک شده‌اند).
//
// استفاده:
//   node scripts/apply-snapshot.mjs <snapshot.json>
//   node scripts/apply-snapshot.mjs <snapshot.json> --dry-run
//
// جداولی که sync می‌شوند:
//   - SiteText (upsert by key)
//   - SiteSetting (upsert by key — bot tokens ماسک شده را رد می‌کند)
//   - NavItem (upsert by id)
//   - AparatClip (upsert by id)
//   - LabEquipment (upsert by id)
//   - Book, Article, Tutorial, Skill (upsert by id)
//   - CustomTheme (upsert by id)
//
// جداولی که sync نمی‌شوند (داده‌های خصوصی کاربران / لاگ‌های داخلی):
//   - ContactMessage, MessageReply
//   - ChatSession, ChatMessage
//   - AccessUser (شامل passwordHash)
//   - AccessLog, SecurityLog
//   - PageView, BlockedIp
//   - AiProvider (شامل API keys)
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const db = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const snapshotPath = process.argv[2];

if (!snapshotPath) {
  console.error("❌ استفاده: node scripts/apply-snapshot.mjs <snapshot.json> [--dry-run]");
  process.exit(1);
}

// خواندن snapshot
let snapshot;
try {
  const raw = readFileSync(snapshotPath, "utf8");
  snapshot = JSON.parse(raw);
} catch (e) {
  console.error(`❌ نمی‌توانم snapshot را بخوانم: ${e.message}`);
  process.exit(1);
}

// payload ممکن است در snapshot.payload.data باشد (ساختار sync-server-to-github)
// یا مستقیماً در snapshot.data باشد
const data = snapshot.payload?.data || snapshot.data || snapshot;
if (!data) {
  console.error("❌ ساختار snapshot نامعتبر است — .payload.data یا .data پیدا نشد");
  process.exit(1);
}

console.log(`=== apply-snapshot ${dryRun ? "(dry-run) " : ""}===`);
console.log(`  snapshot time: ${snapshot.snapshotAt || "unknown"}`);
console.log(`  snapshot host: ${snapshot.snapshotHost || "unknown"}`);
console.log("");

const stats = { upserted: 0, skipped: 0, errors: 0 };

// -------------------------------------------------------------------------
// SiteText — upsert by key
// -------------------------------------------------------------------------
if (Array.isArray(data.siteTexts)) {
  console.log(`  SiteText: ${data.siteTexts.length} records`);
  if (!dryRun) {
    for (const t of data.siteTexts) {
      try {
        await db.siteText.upsert({
          where: { key: t.key },
          update: {
            valueEn: t.valueEn ?? "",
            valueFa: t.valueFa ?? "",
            valueDe: t.valueDe ?? "",
          },
          create: {
            key: t.key,
            valueEn: t.valueEn ?? "",
            valueFa: t.valueFa ?? "",
            valueDe: t.valueDe ?? "",
          },
        });
        stats.upserted++;
      } catch (e) {
        console.error(`    ❌ SiteText key=${t.key}: ${e.message}`);
        stats.errors++;
      }
    }
  }
}

// -------------------------------------------------------------------------
// SiteSetting — upsert by key, but skip masked secrets (••••••••...)
// -------------------------------------------------------------------------
if (Array.isArray(data.siteSettings)) {
  console.log(`  SiteSetting: ${data.siteSettings.length} records`);
  if (!dryRun) {
    for (const s of data.siteSettings) {
      try {
        // اگر value ماسک شده است (شروع با ••••)، رد کن — راز واقعی در snapshot نیست
        if (typeof s.value === "string" && s.value.startsWith("••••")) {
          stats.skipped++;
          continue;
        }
        await db.siteSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value },
        });
        stats.upserted++;
      } catch (e) {
        console.error(`    ❌ SiteSetting key=${s.key}: ${e.message}`);
        stats.errors++;
      }
    }
  }
}

// -------------------------------------------------------------------------
// NavItem — upsert by id
// -------------------------------------------------------------------------
if (Array.isArray(data.navItems)) {
  console.log(`  NavItem: ${data.navItems.length} records`);
  if (!dryRun) {
    for (const n of data.navItems) {
      try {
        await db.navItem.upsert({
          where: { id: n.id },
          update: {
            labelEn: n.labelEn,
            labelFa: n.labelFa,
            labelDe: n.labelDe,
            href: n.href,
            target: n.target,
            visible: n.visible,
            order: n.order,
          },
          create: {
            id: n.id,
            labelEn: n.labelEn,
            labelFa: n.labelFa,
            labelDe: n.labelDe,
            href: n.href,
            target: n.target,
            visible: n.visible,
            order: n.order,
          },
        });
        stats.upserted++;
      } catch (e) {
        console.error(`    ❌ NavItem id=${n.id}: ${e.message}`);
        stats.errors++;
      }
    }
  }
}

// -------------------------------------------------------------------------
// AparatClip — upsert by id
// -------------------------------------------------------------------------
if (Array.isArray(data.clips)) {
  console.log(`  AparatClip: ${data.clips.length} records`);
  if (!dryRun) {
    for (const c of data.clips) {
      try {
        await db.aparatClip.upsert({
          where: { id: c.id },
          update: {
            title: c.title,
            embedCode: c.embedCode,
            description: c.description,
            category: c.category,
            visible: c.visible,
            order: c.order,
          },
          create: {
            id: c.id,
            title: c.title,
            embedCode: c.embedCode,
            description: c.description || "",
            category: c.category || "general",
            visible: c.visible,
            order: c.order,
          },
        });
        stats.upserted++;
      } catch (e) {
        console.error(`    ❌ AparatClip id=${c.id}: ${e.message}`);
        stats.errors++;
      }
    }
  }
}

// -------------------------------------------------------------------------
// LabEquipment — upsert by id
// -------------------------------------------------------------------------
if (Array.isArray(data.equipment)) {
  console.log(`  LabEquipment: ${data.equipment.length} records`);
  if (!dryRun) {
    for (const eq of data.equipment) {
      try {
        await db.labEquipment.upsert({
          where: { id: eq.id },
          update: {
            nameEn: eq.nameEn,
            nameFa: eq.nameFa,
            nameDe: eq.nameDe,
            description: eq.description,
            status: eq.status,
            visible: eq.visible,
            order: eq.order,
          },
          create: {
            id: eq.id,
            nameEn: eq.nameEn,
            nameFa: eq.nameFa,
            nameDe: eq.nameDe,
            description: eq.description || "",
            status: eq.status || "offline",
            visible: eq.visible,
            order: eq.order,
          },
        });
        stats.upserted++;
      } catch (e) {
        console.error(`    ❌ LabEquipment id=${eq.id}: ${e.message}`);
        stats.errors++;
      }
    }
  }
}

// -------------------------------------------------------------------------
// Book, Article, Tutorial, Skill — upsert by id
// -------------------------------------------------------------------------
async function upsertContent(modelName, rows, fields) {
  if (!Array.isArray(rows)) return;
  console.log(`  ${modelName}: ${rows.length} records`);
  if (dryRun) return;
  for (const r of rows) {
    try {
      await db[modelName].upsert({
        where: { id: r.id },
        update: fields.reduce((acc, f) => ({ ...acc, [f]: r[f] }), {}),
        create: fields.reduce((acc, f) => ({ ...acc, [f]: r[f] ?? "" }), {}),
      });
      stats.upserted++;
    } catch (e) {
      console.error(`    ❌ ${modelName} id=${r.id}: ${e.message}`);
      stats.errors++;
    }
  }
}

await upsertContent("book", data.books, ["titleEn", "titleFa", "titleDe", "description", "author", "url", "visible", "order"]);
await upsertContent("article", data.articles, ["titleEn", "titleFa", "titleDe", "excerpt", "content", "url", "visible", "order"]);
await upsertContent("tutorial", data.tutorials, ["titleEn", "titleFa", "titleDe", "description", "url", "visible", "order"]);
await upsertContent("skill", data.skills, ["nameEn", "nameFa", "nameDe", "level", "category", "visible", "order"]);

// -------------------------------------------------------------------------
// CustomTheme — upsert by id
// -------------------------------------------------------------------------
if (Array.isArray(data.themes)) {
  console.log(`  CustomTheme: ${data.themes.length} records`);
  if (!dryRun) {
    for (const th of data.themes) {
      try {
        await db.customTheme.upsert({
          where: { id: th.id },
          update: {
            name: th.name,
            config: th.config,
            active: th.active,
            order: th.order,
          },
          create: {
            id: th.id,
            name: th.name,
            config: th.config,
            active: th.active,
            order: th.order,
          },
        });
        stats.upserted++;
      } catch (e) {
        console.error(`    ❌ CustomTheme id=${th.id}: ${e.message}`);
        stats.errors++;
      }
    }
  }
}

console.log("");
console.log("=== نتیجه ===");
console.log(`  upserted: ${stats.upserted}`);
console.log(`  skipped (masked secrets): ${stats.skipped}`);
console.log(`  errors: ${stats.errors}`);
if (dryRun) {
  console.log("  (dry-run — چیزی نوشته نشد)");
}

await db.$disconnect();
process.exit(stats.errors > 0 ? 1 : 0);
