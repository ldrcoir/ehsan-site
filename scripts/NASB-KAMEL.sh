#!/bin/bash
# ============================================================================
# NASB-KAMEL.sh v2 — نصب کامل سایت + nginx + SSL + اتصال هوش مصنوعی
# ============================================================================
# تغییرات نسخه ۲ (رفع خطای اجرای قبلی):
#   ✚ خطای «server_tokens is duplicate» رفع شد — server_tokens فقط داخل
#     هر server block نوشته می‌شود، نه در سطح http
#   ✚ map و limit_req_zone فقط اگر از قبل در nginx وجود نداشته باشند اضافه
#     می‌شوند (ضد تکرار)
#   ✚ کانفیگ‌های قدیمی ehsan*.conf و ehsan-3domains.conf پاک می‌شوند
#   ✚ کاملاً قابل اجرای مجدد است — هر بار اجرا کنی، بخش‌های انجام‌شده رد می‌شوند
#   ✚ توکن‌های کانال داخل اسکریپت هست‌اند و به‌طور خودکار در .env ست می‌شوند
#   ✚ اگر دیتابیس نباشد، با prisma db push ساخته می‌شود
#
# راهنما:
#   ۱. این فایل را از چت دانلود کن
#   ۲. scp NASB-KAMEL.sh root@31.70.76.10:/root/
#   ۳. ssh root@31.70.76.10 'bash /root/NASB-KAMEL.sh'
#
# اگر وسط کار قطع شد، نگران نباش — دوباره همان دستور را اجرا کن.
# ============================================================================
export DEBIAN_FRONTEND=noninteractive
DOMAINS="ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir"
VPS_IP="31.70.76.10"
MAIN_DOMAIN="ehsanmorad.ir"
APP_PORT=3000
SERVICE_NAME="ehsan-site"
BASE="/home/ehsan"
PRISMA_VER="6.11.1"

# ── توکن‌های کانال هوش مصنوعی (ثابت — با چت هم‌خوان هستند) ──────────────────
READ_TOKEN="e5f11035680e2eca4a303d165ee79f089b5c8fe950965cf815d00fc490454764"
EDIT_TOKEN="28418d648fc14f30cf685c1d3adcfe6ad232491e02da1bb50f1e2b4917f5f9df"
ENC_KEY="74cbddeeab75d3788deeba55676ac14adad621f9d8ddd54b9954b02450e2e416"

echo "=============================================="
echo "  نصب کامل ehsanmorad.ir — نسخه ۲ — $(date)"
echo "=============================================="

# ----------------------------------------------------------------------------
# ۱) پیش‌نیازها
# ----------------------------------------------------------------------------
echo ""
echo "=== [۱/۸] پیش‌نیازها (nginx, certbot, node, ...) ==="
apt-get update -qq 2>/dev/null || echo "  ⚠ apt update کامل نشد — ادامه می‌دهم"
for pkg in nginx python3-certbot-nginx curl unzip sqlite3 jq openssl; do
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
# ۲) پیدا کردن یا باز کردن zip سایت
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

if [ -z "$PROJECT" ]; then
    echo "  ⚠ سایت پیدا نشد — دنبال zip می‌گردم..."
    ZIP=$(find /root "$BASE" -maxdepth 3 -name "ehsan-site-*.zip" 2>/dev/null | head -1)
    if [ -n "$ZIP" ]; then
        echo "  » zip پیدا شد: $ZIP"
        mkdir -p "$BASE"
        unzip -q -o "$ZIP" -d "$BASE/"
        PROJECT="$BASE/personal-site"
        echo "  ✅ باز شد: $PROJECT"
    else
        echo "  ❌ نه سایت هست نه zip!"
        echo "     zip را آپلود کن: scp ehsan-site-*.zip root@$VPS_IP:/root/"
        echo "     بعد دوباره همین اسکریپت را اجرا کن. (nginx و SSL همین‌جا نصب می‌شوند)"
    fi
else
    echo "  ✅ سایت: $PROJECT"
fi

