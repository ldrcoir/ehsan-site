#!/bin/bash
# ============================================================================
# install.sh — v1.0 — Pre-built standalone installer
# ============================================================================
# این نسخه:
# - npm install نمی‌خواد (همه‌چیز pre-built هست)
# - هر وابستگی (node/nginx/sqlite/python/certbot/jq/…) جداگانه چک می‌شه و هر
#   چی نبود نصب می‌شه (v1.0: چک آیتم‌به‌آیتم به‌جای نصب کورکورانه)
# - SESSION_SECRET قوی تولید می‌کنه
# - MAINTENANCE_TOKEN هم تولید می‌کنه — کانال نگهداری امن (scripts/maintenance.sh)
# - Webhook secrets هم تولید می‌کنه
# - کلیدهای سفارشی .env (BALE_BOT_TOKEN و …) در اجرای مجدد حفظ می‌شن
# - دیتابیس با permissions امن
# - systemd با user غیر root + بک‌آپ شبانه (cron)
# - فایروال + Nginx
# - reCAPTCHA placeholder + راهنما
# - HTTPS setup با certbot (اگه دامنه ست شده)
# ============================================================================
# v1.0 (تغییرات از 1.1.2):
# - چک وابستگی‌ها آیتم‌به‌آیتم: هر ابزار که نیست، فقط همان نصب می‌شود
# - jq هم نصب می‌شود (خروجی خوانا برای scripts/maintenance.sh)
# - MAINTENANCE_TOKEN: کلید کانال نگهداری — یک بار چاپ و در .env ذخیره می‌شود
# ============================================================================
set -eo pipefail
# v1.0 (audit W36-40 #12): خطای وسط نصب باید خط را گزارش کند — بدون ERR trap،
# شکست بعد از قدم ۶ (توقف سرویس) حالت نیمه‌کاره با هیچ تشخیصی جا می‌ماند
trap 'echo "❌ install.sh در خط $LINENO شکست خورد — وضعیت را بررسی کن و دوباره اجرا کن (idempotent است)"' ERR
# v1.0 (audit W46-50 #14): هیچ پرامپت تعاملی در نصب خودکار
export DEBIAN_FRONTEND=noninteractive

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

# v1.0 rev5 — flagهای «فقط دستیار» (AI-bind):
#   --ai-bind              → MAINTENANCE_AI_BIND=1 در .env (خواندن هم به EDIT_TOKEN نیاز دارد)
#   --ip-allowlist "<csv>"  → MAINTENANCE_IP_ALLOWLIST در .env (csv از IP/CIDR)
#   --no-ai-bind           → صریح غیرفعال (در re-run)
AI_BIND_FLAG=""
IP_ALLOWLIST_FLAG=""
while [ $# -gt 0 ]; do
    case "$1" in
        --ai-bind)
            AI_BIND_FLAG="1"
            shift
            ;;
        --no-ai-bind)
            AI_BIND_FLAG="0"
            shift
            ;;
        --ip-allowlist)
            IP_ALLOWLIST_FLAG="$2"
            shift 2
            ;;
        --ip-allowlist=*)
            IP_ALLOWLIST_FLAG="${1#*=}"
            shift
            ;;
        --)
            shift
            break
            ;;
        *)
            # آرگومان‌های دیگر را نادیده می‌گیریم (مثلاً پرچم‌های قدیمی)
            shift
            ;;
    esac
done

VERSION="1.0"
echo "=========================================="
echo "  نصب سایت شخصی v$VERSION (Pre-built)"
echo "=========================================="
if [ "$AI_BIND_FLAG" = "1" ]; then
    echo "  🔒 حالت AI-bind فعال: خواندن هم به EDIT_TOKEN نیاز دارد"
fi
if [ -n "$IP_ALLOWLIST_FLAG" ]; then
    echo "  🔒 IP allowlist: $IP_ALLOWLIST_FLAG"
fi
echo ""

# ============================================================================
# قدم ۱: Swap (اگه رم کمه)
# ============================================================================
echo "[1/11] Swap..."
# v1.0 (audit W46-50 #14): خروجی خالی swapon --show یعنی هیچ swap ای (فایل یا
# پارتیشن) — قبلاً grep swap پارتیشن‌هایی با نام عادی را از قلم می‌انداخت و
# swapfile دوم بی‌دلیل ساخته می‌شد
if [ -z "$(swapon --show 2>/dev/null)" ]; then
    # v1.0 (audit W36-40 #9): قبل از ساخت swapfile، فضای دیسک چک می‌شود —
    # dd روی دیسک کوچک می‌تواند کل دیسک را پر کند و نصب را بکشد
    AVAIL_KB=$(df --output=avail / | tail -1 | tr -dc '0-9')
    if [ "${AVAIL_KB:-0}" -lt 3145728 ]; then
        echo "  ⚠️  کمتر از ۳GB فضای خالی — swapfile ساخته نشد (سایت با ۱GB رم هم بالا می‌آید)"
    else
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  ✅ Swap ساخته شد"
    fi
else
    echo "  ✅ Swap هست"
fi

