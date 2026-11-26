#!/bin/bash
# ============================================================================
# fix-nginx.sh — عیب‌یابی و نصب دستی nginx وقتی install.sh شکست خورده
# ============================================================================
# استفاده:
#   ssh root@31.70.76.10
#   cd /home/ehsan/personal-site
#   bash scripts/fix-nginx.sh
#
# این اسکریپت:
#   ۱. وضعیت nginx را چک می‌کند (نصب است؟ اجرا می‌شود؟)
#   ۲. اگر نصب نیست، نصب می‌کند
#   ۳. کانفیگ را کپی و سینتکس را چک می‌کند
#   ۴. سرویس را استارت می‌کند
#   ۵. تست نهایی می‌کند که سایت بالا آمده یا نه
# ============================================================================

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "============================================================"
echo "  عیب‌یابی nginx — $(date)"
echo "  مسیر پروژه: $PROJECT_ROOT"
echo "============================================================"
echo ""

# ---- مرحله ۱: چک نصب بودن nginx ----
echo "[۱/۶] چک نصب بودن nginx..."
if command -v nginx &>/dev/null; then
    NGINX_VER=$(nginx -v 2>&1)
    echo "  ✅ nginx نصب است: $NGINX_VER"
else
    echo "  ❌ nginx نصب نیست — تلاش برای نصب..."
    echo ""
    echo "  [۱.۱] apt-get update..."
    if ! apt-get update -y 2>&1 | tail -5; then
        echo "  ❌ apt-get update شکست خورد — اتصال اینترنت یا sources.list را چک کن"
        echo "      بررسی: cat /etc/apt/sources.list"
        echo "      تست:   ping -c 3 deb.debian.org"
        exit 1
    fi

    echo ""
    echo "  [۱.۲] apt-get install nginx..."
    if ! apt-get install -y nginx 2>&1 | tail -10; then
        echo "  ❌ نصب nginx شکست خورد"
        echo "      راه‌حل‌های ممکن:"
        echo "      - دیسک پر است: df -h"
        echo "      - apt lock: lsof /var/lib/dpkg/lock-frontend"
        echo "      - بسته خراب: apt --fix-broken install"
        exit 1
    fi

    if command -v nginx &>/dev/null; then
        echo "  ✅ nginx نصب شد: $(nginx -v 2>&1)"
    else
        echo "  ❌ هنوز نصب نیست — خروجی بالا را بخوان"
        exit 1
    fi
fi

# ---- مرحله ۲: چک سرویس systemd ----
echo ""
echo "[۲/۶] چک سرویس systemd nginx..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "  ✅ سرویس nginx در حال اجراست"
else
    echo "  ⚠ سرویس nginx اجرا نمی‌شود — استارت می‌کنیم..."
    systemctl enable nginx 2>&1 | tail -3
    if ! systemctl start nginx 2>&1 | tail -10; then
        echo "  ❌ استارت شکست خورد — لاگ:"
        journalctl -u nginx -n 20 --no-pager
        echo ""
        echo "  بررسی پورت ۸۰:"
        ss -tlnp | grep ':80 ' || echo "    پورت ۸۰ اشغال نیست"
        echo ""
        echo "  بررسی کانفیگ:"
        nginx -t 2>&1
        exit 1
    fi
    sleep 2
    if systemctl is-active --quiet nginx; then
        echo "  ✅ سرویس nginx استارت شد"
    else
        echo "  ❌ هنوز اجرا نمی‌شود — journalctl -u nginx -n 30 را ببین"
        exit 1
    fi
fi

# ---- مرحله ۳: کپی کانفیگ سایت ----
echo ""
echo "[۳/۶] کپی کانفیگ nginx-ehsanmorad..."
SOURCE_CONF="$PROJECT_ROOT/nginx-ehsanmorad.conf"
TARGET_CONF=/etc/nginx/sites-available/nginx-ehsanmorad.conf

if [ ! -f "$SOURCE_CONF" ]; then
    echo "  ❌ فایل $SOURCE_CONF پیدا نیست"
    echo "      بررسی: ls -la $PROJECT_ROOT/"
    exit 1
fi

# اگر کانفیگ موجود TLS دارد، بازنویسی نکن (certbot مدیریت می‌کند)
if [ -f "$TARGET_CONF" ] && grep -qE 'ssl_certificate|443 ssl' "$TARGET_CONF"; then
    echo "  ⏭ کانفیگ نصب‌شده TLS دارد — بازنویسی نشد (certbot مدیریت می‌کند)"
