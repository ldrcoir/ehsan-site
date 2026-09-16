#!/bin/bash
# ============================================================================
# setup-ehsanmorad.sh — اسکریپت راه‌اندازی کامل سایت احسان مراد روی VPS
# ============================================================================
# این اسکریپت:
# 1. Docker و Docker Compose رو نصب می‌کنه (اگه نباشن)
# 2. Caddy رو نصب می‌کنه
# 3. Caddyfile رو با ۳ دامنه ست می‌کنه
# 4. سایت رو از zip extract و اجرا می‌کنه
# 5. فایروال رو ست می‌کنه
#
# نحوه استفاده:
#   1. این فایل و personal-site-v19.3.zip رو روی VPS آپلود کن
#   2. chmod +x setup-ehsanmorad.sh
#   3. sudo ./setup-ehsanmorad.sh
#
# IP VPS: 31.70.76.10
# دامنه‌ها: ehsanmorad.ir, ehsan-morad.ir, ehsanmorad.id.ir
# ============================================================================

set -e

echo "=========================================="
echo "  راه‌اندازی سایت احسان مراد"
echo "  IP: 31.70.76.10"
echo "  دامنه‌ها: ehsanmorad.ir, ehsan-morad.ir, ehsanmorad.id.ir"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# قدم ۱: نصب Docker (اگه نصب نیست)
# ---------------------------------------------------------------------------
echo "[1/6] بررسی نصب Docker..."
if ! command -v docker &> /dev/null; then
    echo "  Docker نصب نیست. در حال نصب..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  ✅ Docker نصب شد"
else
    echo "  ✅ Docker از قبل نصب است"
fi

# ---------------------------------------------------------------------------
# قدم ۲: نصب Caddy (اگه نصب نیست)
# ---------------------------------------------------------------------------
echo ""
echo "[2/6] بررسی نصب Caddy..."
if ! command -v caddy &> /dev/null; then
    echo "  Caddy نصب نیست. در حال نصب..."
    apt update
    apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install -y caddy
    echo "  ✅ Caddy نصب شد"
else
    echo "  ✅ Caddy از قبل نصب است"
fi

# ---------------------------------------------------------------------------
# قدم ۳: پیکربندی Caddyfile
# ---------------------------------------------------------------------------
echo ""
echo "[3/6] پیکربندی Caddyfile با ۳ دامنه..."

cat > /etc/caddy/Caddyfile << 'CADDYEOF'
ehsanmorad.ir, www.ehsanmorad.ir {
    reverse_proxy localhost:3000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
    encode gzip zstd
}

ehsan-morad.ir, www.ehsan-morad.ir {
    reverse_proxy localhost:3000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
    encode gzip zstd
}

ehsanmorad.id.ir, www.ehsanmorad.id.ir {
    reverse_proxy localhost:3000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
    }
    encode gzip zstd
}
CADDYEOF

systemctl restart caddy
systemctl enable caddy
echo "  ✅ Caddyfile ست شد و Caddy restart شد"

# ---------------------------------------------------------------------------
# قدم ۴: Extract و اجرای سایت
# ---------------------------------------------------------------------------
echo ""
echo "[4/6] Extract و اجرای سایت..."

if [ ! -f "personal-site-v19.3.zip" ]; then
    echo "  ❌ فایل personal-site-v19.3.zip پیدا نشد!"
    echo "  لطفاً این فایل رو در همین مسیر آپلود کن."
    exit 1
fi

# اگه قبلاً extract شده، حذف کن
rm -rf personal-site-v19

# Extract
unzip -q personal-site-v19.3.zip
cd personal-site-v19

# اجرای Docker
echo "  در حال build و اجرای Docker (۳-۵ دقیقه طول می‌کشه)..."
docker-compose up -d --build

# صبر تا بالا بیاد
echo "  صبر ۳۰ ثانیه تا سرور بالا بیاد..."
sleep 30

# تست
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo "  ✅ سایت روی localhost:3000 بالا اومد"
else
    echo "  ⚠ سایت هنوز بالا نیومده. چک کن:"
    echo "    docker-compose logs -f"
fi

cd ..

# ---------------------------------------------------------------------------
# قدم ۵: فایروال
# ---------------------------------------------------------------------------
echo ""
echo "[5/6] تنظیم فایروال..."

if ! command -v ufw &> /dev/null; then
    apt install -y ufw
fi

ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "  ✅ فایروال فعال شد (پورت‌های 22, 80, 443 باز)"

# ---------------------------------------------------------------------------
# قدم ۶: تولید SESSION_SECRET
# ---------------------------------------------------------------------------
echo ""
echo "[6/6] تولید SESSION_SECRET..."

cd personal-site-v19
SECRET=$(openssl rand -hex 32)

# اگه .env وجود نداره، از .env.example بساز
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

# SESSION_SECRET رو در .env جایگزین کن
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=\"$SECRET\"/g" .env
echo "  ✅ SESSION_SECRET تولید و در .env ست شد"

echo ""
echo "=========================================="
echo "  ✅ نصب کامل شد!"
echo "=========================================="
echo ""
echo "  سایت‌ها:"
echo "    https://ehsanmorad.ir"
echo "    https://ehsan-morad.ir"
echo "    https://ehsanmorad.id.ir"
echo ""
echo "  ورود ادمین:"
echo "    https://ehsanmorad.ir#admin"
echo "    username: admin"
echo "    password: admin123"
echo "    ⚠️ حتماً از پنل settings رمز رو عوض کن!"
echo ""
echo "  دستورات مفید:"
echo "    docker-compose logs -f          # لاگ سایت"
echo "    docker-compose restart          # restart سایت"
echo "    docker-compose down             # توقف سایت"
echo "    sudo systemctl status caddy     # وضعیت Caddy"
echo "    sudo journalctl -u caddy -f     # لاگ Caddy"
echo ""
echo "=========================================="
