#!/bin/bash
# ============================================================================
# install.sh — v1.1 — Pre-built standalone installer
# ============================================================================
# این نسخه:
# - npm install نمی‌خواد (همه‌چیز pre-built هست)
# - SESSION_SECRET قوی تولید می‌کنه
# - Webhook secrets هم تولید می‌کنه
# - کلیدهای سفارشی .env (BALE_BOT_TOKEN و …) در اجرای مجدد حفظ می‌شن
# - دیتابیس با permissions امن
# - systemd با user غیر root + بک‌آپ شبانه (cron)
# - فایروال + Nginx
# - reCAPTCHA placeholder + راهنما
# - HTTPS setup با certbot (اگه دامنه ست شده)
# ============================================================================
set -eo pipefail

# v1.1.1 (audit S10-L9/S8-L3): باید با root اجرا شود + umask امن —
# هر فایلی که این اسکریپت می‌سازد (مخصوصاً .env و رمز ادمین) بلافاصله 600 می‌ماند
if [ "$(id -u)" != "0" ]; then
    echo "❌ این اسکریپت باید با sudo اجرا شود:  sudo ./install.sh"
    exit 1
fi
umask 077

SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SITE_DIR"   # ریشه‌ی پروژه — حتی اگه پایین‌تر به standalone سوئیچ کنیم
cd "$SITE_DIR"

VERSION="1.1"
echo "=========================================="
echo "  نصب سایت شخصی v$VERSION (Pre-built)"
echo "=========================================="
echo ""

# ============================================================================
# قدم ۱: Swap (اگه رم کمه)
# ============================================================================
echo "[1/11] Swap..."
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
echo "[2/11] Node.js..."
# v1.1: curl باید قبل از NodeSource نصب باشه
if ! command -v curl &> /dev/null; then
    apt-get update -qq
    apt-get install -y curl
    echo "  ✅ curl نصب شد"
fi
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
# قدم ۳: ابزارهای ضروری
# ============================================================================
echo ""
echo "[3/11] Nginx + tools + openssl..."
# v1.1: dnsutils لازمه برای `host` (تشخیص دامنه → HTTPS)
# v1.1.1 (audit P6-L9): unzip هم لازمه برای quick-start مستند در VERSION.txt
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx sqlite3 python3 ufw certbot python3-certbot-nginx openssl curl dnsutils unzip
    systemctl enable nginx
    systemctl start nginx
    echo "  ✅ Nginx نصب شد"
else
    apt install -y sqlite3 python3 ufw certbot python3-certbot-nginx openssl curl dnsutils unzip 2>/dev/null || true
    echo "  ✅ Nginx نصبه"
fi
# بررسی نهایی openssl (مهم برای تولید SESSION_SECRET)
if ! command -v openssl &> /dev/null; then
    echo "  ❌ openssl پیدا نشد! نصب دستی: apt install -y openssl"
    exit 1
fi

# ============================================================================
# قدم ۴: فایروال
# ============================================================================
echo ""
echo "[4/11] فایروال..."
# v1.1.1 (audit S10-L3): اگر SSH روی پورت دیگری است، همان را باز کن —
# وگرنه ufw enable کلاینت SSHِ فعال را قطع می‌کند (lockout)
SSH_PORT=$(ss -tlnp 2>/dev/null | grep sshd | grep -oP ':\K\d+(?=\s)' | head -1)
SSH_PORT="${SSH_PORT:-22}"
ufw allow "$SSH_PORT"/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true
echo "  ✅ فایروال ست شد (SSH روی پورت $SSH_PORT + 80/443 — پورت 3000 از بیرون بسته است)"

# ============================================================================
# قدم ۵: SESSION_SECRET قوی + .env امن
# ============================================================================
echo ""
echo "[5/11] SESSION_SECRET و .env..."
# Idempotent: اگه .env از قبل هست، SESSION_SECRET رو نگه دار
if [ -f .env ] && grep -q "^SESSION_SECRET=" .env; then
    EXISTING_SECRET=$(grep "^SESSION_SECRET=" .env | cut -d'"' -f2)
    if [ -n "$EXISTING_SECRET" ] && [ "$EXISTING_SECRET" != "build-placeholder" ]; then
        SECRET="$EXISTING_SECRET"
        echo "  ✅ SESSION_SECRET موجود نگه داشته شد (idempotent)"
    else
        SECRET=$(openssl rand -hex 32)
        echo "  ✅ SESSION_SECRET جدید تولید شد (قدیمی ضعیف بود)"
    fi