else
    cp "$SOURCE_CONF" "$TARGET_CONF"
    echo "  ✅ کانفیگ کپی شد: $TARGET_CONF"
fi

# symlink به sites-enabled
SITES_ENABLED=/etc/nginx/sites-enabled
if [ -d "$SITES_ENABLED" ]; then
    ln -sf "$TARGET_CONF" "$SITES_ENABLED/nginx-ehsanmorad.conf"
    echo "  ✅ symlink ساخته شد"
    # حذف سایت default که پورت ۸۰ را اشغال می‌کند
    rm -f "$SITES_ENABLED/default" 2>/dev/null && echo "  ✅ سایت default حذف شد"
else
    # برخی نصب‌ها sites-enabled ندارند — از conf.d استفاده کن
    echo "  ⚠ sites-enabled پیدا نیست — استفاده از conf.d"
    mkdir -p /etc/nginx/conf.d
    cp "$SOURCE_CONF" /etc/nginx/conf.d/nginx-ehsanmorad.conf
fi

# ---- مرحله ۴: تست سینتکس کانفیگ ----
echo ""
echo "[۴/۶] تست سینتکس nginx..."
if nginx -t 2>&1; then
    echo "  ✅ سینتکس درست است"
else
    echo "  ❌ سینتکس کانفیگ خراب است"
    echo ""
    echo "  محتوای کانفیگ:"
    cat "$TARGET_CONF"
    echo ""
    echo "  بررسیها:"
    echo "    - آیا پورت ۳۰۰۰ (Next.js) اجرا می‌شود؟ ss -tlnp | grep 3000"
    echo "    - آیا مسیر /home/ehsan/personal-site درست است؟"
    exit 1
fi

# ---- مرحله ۵: reload ----
echo ""
echo "[۵/۶] reload nginx..."
systemctl reload nginx 2>&1
sleep 1
if systemctl is-active --quiet nginx; then
    echo "  ✅ nginx reload شد و در حال اجراست"
else
    echo "  ⚠ reload شکست خورد — restart می‌کنیم..."
    systemctl restart nginx
    sleep 2
    systemctl is-active --quiet nginx && echo "  ✅ nginx restart شد" || echo "  ❌ هنوز مشکل دارد"
fi

# ---- مرحله ۶: تست نهایی ----
echo ""
echo "[۶/۶] تست نهایی..."
echo ""
echo "  پورت‌های در حال شنید:"
ss -tlnp | grep -E ':80|:443|:3000' || echo "    هیچ‌کدام اجرا نمی‌شوند!"
echo ""
echo "  تست HTTP محلی (پورت ۸۰):"
curl -sS -o /dev/null -w "    HTTP %{http_code} — %{time_total}s\n" http://localhost/ 2>&1 || \
    echo "    ❌ اتصال به localhost:80 ناموفق"
echo ""
echo "  تست HTTP محلی (پورت ۳۰۰۰ — Next.js):"
curl -sS -o /dev/null -w "    HTTP %{http_code} — %{time_total}s\n" http://localhost:3000/ 2>&1 || \
    echo "    ⚠ Next.js روی پورت ۳۰۰۰ اجرا نمی‌شود — systemctl status ehsan-site"

echo ""
echo "============================================================"
echo "  خلاصه وضعیت:"
echo "============================================================"
echo "  nginx نصب است:        $(command -v nginx &>/dev/null && echo '✅ بله' || echo '❌ خیر')"
echo "  nginx اجرا می‌شود:    $(systemctl is-active --quiet nginx && echo '✅ بله' || echo '❌ خیر')"
echo "  سرویس ehsan-site:     $(systemctl is-active --quiet ehsan-site && echo '✅ بله' || echo '❌ خیر')"
echo "  پورت ۸۰ باز:          $(ss -tlnp | grep -q ':80 ' && echo '✅ بله' || echo '❌ خیر')"
echo "  پورت ۳۰۰۰ باز:        $(ss -tlnp | grep -q ':3000 ' && echo '✅ بله' || echo '❌ خیر')"
echo ""
echo "  اگر همه ✅ هستند، از مرورگر تست کن:"
echo "    http://31.70.76.10/"
echo "    https://ehsanmorad.ir/   (اگر DNS ست شده)"
echo ""
echo "  اگر پورت ۳۰۰۰ ❌ است:"
echo "    systemctl status ehsan-site"
echo "    journalctl -u ehsan-site -n 50"
echo ""
echo "  اگر پورت ۸۰ ❌ است:"
echo "    systemctl status nginx"
echo "    journalctl -u nginx -n 30"
echo "============================================================"
