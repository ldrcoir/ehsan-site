#!/bin/bash
# ============================================================================
# install.sh — نصب خودکار سایت با یه دستور
# ============================================================================
# این اسکریپت خودش این کارا رو می‌کنه:
#   ۱. Docker رو نصب می‌کنه (اگه نباشه)
#   ۲. فایروال رو ست می‌کنه
#   ۳. سایت رو extract می‌کنه
#   ۴. docker compose up می‌زنه
#   ۵. صبر می‌کنه تا بالا بیاد
#   ۶. تست می‌کنه
#   ۷. SESSION_SECRET تولید می‌کنه
#
# نحوه استفاده:
#   scp personal-site.zip + install.sh رو روی VPS ببر
#   chmod +x install.sh
#   sudo ./install.sh
# ============================================================================

set -e

echo "=========================================="
echo "  نصب خودکار سایت"
echo "  IP: 31.70.76.10"
echo "=========================================="
echo ""

# ============================================================================
# قدم ۱: نصب Docker (اگه نصب نیست)
# ============================================================================
echo "[1/7] بررسی Docker..."
if command -v docker &> /dev/null; then
    echo "  ✅ Docker از قبل نصبه"
else
    echo "  در حال نصب Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  ✅ Docker نصب شد"
fi

# ============================================================================
# قدم ۲: فایروال
# ============================================================================
echo ""
echo "[2/7] تنظیم فایروال..."
if ! command -v ufw &> /dev/null; then
    apt update && apt install -y ufw 2>/dev/null || true
fi
ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw allow 3000/tcp 2>/dev/null || true
echo "  ✅ فایروال ست شد (پورت ۲۲، ۸۰، ۴۴۳، ۳۰۰۰)"

# ============================================================================
# قدم ۳: پیدا کردن و extract کردن zip
# ============================================================================
echo ""
echo "[3/7] extract کردن سایت..."

# پیدا کردن فایل zip (هر چی نام شخصی-سایت.zip یا personal-site.zip باشه)
ZIP_FILE=""
for f in personal-site.zip personal-site-v19*.zip EhsanMorad*.zip; do
    if [ -f "$f" ]; then
        ZIP_FILE="$f"
        break
    fi
done

if [ -z "$ZIP_FILE" ]; then
    echo "  ❌ فایل zip پیدا نشد!"
    echo "  فایل personal-site.zip رو کنار این اسکریپت بذار."
    exit 1
fi

echo "  استفاده از: $ZIP_FILE"

# اگه قبلاً extract شده، حذف کن
rm -rf personal-site

# extract
unzip -q "$ZIP_FILE"

# وارد پوشه‌ی personal-site شو (که توی zip هست)
if [ -d "personal-site" ]; then
    cd personal-site
elif [ -d "ehsanmorad-final/personal-site" ]; then
    cd ehsanmorad-final/personal-site
else
    echo "  ❌ ساختار zip ناشناخته!"
    ls -la
    exit 1
fi

echo "  ✅ extract شد"

# ============================================================================
# قدم ۴: تولید SESSION_SECRET
# ============================================================================
echo ""
echo "[4/7] تولید SESSION_SECRET..."
if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -hex 32)
else
    SECRET=$(head -c 32 /dev/urandom | xxd -p | head -c 64)
fi

# اگه .env وجود نداره، بساز
if [ ! -f ".env" ]; then
    cat > .env << EOF
DATABASE_URL="file:./db/custom.db"
NODE_ENV="development"
PORT=3000
HOSTNAME="0.0.0.0"
SESSION_SECRET="$SECRET"
EOF
else
    # اگه SESSION_SECRET توش هست، عوضش
    if grep -q "SESSION_SECRET" .env; then
        sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=\"$SECRET\"/g" .env
    else
        echo "SESSION_SECRET=\"$SECRET\"" >> .env
    fi
fi
echo "  ✅ SESSION_SECRET تولید شد"

# ============================================================================
# قدم ۵: اجرای Docker
# ============================================================================
echo ""
echo "[5/7] اجرای Docker..."
echo "  (دفعه اول ۳-۵ دقیقه طول می‌کشه — داره دانلود می‌کنه)"
echo ""

docker compose up -d --build 2>&1 | tail -20

# ============================================================================
# قدم ۶: صبر تا بالا بیاد
# ============================================================================
echo ""
echo "[6/7] صبر ۹۰ ثانیه تا سرور بالا بیاد..."
sleep 90

# ============================================================================
# قدم ۷: تست
# ============================================================================
echo ""
echo "[7/7] تست سایت..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "  ✅ سایت بالا اومد!"
    SUCCESS=true
else
    echo "  ⚠ سایت هنوز بالا نیومده — ۳۰ ثانیه دیگه صبر کن..."
    sleep 30
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
        echo "  ✅ سایت بالا اومد!"
        SUCCESS=true
    else
        echo "  ❌ سایت بالا نیومد. لاگ رو ببین:"
        docker compose logs --tail 20
        SUCCESS=false
    fi
fi

# ============================================================================
# نمایش نتیجه
# ============================================================================
echo ""
echo "=========================================="
if [ "$SUCCESS" = "true" ]; then
    echo "  ✅ نصب کامل شد!"
else
    echo "  ⚠ نصب انجام شد ولی سایت هنوز بالا نیومده"
fi
echo "=========================================="
echo ""
echo "  آدرس سایت:"
echo "    http://31.70.76.10:3000"
echo ""
echo "  ورود ادمین:"
echo "    http://31.70.76.10:3000#admin"
echo "    username: admin"
echo "    password: admin123"
echo "    ⚠️ حتماً از Settings رمز رو عوض کن!"
echo ""
echo "  دستورات مفید:"
echo "    docker compose logs -f        # دیدن لاگ"
echo "    docker compose restart        # restart"
echo "    docker compose down           # توقف"
echo "    docker compose up -d          # اجرای دوباره"
echo ""
echo "  دامنه‌ها (اگه DNS ست کرده باشی):"
echo "    https://ehsanmorad.ir"
echo "    https://ehsan-morad.ir"
echo "    https://ehsanmorad.id.ir"
echo ""
echo "=========================================="
