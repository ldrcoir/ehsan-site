#!/bin/bash
# ============================================================================
# NASB-KAMEL.sh — نصب کامل سایت + nginx + SSL + اتصال هوش مصنوعی
# ============================================================================
# راهنما:
#   ۱. این فایل را از چت دانلود کن
#   ۲. scp NASB-KAMEL.sh root@31.70.76.10:/root/
#   ۳. ssh root@31.70.76.10
#   ۴. bash /root/NASB-KAMEL.sh
#
# این اسکریپت:
#   - nginx و certbot نصب می‌کند
#   - کانفیگ ۳ دامنه می‌نویسد (ehsanmorad.ir / ehsan-morad.ir / ehsanmorad.id.ir)
#   - سایت را پیدا می‌کند (یا از zip نصب می‌کند)
#   - سرویس systemd می‌سازد و استارت می‌کند
#   - SSL برای هر ۳ دامنه می‌گیرد
#   - توکن‌های کانال هوش مصنوعی را چاپ می‌کند
# ============================================================================
export DEBIAN_FRONTEND=noninteractive
DOMAINS="ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir"
VPS_IP="31.70.76.10"
MAIN_DOMAIN="ehsanmorad.ir"
APP_PORT=3000
SERVICE_NAME="ehsan-site"
BASE="/home/ehsan"

echo "=============================================="
echo "  نصب کامل ehsanmorad.ir — $(date)"
echo "=============================================="

# ----------------------------------------------------------------------------
# ۱) پیش‌نیازها
# ----------------------------------------------------------------------------
echo ""
echo "=== [۱/۸] نصب پیش‌نیازها (nginx, certbot, node, ...) ==="
apt-get update -qq 2>/dev/null || echo "  ⚠ apt update کامل نشد — ادامه می‌دهم"
for pkg in nginx python3-certbot-nginx curl unzip sqlite3 jq; do
    if ! command -v "$pkg" &>/dev/null && ! dpkg -s "$pkg" &>/dev/null 2>&1; then
        apt-get install -y -qq "$pkg" 2>&1 | tail -1 && echo "  ✅ $pkg نصب شد" || echo "  ⚠ $pkg نصب نشد"
    else
        echo "  ✅ $pkg از قبل هست"
    fi
done

# Node.js 20 (اگر نیست)
if ! command -v node &>/dev/null || [ "$(node -v 2>/dev/null | cut -dv -f2 | cut -d. -f1)" -lt 20 ] 2>/dev/null; then
    echo "  » نصب Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1 \
        && apt-get install -y -qq nodejs 2>&1 | tail -1 \
        && echo "  ✅ Node $(node -v) نصب شد" \
        || echo "  ❌ Node نصب نشد — دستی: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs"
else
    echo "  ✅ Node $(node -v) هست"
fi

# ----------------------------------------------------------------------------
# ۲) پیدا کردن یا نصب سایت
# ----------------------------------------------------------------------------
echo ""
echo "=== [۲/۸] پیدا کردن سایت ==="
PROJECT=""
for p in "$BASE/personal-site" "$BASE/personal-site-rev5/personal-site" "/root/personal-site" "/opt/personal-site" "/srv/personal-site"; do
    if [ -f "$p/package.json" ]; then PROJECT="$p"; break; fi
done
if [ -z "$PROJECT" ]; then
    PROJECT=$(find "$BASE" /root /opt /srv -maxdepth 4 -name package.json -path "*personal-site*" 2>/dev/null | head -1 | xargs -r dirname)
fi

# اگر پیدا نشد، دنبال zip بگرد
if [ -z "$PROJECT" ]; then
    echo "  ⚠ سایت پیدا نشد — دنبال zip نصب می‌گردم..."
    ZIP=$(find /root "$BASE" -maxdepth 3 -name "ehsan-site-*.zip" 2>/dev/null | head -1)
    if [ -n "$ZIP" ]; then
        echo "  » zip پیدا شد: $ZIP"
        mkdir -p "$BASE"
        unzip -q -o "$ZIP" -d "$BASE/"
        PROJECT=$(find "$BASE" -maxdepth 3 -name package.json -path "*personal-site*" 2>/dev/null | head -1 | xargs -r dirname)
        echo "  ✅ باز شد: $PROJECT"
    else
        echo "  ❌ نه سایت هست نه zip!"
        echo "     zip را با scp آپلود کن: scp ehsan-site-v1.0-rev5-*.zip root@$VPS_IP:/root/"
        echo "     بعد دوباره این اسکریپت را اجرا کن."
        echo "     (nginx و SSL همین‌جا نصب می‌شود؛ ادامه می‌دهم)"
    fi
else
    echo "  ✅ سایت: $PROJECT"
fi

