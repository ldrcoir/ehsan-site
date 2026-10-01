#!/bin/bash
# ============================================================================
# package-v188.sh — Build install-v18.8.zip
# ============================================================================
# Steps:
#   1. Clean .next/standalone/db/custom.db (dev DB — install.sh creates fresh)
#   2. Clean .next/standalone/.env (dev path — install.sh creates fresh)
#   3. Copy install.sh, scripts/, prisma/, public assets, README
#   4. Zip into public/install-v18.8.zip
# ============================================================================
set -eo pipefail

cd /home/z/my-project

echo "=== V18.8 Packaging ==="

# 1. Clean dev artifacts from standalone
echo "[1/5] Cleaning dev artifacts from standalone..."
rm -f .next/standalone/db/custom.db
rm -f .next/standalone/db/custom.db-journal
rm -f .next/standalone/.env
echo "  ✓ Removed dev DB + .env"

# 2. Prepare package directory
echo "[2/5] Preparing package directory..."
PKG_DIR="/tmp/install-v18.8"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/personal-site"

# 3. Copy standalone + essentials
echo "[3/5] Copying files..."
cp -r .next/standalone/. "$PKG_DIR/personal-site/"
cp -r public/. "$PKG_DIR/personal-site/public/"
cp install.sh "$PKG_DIR/personal-site/"
cp -r scripts/ "$PKG_DIR/personal-site/scripts/"
cp prisma/schema.prisma "$PKG_DIR/personal-site/prisma/"
cp VERSION.txt "$PKG_DIR/personal-site/"
cp PROJECT_LOG.md "$PKG_DIR/personal-site/"
cp package.json "$PKG_DIR/personal-site/package.json"

# Clean any leftover DBs / .env from package
find "$PKG_DIR" -name "*.db" -delete
find "$PKG_DIR" -name ".env*" -not -name ".env.example" -delete
find "$PKG_DIR" -name "*.log" -delete

# 4. Write README
echo "[4/5] Writing README..."
cat > "$PKG_DIR/personal-site/README.md" <<'EOF'
# Personal Site V18.8 — سایت شخصی

## نصب سریع

```bash
wget https://github.com/ldrcoir/ehsan-site-private/raw/main/public/install-v18.8.zip
unzip install-v18.8.zip
cd personal-site
sudo ./install.sh
```

## ورود ادمین

- URL: `http://YOUR_IP:3000/user-login`
- username: `admin`
- password: (توسط install.sh چاپ می‌شه — رمز تصادفی)

⚠️ بعد از اولین ورود، از پنل → تنظیمات → تغییر رمز عوض کن!

## ریست رمز ادمین (اگه فراموش کردی)

```bash
cd /home/ehsan/personal-site
sudo bash scripts/reset-admin-password.sh
```

## تنظیم reCAPTCHA (بعد از نصب)

1. به https://www.google.com/recaptcha/admin برو
2. سایت v2 ثبت کن
3. Site Key و Secret رو در `.env` بذار
4. `sudo systemctl restart personal-site`

## مستندات

- `VERSION.txt` — تاریخچه نسخه‌ها
- `PROJECT_LOG.md` — تاریخچه پروژه
- `TUTORIAL_FA_V18.8.docx` — آموزش کامل (فارسی)
EOF

# 5. Zip
echo "[5/5] Zipping..."
cd "$PKG_DIR"
zip -r -q /home/z/my-project/public/install-v18.8.zip personal-site/
cd /home/z/my-project

SIZE=$(du -sh public/install-v18.8.zip | cut -f1)
echo ""
echo "✅ Built: public/install-v18.8.zip ($SIZE)"
echo ""
echo "Contents:"
unzip -l public/install-v18.8.zip | tail -1
