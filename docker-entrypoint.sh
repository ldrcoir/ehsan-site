#!/bin/bash
# ============================================================================
# docker-entrypoint.sh — اسکریپت راه‌انداز Docker
# ============================================================================
# این اسکریپت موقع شروع container اجرا می‌شه و:
# 1. schema دیتابیس رو اعمال می‌کنه (prisma db push)
# 2. داده‌های اولیه (seed) رو وارد می‌کنه
# 3. سرور Next.js رو شروع می‌کنه
# ============================================================================

set -e

echo "=========================================="
echo "  Personal Site — Starting up..."
echo "  Version: V19.0"
echo "  Date: 2026-09-03"
echo "=========================================="

echo ""
echo "[1/4] Pushing database schema..."
bunx prisma db push --accept-data-loss 2>&1 || true
bunx prisma generate 2>&1 || true

echo ""
echo "[2/4] Seeding content..."
python3 scripts/seed_content.py 2>&1 || true
python3 scripts/seed_equipment.py 2>&1 || true
python3 scripts/seed_texts.py 2>&1 || true

echo ""
echo "[3/4] Seeding access users (admin)..."
python3 scripts/seed_access_users.py 2>&1 || true

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
  exec bun run dev --host 0.0.0.0
fi