# ----------------------------------------------------------------------------
# ۳) systemd service
# ----------------------------------------------------------------------------
echo ""
echo "=== [۳/۸] ساخت سرویس systemd ==="
if [ -n "$PROJECT" ] && [ -d "$PROJECT" ]; then
    # standalone یا build موجود؟
    if [ -f "$PROJECT/.next/standalone/server.js" ]; then
        SERVER_JS="$PROJECT/.next/standalone/server.js"
        cd "$PROJECT/.next/standalone" 2>/dev/null || true
    elif [ -f "$PROJECT/server.js" ]; then
        SERVER_JS="$PROJECT/server.js"
    else
        SERVER_JS=""
        echo "  » standalone نیست — build می‌گیرم (۲-۳ دقیقه)..."
        cd "$PROJECT"
        command -v bun &>/dev/null && bun install >/dev/null 2>&1 || npm install --legacy-peer-deps >/dev/null 2>&1
        npx prisma generate >/dev/null 2>&1
        npm run build >/dev/null 2>&1 && echo "  ✅ build شد" || echo "  ❌ build شکست خورد"
        [ -f "$PROJECT/.next/standalone/server.js" ] && SERVER_JS="$PROJECT/.next/standalone/server.js"
    fi

    if [ -n "$SERVER_JS" ]; then
        # SESSION_SECRET اگر نیست بساز
        if [ -f "$PROJECT/.env" ] && ! grep -q SESSION_SECRET "$PROJECT/.env" 2>/dev/null; then
            echo "SESSION_SECRET=$(openssl rand -hex 32)" >> "$PROJECT/.env"
        elif [ ! -f "$PROJECT/.env" ]; then
            echo "SESSION_SECRET=$(openssl rand -hex 32)" > "$PROJECT/.env"
        fi
        cat > /etc/systemd/system/$SERVICE_NAME.service << SVC