# ----------------------------------------------------------------------------
# ۳) دیتابیس + .env + سرویس systemd
# ----------------------------------------------------------------------------
echo ""
echo "=== [۳/۸] دیتابیس، .env و سرویس systemd ==="
if [ -n "$PROJECT" ] && [ -d "$PROJECT" ]; then

    # server.js — اول root پروژه، بعد standalone
    if [ -f "$PROJECT/server.js" ]; then
        SERVER_JS="$PROJECT/server.js"
    elif [ -f "$PROJECT/.next/standalone/server.js" ]; then
        SERVER_JS="$PROJECT/.next/standalone/server.js"
    else
        SERVER_JS=""
        echo "  ❌ server.js پیدا نشد — zip ناقص است"
    fi

    # .env — مقدارهای موجود حفظ می‌شوند، فقط چیزی که نیست اضافه می‌شود
    mkdir -p "$PROJECT/db"
    touch "$PROJECT/.env"
    set_env() {  # set_env KEY VALUE → اگر کلید بود عوض کن، نبود اضافه کن
        if grep -q "^$1=" "$PROJECT/.env" 2>/dev/null; then
            sed -i "s|^$1=.*|$1=\"$2\"|" "$PROJECT/.env"
        else
            echo "$1=\"$2\"" >> "$PROJECT/.env"
        fi
    }
    grep -q "^SESSION_SECRET=" "$PROJECT/.env" 2>/dev/null \
        || echo "SESSION_SECRET=$(openssl rand -hex 32)" >> "$PROJECT/.env"
    set_env DATABASE_URL "file:$PROJECT/db/custom.db"
    set_env TRUST_PROXY "true"
    set_env NEXT_PUBLIC_SITE_URL "https://$MAIN_DOMAIN"

    # توکن‌های کانال: اگر فایل بود همان مقدار، نبود مقدار ثابت اسکریپت
    READ_V=$(cat "$PROJECT/db/.maintenance-token.txt" 2>/dev/null || echo "$READ_TOKEN")
    EDIT_V=$(cat "$PROJECT/db/.maintenance-edit-token.txt" 2>/dev/null || echo "$EDIT_TOKEN")
    ENC_V=$(cat "$PROJECT/db/.maintenance-enc-key.txt" 2>/dev/null || echo "$ENC_KEY")
    echo "$READ_V" > "$PROJECT/db/.maintenance-token.txt"
    echo "$EDIT_V" > "$PROJECT/db/.maintenance-edit-token.txt"
    echo "$ENC_V" > "$PROJECT/db/.maintenance-enc-key.txt"
    chmod 600 "$PROJECT/db/.maintenance-"*.txt
    set_env MAINTENANCE_TOKEN "$READ_V"
    set_env MAINTENANCE_EDIT_TOKEN "$EDIT_V"
    set_env MAINTENANCE_ENC_KEY "$ENC_V"
    echo "  ✅ .env و توکن‌های کانال آماده شد"

    # دیتابیس — اگر فایل db نیست با prisma ساخته می‌شود
    DB_FRESH=0
    if [ ! -f "$PROJECT/db/custom.db" ]; then
        echo "  » ساخت دیتابیس با prisma db push..."
        if (cd "$PROJECT" && npx -y "prisma@$PRISMA_VER" db push --skip-generate >/dev/null 2>&1); then
            DB_FRESH=1
            echo "  ✅ دیتابیس ساخته شد: $PROJECT/db/custom.db"
        else
            echo "  ⚠ db push نشد — دستی: cd $PROJECT && npx -y prisma@$PRISMA_VER db push"
        fi
    else
        echo "  ✅ دیتابیس از قبل هست"
    fi

    # اگر دیتابیس تازه ساخته شد، رمز ادمین تولید و فقط همین یک بار چاپ می‌شود
    if [ "$DB_FRESH" = "1" ] && [ -f "$PROJECT/scripts/reset-admin-password.sh" ]; then
        echo "  » تولید رمز ادمین (همین یک بار نمایش داده می‌شود):"
        (cd "$PROJECT" && bash scripts/reset-admin-password.sh) 2>/dev/null | tail -4
    fi

    # systemd
    if [ -n "$SERVER_JS" ]; then
        cat > /etc/systemd/system/$SERVICE_NAME.service << SVC
[Unit]
Description=Ehsan Morad Personal Site (Next.js)
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT
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
        systemctl restart $SERVICE_NAME
        sleep 3
        echo "  ✅ سرویس: $(systemctl is-active $SERVICE_NAME)"
    fi
else
    echo "  ⚠ پروژه نیست — این بخش رد شد (بعد از آپلود zip دوباره اجرا کن)"
fi

# ----------------------------------------------------------------------------
# ۴) کانفیگ nginx — ضد تکرار (رفع خطای نسخه ۱)
# ----------------------------------------------------------------------------
echo ""
echo "=== [۴/۸] کانفیگ nginx برای ۳ دامنه ==="

