#!/bin/bash
# ============================================================================
# one-shot-nginx.sh — یک دستور، همه چیز خودکار
# ============================================================================
# کافی است این را روی سرور اجرا کنی:
#   curl -sL https://raw.githubusercontent.com/ldrcoir/ehsan-site/main/scripts/one-shot-nginx.sh | bash
#
# نیازی به پوشه personal-site، نیازی به clone کردن ریپو، نیازی به هیچ چیز.
# فقط nginx + کانفیگ ۳ دامنه + SSL + استارت سرویس.
# ============================================================================
set -e

DOMAINS="ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir"
APP_PORT=3000

echo "=========================================="
echo "  نصب nginx + SSL برای ۳ دامنه"
echo "  $DOMAINS"
echo "=========================================="

# ---- ۱. نصب nginx و certbot ----
echo "» [۱/۶] نصب nginx و certbot..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq nginx python3-certbot-nginx curl 2>&1 | tail -3

# ---- ۲. پیدا کردن مسیر پروژه ----
echo "» [۲/۶] پیدا کردن مسیر پروژه..."
PROJECT=""
for p in /home/ehsan/personal-site /home/ehsan/personal-site-rev5/personal-site /root/personal-site /opt/ehsan/personal-site; do
    if [ -f "$p/.next/standalone/server.js" ] || [ -f "$p/server.js" ] || [ -f "$p/package.json" ]; then
        PROJECT="$p"
        break
    fi
done
if [ -z "$PROJECT" ]; then
    # جستجوی گسترده‌تر
    PROJECT=$(find /home /root /opt /srv -maxdepth 4 -name "package.json" -path "*personal-site*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
fi
echo "  مسیر: ${PROJECT:-پیدا نشد}"

# ---- ۳. چک سرویس ehsan-site ----
echo "» [۳/۶] چک سرویس ehsan-site..."
if systemctl list-units --full | grep -q "ehsan-site"; then
    if ! systemctl is-active --quiet ehsan-site; then
        systemctl start ehsan-site 2>&1 | tail -3 || true
    fi
    echo "  وضعیت: $(systemctl is-active ehsan-site)"
else
    echo "  ⚠ سرویس ehsan-site پیدا نشد — install.sh کامل اجرا نشده"
    echo "    ولی ادامه می‌دهیم تا حداقل nginx بالا بیاید"
fi

# ---- ۴. نوشتن کانفیگ nginx ----
echo "» [۴/۶] نوشتن کانفیگ nginx..."
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

cat > /etc/nginx/sites-available/ehsan-3domains.conf << 'NGINX_EOF'
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server_tokens off;

limit_req_zone $binary_remote_addr zone=login_zone:1m rate=10r/m;
limit_req_zone $binary_remote_addr zone=maint_zone:1m rate=10r/m;

server {
    listen 80 default_server;
    server_name _;
    return 444;
}

server {
    listen 80;
    server_name ehsanmorad.ir www.ehsanmorad.ir;

    client_max_body_size 1m;

    location /api/user/login {
        limit_req zone=login_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/maintenance {
        limit_req zone=maint_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
    }
}

server {
    listen 80;
    server_name ehsan-morad.ir www.ehsan-morad.ir;

    client_max_body_size 1m;

    location /api/user/login {
        limit_req zone=login_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/maintenance {
        limit_req zone=maint_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
    }
}

server {
    listen 80;
    server_name ehsanmorad.id.ir www.ehsanmorad.id.ir;

    client_max_body_size 1m;

    location /api/user/login {
        limit_req zone=login_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/maintenance {
        limit_req zone=maint_zone burst=5 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/ehsan-3domains.conf /etc/nginx/sites-enabled/ehsan-3domains.conf
rm -f /etc/nginx/sites-enabled/default

# ---- ۵. تست و استارت nginx ----
echo "» [۵/۶] تست و استارت nginx..."
nginx -t 2>&1
systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx
echo "  nginx: $(systemctl is-active nginx)"

# ---- ۶. SSL برای هر سه دامنه ----
echo "» [۶/۶] گرفتن SSL برای ۳ دامنه..."
for d in $DOMAINS; do
    echo "  - $d"
    # چک DNS
    IP=$(getent hosts "$d" | awk '{print $1}' | head -1)
    if [ "$IP" != "31.70.76.10" ] && [ "$IP" != "127.0.0.1" ]; then
        echo "    ⚠ DNS ست نشده (IP فعلی: ${IP:-هیچ}) — certbot را رد کن"
        continue
    fi
    certbot --nginx -d "$d" -d "www.$d" --redirect --non-interactive \
        --agree-tos --register-unsafely-without-email 2>&1 | tail -3 || \
        echo "    ⚠ برای $d SSL گرفته نشد"
done

# ---- گزارش نهایی ----
echo ""
echo "=========================================="
echo "  وضعیت نهایی"
echo "=========================================="
echo "  nginx:        $(systemctl is-active nginx)"
echo "  ehsan-site:   $(systemctl is-active ehsan-site 2>/dev/null || echo 'نصب نشده')"
echo ""
ss -tlnp 2>/dev/null | grep -E ':80|:443|:3000' | awk '{print "  پورت:", $4}'
echo ""
echo "  تست محلی:"
curl -sS -o /dev/null -w "    http://localhost → HTTP %{http_code}\n" http://localhost/ 2>&1 || true
echo ""
echo "=========================================="
echo "  از مرورگر تست کن:"
echo "    https://ehsanmorad.ir"
echo "    https://ehsan-morad.ir"
echo "    https://ehsanmorad.id.ir"
echo "=========================================="
