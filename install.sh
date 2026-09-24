#!/bin/bash
# ============================================================================
# install.sh — نصب سایت با یه دستور (V16.0 — رفع مشکل SESSION_SECRET)
# ============================================================================
set -e

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SITE_DIR"

echo "=========================================="
echo "  نصب سایت شخصی V16.0"
echo "=========================================="
echo ""

# ============================================================================
# قدم ۱: Swap
# ============================================================================
echo "[1/9] Swap..."
if ! swapon --show | grep -q swap; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  ✅ Swap ساخته شد"
else
    echo "  ✅ Swap هست"
fi

# ============================================================================
# قدم ۲: Node.js
# ============================================================================
echo ""
echo "[2/9] Node.js..."
if command -v node &> /dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -ge 20 ]; then
        echo "  ✅ Node.js نصبه ($(node -v))"
    else
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt install -y nodejs
        echo "  ✅ Node.js آپدیت شد"
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    echo "  ✅ Node.js نصب شد ($(node -v))"
fi

# ============================================================================
# قدم ۳: Nginx + tools
# ============================================================================
echo ""
echo "[3/9] Nginx..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx sqlite3 python3
    systemctl enable nginx
    systemctl start nginx
    echo "  ✅ Nginx نصب شد"
else
    apt install -y sqlite3 python3 2>/dev/null || true
    echo "  ✅ Nginx نصبه"
fi

# ============================================================================
# قدم ۴: فایروال
# ============================================================================
echo ""
echo "[4/9] فایروال..."
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
echo "  ✅ فایروال ست شد"

# ============================================================================
# قدم ۵: SESSION_SECRET و .env — قبل از build!
# ============================================================================
echo ""
echo "[5/9] SESSION_SECRET و .env..."
SECRET=$(openssl rand -hex 32)
mkdir -p db
cat > .env << EOF
DATABASE_URL="file:$SITE_DIR/db/custom.db"
NODE_ENV="production"
PORT=3000
HOSTNAME="0.0.0.0"
SESSION_SECRET="$SECRET"
NEXT_PUBLIC_SITE_URL="https://ehsanmorad.ir"
RECAPTCHA_SECRET=""
NEXT_PUBLIC_RECAPTCHA_SITEKEY=""
EOF
echo "  ✅ SESSION_SECRET تولید شد"

# ============================================================================
# قدم ۶: نصب وابستگی‌ها
# ============================================================================
echo ""
echo "[6/9] نصب وابستگی‌ها (npm install — ۵-۱۵ دقیقه)..."
npm config set registry https://registry.npmmirror.com
npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -3
echo "  ✅ وابستگی‌ها نصب شد"

# ============================================================================
# قدم ۷: دیتابیس
# ============================================================================
echo ""
echo "[7/9] دیتابیس..."
touch db/custom.db
rm -f db/custom.db-journal db/custom.db-wal db/custom.db-shm
./node_modules/.bin/prisma generate 2>&1 | tail -2
./node_modules/.bin/prisma db push --accept-data-loss 2>&1 | tail -2

TABLES=$(sqlite3 db/custom.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
if [ "$TABLES" = "0" ] || [ -z "$TABLES" ]; then
    echo "  seeding..."
    python3 scripts/seed_content.py 2>&1 | tail -1 || true
    python3 scripts/seed_equipment.py 2>&1 | tail -1 || true
    python3 scripts/seed_texts.py 2>&1 | tail -1 || true
    python3 scripts/seed_access_users.py 2>&1 | tail -1 || true
else
    echo "  دیتابیس آماده ($TABLES جدول)"
fi
echo "  ✅ دیتابیس آماده"

# ============================================================================
# قدم ۸: Build
# ============================================================================
echo ""
echo "[8/9] Build..."
./node_modules/.bin/next build 2>&1 | tail -5
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
echo "  ✅ Build شد"

# پاک‌سازی devDependencies
npm prune --production --legacy-peer-deps 2>&1 | tail -2
echo "  ✅ پاک شد"

# کپی .env به standalone (مهم! standalone یه پوشه‌ی جدا هست)
cp .env .next/standalone/.env
cp -r db .next/standalone/db 2>/dev/null || true

# ============================================================================
# قدم ۹: اجرا + Nginx
# ============================================================================
echo ""
echo "[9/9] اجرا..."

cat > /etc/systemd/system/personal-site.service << EOF
[Unit]
Description=Personal Site
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$SITE_DIR/.next/standalone
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=HOSTNAME=0.0.0.0
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable personal-site
systemctl restart personal-site
sleep 5

# Nginx
cp nginx-ehsanmorad.conf /etc/nginx/sites-available/nginx-ehsanmorad.conf 2>/dev/null || true
ln -sf /etc/nginx/sites-available/nginx-ehsanmorad.conf /etc/nginx/sites-enabled/nginx-ehsanmorad.conf 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t 2>&1 && systemctl reload nginx

# تست
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "  ✅ سایت بالا اومد"
    SUCCESS=true
else
    echo "  ⚠ چک کن: systemctl status personal-site"
    SUCCESS=false
fi

# ============================================================================
# خروجی نهایی
# ============================================================================
echo ""
echo "=========================================="
if [ "$SUCCESS" = "true" ]; then
    echo "  ✅ نصب کامل شد!"
else
    echo "  ⚠ نصب انجام شد ولی سایت بالا نیومد"
    echo "  دستور بررسی: journalctl -u personal-site -n 20"
fi
echo "=========================================="
echo ""
echo "  آدرس‌ها:"
echo "    http://31.70.76.10:3000"
echo "    http://ehsanmorad.ir (اگه DNS ست شده)"
echo ""
echo "  ورود ادمین:"
echo "    http://ehsanmorad.ir/user-login"
echo "    username: admin"
echo "    password: admin123"
echo "    ⚠️ از پنل رمز رو عوض کن!"
echo ""
echo "  دستورات:"
echo "    systemctl status personal-site"
echo "    systemctl restart personal-site"
echo "    journalctl -u personal-site -f"
echo ""
echo "=========================================="
