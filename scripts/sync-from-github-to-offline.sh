#!/bin/bash
# ============================================================================
# sync-from-github-to-offline.sh — همگام‌سازی نسخه‌ی آفلاین با آنلاین (v1.0 rev5)
# ============================================================================
# این اسکریپت snapshot.json را از شاخه‌ی server-state در GitHub می‌گیرد و
# در دیتابیس لوکال اعمال می‌کند. به این ترتیب نسخه‌ی آفلاین دقیقاً مشابه
# نسخه‌ی آنلاین می‌شود (به جز رازهایی مثل bot tokens که در snapshot ماسک
# شده‌اند).
#
# جریان:
#   1) git fetch origin server-state
#   2) git checkout server-state -- server-state/snapshot.json
#   3) node scripts/apply-snapshot.mjs server-state/snapshot.json
#
# استفاده:
#   bash scripts/sync-from-github-to-offline.sh           # اعمال
#   bash scripts/sync-from-github-to-offline.sh --dry-run # فقط نمایش، بدون اعمال
#
# پیش‌نیاز:
#   - دیتابیس لوکال باید با prisma db push ساخته شده باشد
#   - .env باید DATABASE_URL را به دیتابیس لوکال اشاره کند
#   - git remote origin باید به github.com/ldrcoir/ehsan-site اشاره کند
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
    DRY_RUN="--dry-run"
fi

# --- وابستگی‌ها --------------------------------------------------------------
for cmd in git node; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "❌ $cmd نصب نیست"
        exit 1
    fi
done

# --- بررسی remote ------------------------------------------------------------
if ! git remote get-url origin &>/dev/null; then
    echo "❌ git remote origin تنظیم نشده"
    echo "   ست کن:  git remote add origin https://github.com/ldrcoir/ehsan-site.git"
    exit 1
fi

# --- مرحله 1: fetch شاخه‌ی server-state --------------------------------------
echo "=== [1] fetch شاخه‌ی server-state از GitHub ==="
if ! git fetch origin server-state 2>/dev/null; then
    echo "❌ شاخه‌ی server-state روی GitHub نیست"
    echo ""
    echo "   این یعنی هنوز هیچ snapshot از سرور به GitHub push نشده."
    echo "   برای ساختنش، در سرور اجرا کن:"
    echo "     bash scripts/sync-server-to-github.sh"
    echo ""
    echo "   یا اگر هنوز سرور نصب نشده، اول rev5 را deploy کن (ببین DEPLOYMENT-GUIDE-FA-v5.md)"
    exit 1
fi
echo "  ✅ fetch موفق"

# --- مرحله 2: استخراج snapshot.json -----------------------------------------
echo "=== [2] استخراج snapshot.json ==="
SNAPSHOT_DIR="$PROJECT_DIR/server-state"
mkdir -p "$SNAPSHOT_DIR"
# فایل را از شاخه‌ی server-state بردار — بدون checkout کل شاخه
git show origin/server-state:server-state/snapshot.json > "$SNAPSHOT_DIR/snapshot.json" 2>/dev/null || {
    echo "❌ server-state/snapshot.json روی شاخه‌ی server-state نیست"
    echo "   محتویات شاخه:"
    git ls-tree --name-only origin/server-state | head -10
    exit 1
}
SNAPSHOT_SIZE=$(wc -c < "$SNAPSHOT_DIR/snapshot.json")
echo "  ✅ snapshot.json استخراج شد ($SNAPSHOT_SIZE bytes)"

# --- مرحله 3: اعمال در دیتابیس لوکال ---------------------------------------
echo "=== [3] اعمال snapshot در دیتابیس لوکال ==="
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "  ⚠️  .env پیدا نشد — DATABASE_URL باید set باشد"
    echo "     مثال:  export DATABASE_URL=file:./db/local.db"
fi

# اطمینان از prisma client
if [ ! -d "$PROJECT_DIR/node_modules/@prisma/client" ]; then
    echo "  ⏳ prisma client تولید نشده — generate می‌کنم"
    (cd "$PROJECT_DIR" && npx prisma generate)
fi

node "$SCRIPT_DIR/apply-snapshot.mjs" "$SNAPSHOT_DIR/snapshot.json" $DRY_RUN
RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "=== ✅ همگام‌سازی موفق ==="
    echo "  نسخه‌ی آفلاین حالا با نسخه‌ی آنلاین هم‌رنگ است"
    echo "  (به جز bot tokens که در snapshot ماسک شده‌اند — آنها را جداگانه پیکربندی کن)"
    echo ""
    echo "  snapshot: $SNAPSHOT_DIR/snapshot.json"
    echo "  برای دیدن محتوا:  jq '.payload.data.siteTexts[0:3]' $SNAPSHOT_DIR/snapshot.json"
else
    echo ""
    echo "=== ⚠️  همگام‌سازی با خطا تمام شد ==="
    echo "  بعضی رکوردها اعمال نشدند — خطاهای بالا را بررسی کن"
fi

exit $RESULT