# ============================================================================
# قدم ۲: Node.js
# ============================================================================
echo ""
echo "[2/11] Node.js..."
# v1.0: ابزار کمکی — هر بسته‌ای که نبود فقط همان نصب می‌شود
ensure_pkg() {
    local cmd="$1" pkg="$2"
    if command -v "$cmd" &> /dev/null; then
        echo "  ✅ $pkg نصبه"
    else
        apt-get update -qq 2>/dev/null || apt update -qq
        apt-get install -y "$pkg"
        echo "  ✅ $pkg نصب شد (نبود)"
    fi
}
# v1.1: curl باید قبل از NodeSource نصب باشه
ensure_pkg curl curl
if command -v node &> /dev/null; then
    # v1.1.2: Next.js 16 به Node.js >= 20.9 نیاز دارد (نه فقط 20)
    NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
    NODE_MINOR=$(node -v | sed 's/v//' | cut -d. -f2)
    if [ "$NODE_VER" -gt 20 ] || { [ "$NODE_VER" -eq 20 ] && [ "$NODE_MINOR" -ge 9 ]; }; then
        echo "  ✅ Node.js نصبه ($(node -v)) — با Next.js 16 سازگار است (>= 20.9)"
    else
        echo "  ⚠ Node.js $(node -v) برای Next.js 16 کم است (>= 20.9 لازم است) — آپدیت می‌کنم..."
        # v1.0 (audit W46-50 #14): شکست network با پیام شفاف — قبلاً set -e بی‌صدا می‌کشت
        curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || { echo "  ❌ NodeSource در دسترس نیست — اتصال اینترنت/فیلتر را چک کن"; exit 1; }
        apt install -y nodejs
        echo "  ✅ Node.js آپدیت شد ($(node -v))"
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || { echo "  ❌ NodeSource در دسترس نیست — اتصال اینترنت/فیلتر را چک کن"; exit 1; }
    apt install -y nodejs
    echo "  ✅ Node.js نصب شد ($(node -v))"
fi

# v1.1.2: موتور Prisma این بیلد روی openssl 3.0 کامپایل شده (Ubuntu 22.04+/Debian 12).
# روی openssl < 3 سرویس با Prisma بالا نمی‌آید — مگر با FORCE_INSTALL=1 نصب اجباری شود.
check_openssl_compat() {
    # اگر openssl هنوز نصب نیست، قدم ۳ نصبش می‌کند و «بررسی نهایی» دوباره چک می‌کند
    command -v openssl &> /dev/null || return 0
    local OPENSSL_MAJOR
    OPENSSL_MAJOR=$(openssl version | awk '{print $2}' | cut -d. -f1)
    if [ "${OPENSSL_MAJOR:-0}" -lt 3 ] && [ "${FORCE_INSTALL:-0}" != "1" ]; then
        echo ""
        echo "  ⚠️ هشدار: موتور Prisma این بیلد به openssl 3.0 نیاز دارد (Ubuntu 22.04+ / Debian 12+)."
        echo "  ⚠️ WARNING: the bundled Prisma engine targets openssl 3.0 (Ubuntu 22.04+ / Debian 12)."
        echo "     این سیستم openssl $(openssl version | awk '{print $2}') دارد → Prisma اجرا نمی‌شود."
        echo "     برای نصب اجباری:  sudo FORCE_INSTALL=1 ./install.sh"
        exit 1
    fi
}
check_openssl_compat

# ============================================================================
# قدم ۳: ابزارهای ضروری — v1.0: چک آیتم‌به‌آیتم و نصب فقط موارد غایب
# ============================================================================
echo ""
echo "[3/11] Nginx + tools + openssl (چک و نصب موارد غایب)..."
# v1.0 (audit W46-50 #14): یک update واحد — python3-certbot-nginx بدون index تازه 404 می‌داد
# v1.0 (audit W36-40 #12): شکست update را می‌پوشاند؟ نه — هشدار می‌دهیم؛ نصب بسته‌ها اگر index
# کامل نباشد جایی بعد خطای مبهم می‌دهد. || true فقط برای محیط‌های بدون اینترنت index کامل
if ! apt-get update -qq 2>/dev/null && ! apt update -qq 2>/dev/null; then
    echo "  ⚠️  apt-get update ناموفق بود — اگر نصب بسته‌ها شکست خورد، اتصال شبکه را بررسی کن"
fi
# v1.1: dnsutils لازمه برای `host` (تشخیص دامنه → HTTPS)
# v1.1.1 (audit P6-L9): unzip هم لازمه برای quick-start مستند در VERSION.txt
# v1.0: jq برای خوانا شدن خروجی maintenance.sh؛ logrotate برای چرخش لاگ بک‌آپ
ensure_pkg nginx nginx
ensure_pkg sqlite3 sqlite3
ensure_pkg python3 python3
ensure_pkg ufw ufw
ensure_pkg certbot certbot
ensure_pkg openssl openssl
ensure_pkg dig dnsutils
ensure_pkg unzip unzip
ensure_pkg jq jq
ensure_pkg logrotate logrotate
if ! dpkg -s python3-certbot-nginx &>/dev/null 2>&1; then
    apt-get install -y python3-certbot-nginx
    echo "  ✅ python3-certbot-nginx نصب شد"
