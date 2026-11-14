#!/bin/bash
# ============================================================================
# reset-admin-password.sh — ریست رمز ادمین از سرور (v1.1)
# ============================================================================
# اگه ادمین رمز رو فراموش کرد، این اسکریپت رو روی سرور اجرا کن:
#
#   cd /home/ehsan/personal-site
#   sudo bash scripts/reset-admin-password.sh
#
# v1.1: یک رمز تصادفی تولید می‌شه، هش bcrypt تو دیتابیس ذخیره می‌شه
#       و رمز فقط «همین یک بار» همینجا چاپ می‌شه.
#       (رمز پیش‌فرض ثابت قدیمی برای همیشه حذف شده.)
# ============================================================================
set -eo pipefail

# v1.0 (audit W41-45 #5): gate دسترسی — ریست رمز ادمین عملیات حساس است
if [ "$(id -u)" != "0" ]; then
    echo "❌ این اسکریپت باید با sudo اجرا شود:  sudo bash scripts/reset-admin-password.sh"
    exit 1
fi

echo "=========================================="
echo "  ریست رمز ادمین (v1.1 — رمز تصادفی)"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# v1.1 (fix): مسیر دیتابیس را از DATABASE_URL حل کن — وقتی اپ روی
# .next/standalone اجرا می‌شود، db.ts مسیر دیگری باز می‌کند و قبلاً ریست
# «موفق» روی دیتابیس اشتباه انجام می‌شد.
resolve_db() {
    local url=""
    if [ -f "$PROJECT_DIR/.env" ]; then
        url=$(grep "^DATABASE_URL=" "$PROJECT_DIR/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' || true)
    fi
    local candidate=""
    if [ -n "$url" ]; then
        candidate="${url#file:}"
        # v1.0 (audit W41-45 #13): query params (?connection_limit=...) از مسیر حذف می‌شوند
        candidate="${candidate%%\?*}"
        case "$candidate" in
            /*) ;;
            *) candidate="$PROJECT_DIR/$candidate" ;;
        esac
        if [ -f "$candidate" ]; then echo "$candidate"; return; fi
    fi
    for p in "$PROJECT_DIR/.next/standalone/db/custom.db" "$PROJECT_DIR/db/custom.db"; do
        if [ -f "$p" ]; then echo "$p"; return; fi
    done
    echo "$PROJECT_DIR/db/custom.db"
}
DB_FILE="$(resolve_db)"

echo "مسیر پروژه: $PROJECT_DIR"
echo ""

if [ ! -f "$DB_FILE" ]; then
    echo "❌ دیتابیس پیدا نشد: $DB_FILE"
    exit 1
fi

# اگه کاربر admin وجود نداره، راهنمای ساختش رو نشون بده
ADMIN_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "0")
if [ "$ADMIN_COUNT" = "0" ]; then
    echo ""
    echo "❌ کاربر admin پیدا نشد!"
    echo ""
    echo "برای ساخت کاربر admin جدید:"
    echo "  python3 scripts/seed_access_users.py"
    exit 1
fi

# v1.1: رمز تصادفی ۱۶ کاراکتری (بدون کاراکترهای مبهم) — دیگر هیچ رمز ثابتی نیست
NEW_PASSWORD=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 16)
if [ "${#NEW_PASSWORD}" -lt 12 ]; then
    echo "❌ تولید رمز تصادفی ناموفق بود — یک بار دیگه اجرا کن"
    exit 1
fi

# تولید هش bcrypt — رمز از ENV VAR خونده می‌شه، نه با interpolation داخل کد JS
echo "در حال تولید هش bcrypt..."
# v1.0 (audit W1-5 #10): cost 12 — هم‌مثل hashPassword اپ (قبلاً 10 بود)
HASH=$(BcryptPass="$NEW_PASSWORD" node -e "const b=require('./node_modules/bcryptjs');process.stdout.write(b.hashSync(process.env.BcryptPass,12))")
if [ -z "$HASH" ]; then
    echo "❌ خطا در تولید هش. مطمئن شو bcryptjs داخل node_modules هست."
    exit 1
fi
echo "هش تولید شد."
# v1.0 (audit W41-45 #5): ردپای در syslog هم می‌ماند
logger -t personal-site "admin password reset executed" 2>/dev/null || true

# آپدیت دیتابیس — SQL از stdin (heredoc) می‌ره، نه از argv (-c)
# تا هش تو لیست پروسه‌ها (ps) دیده نشه
echo "در حال آپدیت دیتابیس..."
# v1.0 (audit W41-45 #5):
# - sessionsValidAfter = الان → همه‌ی sessionهای باز ادمین بلافاصله بی‌اعتبار می‌شوند
#   (قبلاً توکن‌های باز تا ۲۴h زنده می‌ماندند)
# - active دیگر بی‌صدا 1 نمی‌شود — غیرفعال‌کردنِ عمدی با ریست رمز باطل نمی‌شود؛
#   ادمین باید جداگانه از پنل فعالش کند (اگر لازم بود)
# - ردپای حسابرسی در SecurityLog ثبت می‌شود
NOW_MS=$(node -e "process.stdout.write(String(Date.now()))")
sqlite3 "$DB_FILE" <<EOF
UPDATE AccessUser
SET passwordHash = '$HASH', sessionsValidAfter = $NOW_MS
WHERE username = 'admin';
INSERT INTO SecurityLog (id, type, ip, detail, createdAt)
VALUES (lower(hex(randomblob(16))), 'admin_password_reset', NULL, 'reset-admin-password.sh executed on ' || datetime('now'), $NOW_MS);
EOF

# بررسی نهایی — هش bcrypt همیشه ۶۰ کاراکتره
HASH_LEN=$(sqlite3 "$DB_FILE" "SELECT length(passwordHash) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "0")
if [ "$HASH_LEN" = "60" ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ رمز ادمین ریست شد!"
    echo "=========================================="
    echo ""
    echo "  ⚠️ این رمز فقط همین یک بار نمایش داده می‌شه — الان یادداشتش کن:"
    echo ""
    echo "    username: admin"
    echo "    password: $NEW_PASSWORD"
    echo ""
    echo "  ورود:"
    echo "    URL: https://YOUR_DOMAIN/user-login  (یا http://SERVER_IP:3000 فقط برای تست)"
    echo ""
    echo "  ⚠️ بعد از ورود، از پنل → تنظیمات → تغییر رمز، یه رمز جدید بذار!"
    echo "  ⚠️ با تغییر رمز، همه‌ی sessionهای قبلی هم خودکار باطل می‌شن (v1.1)."
    echo ""
    echo "=========================================="
else
    echo ""
    echo "❌ آپدیت دیتابیس ناموفق بود (طول هش: $HASH_LEN)"
    echo "   چک کن: journalctl -u personal-site -n 20"
    exit 1
fi