else
    SECRET=$(openssl rand -hex 32)
    echo "  ✅ SESSION_SECRET قوی تولید شد (openssl rand -hex 32)"
fi

# Webhook secrets — اگه هستن نگه دار
if [ -f .env ] && grep -q "^BALE_WEBHOOK_SECRET=" .env; then
    BALE_SECRET=$(grep "^BALE_WEBHOOK_SECRET=" .env | cut -d'"' -f2)
    [ -z "$BALE_SECRET" ] && BALE_SECRET=$(openssl rand -hex 16)
else
    BALE_SECRET=$(openssl rand -hex 16)
fi
if [ -f .env ] && grep -q "^TELEGRAM_WEBHOOK_SECRET=" .env; then
    TG_SECRET=$(grep "^TELEGRAM_WEBHOOK_SECRET=" .env | cut -d'"' -f2)
    [ -z "$TG_SECRET" ] && TG_SECRET=$(openssl rand -hex 16)
else
    TG_SECRET=$(openssl rand -hex 16)
fi

mkdir -p db
chmod 700 db

# reCAPTCHA — اگه از قبل هست، نگه‌دار
EXISTING_RECAPTCHA_SECRET=$(grep "^RECAPTCHA_SECRET=" .env 2>/dev/null | cut -d'"' -f2 || echo "")
EXISTING_RECAPTCHA_SITEKEY=$(grep "^NEXT_PUBLIC_RECAPTCHA_SITEKEY=" .env 2>/dev/null | cut -d'"' -f2 || echo "")

# v1.1: NEXT_PUBLIC_SITE_URL هم مثل بقیه‌ی کلیدها preserve می‌شه
EXISTING_SITE_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" .env 2>/dev/null | cut -d'"' -f2 || echo "")
[ -z "$EXISTING_SITE_URL" ] && EXISTING_SITE_URL="https://ehsanmorad.ir"

# Write .env (preserving existing values where present)
# v1.1: قبل از بازنویسی، .env قدیمی رو کنار بذار (برای merge کلیدهای سفارشی)
if [ -f .env ]; then cp .env .env.pre-install.$$; fi
cat > .env << EOF
# v1.1.1 — auto-generated by install.sh
DATABASE_URL="file:$SITE_DIR/db/custom.db"
NODE_ENV="production"
PORT=3000
# v1.1.1 (audit S10-M1): فقط روی loopback — nginx به همین آدرس proxy می‌کند؛
# app هرگز مستقیم از اینترنت قابل دسترسی نیست → هدرِ جعلی X-Forwarded-For
# نمی‌تواند rate limit را دور بزند
HOSTNAME="127.0.0.1"
SESSION_SECRET="$SECRET"
NEXT_PUBLIC_SITE_URL="$EXISTING_SITE_URL"
RECAPTCHA_SECRET="$EXISTING_RECAPTCHA_SECRET"
NEXT_PUBLIC_RECAPTCHA_SITEKEY="$EXISTING_RECAPTCHA_SITEKEY"
BALE_WEBHOOK_SECRET="$BALE_SECRET"
TELEGRAM_WEBHOOK_SECRET="$TG_SECRET"
TRUST_PROXY="true"
EOF
chmod 600 .env
echo "  ✅ Webhook secrets تولید شد"

# v1.1: کلیدهای سفارشی .env قدیمی که تو تمپلیت نیستن (به‌جز DATABASE_URL)
# رو به انتهای .env جدید اضافه کن — تا تو اجرای مجدد install.sh از بین نرن
# (نسخه‌ی قدیمی الان تو .env.pre-install.$$ هست)
if [ -f .env.pre-install.$$ ]; then
    CUSTOM_KEYS=""
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ""|\#*) continue ;;
        esac
        case "$line" in
            *=*) ;;
            *) continue ;;
        esac
        KEY="${line%%=*}"
        case "$KEY" in
            [A-Za-z_]*) ;;
            *) continue ;;
        esac
        # DATABASE_URL همیشه از مسیر جدید ساخته می‌شه — از فایل قدیمی نمیاد
        [ "$KEY" = "DATABASE_URL" ] && continue
        # کلیدی که تمپلیت داره، دوباره اضافه نکن
        grep -q "^$KEY=" .env && continue
        printf '%s\n' "$line" >> .env
        CUSTOM_KEYS="$CUSTOM_KEYS $KEY"
    done < .env.pre-install.$$
    rm -f .env.pre-install.$$
    if [ -n "$CUSTOM_KEYS" ]; then
        echo "  ✅ کلیدهای سفارشی حفظ شد:$CUSTOM_KEYS"
    fi