else
    echo "  ✅ python3-certbot-nginx نصبه"
fi
if command -v nginx &>/dev/null && ! systemctl is-active --quiet nginx 2>/dev/null; then
    systemctl enable nginx
    systemctl start nginx
    echo "  ✅ سرویس nginx استارت شد"
fi
# بررسی نهایی openssl (مهم برای تولید SESSION_SECRET)
if ! command -v openssl &> /dev/null; then
    echo "  ❌ openssl پیدا نشد! نصب دستی: apt install -y openssl"
    exit 1
fi
# v1.1.2: روی سیستم‌های تازه openssl همین‌جا (قدم ۳) نصب شده — چک نسخه (>= 3) هم لازم است
check_openssl_compat

# ============================================================================
# قدم ۴: فایروال
# ============================================================================
echo ""
echo "[4/11] فایروال..."
# v1.1.1 (audit S10-L3): اگر SSH روی پورت دیگری است، همان را باز کن —
# وگرنه ufw enable کلاینت SSHِ فعال را قطع می‌کند (lockout)
# v1.1.2 (fix): اگر sshd پیدا نشود (یا ss نباشد)، pipeline با set -o pipefail کل نصب را
# می‌کشت — حالا || true و اگر خالی بود، پیش‌فرض 22 (خط بعدی)
# v1.0 (audit W46-50 #9): تشخیص پورت SSH کامل‌تر — socket-activated sshd و
# کانفیگ صریح؛ وگرنه ufw enable می‌توانست session ادمین را قطع کند
SSH_PORT=$(ss -tlnp 2>/dev/null | grep -E 'sshd|openssh' | grep -oP ':\K\d+(?=\s)' | head -1) || true
if [ -z "$SSH_PORT" ]; then
    SSH_PORT=$(awk '/^\s*Port\s+/{print $2; exit}' /etc/ssh/sshd_config 2>/dev/null) || true
fi
if [ -z "$SSH_PORT" ]; then
    SSH_PORT=$(systemctl cat ssh.socket 2>/dev/null | grep -oP 'ListenStream=\K\d+' | head -1) || true
fi
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
    EXISTING_SECRET=$(grep "^SESSION_SECRET=" .env | cut -d'=' -f2- | tr -d '"')
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
    BALE_SECRET=$(grep "^BALE_WEBHOOK_SECRET=" .env | cut -d'=' -f2- | tr -d '"')
    [ -z "$BALE_SECRET" ] && BALE_SECRET=$(openssl rand -hex 16)
else
    BALE_SECRET=$(openssl rand -hex 16)
fi
if [ -f .env ] && grep -q "^TELEGRAM_WEBHOOK_SECRET=" .env; then
    TG_SECRET=$(grep "^TELEGRAM_WEBHOOK_SECRET=" .env | cut -d'=' -f2- | tr -d '"')
    [ -z "$TG_SECRET" ] && TG_SECRET=$(openssl rand -hex 16)
else
    TG_SECRET=$(openssl rand -hex 16)
fi

# v1.0: MAINTENANCE_TOKEN — کلید کانال نگهداری (scripts/maintenance.sh).
# اگه هست نگه دار (idempotent)؛ حداقل ۳۲ کاراکتر — کوتاه‌تر یعنی کانال خاموش.
if [ -f .env ] && grep -q "^MAINTENANCE_TOKEN=" .env; then
    MAINT_TOKEN=$(grep "^MAINTENANCE_TOKEN=" .env | cut -d'=' -f2- | tr -d '"')
    if [ -z "$MAINT_TOKEN" ] || [ "${#MAINT_TOKEN}" -lt 32 ]; then
        MAINT_TOKEN=$(openssl rand -hex 32)
        # v1.0 (audit W41-45 #6): توکنِ ضعیفِ جایگزین‌شده هم باید یک بار نمایش داده شود —
        # قبلاً در .env نوشته می‌شد ولی چون MAINT_TOKEN_IS_NEW ست نمی‌شد، هرگز چاپ نمی‌شد
        MAINT_TOKEN_IS_NEW="1"
        echo "  ✅ MAINTENANCE_TOKEN قبلی ضعیف بود — جدید تولید شد"
    else
        echo "  ✅ MAINTENANCE_TOKEN موجود نگه داشته شد"
    fi
else
    MAINT_TOKEN=$(openssl rand -hex 32)
    MAINT_TOKEN_IS_NEW="1"
fi

# v1.0 (rev2): MAINTENANCE_EDIT_TOKEN — کلید کانال ویرایش از دور (سطح دوم؛
# actionهای نوشتن). حداقل ۴۸ کاراکتر → hex ۳۲ بایتی = ۶۴ کاراکتر.
if [ -f .env ] && grep -q "^MAINTENANCE_EDIT_TOKEN=" .env; then
    EDIT_TOKEN=$(grep "^MAINTENANCE_EDIT_TOKEN=" .env | cut -d'=' -f2- | tr -d '"')
    if [ -z "$EDIT_TOKEN" ] || [ "${#EDIT_TOKEN}" -lt 48 ]; then
        EDIT_TOKEN=$(openssl rand -hex 32)
        EDIT_TOKEN_IS_NEW="1"
        echo "  ✅ MAINTENANCE_EDIT_TOKEN قبلی ضعیف بود — جدید تولید شد"
    else
        echo "  ✅ MAINTENANCE_EDIT_TOKEN موجود نگه داشته شد"
    fi
