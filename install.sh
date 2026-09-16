#!/bin/bash
# ============================================================================
# install.sh — نصب سایت (نسخه نهایی ۳.۰ — واقعاً سالم)
# ============================================================================
set -e

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SITE_DIR"

echo "=========================================="
echo "  نصب سایت شخصی"
echo "=========================================="
echo ""

# ============================================================================
# قدم ۱: Swap
# ============================================================================
echo "[1/8] Swap..."
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
echo "[2/8] Node.js..."
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
echo "[3/8] Nginx..."
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
echo "[5/8] نصب وابستگی‌ها (۵-۱۵ دقیقه)..."
npm config set registry https://registry.npmmirror.com
npm install --legacy-peer-deps --no-audit --no-fund 2>&1 | tail -3
echo "  ✅ وابستگی‌ها نصب شد"

# ============================================================================
# قدم ۶: دیتابیس
# ============================================================================
echo ""
echo "[6/8] دیتابیس..."
mkdir -p db
touch db/custom.db
rm -f db/custom.db-journal db/custom.db-wal db/custom.db-shm

# .env با مسیر مطلق (مهم برای standalone)
SECRET=$(openssl rand -hex 32)
cat > .env << EOF
DATABASE_URL="file:$SITE_DIR/db/custom.db"
NODE_ENV="production"
PORT=3000
HOSTNAME="0.0.0.0"
SESSION_SECRET="$SECRET"
EOF

# prisma
./node_modules/.bin/prisma generate 2>&1 | tail -2
./node_modules/.bin/prisma db push --accept-data-loss 2>&1 | tail -2

# seed فقط اگه خالی باشه
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

# چک کن کاربر admin وجود داره
ADMIN_EXISTS=$(sqlite3 db/custom.db "SELECT count(*) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "0")
if [ "$ADMIN_EXISTS" = "0" ]; then
    echo "  ساخت کاربر admin..."
    python3 scripts/seed_access_users.py 2>&1 | tail -1 || true
fi
echo "  ✅ دیتابیس آماده"

# ============================================================================
# قدم ۷: Build
# ============================================================================
echo ""
echo "[7/8] Build..."
./node_modules/.bin/next build 2>&1 | tail -5
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true
echo "  ✅ Build شد"

# پاک‌سازی devDependencies
npm prune --production --legacy-peer-deps 2>&1 | tail -2
echo "  ✅ پاک شد"

# ============================================================================
# قدم ۸: اجرا + Nginx
# ============================================================================
echo ""
echo "[8/8] اجرا..."

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
fi

# تست login
echo ""
echo "تست ورود..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:3000/api/user/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' 2>/dev/null)
if echo "$LOGIN_RESULT" | grep -q '"ok":true'; then
    echo "  ✅ ورود کار می‌کنه"
else
    echo "  ⚠ ورود مشکل داره: $LOGIN_RESULT"
fi

echo ""
echo "=========================================="
echo "  ✅ نصب کامل شد!"
echo "=========================================="
echo ""
echo "  ورود ادمین:"
echo "    http://31.70.76.10:3000/user-login"
echo "    یا: http://ehsanmorad.ir/user-login"
echo ""
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
