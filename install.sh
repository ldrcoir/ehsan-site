#!/bin/bash
# ============================================================================
# install.sh — نصب سایت با یه دستور (اصلاح نهایی)
# ============================================================================
set -e

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SITE_DIR"

echo "=========================================="
echo "  نصب سایت شخصی"
echo "=========================================="
echo ""

# ============================================================================
# قدم ۱: ساخت Swap (برای VPS با RAM کم)
# ============================================================================
echo "[1/8] بررسی Swap..."
if [ ! -f /swapfile ]; then
    echo "  ساخت Swap (2GB)..."
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  ✅ Swap ساخته شد"
else
    echo "  ✅ Swap از قبل هست"
fi

# ============================================================================
# قدم ۲: نصب Node.js 22
# ============================================================================
echo ""
echo "[2/8] نصب Node.js 22..."
if command -v node &> /dev/null; then
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VER" -ge 20 ]; then
        echo "  ✅ Node.js نصبه ($(node -v))"
    else
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
        apt install -y nodejs
        echo "  ✅ Node.js آپدیت شد ($(node -v))"
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
    echo "  ✅ Node.js نصب شد ($(node -v))"
fi

# ============================================================================
# قدم ۳: نصب Nginx و Certbot
# ============================================================================
echo ""
echo "[3/8] نصب Nginx و Certbot..."
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx certbot python3-certbot-nginx sqlite3 python3
    systemctl enable nginx
    systemctl start nginx
    echo "  ✅ Nginx نصب شد"
else
    apt install -y certbot python3-certbot-nginx sqlite3 python3 2>/dev/null || true
    echo "  ✅ Nginx نصبه"
fi

# ============================================================================
# قدم ۴: فایروال
# ============================================================================
echo ""
echo "[4/8] فایروال..."
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
echo "  ✅ فایروال ست شد"

# ============================================================================
# قدم ۵: نصب وابستگی‌ها
# ============================================================================
echo ""
echo "[5/8] نصب وابستگی‌ها (npm install)..."
npm config set registry https://registry.npmmirror.com
npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -5
echo "  ✅ وابستگی‌ها نصب شد"

# ============================================================================
# قدم ۶: دیتابیس
# ============================================================================
echo ""
echo "[6/8] تنظیم دیتابیس..."
mkdir -p db
touch db/custom.db
rm -f db/custom.db-journal db/custom.db-wal db/custom.db-shm

# استفاده از prisma local (نه npx)
./node_modules/.bin/prisma generate 2>&1 | tail -3
./node_modules/.bin/prisma db push --accept-data-loss 2>&1 | tail -3

# seed فقط اگه دیتابیس خالی باشه
TABLES=$(sqlite3 db/custom.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
if [ "$TABLES" = "0" ] || [ -z "$TABLES" ]; then
    echo "  seeding..."
    python3 scripts/seed_content.py 2>&1 | tail -2 || true
    python3 scripts/seed_equipment.py 2>&1 | tail -2 || true
    python3 scripts/seed_texts.py 2>&1 | tail -2 || true
    python3 scripts/seed_access_users.py 2>&1 | tail -2 || true
else
    echo "  دیتابیس آماده ($TABLES جدول)"
fi
echo "  ✅ دیتابیس آماده"

# ============================================================================
# قدم ۷: SESSION_SECRET و build
# ============================================================================
echo ""
echo "[7/8] SESSION_SECRET و build..."
SECRET=$(openssl rand -hex 32)
if [ ! -f ".env" ]; then
    cat > .env << EOF
DATABASE_URL="file:./db/custom.db"
NODE_ENV="production"
PORT=3000
HOSTNAME="0.0.0.0"
SESSION_SECRET="$SECRET"
EOF
else
    if grep -q "SESSION_SECRET" .env; then
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=\"$SECRET\"/g" .env
    else
        echo "SESSION_SECRET=\"$SECRET\"" >> .env
    fi
fi

# build با next local
./node_modules/.bin/next build 2>&1 | tail -5
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
echo "  ✅ build شد"

# پاک‌سازی (صرفه‌جویی در فضا)
npm prune --production --legacy-peer-deps 2>&1 | tail -2
echo "  ✅ پاک شد"

# ============================================================================
# قدم ۸: اجرای سایت + Nginx
# ============================================================================
echo ""
echo "[8/8] اجرای سایت..."

# systemd service
cat > /etc/systemd/system/personal-site.service << EOF
[Unit]
Description=Personal Site
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$SITE_DIR
ExecStart=$(which node) .next/standalone/server.js
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
else
    echo "  ⚠ چک کن: systemctl status personal-site"
    systemctl status personal-site --no-pager | tail -10
fi

# ============================================================================
# SSL
# ============================================================================
echo ""
read -p "DNS ست شده؟ (y/n): " DNS_OK
if [ "$DNS_OK" = "y" ] || [ "$DNS_OK" = "Y" ]; then
    for domain in ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir; do
        echo "  SSL برای $domain..."
        certbot --nginx -d $domain -d www.$domain --non-interactive --agree-tos -m admin@$domain --redirect 2>&1 | tail -3 || true
    done
    systemctl reload nginx
    echo "  ✅ SSL گرفته شد"
else
    echo "  ⚠ بعداً: sudo certbot --nginx -d ehsanmorad.ir"
fi

echo ""
echo "=========================================="
echo "  ✅ نصب کامل شد!"
echo "=========================================="
echo ""
echo "  دامنه‌ها:"
echo "    https://ehsanmorad.ir"
echo "    https://ehsan-morad.ir"
echo "    https://ehsanmorad.id.ir"
echo ""
echo "  یا: http://31.70.76.10:3000"
echo ""
echo "  ادمین: https://ehsanmorad.ir#admin"
echo "  username: admin"
echo "  password: admin123"
echo "  ⚠️ از Settings رمز رو عوض کن!"
echo ""
echo "  دستورات:"
echo "    systemctl status personal-site"
echo "    systemctl restart personal-site"
echo "    journalctl -u personal-site -f"
echo ""
echo "=========================================="