else
    EDIT_TOKEN=$(openssl rand -hex 32)
    EDIT_TOKEN_IS_NEW="1"
fi

# v1.0 (rev3): MAINTENANCE_ENC_KEY — کلید رمزنگاری کانال نگهداری (AES-256-GCM).
# درخواست و پاسخ هر دو رمز می‌شوند؛ داخل پاکت ts (±۵ دقیقه) و nonce یک‌بارمصرف
# هست (ضد replay). سرور وقتی این کلید هست، درخواست متنیِ خام را با 426 رد می‌کند.
if [ -f .env ] && grep -q "^MAINTENANCE_ENC_KEY=" .env; then
    ENC_KEY=$(grep "^MAINTENANCE_ENC_KEY=" .env | cut -d'=' -f2- | tr -d '"')
    if ! echo "$ENC_KEY" | grep -qE '^[0-9a-fA-F]{64}$'; then
        ENC_KEY=$(openssl rand -hex 32)
        ENC_KEY_IS_NEW="1"
        echo "  ✅ MAINTENANCE_ENC_KEY قبلی نامعتبر بود — جدید تولید شد"
    else
        echo "  ✅ MAINTENANCE_ENC_KEY موجود نگه داشته شد"
    fi
else
    ENC_KEY=$(openssl rand -hex 32)
    ENC_KEY_IS_NEW="1"
fi

