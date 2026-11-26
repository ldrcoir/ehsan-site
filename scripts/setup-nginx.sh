#!/bin/bash
# ============================================================================
# setup-nginx.sh — نصب کامل nginx برای ۳ دامنه + SSL
# ============================================================================
# یک دستور کافی است:
#   bash setup-nginx.sh
# ============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

DOMAINS="ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir"

echo "» نصب nginx..."
apt-get update -qq
apt-get install -y nginx python3-certbot-nginx >/dev/null 2>&1

echo "» کپی کانفیگ..."
cp nginx-ehsanmorad.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/nginx-ehsanmorad.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "» تست سینتکس..."
nginx -t

echo "» استارت سرویس..."
systemctl enable nginx
systemctl restart nginx

echo "» چک سرویس ehsan-site..."
systemctl is-active --quiet ehsan-site || systemctl start ehsan-site
sleep 2

echo "» تست محلی..."
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" http://localhost/ || true

echo "» دریافت SSL برای ۳ دامنه..."
for d in $DOMAINS; do
    echo "  - $d"
    certbot --nginx -d "$d" -d "www.$d" --redirect --non-interactive \
        --agree-tos --register-unsafely-without-email 2>&1 | tail -2 || \
        echo "    ⚠ برای $d SSL گرفته نشد — DNS را چک کن: host $d"
done

echo ""
echo "» وضعیت نهایی:"
echo "  nginx:       $(systemctl is-active nginx)"
echo "  ehsan-site:  $(systemctl is-active ehsan-site)"
ss -tlnp | grep -E ':80|:443|:3000' | awk '{print "  پورت:", $4}'

echo ""
echo "✅ تمام. از مرورگر تست کن:"
echo "  https://ehsanmorad.ir"
echo "  https://ehsan-morad.ir"
echo "  https://ehsanmorad.id.ir"
