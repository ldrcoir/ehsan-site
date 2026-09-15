#!/bin/bash
# ============================================================================
# build-clean-zip.sh — ساخت zip تمیز با یه پوشه فقط (personal-site)
# ============================================================================

set -e

cd /home/z/my-project

OUTPUT="download/personal-site.zip"
TMP_DIR="/tmp/personal-site-clean"

echo "🧹 Cleaning up..."
rm -rf "$TMP_DIR"
rm -f "$OUTPUT"

echo "📦 Creating personal-site folder..."
mkdir -p "$TMP_DIR/personal-site"

# ============================================================================
# فایل‌های اصلی — مستقیم داخل personal-site/
# ============================================================================

# Source code
cp -r src/ "$TMP_DIR/personal-site/"
cp -r prisma/ "$TMP_DIR/personal-site/"
cp -r public/ "$TMP_DIR/personal-site/"

# Scripts (فقط seed و build هامون، نه همه چیز)
mkdir -p "$TMP_DIR/personal-site/scripts"
cp scripts/seed_content.py "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true
cp scripts/seed_equipment.py "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true
cp scripts/seed_texts.py "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true
cp scripts/seed_access_users.py "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true
cp scripts/auto-backup.sh "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true
cp scripts/list_messages.py "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true
cp scripts/shoot_preview.py "$TMP_DIR/personal-site/scripts/" 2>/dev/null || true

# Config files
cp package.json "$TMP_DIR/personal-site/"
cp bun.lock* "$TMP_DIR/personal-site/" 2>/dev/null || echo "  (no bun.lock)"
cp next.config.ts tsconfig.json "$TMP_DIR/personal-site/"
cp postcss.config.mjs components.json "$TMP_DIR/personal-site/" 2>/dev/null || true
cp .dockerignore .gitignore "$TMP_DIR/personal-site/" 2>/dev/null || true
cp eslint.config.mjs "$TMP_DIR/personal-site/" 2>/dev/null || true

# Docker files
cp Dockerfile docker-compose.yml docker-entrypoint.sh "$TMP_DIR/personal-site/"
chmod +x "$TMP_DIR/personal-site/docker-entrypoint.sh"

# .env (تمیز)
cat > "$TMP_DIR/personal-site/.env" << 'EOF'
DATABASE_URL="file:./db/custom.db"
NODE_ENV="development"
PORT=3000
HOSTNAME="0.0.0.0"
SESSION_SECRET="change-this-to-a-random-secret-in-production"
EOF

# دیتابیس اولیه
mkdir -p "$TMP_DIR/personal-site/db"
cp db/custom.db "$TMP_DIR/personal-site/db/" 2>/dev/null || echo "  (no db, will create on first run)"

# Caddyfile (اختیاری)
cat > "$TMP_DIR/personal-site/Caddyfile" << 'EOF'
# Caddyfile (اختیاری — اگه Nginx نصبه، Caddy نصب نکن)

ehsanmorad.ir, www.ehsanmorad.ir {
    reverse_proxy localhost:3000
    encode gzip zstd
}

ehsan-morad.ir, www.ehsan-morad.ir {
    reverse_proxy localhost:3000
    encode gzip zstd
}

ehsanmorad.id.ir, www.ehsanmorad.id.ir {
    reverse_proxy localhost:3000
    encode gzip zstd
}
EOF

# README
cat > "$TMP_DIR/personal-site/README.md" << 'EOF'
# Personal Site

## نصب (۳ قدم)

```bash
# ۱. Extract
unzip personal-site.zip
cd personal-site

# ۲. اجرا
docker compose up -d --build

# ۳. صبر ۶۰ ثانیه، بعد تست
curl http://localhost:3000/
```

## ورود ادمین

- URL: `http://YOUR_IP:3000#admin`
- username: `admin`
- password: `admin123`
- ⚠️ از Settings رمز رو عوض کن!

## دامنه‌ها (ست شده)

- ehsanmorad.ir
- ehsan-morad.ir
- ehsanmorad.id.ir
- 31.70.76.10

## دستورات

```bash
docker compose logs -f        # لاگ
docker compose restart        # restart
docker compose down           # توقف
docker compose up -d --build  # بازسازی
```
EOF

# ============================================================================
# ساخت zip — فقط personal-site/ (بدون پوشه‌ی اضافی)
# ============================================================================
echo "🗜️  Creating zip..."
cd /tmp
zip -r "/home/z/my-project/$OUTPUT" personal-site/ -x "*/node_modules/*" "*/.next/*" "*/.git/*" > /dev/null

echo ""
echo "✅ Done!"
echo "   File: $OUTPUT"
ls -lh "/home/z/my-project/$OUTPUT"

# ============================================================================
# بررسی ساختار
# ============================================================================
echo ""
echo "=== ساختار zip ==="
unzip -l "/home/z/my-project/$OUTPUT" | head -20
echo "..."

rm -rf "$TMP_DIR"
