#!/bin/bash
# ============================================================================
# docker-entrypoint.sh — فقط با npm (بدون bun)
# v1.1 (security pass 2):
#   - db push فقط وقتی جدول‌ها هنوز ساخته نشده‌اند (دیگر هر بوت --accept-data-loss
#     روی دیتابیس production اجرا نمی‌شود)
#   - seed ادمین گated روی شمارش جدول AccessUser (قبلاً گate روی «0 جدول» بود که
#     بعد از db push هرگز true نمی‌شد → ادمین هیچ‌وقت ساخته نمی‌شد)
#   - رمز ادمین در فایل root-only نوشته می‌شود، نه stdout (docker logs)
#   - اگر build وجود نداشت، یک بار build می‌شود (dev server در production ممنوع)
# ============================================================================

set -e

echo "=========================================="
echo "  Personal Site — Starting up..."
echo "=========================================="

echo ""
echo "[1/5] Creating db directory..."
mkdir -p /app/db
touch /app/db/custom.db

# v1.1.1 (audit Q3-L): corrupt vs empty — با integrity_check تشخیص داده می‌شود،
# نه شمارش جدول (فایل خراب هم «0 جدول» می‌داد و بوتِ خرابِ بی‌صدا می‌ساخت)
DB_OK=$(sqlite3 /app/db/custom.db "PRAGMA quick_check;" 2>/dev/null || echo "corrupt")
if [ "$DB_OK" != "ok" ]; then
    echo "❌ FATAL: database file exists but is corrupt (quick_check=$DB_OK)"
    echo "   Restore from backups/ or import-site.sh — refusing to boot on corrupt DB."
    exit 1
fi
DB_EMPTY=$(sqlite3 /app/db/custom.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")

echo ""
echo "[2/5] Pushing database schema..."
if [ "$DB_EMPTY" = "0" ] || [ -z "$DB_EMPTY" ]; then
    # فقط روی دیتابیس خالی — schema تازه ساخته می‌شود
    # v1.0 (audit W41-45 #14): شکست schema push دیگر پوشانده نمی‌شود — app بدون
    # جدول‌ها روی هر route 500 می‌داد و seed هم skip می‌شد (سایت مرضی بدون هیچ پیام)
    if ! npx prisma db push; then
        echo "❌ FATAL: prisma db push failed — container cannot start correctly."
        exit 1
    fi
    # v1.0 (audit W41-45 #4): WAL durable — مسیر db push آن را ست نمی‌کند؛
    # فقط apply_schema.py ست می‌کرد که در مسیر docker اجرا نمی‌شود
    sqlite3 /app/db/custom.db "PRAGMA journal_mode=WAL;" 2>/dev/null || true
else
    echo "  Tables already exist — SKIP db push (no --accept-data-loss on live data)"
fi
npx prisma generate 2>&1 || echo "  (generate warning, continuing)"

echo ""
echo "[3/5] Seeding (if AccessUser table is empty)..."
ADMIN_COUNT=$(sqlite3 /app/db/custom.db "SELECT count(*) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "ERR")
# v1.0 (audit W46-50 #8): مقدار غیر-عددی (مثل ERR) یعنی query شکسته — seed اجرا شود
# نه اینکه به‌عنوان «admin exists» پوشانده شود
case "$ADMIN_COUNT" in
    ''|*[!0-9]*)
        if [ "$ADMIN_COUNT" != "0" ]; then
            echo "  ⚠ admin count query failed ($ADMIN_COUNT) — attempting seed..."
        fi
        ADMIN_COUNT="0"
        ;;
esac
if [ "$ADMIN_COUNT" = "0" ] || [ -z "$ADMIN_COUNT" ]; then
    echo "  Admin missing — running seed scripts..."
    python3 scripts/seed_content.py 2>&1 || echo "  (seed_content warning)"
    python3 scripts/seed_equipment.py 2>&1 || echo "  (seed_equipment warning)"
    python3 scripts/seed_texts.py 2>&1 || echo "  (seed_texts warning)"
    # v1.1 (security): رمز ادمین فقط در فایل 600 نوشته می‌شود — هرگز stdout/دocker logs
    # v1.0 (audit W41-45 #7): fallback هم quiet است — قبلاً خروجی غیر-quiet با رمز
    # مخلوط در همان فایل نوشته می‌شد
    python3 scripts/seed_access_users.py --quiet > /app/db/.admin-initial-password.txt 2>/dev/null \
        || { python3 scripts/seed_access_users.py --quiet > /app/db/.admin-initial-password.txt 2>/dev/null || true; }
    chmod 600 /app/db/.admin-initial-password.txt 2>/dev/null || true
    echo "  ✅ Admin seeded. Password written to: /app/db/.admin-initial-password.txt (chmod 600)"
    echo "     Read it with:  docker exec personal-site cat /app/db/.admin-initial-password.txt"
else
    echo "  Admin exists — skipping seed."
fi

echo ""
echo "[4/5] Build check..."
if [ "$NODE_ENV" = "production" ]; then
    if [ -f ".next/standalone/server.js" ]; then
        echo "  ✅ standalone build present"
    else
        # v1.1 (fix): قبلاً اینجا dev server production راه می‌انداخت — حالا build می‌کنیم
        echo "  No standalone build found — building once (this may take a few minutes)..."
        npx next build
    fi
fi

echo ""
echo "[5/5] Starting Next.js server..."
echo "  NODE_ENV: ${NODE_ENV:-development}"
echo "  PORT: ${PORT:-3000}"
echo ""

if [ "$NODE_ENV" = "production" ]; then
    echo "  Mode: PRODUCTION (standalone)"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    node .next/standalone/server.js
else
    echo "  Mode: DEVELOPMENT"
    npm run dev
fi
