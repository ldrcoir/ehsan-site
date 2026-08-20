#!/bin/bash
set -e
echo "[1/3] Pushing database schema..."
bunx prisma db push --accept-data-loss 2>&1 || true
echo "[2/3] Seeding content..."
python3 scripts/seed_content.py 2>&1 || true
python3 scripts/seed_equipment.py 2>&1 || true
echo "[3/3] Starting Next.js dev server..."
exec bun run dev --host 0.0.0.0