# v1.0 rev5 — محاسبه‌ی مقدار نهایی AI_BIND و IP_ALLOWLIST برای نوشتن در .env.
# منطق: flag صریح > مقدار قبلی .env > پیش‌فرض خاموش.
EXISTING_AI_BIND=$(grep "^MAINTENANCE_AI_BIND=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)
EXISTING_IP_ALLOWLIST=$(grep "^MAINTENANCE_IP_ALLOWLIST=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"' || true)

if [ "$AI_BIND_FLAG" = "1" ]; then
    FINAL_AI_BIND="1"
elif [ "$AI_BIND_FLAG" = "0" ]; then
    FINAL_AI_BIND="0"
else
    FINAL_AI_BIND="${EXISTING_AI_BIND:-0}"
fi

if [ -n "$IP_ALLOWLIST_FLAG" ]; then
    # flag خالی هم می‌تواند داده شود تا پاک شود
    FINAL_IP_ALLOWLIST="$IP_ALLOWLIST_FLAG"
else
    FINAL_IP_ALLOWLIST="$EXISTING_IP_ALLOWLIST"
fi

if [ "$FINAL_AI_BIND" = "1" ]; then
    echo "  ✅ MAINTENANCE_AI_BIND=1 (حالت فقط-دستیار)"
else
    echo "  ✅ MAINTENANCE_AI_BIND=0 (legacy — خواندن با توکن اصلی)"
fi
if [ -n "$FINAL_IP_ALLOWLIST" ]; then
    echo "  ✅ MAINTENANCE_IP_ALLOWLIST ست شد ($FINAL_IP_ALLOWLIST)"
else
    echo "  ✅ MAINTENANCE_IP_ALLOWLIST خالی (همه‌ی IPها مجاز)"
fi

mkdir -p db
chmod 700 db

# reCAPTCHA — اگه از قبل هست، نگه‌دار
EXISTING_RECAPTCHA_SECRET=$(grep "^RECAPTCHA_SECRET=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true
EXISTING_RECAPTCHA_SITEKEY=$(grep "^NEXT_PUBLIC_RECAPTCHA_SITEKEY=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true

# v1.1: NEXT_PUBLIC_SITE_URL هم مثل بقیه‌ی کلیدها preserve می‌شه
EXISTING_SITE_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true
[ -z "$EXISTING_SITE_URL" ] && EXISTING_SITE_URL="https://ehsanmorad.ir"

# v1.0 (audit W46-50 #7): TRUST_PROXY/PORT/HOSTNAME هم preserve — قبلاً هر re-run
# بی‌صدا روی مقدار تمپلیت برمی‌گشت (ادمینی که TRUST_PROXY=false ست کرده بود را
# سکوت امنیتی‌اش گرفته می‌شد)
EXISTING_TRUST_PROXY=$(grep "^TRUST_PROXY=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true
# v1.0 (audit W36-40 #1 — HIGH): قبلاً خودش را به خودش تخصیص می‌داد (no-op)؛
# حالا پیش‌فرض نصب تمیز = "true" — و re-run مقدار صریحِ ادمین (true/false) را حفظ می‌کند
[ -z "$EXISTING_TRUST_PROXY" ] && EXISTING_TRUST_PROXY="true"
EXISTING_PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true
[ -z "$EXISTING_PORT" ] && EXISTING_PORT="3000"
EXISTING_HOSTNAME=$(grep "^HOSTNAME=" .env 2>/dev/null | cut -d'=' -f2- | tr -d '"') || true
[ -z "$EXISTING_HOSTNAME" ] && EXISTING_HOSTNAME="127.0.0.1"

# Write .env (preserving existing values where present)
# v1.1: قبل از بازنویسی، .env قدیمی رو کنار بذار (برای merge کلیدهای سفارشی)
if [ -f .env ]; then cp .env .env.pre-install.$$; fi
cat > .env << EOF
# v1.1.1 — auto-generated by install.sh
DATABASE_URL="file:$SITE_DIR/db/custom.db"
NODE_ENV="production"
PORT=$EXISTING_PORT
# v1.1.1 (audit S10-M1): فقط روی loopback — nginx به همین آدرس proxy می‌کند؛
# app هرگز مستقیم از اینترنت قابل دسترسی نیست → هدرِ جعلی X-Forwarded-For
# نمی‌تواند rate limit را دور بزند
HOSTNAME="$EXISTING_HOSTNAME"
SESSION_SECRET="$SECRET"
NEXT_PUBLIC_SITE_URL="$EXISTING_SITE_URL"
RECAPTCHA_SECRET="$EXISTING_RECAPTCHA_SECRET"
NEXT_PUBLIC_RECAPTCHA_SITEKEY="$EXISTING_RECAPTCHA_SITEKEY"
BALE_WEBHOOK_SECRET="$BALE_SECRET"
TELEGRAM_WEBHOOK_SECRET="$TG_SECRET"
# v1.0: کانال نگهداری — فقط با این هدر: X-Maintenance-Token (ببین scripts/maintenance.sh)
MAINTENANCE_TOKEN="$MAINT_TOKEN"
# v1.0 (rev2): کانال ویرایش از دور — actionهای نوشتن هدر دوم لازم دارند:
# X-Maintenance-Edit-Token (ببین scripts/maintenance.sh و scripts/sync-server-to-github.sh)
MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN"
# v1.0 (rev3): کلید رمزنگاری کانال — پاکت AES-256-GCM (ببین src/lib/maintenance-crypto.ts)
MAINTENANCE_ENC_KEY="$ENC_KEY"
# v1.0 (rev5): حالت «فقط دستیار» — اگر =1 باشد، خواندن هم به EDIT_TOKEN نیاز دارد.
# از flag --ai-bind install.sh ست می‌شود. اگر قبلاً ست شده و این بار --no-ai-bind
# داده شده، به 0 برمی‌گردد. اگر هیچ فلگی داده نشده، مقدار قبلی .env حفظ می‌شود.
MAINTENANCE_AI_BIND="$FINAL_AI_BIND"
# v1.0 rev5: IP allowlist — اگر ست شود، کانال فقط از این IPها/CIDRها قبول می‌کند.
# از flag --ip-allowlist install.sh ست می‌شود. ست نشدن = همه‌ی IPها مجاز.
MAINTENANCE_IP_ALLOWLIST="$FINAL_IP_ALLOWLIST"
# v1.1.2: سایت پشت nginx محلی است — app فقط وقتی TRUST_PROXY=true است به
# X-Forwarded-For اعتماد می‌کند (rate limit بر اساس IP واقعی کاربر)
# v1.0 (audit W36-40 #1 — HIGH): مقدار حفظ‌شده از .env قبلی نوشته می‌شود، نه همیشه "true" —
# قبلاً re-run بی‌صدا TRUST_PROXY=false ادمین را بازنویسی می‌کرد
TRUST_PROXY="$EXISTING_TRUST_PROXY"

# توکن‌های ربات‌ها — اختیاری‌اند (fallback)؛ کانفیگ اصلی ربات‌ها از پنل ادمین خوانده می‌شود
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
# BALE_BOT_TOKEN=
# BALE_CHAT_ID=
EOF
chmod 600 .env
echo "  ✅ Webhook secrets تولید شد"
# v1.0 (audit W46-50 #14): توکن نگهداری هم مثل رمز ادمین در فایل 600 ذخیره می‌شود —
# اگر خروجی install در log ذخیره شده باشد، توکن فقط از فایل امن خوانده می‌شود
umask 077
echo "$MAINT_TOKEN" > "$PROJECT_ROOT/db/.maintenance-token.txt"
chmod 600 "$PROJECT_ROOT/db/.maintenance-token.txt"
echo "$EDIT_TOKEN" > "$PROJECT_ROOT/db/.maintenance-edit-token.txt"
chmod 600 "$PROJECT_ROOT/db/.maintenance-edit-token.txt"
echo "$ENC_KEY" > "$PROJECT_ROOT/db/.maintenance-enc-key.txt"
chmod 600 "$PROJECT_ROOT/db/.maintenance-enc-key.txt"
if [ "${MAINT_TOKEN_IS_NEW:-}" = "1" ]; then
    echo "  ✅ MAINTENANCE_TOKEN تولید شد (در انتهای نصب یک بار چاپ می‌شود)"
fi
if [ "${EDIT_TOKEN_IS_NEW:-}" = "1" ]; then
    echo "  ✅ MAINTENANCE_EDIT_TOKEN تولید شد (در انتهای نصب یک بار چاپ می‌شود)"
fi

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
# v1.0 (audit W46-50 #2 — HIGH): سرویسِ در حال اجرا قبل از دست‌بردن در فایل‌های
# db متوقف می‌شود — حذف WAL/journal زیر پای Node/Prisma در re-run آخرین
# تراکنش‌های commit‌شده را از بین می‌برد (data loss). در قدم ۸ دوباره start می‌شود.
SERVICE_WAS_ACTIVE=0
if systemctl is-active --quiet personal-site 2>/dev/null; then
    SERVICE_WAS_ACTIVE=1
    systemctl stop personal-site
    echo "  سرویس موقتاً متوقف شد (برای امنیت دیتابیس)"
fi
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
    # v1.0 (audit W46-50 #13): umask 022 حذف شد — قول «همه‌ی فایل‌های ساخته‌شده 600»
    # باید تا انتهای اسکریپت برقرار بماند
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

# v1.0 (RBAC cleanup): تضمین نقش مالک — حساب admin همیشه owner است (بالاتر از
# admin؛ از پنل قابل حذف/تنزل نیست). این UPDATE idempotent است و در هر نصب/آپگرید
# اجرا می‌شود تا دیتابیس‌های قدیمی هم به مدل RBAC جدید مهاجرت شوند.
sqlite3 db/custom.db "UPDATE AccessUser SET role='owner' WHERE username='admin' AND role!='owner';" 2>/dev/null || true
OWNER_ROLE=$(sqlite3 db/custom.db "SELECT role FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "?")
if [ "$OWNER_ROLE" = "owner" ]; then
    echo "  ✅ نقش حساب admin = owner (مالک سایت — محافظت‌شده در RBAC)"
else
    echo "  ⚠ نقش حساب admin قابل بررسی نیست ($OWNER_ROLE) — ادامه می‌دهیم"
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
    # v1.1.2 (fix SQLITE_CANTOPEN): DATABASE_URL همچنان به $PROJECT_ROOT/db/custom.db
    # اشاره می‌کند (مسیر مطلق در .env) — owner دایرکتوری db پروژه و ReadWritePaths آن
    # در قدم ۸ ست می‌شوند (کاربر ehsansite آنجا ساخته می‌شود) وگرنه سرویس نمی‌توانست
    # دیتابیس را باز کند.
    echo "  ✅ آماده شد"
else
    # v1.0 rev3 (audit DEPLOY-d CRITICAL): پکیج فقط-سورس → server.js وجود ندارد →
    # قبلاً نصب ادامه می‌یافت و systemd unit روی فایل ناموجود crash-loop می‌کرد
    # و seed ادمین هم (بدون node_modules) fatal می‌شد. حالا fail-fast با پیام شفاف:
    echo "  ❌ FATAL: نه server.js هست نه .next/standalone — این zip فقط-سورس است!"
    echo "     install.sh به بیلدِ pre-built نیاز دارد (standalone)."
    echo "     ✔ zip رسمی «ehsan-site-v1.0-<تاریخ شمسی>.zip» را دانلود کن (شامل standalone است)"
    echo "     ✔ یا خودت اول: npm install && npm run build  و بعد دوباره install.sh"
    exit 1
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
# v1.1.2 (fix SQLITE_CANTOPEN): وقتی app از .next/standalone اجرا می‌شود، DATABASE_URL
# به $PROJECT_ROOT/db/custom.db اشاره می‌کند — این دایرکتوری root-owned 700 بود و
# سرویس (ehsansite) SQLITE_CANTOPEN می‌گرفت. owner + ReadWritePaths (پایین‌تر):
chown -R ehsansite:ehsansite "$PROJECT_ROOT/db" 2>/dev/null || true

# v1.0 (audit W46-50 #2 — HIGH): backups باید قبل از ساخت unit وجود داشته باشد —
# ReadWritePaths روی مسیرِ غایب با status=226/NAMESPACE کرش می‌کرد و نصب تمیز abort می‌شد
mkdir -p "$PROJECT_ROOT/backups"
chown ehsansite:ehsansite "$PROJECT_ROOT/backups" 2>/dev/null || true
chmod 750 "$PROJECT_ROOT/backups" 2>/dev/null || true

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
# v1.0 (audit W31-35 #10): سلامت دیتابیس قبل از هر بوت — DB خراب در مسیر systemd
# (برخلاف Docker) تا حالا به‌صورت 500 های بی‌صدا ظاهر می‌شد؛ حالا با پیام روشن fail می‌کند
ExecStartPre=-/usr/bin/sqlite3 $PROJECT_ROOT/db/custom.db "PRAGMA quick_check;"
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
# v1.1.2 (fix): db ممکن است در $PROJECT_ROOT/db باشد حتی وقتی WorkingDirectory
# همان standalone است — بدون این مسیر sqlite3 خطای SQLITE_CANTOPEN می‌دهد
ReadWritePaths=$SITE_DIR $PROJECT_ROOT/db $PROJECT_ROOT/backups
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
# v1.1.2: logrotate برای لاگ بک‌آپ — هفتگی، نگه‌داری ۷ نسخه، فشرده‌سازی
cat > /etc/logrotate.d/personal-site-backup << EOF
/var/log/personal-site-backup.log {
    weekly
    rotate 7
    compress
    copytruncate
    missingok
}
EOF
chmod 644 /etc/logrotate.d/personal-site-backup
systemctl enable cron 2>/dev/null || systemctl enable crond 2>/dev/null || true
systemctl restart cron 2>/dev/null || systemctl restart crond 2>/dev/null || true
# v1.0 (audit W46-50 #4): دایرکتوری backups متعلق به سرویس — تا اکشن backupِ
# کانال نگهداری (که با کاربر ehsansite اجرا می‌شود) بتواند بنویسد؛ root cron هم
# در همان می‌نویسد. بدون این، با ProtectSystem عملیات EROFS می‌گرفت.
# v1.0 (audit W46-50 #2): mkdir قبلاً در قدم قبل انجام شد (قبل از systemd unit) —
# اینجا فقط ensure برای نصب‌های قدیمی که قدم قبل را ندارند (idempotent)
mkdir -p "$PROJECT_ROOT/backups" 2>/dev/null || true
chown ehsansite:ehsansite "$PROJECT_ROOT/backups" 2>/dev/null || true
chmod 750 "$PROJECT_ROOT/backups" 2>/dev/null || true
echo "  ✅ بک‌آپ شبانه ۳ بامداد فعال شد (/etc/cron.d/personal-site-backup)"
echo "  ✅ logrotate لاگ بک‌آپ فعال شد (/etc/logrotate.d/personal-site-backup)"

# ============================================================================
# قدم ۱۰: Nginx
# ============================================================================
echo ""
echo "[10/11] Nginx..."
# v1.1.2 (fix): || true حذف شد — خطای کپی کانفیگ یا nginx -t باید نصب را متوقف کند
# (سایت بدون nginx کار نمی‌کند؛ پوشاندن خطا یعنی «موفق» گزارش‌کردنِ نصب خراب)
# v1.0 (audit W46-50 #1 — HIGH): مسیر مطلق — در شاخه‌ی standalone، cd به
# .next/standalone انجام شده بود و cp نسبی فایل conf را پیدا نمی‌کرد و کل نصب
# بعد از تمام شدن کارهای سنگین abort می‌شد
echo "" 
echo "[10/11] Nginx..."
# v1.0 rev3 (audit DEPLOY-d MEDIUM): اگر کانفیگِ نصب‌شده از قبل TLS دارد (certbot
# بلوک‌های 443/redirect را داخل همان فایل می‌نویسد)، بازنویسی با نسخه‌ی HTTP-only
# ریپو «HTTPS فعال» را بی‌صدا می‌شکست — پس کانفیگ TLS-دار دست‌نخورده می‌ماند.
INSTALLED_NGINX_CONF=/etc/nginx/sites-available/nginx-ehsanmorad.conf
if [ -f "$INSTALLED_NGINX_CONF" ] && grep -qE 'ssl_certificate|443 ssl' "$INSTALLED_NGINX_CONF"; then
    echo "  ⏭ کانفیگ nginx نصب‌شده TLS/certbot-managed است — بازنویسی نشد"
    echo "    (برای اعمال نسخه‌ی جدید: اول بک‌آپ بگیر و بلوک‌های TLS را دستی منتقل کن)"
else
    if ! cp "$PROJECT_ROOT/nginx-ehsanmorad.conf" "$INSTALLED_NGINX_CONF"; then
        echo "  ❌ کپی nginx config ناموفق بود — فایل nginx-ehsanmorad.conf کنار install.sh هست؟"
        exit 1
    fi
fi
ln -sf /etc/nginx/sites-available/nginx-ehsanmorad.conf /etc/nginx/sites-enabled/nginx-ehsanmorad.conf 2>/dev/null || true
# v1.0 (audit W36-40 #11): symlink بی‌صدا نباید فرض شود — در چیدمان‌های بدون sites-enabled،
# nginx -t با سایت default سبز می‌شد و هیچ proxys به :3000 وجود نداشت
if [ ! -e /etc/nginx/sites-enabled/nginx-ehsanmorad.conf ]; then
    echo "  ❌ symlink sites-enabled ساخته نشد — چیدمان nginx را دستی بررسی کن (conf.d یا include)"
    exit 1
fi
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
if nginx -t 2>&1; then
    systemctl reload nginx
else
    echo "  ❌ nginx -t ناموفق بود — config نامعتبر است؛ nginx reload نشد. نصب متوقف شد."
    echo "     بررسی دستی: nginx -t   و   cat /etc/nginx/sites-available/nginx-ehsanmorad.conf"
    exit 1
fi
echo "  ✅ Nginx تنظیم شد"

# تست — v1.0 (audit W46-50 #14): retry تا ۱۵ ثانیه؛ start سرد standalone گاهی
# بیشتر از 5s طول می‌کشید و «سایت بالا نیومد» کاذب گزارش می‌شد
SUCCESS=false
for _ in 1 2 3 4 5 6; do
    sleep 3
    CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ]; then
        echo "  ✅ سایت بالا اومد"
        SUCCESS=true
        break
    fi
done
if [ "$SUCCESS" != "true" ]; then
    echo "  ⚠ چک کن: journalctl -u personal-site -n 20"
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
    # v1.0 (audit W46-50 #5): www فقط وقتی در DNS هست درخواست می‌شود — نبودِ رکورد
    # www کل order را می‌شکست و HTTPS کلاً skip می‌شد
    WWW_ARGS=""
    if host "www.$DOMAIN_FOUND" >/dev/null 2>&1; then
        WWW_ARGS="-d www.$DOMAIN_FOUND"
    else
        echo "  (رکورد www در DNS نیست — فقط دامنه‌ی اصلی درخواست می‌شود)"
    fi
    if certbot --nginx -d "$DOMAIN_FOUND" $WWW_ARGS --redirect --non-interactive --agree-tos --register-unsafely-without-email 2>&1 | tail -5; then
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
echo "    ⚠️ v1.0: Secret از طریق هدر بومی پلتفرم ارسال می‌شه — موقع setWebhook این بدنه را بفرست:"
echo "       { "url": "https://<domain>/api/bale/webhook", "secret_token": "<BALE_WEBHOOK_SECRET داخل .env>" }"
echo "       (پلتفرم مقدار را در هدر X-Telegram-Bot-Api-Secret-Token برمی‌گرداند؛ هدر سفارشی x-webhook-secret هم پذیرفته می‌شود)"
echo "    ⚠️ Secretها تو فایل .env هستن — با 'sudo cat .env' ببین"
echo "    ⚠️ این مقادیر رو با کسی به اشتراک نذار!"
echo ""
echo "  بک‌آپ خودکار: هر شب ۳ بامداد (نگه‌داری ۷ نسخه — backups/)"
echo ""
echo "  کانال نگهداری اختصاصی (v1.0):"
echo "    action ها: status | db-stats | security-logs | messages | chats | backup | help"
echo "    روی خود سرور:   cd $PROJECT_ROOT && bash scripts/maintenance.sh status"
echo "    از هر جای دیگر: bash scripts/maintenance.sh status  (با MAINTENANCE_URL ست‌شده)"
echo ""
if [ "${MAINT_TOKEN_IS_NEW:-}" = "1" ]; then
    echo "  🔑 MAINTENANCE_TOKEN (یک بار نمایش — در .env هم ذخیره شد):"
    echo "     $MAINT_TOKEN"
    echo "     ⚠️ این توکن را فقط به نگهدارنده‌ی مطمئن بده — دسترسی خواندن پیام‌ها/لاگ‌ها + بک‌آپ دارد"
    echo ""
else
    echo "  🔑 MAINTENANCE_TOKEN: قبلاً ست شده — با 'sudo grep MAINTENANCE_TOKEN $PROJECT_ROOT/.env' ببین"
    echo ""
fi
if [ "${EDIT_TOKEN_IS_NEW:-}" = "1" ]; then
    echo "  🔑 MAINTENANCE_EDIT_TOKEN (یک بار نمایش — در .env هم ذخیره شد):"
    echo "     $EDIT_TOKEN"
    echo "     ⚠️ این توکن دسترسی ویرایش محتوای سایت از دور می‌دهد (texts/nav/clips/settings)"
    echo "     ⚠️ فقط به خودت/نگهدارنده‌ی کاملاً مطمئن بده — همه‌ی فراخوانی‌ها در SecurityLog ثبت می‌شود"
    echo ""
else
    echo "  🔑 MAINTENANCE_EDIT_TOKEN: قبلاً ست شده — با 'sudo grep MAINTENANCE_EDIT_TOKEN $PROJECT_ROOT/.env' ببین"
    echo ""
fi
if [ "${ENC_KEY_IS_NEW:-}" = "1" ]; then
    echo "  🔑 MAINTENANCE_ENC_KEY (یک بار نمایش — در .env هم ذخیره شد):"
    echo "     $ENC_KEY"
    echo "     ⚠️ کلید رمزنگاری کانال (AES-256-GCM) — کپی امن: sudo cat db/.maintenance-enc-key.txt"
    echo "     با ست‌شدن این کلید، scripts/maintenance.sh و sync-server-to-github.sh خودکار رمز می‌کنند"
    echo ""
else
    echo "  🔑 MAINTENANCE_ENC_KEY: قبلاً ست شده — با 'sudo grep MAINTENANCE_ENC_KEY $PROJECT_ROOT/.env' ببین"
    echo ""
fi
echo "  کانال ویرایش از دور (v1.0 rev3 — رمزنگاری‌شده با AES-256-GCM):"
echo "    export MAINTENANCE_URL=https://ehsanmorad.ir MAINTENANCE_TOKEN=... MAINTENANCE_EDIT_TOKEN=... MAINTENANCE_ENC_KEY=..."
echo "    bash scripts/maintenance.sh texts.get        # خواندن متن‌ها (درخواست و پاسخ رمز می‌شوند)"
echo "    bash scripts/maintenance.sh texts.set --data '{\"key\":\"hero.greeting\",\"valueFa\":\"سلام\"}'"
echo "    bash scripts/ai-edit-online.sh texts.set --data '{\"key\":\"hero.greeting\",\"valueFa\":\"سلام\"}'  # ویرایش + sync خودکار"
echo "    bash scripts/sync-server-to-github.sh    # snapshot سرور به GitHub (شاخه‌ی server-state)"
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
