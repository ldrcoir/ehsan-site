#!/bin/bash
# نصب کامل nginx + SSL برای ۳ دامنه — کاملاً مستقل، بدون دانلود
export DEBIAN_FRONTEND=noninteractive

echo "=== ۱/۶ نصب nginx و certbot ==="
apt-get update -qq 2>/dev/null || true
apt-get install -y -qq nginx python3-certbot-nginx curl 2>&1 | tail -2

echo "=== ۲/۶ نوشتن کانفیگ ۳ دامنه ==="
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cat > /etc/nginx/sites-available/ehsan.conf << 'NGXEOF'
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
NGXEOF
ln -sf /etc/nginx/sites-available/ehsan.conf /etc/nginx/sites-enabled/ehsan.conf
rm -f /etc/nginx/sites-enabled/default

echo "=== ۳/۶ تست و استارت nginx ==="
nginx -t
systemctl enable nginx >/dev/null 2>&1
systemctl restart nginx
echo "nginx: $(systemctl is-active nginx)"

echo "=== ۴/۶ پیدا کردن و استارت سرویس سایت ==="
if systemctl list-unit-files | grep -q ehsan-site; then
    systemctl enable ehsan-site >/dev/null 2>&1 || true
    systemctl restart ehsan-site || systemctl start ehsan-site || true
    sleep 2
    echo "ehsan-site: $(systemctl is-active ehsan-site)"
else
    echo "سرویس ehsan-site هنوز نصب نیست (install.sh اجرا نشده) — ادامه..."
fi

echo "=== ۵/۶ تست محلی ==="
curl -sS -o /dev/null -w "پورت ۸۰ → HTTP %{http_code}\n" http://localhost/ || echo "پورت ۸۰ پاسخ نداد"
curl -sS -o /dev/null -w "پورت ۳۰۰۰ → HTTP %{http_code}\n" --max-time 3 http://127.0.0.1:3000/ 2>/dev/null || echo "پورت ۳۰۰۰ پاسخ نداد (سایت نصب نشده)"

echo "=== ۶/۶ گرفتن SSL برای ۳ دامنه ==="
for d in ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir; do
    IP=$(getent hosts "$d" | awk '{print $1}' | head -1)
    if [ "$IP" = "31.70.76.10" ]; then
        echo "--- $d (DNS اوکی) ---"
        certbot --nginx -d "$d" -d "www.$d" --redirect --non-interactive \
            --agree-tos --register-unsafely-without-email 2>&1 | tail -2 || \
            echo "⚠ SSL برای $d گرفته نشد"
    else
        echo "⚠ $d هنوز به 31.70.76.10 اشاره نمی‌کند (الان: ${IP:-هیچ}) — SSL رد شد"
    fi
done

echo ""
echo "==================================="
echo "تمام. nginx: $(systemctl is-active nginx)"
echo "از مرورگر تست کن:"
echo "  https://ehsanmorad.ir"
echo "  https://ehsan-morad.ir"
echo "  https://ehsanmorad.id.ir"
echo "==================================="