fi

# ============================================================================
# قدم ۶: دیتابیس
# ============================================================================
echo ""
echo "[6/11] دیتابیس..."
mkdir -p db
chmod 700 db
touch db/custom.db
chmod 600 db/custom.db
rm -f db/custom.db-journal db/custom.db-wal db/custom.db-shm

# v1.1: apply_schema.py همیشه اجرا می‌شه (CREATE TABLE IF NOT EXISTS-safe)
# — schema drift روی آپگریدها خودش heal می‌شه
echo "  ساخت/به‌روزرسانی جداول (apply_schema.py)..."
if python3 scripts/apply_schema.py; then
    TABLES=$(sqlite3 db/custom.db "SELECT count(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
    echo "  ✅ $TABLES جدول آماده (schema همگام شد)"
else
    echo "  ⚠ apply_schema.py خطا داد — ادامه می‌دیم"
fi

# seeding اگه جداول خالی هستن
ADMIN_EXISTS=$(sqlite3 db/custom.db "SELECT count(*) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "0")
if [ "$ADMIN_EXISTS" = "0" ] || [ -z "$ADMIN_EXISTS" ]; then
    echo "  seeding..."
    python3 scripts/seed_content.py 2>&1 | tail -2 || echo "  ⚠ seed_content failed"
    python3 scripts/seed_equipment.py 2>&1 | tail -2 || echo "  ⚠ seed_equipment failed"
    python3 scripts/seed_texts.py 2>&1 | tail -2 || echo "  ⚠ seed_texts failed"
    # v1.1: خروجی کامل + exit code — رمز تصادفی ادمین باید اینجا دیده بشه
    # (set +e موقتی تا خطای seed، کل install رو نکشه)
    set +e
    SEED_OUT=$(python3 scripts/seed_access_users.py 2>&1); SEED_RC=$?
    set -e
    echo "$SEED_OUT"
    # v1.1.1 (audit S7-M2): رمز ادمین علاوه بر خروجی نصب، در فایل root-only هم
    # ذخیره می‌شود — اگر خروجی نصب در log ذخیره شده باشد، رمز در فایل 600 امن است
    umask 077
    echo "$SEED_OUT" > "$PROJECT_ROOT/db/.admin-initial-password.txt"
    chmod 600 "$PROJECT_ROOT/db/.admin-initial-password.txt" 2>/dev/null || true
    umask 022
    if [ $SEED_RC -ne 0 ]; then
        echo "  ❌ seed_access_users failed (exit $SEED_RC)"
    else
        echo "  ✅ دیتابیس seed شد"
        echo "     رمز ادمین همچنین در فایل ذخیره شد: db/.admin-initial-password.txt (chmod 600)"
    fi
    # v1.1 (fix): بدون ادمین، ادامه‌ی نصب بی‌معنی است — رمزی هم چاپ نشده که
    # کاربر بتواند وارد شود؛ نصب را با خطای شفاف متوقف کن
    ADMIN_AFTER=$(sqlite3 db/custom.db "SELECT count(*) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "0")
    if [ "$ADMIN_AFTER" = "0" ] || [ -z "$ADMIN_AFTER" ]; then
        echo "  ❌ FATAL: admin user was not created — installation aborted."
        echo "     Fix the seed error above and re-run: sudo ./install.sh"
        exit 1
    fi
else
    echo "  ✅ دیتابیس آماده (admin user exists)"
fi

# ============================================================================
# قدم ۷: کپی .env و db به standalone (اگه standalone هست)
# ============================================================================
echo ""
echo "[7/11] آماده‌سازی standalone..."
if [ -f server.js ]; then
    # حالت standalone — فایل‌ها از قبل هستن
    echo "  ✅ standalone آماده"
elif [ -d .next/standalone ]; then
    # حالت توسعه — کپی کن به standalone
    cp .env .next/standalone/.env
    chmod 600 .next/standalone/.env
    # v1.1 (fix): cp -r db .next/standalone/db در re-run تودرتو می‌شد
    # (.next/standalone/db/db/custom.db) — دیتابیس تازه هرگز جایگزین نمی‌شد
    mkdir -p .next/standalone/db
    cp db/custom.db .next/standalone/db/ 2>/dev/null || true
    chmod 600 .next/standalone/db/*.db 2>/dev/null || true
    cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
    cp -r public .next/standalone/ 2>/dev/null || true
    SITE_DIR="$SITE_DIR/.next/standalone"
    cd "$SITE_DIR"
    echo "  ✅ آماده شد"
fi

# ============================================================================
# قدم ۸: systemd service (با user غیر root)
# ============================================================================
echo ""
echo "[8/11] systemd service..."
if ! id -u ehsansite &>/dev/null; then
    useradd -r -s /bin/false -d "$SITE_DIR" ehsansite 2>/dev/null || true
fi
chown -R ehsansite:ehsansite "$SITE_DIR" 2>/dev/null || true

cat > /etc/systemd/system/personal-site.service << EOF
[Unit]
Description=Personal Site v$VERSION
After=network.target

[Service]
Type=simple
User=ehsansite
Group=ehsansite
WorkingDirectory=$SITE_DIR
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
# v1.1.1 (audit S10-M1): فقط loopback — nginx جلوی app است، پورت 3000 از بیرون بسته
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3000
# امنیت اضافه
# v1.1 (fix): ProtectHome=true زیرمجموعه‌ی /home را برای systemd می‌پوشاند
# (status=226/NAMESPACE) — چون مسیر نصب مستند /home/ehsan/personal-site است،
# سرویس هرگز بالا نمی‌آمد. read-only با ReadWritePaths سازگار است.
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=$SITE_DIR
PrivateTmp=true
# v1.1.1 (audit S10-M4): hardening اضافه — مجموعه‌ی کم‌ریسک (بدون SystemCallFilter و
# بدون MemoryDenyWriteExecute که JIT وی۸ را می‌شکند؛ با systemd-analyze security بسنجید)
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
CapabilityBoundingSet=
UMask=0077

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable personal-site
systemctl restart personal-site
sleep 5
echo "  ✅ سرویس اجرا شد"

# ============================================================================
# قدم ۹: بک‌آپ خودکار شبانه (cron) — v1.1
# ============================================================================
echo ""
echo "[9/11] بک‌آپ خودکار (cron)..."
cat > /etc/cron.d/personal-site-backup << EOF
# v1.1 — nightly DB backup at 03:00 (keeps last 7 in backups/)
0 3 * * * root cd "$PROJECT_ROOT" && bash scripts/auto-backup.sh >> /var/log/personal-site-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/personal-site-backup
systemctl enable cron 2>/dev/null || systemctl enable crond 2>/dev/null || true
systemctl restart cron 2>/dev/null || systemctl restart crond 2>/dev/null || true
echo "  ✅ بک‌آپ شبانه ۳ بامداد فعال شد (/etc/cron.d/personal-site-backup)"

# ============================================================================
# قدم ۱۰: Nginx
# ============================================================================
echo ""
echo "[10/11] Nginx..."
cp nginx-ehsanmorad.conf /etc/nginx/sites-available/nginx-ehsanmorad.conf 2>/dev/null || true
ln -sf /etc/nginx/sites-available/nginx-ehsanmorad.conf /etc/nginx/sites-enabled/nginx-ehsanmorad.conf 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t 2>&1 && systemctl reload nginx
echo "  ✅ Nginx تنظیم شد"

# تست
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
    echo "  ✅ سایت بالا اومد"
    SUCCESS=true
else
    echo "  ⚠ چک کن: journalctl -u personal-site -n 20"
    SUCCESS=false
fi

# ============================================================================
# قدم ۱۱: HTTPS (اگه دامنه ست شده)
# ============================================================================
echo ""
echo "[11/11] HTTPS..."
DOMAIN_FOUND=""
for domain in ehsanmorad.ir ehsan-morad.ir ehsanmorad.id.ir; do
    if host "$domain" &>/dev/null; then
        DOMAIN_FOUND="$domain"
        break
    fi
done

if [ -n "$DOMAIN_FOUND" ]; then
    echo "  دامنه پیدا شد: $DOMAIN_FOUND"
    echo "  در حال دریافت SSL certificate..."
    # v1.1.1 (audit S10-H2): --redirect — بعد از صدور گواهی، HTTP به HTTPS ریدایرکت
    # می‌شود؛ قبلاً HTTP باز می‌ماند و رمز ادمین می‌توانست در HTTPِ خالی ارسال شود
    if certbot --nginx -d "$DOMAIN_FOUND" -d "www.$DOMAIN_FOUND" --redirect --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -5; then
        echo "  ✅ HTTPS فعال شد (HTTP → HTTPS redirect)"
        SITE_URL="https://$DOMAIN_FOUND"
    else
        echo "  ⚠ certbot ناموفق بود. بعداً دستی اجرا کن:"
        echo "    sudo certbot --nginx -d $DOMAIN_FOUND --redirect"
        SITE_URL="http://$DOMAIN_FOUND"
    fi
else
    echo "  ⚠ دامنه‌ای DNS ست نشده. فعلاً HTTP (از طریق nginx پورت ۸۰)."
    # v1.1: hardcoded VPS IP removed (info leak) — use hostname instead
    # v1.1.1: آدرس بدون پورت 3000 — پورت 3000 فایروال‌شده و app فقط روی loopback است؛
    # ورود از مرورگر فقط از طریق nginx (پورت 80) ممکن است
    SITE_URL="http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_IP')"
fi

# ============================================================================
# خروجی نهایی
# ============================================================================
echo ""
echo "=========================================="
if [ "$SUCCESS" = "true" ]; then
    echo "  ✅ نصب کامل شد! (v$VERSION)"
else
    echo "  ⚠ نصب انجام شد ولی سایت بالا نیومد"
    echo "  دستور بررسی: journalctl -u personal-site -n 30"
fi
echo "=========================================="
echo ""
echo "  آدرس سایت:"
echo "    $SITE_URL"
echo ""
echo "  ورود ادمین:"
echo "    $SITE_URL/user-login"
echo "    username: admin"
echo "    password: (توسط install.sh چاپ می‌شه — رمز تصادفی)"
echo "    ⚠️ حتماً از پنل → تنظیمات → تغییر رمز عوض کن!"
echo ""
echo "  ⚠️ مهم — تنظیم reCAPTCHA بعد از نصب:"
echo "    1. به https://www.google.com/recaptcha/admin برو"
echo "    2. یه سایت v2 ثبت کن (دامنه‌ات رو اضافه کن)"
echo "    3. Site Key و Secret Key رو بگیر"
echo "    4. این فایل رو ویرایش کن: $PROJECT_ROOT/.env"
echo "       RECAPTCHA_SECRET=\"<secret-key>\""
echo "       NEXT_PUBLIC_RECAPTCHA_SITEKEY=\"<site-key>\""
echo "    5. سرویس رو restart کن: sudo systemctl restart personal-site"
echo ""
echo "  ⚠️ بدون reCAPTCHA، فرم تماس کار نمی‌کنه!"
echo ""
echo "  Webhook URLs (برای Bale/Telegram):"
if [ -n "$DOMAIN_FOUND" ]; then
    echo "    Bale:     https://$DOMAIN_FOUND/api/bale/webhook"
    echo "    Telegram: https://$DOMAIN_FOUND/api/telegram/webhook"
else
    echo "    Bale:     http://YOUR_IP/api/bale/webhook"
    echo "    Telegram: http://YOUR_IP/api/telegram/webhook"
    echo "    (برای webhook، HTTPS لازم است — اول دامنه + certbot راه بیندازید)"
fi
echo "    ⚠️ v1.1: Secret فقط از طریق هدر ارسال می‌شه (نه URL):"
echo "       x-webhook-secret: <مقدار داخل .env>"
echo "    ⚠️ Secretها تو فایل .env هستن — با 'sudo cat .env' ببین"
echo "    ⚠️ این مقادیر رو با کسی به اشتراک نذار!"
echo ""
echo "  بک‌آپ خودکار: هر شب ۳ بامداد (نگه‌داری ۷ نسخه — backups/)"
echo ""
echo "  دستورات:"
echo "    systemctl status personal-site"
echo "    systemctl restart personal-site"
echo "    journalctl -u personal-site -f"
echo ""
echo "  ریست رمز ادمین (اگه فراموش کردی):"
echo "    sudo bash scripts/reset-admin-password.sh"
echo ""
echo "  انتقال سایت به سرور دیگر (v1.1):"
echo "    bash scripts/export-site.sh           # روی سرور قدیمی"
echo "    sudo bash scripts/import-site.sh <tarball>   # روی سرور جدید"
echo ""
echo "=========================================="
