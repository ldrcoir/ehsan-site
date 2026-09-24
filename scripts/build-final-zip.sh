#!/bin/bash
# ============================================================================
# build-final-zip.sh — ساخت فایل zip نهایی (اصلاح شده)
# ============================================================================

set -e

cd /home/z/my-project

OUTPUT="download/EhsanMorad-FINAL.zip"
TMP_DIR="/tmp/ehsanmorad-final"

echo "🧹 Cleaning up..."
rm -rf "$TMP_DIR"
rm -f "$OUTPUT"

echo "📦 Copying source files..."
mkdir -p "$TMP_DIR/personal-site"

# فایل‌های اصلی source
cp -r src/ "$TMP_DIR/personal-site/"
cp -r prisma/ "$TMP_DIR/personal-site/"
cp -r scripts/ "$TMP_DIR/personal-site/"
cp -r public/ "$TMP_DIR/personal-site/"

# فایل‌های config
cp package.json bun.lock* "$TMP_DIR/personal-site/" 2>/dev/null || cp package.json "$TMP_DIR/personal-site/"
cp next.config.ts tsconfig.json "$TMP_DIR/personal-site/"
cp postcss.config.mjs components.json "$TMP_DIR/personal-site/" 2>/dev/null || true
cp .dockerignore .gitignore "$TMP_DIR/personal-site/" 2>/dev/null || true

# Docker
cp Dockerfile docker-compose.yml docker-entrypoint.sh "$TMP_DIR/personal-site/"
chmod +x "$TMP_DIR/personal-site/docker-entrypoint.sh"

# .env (اصلاح شده)
cat > "$TMP_DIR/personal-site/.env" << 'EOF'
# Database — مسیر نسبی
DATABASE_URL="file:./db/custom.db"

# Server
NODE_ENV="development"
PORT=3000
HOSTNAME="0.0.0.0"

# Session secret — حتماً عوض کن!
# تولید: openssl rand -hex 32
SESSION_SECRET="change-this-to-a-random-secret-in-production"
EOF

# دیتابیس اولیه
mkdir -p "$TMP_DIR/personal-site/db"
cp db/custom.db "$TMP_DIR/personal-site/db/" 2>/dev/null || echo "  (no db, will be created)"

# Caddyfile (اختیاری — اگه خواستی استفاده کنی)
cat > "$TMP_DIR/personal-site/Caddyfile" << 'EOF'
# Caddyfile (اختیاری)
# اگه می‌خوای Caddy استفاده کنی (نه Nginx):
#   sudo apt install caddy
#   sudo cp Caddyfile /etc/caddy/Caddyfile
#   sudo systemctl restart caddy
#
# نکته: اگه Nginx نصبه، Caddy نصب نکن چون پورت ۸۰/۴۴۳ رو می‌گیرن.

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
# Personal Site — EhsanMorad

## نصب سریع (۳ قدم)

```bash
# ۱. Extract
unzip EhsanMorad-FINAL.zip
cd personal-site

# ۲. اجرا
docker-compose up -d --build

# ۳. صبر ۶۰ ثانیه، بعد تست
curl http://localhost:3000/
# باید HTTP 200 بده
```

## ورود ادمین

- URL: `http://YOUR_IP:3000#admin` (یا `Ctrl+Shift+A`)
- username: `admin`
- password: `admin123`
- ⚠️ حتماً از Settings رمز رو عوض کن!

## دامنه‌ها (از قبل ست شدن)

- `ehsanmorad.ir`
- `ehsan-morad.ir`
- `ehsanmorad.id.ir`
- `31.70.76.10` (VPS IP)

## اگه Caddy خواستی (اختیاری)

```bash
sudo apt install caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

نکته: اگه Nginx نصبه، Caddy نصب نکن.

## دستورات مفید

```bash
docker-compose logs -f          # لاگ
docker-compose restart          # restart
docker-compose down             # توقف
docker-compose up -d --build    # بازسازی
```

## نسخه
V19.4 — 2026-09-12
EOF

echo "📜 Adding quick-install.sh..."
cp download/quick-install.sh "$TMP_DIR/quick-install.sh"
chmod +x "$TMP_DIR/quick-install.sh"

echo "📄 Adding DNS guide..."
cat > "$TMP_DIR/DNS-SETUP.txt" << 'EOF'
==========================================
  DNS Setup Guide
==========================================

برای هر دامنه، این A records رو اضافه کن:

Domain: ehsanmorad.ir
-------------------------------------
  Type:  A
  Name:  @
  Value: 31.70.76.10

  Type:  A
  Name:  www
  Value: 31.70.76.10

Domain: ehsan-morad.ir
-------------------------------------
  Type:  A
  Name:  @
  Value: 31.70.76.10

  Type:  A
  Name:  www
  Value: 31.70.76.10

Domain: ehsanmorad.id.ir
-------------------------------------
  Type:  A
  Name:  @
  Value: 31.70.76.10

  Type:  A
  Name:  www
  Value: 31.70.76.10

==========================================
EOF

echo "🗜️  Creating zip..."
cd /tmp
zip -r "/home/z/my-project/$OUTPUT" ehsanmorad-final/ -x "*/node_modules/*" "*/.next/*" "*/.git/*" > /dev/null

echo ""
echo "✅ Done!"
echo "   File: $OUTPUT"
ls -lh "/home/z/my-project/$OUTPUT"

rm -rf "$TMP_DIR"
