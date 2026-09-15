#!/bin/bash
# ============================================================================
# quick-install.sh — نصب سریع سایت (بدون Caddy، فقط Docker)
# ============================================================================
# فقط ۳ قدم:
#   1. این فایل و zip رو روی VPS ببر
#   2. unzip کن
#   3. این اسکریپت رو اجرا کن
# ============================================================================

set -e

echo "=========================================="
echo "  نصب سریع سایت"
echo "=========================================="
echo ""

# قدم ۱: نصب Docker
echo "[1/3] بررسی Docker..."
if ! command -v docker &> /dev/null; then
    echo "  نصب Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  ✅ Docker نصب شد"
else
    echo "  ✅ Docker از قبل نصب است"
fi

# قدم ۲: Extract
echo ""
echo "[2/3] Extract سایت..."
if [ ! -d "personal-site" ]; then
    if [ -f "EhsanMorad-site-final.zip" ]; then
        unzip -q EhsanMorad-site-final.zip
    elif [ -f "personal-site-v19.3.zip" ]; then
        unzip -q personal-site-v19.3.zip
    else
        echo "  ❌ فایل zip پیدا نشد!"
        echo "  فایل EhsanMorad-site-final.zip رو کنار این اسکریپت بذار."
        exit 1
    fi
fi
cd personal-site
echo "  ✅ Extract شد"

# قدم ۳: اجرا
echo ""
echo "[3/3] اجرای Docker..."
echo "  (دفعه اول ۳-۵ دقیقه طول می‌کشه — داره دانلود می‌کنه)"
echo ""

docker-compose up -d --build

# صبر تا بالا بیاد
echo ""
echo "  صبر ۶۰ ثانیه تا سرور بالا بیاد..."
sleep 60

# تست
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo ""
    echo "=========================================="
    echo "  ✅ نصب کامل شد!"
    echo "=========================================="
    echo ""
    echo "  سایت روی: http://localhost:3000"
    echo ""
    echo "  ورود ادمین:"
    echo "    URL: http://YOUR_IP:3000#admin"
    echo "    username: admin"
    echo "    password: admin123"
    echo "    ⚠️ حتماً رمز رو از Settings عوض کن!"
    echo ""
    echo "  دستورات مفید:"
    echo "    docker-compose logs -f     # لاگ"
    echo "    docker-compose restart     # restart"
    echo "    docker-compose down        # توقف"
    echo "    docker-compose up -d       # اجرا"
    echo ""
    echo "=========================================="
else
    echo ""
    echo "  ⚠ سایت هنوز بالا نیومده. چک کن:"
    echo "    docker-compose logs -f"
fi
