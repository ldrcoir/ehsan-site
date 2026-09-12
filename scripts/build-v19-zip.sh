#!/bin/bash
# ============================================================================
# build-v19-zip.sh — ساخت فایل zip کامل قابل اجرا از extract
# ============================================================================
# این اسکریپت یه zip می‌سازه که:
# - شامل همه‌ی سورس کد هست
# - شامل package.json و bun.lockc هست
# - شامل prisma schema هست
# - شامل scripts ها هست
# - شامل Dockerfile و docker-compose.yml هست
# - شامل دیتابیس اولیه هست (با admin پیش‌فرض)
# - node_modules شامل نمی‌شه (docker-compose up خودش نصب می‌کنه)
# ============================================================================

set -e

cd /home/z/my-project

OUTPUT="download/personal-site-v19.1.zip"
TMP_DIR="/tmp/personal-site-v19"

echo "🧹 Cleaning up..."
rm -rf "$TMP_DIR"
rm -f "$OUTPUT"

echo "📦 Copying files..."
mkdir -p "$TMP_DIR"

# فایل‌های اصلی
cp -r src/ "$TMP_DIR/"
cp -r prisma/ "$TMP_DIR/"
cp -r scripts/ "$TMP_DIR/"
cp -r public/ "$TMP_DIR/"
cp -r mini-services/ "$TMP_DIR/" 2>/dev/null || true
cp -r examples/ "$TMP_DIR/" 2>/dev/null || true

# فایل‌های config
cp package.json bun.lock* "$TMP_DIR/"
cp next.config.ts tsconfig.json "$TMP_DIR/"
cp postcss.config.mjs components.json "$TMP_DIR/" 2>/dev/null || true
cp .dockerignore .gitignore "$TMP_DIR/" 2>/dev/null || true
cp .env "$TMP_DIR/.env.example" 2>/dev/null || true

# Docker
cp Dockerfile docker-compose.yml docker-entrypoint.sh "$TMP_DIR/"
chmod +x "$TMP_DIR/docker-entrypoint.sh"

# Caddyfile (اگه باشه)
cp Caddyfile "$TMP_DIR/" 2>/dev/null || true

# دیتابیس اولیه (با admin/admin123)
mkdir -p "$TMP_DIR/db"
cp db/custom.db "$TMP_DIR/db/" 2>/dev/null || echo "  (no existing db, will be created on first run)"

# README
cat > "$TMP_DIR/README.md" << 'EOF'
# Personal Site V19.1

## Quick Start

```bash
# 1. Extract
unzip personal-site-v19.1.zip
cd personal-site-v19

# 2. Run with Docker
docker-compose up -d

# 3. View
open http://localhost:3000
```

## Admin Access

- URL: http://localhost:3000#admin (or Ctrl+Shift+A)
- Username: admin
- Password: admin123
- ⚠️ CHANGE PASSWORD IMMEDIATELY from Settings tab!

## User Login (for access-controlled users)

- URL: http://localhost:3000/user-login
- Admin can create users with time-based access from admin panel → Users tab

## Features

- Next.js 16 + TypeScript + Prisma + SQLite
- Matrix terminal theme (green on black)
- Signal Lab with oscilloscope + signal generator (AM/FM)
- AI chat with multiple providers (OpenAI, Anthropic, Groq, OpenRouter, Ollama)
- Admin panel with 9 tabs
- User management with time-based access (V19)
- 7 themes + theme builder
- 3 languages (EN, DE, FA)
- PWA, RSS, Sitemap
- Anti-theft (domain lock, watermark, devtools detection)

## Transfer to new VPS

```bash
# Old VPS:
docker cp personal-site:/app/db/custom.db ./backup.db
zip -r site-backup.zip personal-site-v19/ backup.db

# New VPS:
unzip site-backup.zip
cd personal-site-v19
docker-compose up -d
docker cp ../backup.db personal-site:/app/db/custom.db
docker-compose restart
```

## Version

V19.1 — 2026-09-03
EOF

# ساخت zip
echo "🗜️  Creating zip..."
cd /tmp
zip -r "/home/z/my-project/$OUTPUT" personal-site-v19/ -x "*/node_modules/*" "*/.next/*" "*/.git/*" > /dev/null

echo ""
echo "✅ Done!"
echo "   File: $OUTPUT"
ls -lh "/home/z/my-project/$OUTPUT"

# پاک‌سازی
rm -rf "$TMP_DIR"
