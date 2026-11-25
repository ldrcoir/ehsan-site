// ============================================================================
// export-offline-snapshot.mjs — snapshot از دیتابیس آفلاین + push به GitHub
// ============================================================================
// این اسکریپت محتوای دیتابیسِ آفلاین (db/custom.db) را به فرمتِ snapshot.json
// درمی‌آورد — دقیقاً همان فرمتی که sync-server-to-github.sh از سرور می‌سازد —
// تا شاخه‌ی server-state در گیت‌هاب همیشه «نسخه‌ی دقیقِ آفلاین با تاریخ و
// نسخه» را داشته باشد.
//
// استفاده:
//   node AI/export-offline-snapshot.mjs            # export + push به server-state
//   node AI/export-offline-snapshot.mjs --no-push  # فقط export محلی
//
// خروجی: server-state/snapshot.json در شاخه‌ی server-state
// ============================================================================

import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const STATE_DIR = join(ROOT, "server-state");
const PUSH = !process.argv.includes("--no-push");

// ---------------------------------------------------------------- metadata
let version = "unknown";
let commit = "unknown";
try {
  version = readFileSync(join(ROOT, "EMA", "VERSION.txt"), "utf8")
    .split("\n")
    .find((l) => l.includes("نسخه فعلی") || l.includes("Version"))
    ?.replace(/[#*\-|]/g, "")
    .trim() || "unknown";
} catch {}
try {
  commit = execSync("git rev-parse --short HEAD").toString().trim();
} catch {}

// ---------------------------------------------------------------- export
const db = new PrismaClient();
console.log("=== export-offline-snapshot ===");

const data = {
  siteTexts: await db.siteText.findMany({ orderBy: { key: "asc" } }),
  siteSettings: await db.siteSetting.findMany({ orderBy: { key: "asc" } }),
  navItems: await db.navItem.findMany({ orderBy: { order: "asc" } }),
  clips: await db.aparatClip.findMany({ orderBy: { order: "asc" } }),
  equipment: await db.labEquipment.findMany({ orderBy: { order: "asc" } }),
  books: await db.book.findMany({ orderBy: { order: "asc" } }),
  articles: await db.article.findMany({ orderBy: { order: "asc" } }),
  tutorials: await db.tutorial.findMany({ orderBy: { order: "asc" } }),
  skills: await db.skill.findMany({ orderBy: { order: "asc" } }),
  themes: await db.customTheme.findMany({ orderBy: { order: "asc" } }),
};

// ماسک راز‌ها (هر value که SECRET/KEY/TOKEN در نام کلید دارد)
const SECRET_RE = /(TOKEN|KEY|SECRET|PASSWORD)/i;
let masked = 0;
for (const s of data.siteSettings) {
  if (SECRET_RE.test(s.key) && typeof s.value === "string" && s.value && !s.value.startsWith("••••")) {
    s.value = "••••••••" + s.value.slice(-4);
    masked++;
  }
}

const counts = Object.fromEntries(
  Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
);
const total = Object.values(counts).reduce((a, b) => a + b, 0);

const snapshot = {
  snapshotAt: new Date().toISOString(),
  snapshotHost: "offline-local",
  snapshotBy: "AI (export-offline-snapshot.mjs)",
  source: "offline",
  version,
  commit,
  counts,
  payload: { data },
};

await db.$disconnect();

// ---------------------------------------------------------------- write
mkdirSync(STATE_DIR, { recursive: true });
const outPath = join(STATE_DIR, "snapshot.json");
writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
console.log(`  written: ${outPath}`);
console.log(`  records: total=${total} | ${JSON.stringify(counts)}`);
console.log(`  masked secrets: ${masked}`);
console.log(`  snapshotAt: ${snapshot.snapshotAt}`);
console.log(`  version: ${version} | commit: ${commit}`);

// ---------------------------------------------------------------- push
if (!PUSH) {
  console.log("(--no-push — فقط محلی ذخیره شد)");
  process.exit(0);
}

const TOKEN_FILE = join(ROOT, ".gh-token");
if (!existsSync(TOKEN_FILE)) {
  console.error("❌ .gh-token پیدا نشد — push رد شد (فقط محلی ذخیره شد)");
  process.exit(1);
}
const TOKEN = readFileSync(TOKEN_FILE, "utf8").trim();

const REPO = "github.com/ldrcoir/ehsan-site.git";
const BRANCH = "server-state";

function sh(cmd) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { stdio: ["pipe", "pipe", "pipe"] }).toString();
}

try {
  // worktree جدا برای شاخه server-state تا main دست‌نخورده بماند
  try { sh(`git worktree remove --force server-state-wt`); } catch {}
  try { sh(`git branch -D ${BRANCH}`); } catch {}
  try { sh(`git fetch origin ${BRANCH}`); } catch {}
  // اگر شاخه روی origin هست، از آن بساز؛ وگرنه از HEAD یتیم بساز
  let hasRemote = false;
  try { sh(`git rev-parse --verify origin/${BRANCH}`); hasRemote = true; } catch {}
  if (hasRemote) {
    sh(`git branch ${BRANCH} origin/${BRANCH}`);
  } else {
    sh(`git checkout --orphan ${BRANCH}`);
    sh(`git rm -rf --ignore-unmatch . >/dev/null 2>&1 || true`);
  }

  // فایل snapshot را داخل worktree/شاخه بگذار
  if (hasRemote) {
    sh(`git worktree add server-state-wt ${BRANCH}`);
    mkdirSync(join(ROOT, "server-state-wt"), { recursive: true });
    writeFileSync(join(ROOT, "server-state-wt", "snapshot.json"), JSON.stringify(snapshot, null, 2));
    sh(`cd server-state-wt && git add snapshot.json && git -c user.name="EMA-AI" -c user.email="ai@ehsanmorad.ir" commit -m "offline snapshot ${snapshot.snapshotAt} (total=${total}, commit=${commit})" || true`);
    sh(`cd server-state-wt && git push https://x-access-token:${TOKEN}@${REPO} ${BRANCH}:${BRANCH}`);
  } else {
    writeFileSync(join(ROOT, "snapshot.json"), JSON.stringify(snapshot, null, 2));
    sh(`git add snapshot.json`);
    sh(`git -c user.name="EMA-AI" -c user.email="ai@ehsanmorad.ir" commit -m "offline snapshot ${snapshot.snapshotAt} (total=${total}, commit=${commit})"`);
    sh(`git push https://x-access-token:${TOKEN}@${REPO} ${BRANCH}:${BRANCH}`);
    sh(`git checkout main`);
  }
  console.log("✅ push به server-state انجام شد");
} catch (e) {
  console.error(`❌ push ناموفق: ${e.message}`);
  // مطمئن شو برمی‌گردیم روی main
  try { sh(`git checkout main`); } catch {}
  process.exit(1);
} finally {
  try { sh(`git worktree remove --force server-state-wt`); } catch {}
}