# پاک کردن کانفیگ‌های قدیمی خودمان و سایت پیش‌فرض
rm -f /etc/nginx/sites-enabled/default \
      /etc/nginx/sites-enabled/ehsan*.conf /etc/nginx/sites-available/ehsan*.conf \
      /etc/nginx/conf.d/ehsan*.conf \
      /etc/nginx/sites-enabled/*morad*.conf /etc/nginx/sites-available/*morad*.conf \
      /etc/nginx/conf.d/*morad*.conf

# موارد سطح http فقط اگر از قبل در nginx نباشند (ضد duplicate)
CONF_DIRS="/etc/nginx/nginx.conf /etc/nginx/conf.d/*.conf /etc/nginx/sites-enabled/* /etc/nginx/modules-enabled/*.conf"
HTTP_TOP=""
grep -qsE 'map\s+\$http_upgrade\s+\$connection_upgrade' $CONF_DIRS 2>/dev/null \
    || HTTP_TOP+="map \$http_upgrade \$connection_upgrade { default upgrade; '' close; }"$'\n'
grep -qs 'zone=login_zone' $CONF_DIRS 2>/dev/null \
    || HTTP_TOP+="limit_req_zone \$binary_remote_addr zone=login_zone:1m rate=10r/m;"$'\n'
grep -qs 'zone=maint_zone' $CONF_DIRS 2>/dev/null \
    || HTTP_TOP+="limit_req_zone \$binary_remote_addr zone=maint_zone:1m rate=10r/m;"$'\n'

# default_server فقط اگر جای دیگری نباشد
CATCH_BLOCK="server { listen 80 default_server; server_name _; return 444; }"
grep -qsE 'listen[^;]*default_server' $CONF_DIRS 2>/dev/null \
    && CATCH_BLOCK="server { listen 80; server_name _; return 444; }"

SERVERS=$(cat << 'NGX'
server {
    server_tokens off;
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
    server_tokens off;
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
    server_tokens off;
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
)

printf '%s%s%s\n%s' "$HTTP_TOP" "$CATCH_BLOCK" '
' "$SERVERS" > /etc/nginx/sites-available/ehsan.conf
ln -sf /etc/nginx/sites-available/ehsan.conf /etc/nginx/sites-enabled/ehsan.conf

if nginx -t >/dev/null 2>&1; then
    systemctl enable nginx >/dev/null 2>&1
    systemctl restart nginx && echo "  ✅ nginx: $(systemctl is-active nginx)"
else
    echo "  ❌ nginx -t شکست — خروجی:"
    nginx -t 2>&1 | tail -4
    echo "  ↑ این چند خط را برای من بفرست"
fi

# ----------------------------------------------------------------------------
# ۵) تست سایت
# ----------------------------------------------------------------------------
echo ""
echo "=== [۵/۸] تست ==="
sleep 2
# با هدر دامنه تست می‌کنیم — درخواست بدون دامنه عمداً با 444 بسته می‌شود (امنیتی)
curl -sS -o /dev/null -w "  سایت از nginx → HTTP %{http_code}\n" --max-time 5 -H "Host: $MAIN_DOMAIN" http://127.0.0.1/ || echo "  ❌ nginx جواب نمی‌دهد"
if systemctl list-unit-files | grep -q $SERVICE_NAME; then
    curl -sS -o /dev/null -w "  پورت ۳۰۰۰ → HTTP %{http_code}\n" --max-time 5 http://127.0.0.1:$APP_PORT/ \
        || { echo "  ⚠ پورت ۳۰۰۰ — لاگ:"; journalctl -u $SERVICE_NAME -n 10 --no-pager | tail -5; }
fi

# ----------------------------------------------------------------------------
# ۶) SSL — اگر گواهی از قبل باشد رد می‌شود
# ----------------------------------------------------------------------------
echo ""
echo "=== [۶/۸] SSL برای ۳ دامنه ==="
for d in $DOMAINS; do
    if [ -d "/etc/letsencrypt/live/$d" ]; then
        echo "  ✅ $d — گواهی از قبل هست"
        continue
    fi
    IP=$(getent hosts "$d" | awk '{print $1}' | head -1)
    if [ "$IP" = "$VPS_IP" ]; then
        echo "  » $d — DNS اوکی، گرفتن گواهی..."
        OUT=$(certbot --nginx -d "$d" -d "www.$d" --redirect --non-interactive \
            --agree-tos --register-unsafely-without-email 2>&1 | tail -3)
        echo "$OUT" | grep -q "Successfully received certificate" \
            && echo "    ✅ $d" || { echo "    ⚠ $d — خروجی:"; echo "$OUT" | sed 's/^/      /'; }
    else
        echo "  ⚠ $d → DNS هنوز ست نشده (الان: ${IP:-هیچ}) — در Cloudflare رکورد A بده: $VPS_IP با پروکسی خاموش"
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
# ۸) گزارش اتصال هوش مصنوعی
# ----------------------------------------------------------------------------
echo ""
echo "=== [۸/۸] اتصال هوش مصنوعی ==="
if [ -n "$PROJECT" ]; then
    echo "  توکن‌ها همین حالا در .env ست شده‌اند — چیزی لازم نیست بفرستی."
    echo "  (مقدارها در db/.maintenance-*.txt هم ذخیره شد)"
    echo ""
    echo "  AI_URL=$([ -d /etc/letsencrypt/live/$MAIN_DOMAIN ] && echo https || echo http)://$MAIN_DOMAIN/api/maintenance"
else
    echo "  ⚠ بعد از آپلود zip و اجرای مجدد، توکن‌ها ست می‌شوند"
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
ss -tlnp 2>/dev/null | grep -E ':80 |:443 |:3000' | awk '{print "  پورت:", $4}'
echo ""
echo "  از مرورگر تست کن:"
for d in $DOMAINS; do echo "    http(s)://$d"; done
echo "  آخرین قدم: فقط در چت بنویس «نصب شد» — بقیه‌اش با من"
echo "=============================================="