[Unit]
Description=Ehsan Morad Personal Site (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=$(dirname "$SERVER_JS")
ExecStart=$(command -v node) $SERVER_JS
Restart=always
RestartSec=5
Environment=PORT=$APP_PORT
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=-$PROJECT/.env
[Install]
WantedBy=multi-user.target
SVC
        systemctl daemon-reload
        systemctl enable $SERVICE_NAME >/dev/null 2>&1
        systemctl restart $SERVICE_NAME || systemctl start $SERVICE_NAME
        sleep 3
        echo "  ✅ سرویس: $(systemctl is-active $SERVICE_NAME)"
    else
        echo "  ⚠ server.js پیدا نشد — سرویس ساخته نشد"
    fi
else
    echo "  ⚠ پروژه نیست — سرویس ساخته نشد (بعد از آپلود zip دوباره اجرا کن)"
fi

# ----------------------------------------------------------------------------
# ۴) کانفیگ nginx
# ----------------------------------------------------------------------------
echo ""
echo "=== [۴/۸] کانفیگ nginx برای ۳ دامنه ==="
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cat > /etc/nginx/sites-available/ehsan.conf << 'NGX'
map $http_upgrade $connection_upgrade { default upgrade; '' close; }
server_tokens off;
limit_req_zone $binary_remote_addr zone=login_zone:1m rate=10r/m;
limit_req_zone $binary_remote_addr zone=maint_zone:1m rate=10r/m;
server { listen 80 default_server; server_name _; return 444; }
server {
    listen 80;
    server_name ehsanmorad.ir www.ehsanmorad.ir;
    client_max_body_size 10m;
    location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s; }
    location /api/user/login { limit_req zone=login_zone burst=5 nodelay; proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /api/maintenance { limit_req zone=maint_zone burst=5 nodelay; proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
server {
    listen 80;
    server_name ehsan-morad.ir www.ehsan-morad.ir;
    client_max_body_size 10m;
    location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s; }
    location /api/user/login { limit_req zone=login_zone burst=5 nodelay; proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /api/maintenance { limit_req zone=maint_zone burst=5 nodelay; proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
server {
    listen 80;
    server_name ehsanmorad.id.ir www.ehsanmorad.id.ir;
    client_max_body_size 10m;
    location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1;
        proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s; }
    location /api/user/login { limit_req zone=login_zone burst=5 nodelay; proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
    location /api/maintenance { limit_req zone=maint_zone burst=5 nodelay; proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
}
NGX
ln -sf /etc/nginx/sites-available/ehsan.conf /etc/nginx/sites-enabled/ehsan.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx >/dev/null 2>&1 && systemctl restart nginx \
    && echo "  ✅ nginx: $(systemctl is-active nginx)" \
    || { echo "  ❌ nginx -t شکست — کانفیگ را چک کن: nginx -t"; }

# ----------------------------------------------------------------------------
# ۵) تست سایت
# ----------------------------------------------------------------------------
echo ""
echo "=== [۵/۸] تست ==="
sleep 2
curl -sS -o /dev/null -w "  پورت ۸۰   → HTTP %{http_code}\n" --max-time 5 http://localhost/ || echo "  ❌ پورت ۸۰"
if systemctl list-unit-files | grep -q $SERVICE_NAME; then
    curl -sS -o /dev/null -w "  پورت ۳۰۰۰ → HTTP %{http_code}\n" --max-time 5 http://127.0.0.1:$APP_PORT/ \
        || { echo "  ⚠ پورت ۳۰۰۰ — لاگ:"; journalctl -u $SERVICE_NAME -n 10 --no-pager | tail -5; }
fi

# ----------------------------------------------------------------------------
# ۶) SSL
# ----------------------------------------------------------------------------
echo ""
echo "=== [۶/۸] SSL برای ۳ دامنه ==="
for d in $DOMAINS; do
    IP=$(getent hosts "$d" | awk '{print $1}' | head -1)
    if [ "$IP" = "$VPS_IP" ]; then
        echo "  » $d — DNS اوکی، گرفتن گواهی..."
        certbot --nginx -d "$d" -d "www.$d" --redirect --non-interactive \
            --agree-tos --register-unsafely-without-email 2>&1 | grep -E "Successfully|error|Error|Failed" | tail -2 \
            && echo "    ✅ $d" || echo "    ⚠ $d شکست — بعداً: certbot --nginx -d $d"
    else
        echo "  ⚠ $d → DNS ست نشده (الان: ${IP:-هیچ}) — در Cloudflare رکورد A بده: $VPS_IP (پروکسی خاموش)"
    fi
done

# ----------------------------------------------------------------------------
# ۷) فایروال
# ----------------------------------------------------------------------------
echo ""
echo "=== [۷/۸] فایروال ==="
if command -v ufw &>/dev/null; then
    ufw allow 22/tcp >/dev/null 2>&1
    ufw allow 80/tcp >/dev/null 2>&1
    ufw allow 443/tcp >/dev/null 2>&1
    ufw --force enable >/dev/null 2>&1
    echo "  ✅ ufw: پورت 22/80/443 باز"
else
    echo "  ⚠ ufw نیست — اگر فایروال داری، 80 و 443 را باز کن"
fi

# ----------------------------------------------------------------------------
# ۸) توکن‌های اتصال هوش مصنوعی
# ----------------------------------------------------------------------------
echo ""
echo "=== [۸/۸] اتصال هوش مصنوعی ==="
TOKEN_FILE=""
for p in "$PROJECT/db/.maintenance-token.txt" "$BASE/personal-site/db/.maintenance-token.txt"; do
    [ -f "$p" ] && TOKEN_FILE="$p" && break
done

if [ -n "$TOKEN_FILE" ]; then
    DB_DIR=$(dirname "$TOKEN_FILE")
    # اگر AI-bind فعال نیست، توکن ویرایش بساز
    if [ ! -f "$DB_DIR/.maintenance-edit-token.txt" ]; then
        openssl rand -hex 32 > "$DB_DIR/.maintenance-edit-token.txt" && chmod 600 "$DB_DIR/.maintenance-edit-token.txt"
    fi
    if [ ! -f "$DB_DIR/.maintenance-enc-key.txt" ]; then
        openssl rand -hex 32 > "$DB_DIR/.maintenance-enc-key.txt" && chmod 600 "$DB_DIR/.maintenance-enc-key.txt"
    fi
    echo ""
    echo "┌─────────────────────────────────────────────┐"
    echo "│  این ۳ مقدار را کپی کن و در چت به AI بده:   │"
    echo "└─────────────────────────────────────────────┘"
    echo ""
    echo "EDIT_TOKEN=$(cat "$DB_DIR/.maintenance-edit-token.txt")"
    echo "ENC_KEY=$(cat "$DB_DIR/.maintenance-enc-key.txt")"
    echo "READ_TOKEN=$(cat "$TOKEN_FILE")"
    echo ""
    echo "AI_URL=https://$MAIN_DOMAIN/api/maintenance"
else
    echo "  ⚠ توکن‌های کانال هنوز ساخته نشده‌اند (install.sh با --ai-bind اجرا نشده)"
    echo "    بعد از نصب کامل، اجرا کن:"
    echo "      cd $PROJECT && ./install.sh --ai-bind"
fi

# ----------------------------------------------------------------------------
# گزارش نهایی
# ----------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  خلاصه نهایی"
echo "=============================================="
echo "  nginx:        $(systemctl is-active nginx 2>/dev/null || echo 'نصب نشده')"
echo "  سایت:         $(systemctl is-active $SERVICE_NAME 2>/dev/null || echo 'نصب نشده')"
echo "  مسیر پروژه:   ${PROJECT:-پیدا نشد}"
echo ""
ss -tlnp 2>/dev/null | grep -E ':80|:443|:3000' | awk '{print "  پورت:", $4}'
echo ""
echo "  از مرورگر تست کن:"
for d in $DOMAINS; do echo "    https://$d"; done
echo "=============================================="
