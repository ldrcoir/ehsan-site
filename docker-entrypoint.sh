#!/bin/bash
# ============================================================================
# docker-entrypoint.sh — اسکریپت راه‌انداز Docker (اصلاح شده)
# ============================================================================

set -e

echo "=========================================="
echo "  Personal Site — Starting up..."
echo "=========================================="

echo ""
echo "[1/4] Pushing database schema..."
bunx prisma db push --accept-data-loss 2>&1 || echo "  (schema push warning, continuing)"
bunx prisma generate 2>&1 || echo "  (generate warning, continuing)"

echo ""
echo "[2/4] Creating db directory if needed..."
mkdir -p /app/db
touch /app/db/custom.db

echo ""
echo "[3/4] Seeding content (if database empty)..."
# فقط اگه دیتابیس خالی باشه seed کن
TABLES=$(sqlite3 /app/db/custom.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
if [ "$TABLES" = "0" ] || [ -z "$TABLES" ]; then
    echo "  Database empty — running seed scripts..."
    python3 scripts/seed_content.py 2>&1 || echo "  (seed_content warning)"
    python3 scripts/seed_equipment.py 2>&1 || echo "  (seed_equipment warning)"
    python3 scripts/seed_texts.py 2>&1 || echo "  (seed_texts warning)"
    python3 scripts/seed_access_users.py 2>&1 || echo "  (seed_access_users warning)"
else
    echo "  Database already has $TABLES tables — skipping seed."
fi

echo ""
echo "[4/4] Starting Next.js server..."
echo "  NODE_ENV: ${NODE_ENV:-development}"
echo "  PORT: ${PORT:-3000}"
echo "  DATABASE_URL: ${DATABASE_URL:-file:/app/db/custom.db}"
echo ""

if [ "$NODE_ENV" = "production" ] && [ -f ".next/standalone/server.js" ]; then
    echo "  Mode: PRODUCTION (standalone)"
    export HOSTNAME="${HOSTNAME:-0.0.0.0}"
    exec bun .next/standalone/server.js
else
    echo "  Mode: DEVELOPMENT"
    exec bun run dev
fi
