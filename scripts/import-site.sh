#!/bin/bash
# ============================================================================
# import-site.sh — import site state from a migration tarball (v1.1)
# ============================================================================
# روی سرور «جدید» اجرا می‌شه، بعد از نصب کامل با install.sh:
#
#   cd /home/ehsan/personal-site
#   sudo bash scripts/import-site.sh /root/site-migration-YYYYMMDD-HHMMSS.tar.gz
#
# کارهایی که می‌کنه:
#   1) tarball رو باز می‌کنه (db + .env + backups)
#   2) سرویس رو stop می‌کنه
#   3) دیتابیس رو با permission امن نصب می‌کنه (owner: ehsansite)
#   4) .env رو MERGE می‌کنه (نه overwrite):
#      - DATABASE_URL جدید (مبتنی بر مسیر همین سرور) حفظ می‌شه
#      - مقادیر .env «جدید» همیشه برنده‌اند (v1.1.2)؛ از فایل قدیمی فقط
#        کلیدهایی میاد که در .env جدید نیستن — وگرنه مقادیر قدیمیِ دامنه
#        (NEXT_PUBLIC_SITE_URL، webhook URLها، sitekeyها) تنظیمات VPS جدید
#        رو override می‌کردن
#   5) apply_schema.py اجرا می‌شه (heal کردن schema drift)
#   6) سرویس start می‌شه و admin بررسی می‌شه
# ============================================================================
set -eo pipefail
# v1.1.2 (security): umask امن — فایل‌های موقت (db، .env) هرگز world-readable نمی‌شوند
umask 077

if [ "$(id -u)" != "0" ]; then
    echo "❌ این اسکریپت باید با sudo اجرا بشه:"
    echo "   sudo bash scripts/import-site.sh <tarball>"
    exit 1
fi

TARBALL="${1:-}"
if [ -z "$TARBALL" ]; then
    echo "Usage: sudo bash scripts/import-site.sh <tarball>"
    exit 1
fi
if [ ! -f "$TARBALL" ]; then
    echo "❌ فایل tarball پیدا نشد: $TARBALL"
    exit 1
fi

SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SITE_DIR"
DB_FILE="$SITE_DIR/db/custom.db"

echo "=========================================="
echo "  Import migration (v1.1)"
echo "  site dir: $SITE_DIR"
echo "  tarball:  $TARBALL"
echo "=========================================="
echo ""

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[1/6] استخراج tarball..."
# v1.1 (security): --no-same-owner — جلوگیری از ساخت فایل‌های root-owned توسط tarball
# نامعتبر + مسیرهای مطلق/با .. رد می‌شوند
if tar -xzf "$TARBALL" -C "$TMP" --no-same-owner 2>/dev/null; then
    :
else
    echo "❌ استخراج tarball ناموفق بود — فایل خراب یا مسیرهای نامعتبر"
    exit 1
fi
if [ ! -f "$TMP/db/custom.db" ]; then
    echo "❌ داخل tarball، db/custom.db پیدا نشد — فایل درسته؟"
    exit 1
fi
echo "  ✅ استخراج شد"

echo "[2/6] stop سرویس..."
systemctl stop personal-site 2>/dev/null || true
echo "  ✅ سرویس متوقف شد"

echo "[3/6] نصب دیتابیس..."
mkdir -p "$SITE_DIR/db"
chmod 700 "$SITE_DIR/db"
# v1.1 (fix): قبل از جایگزینی، از دیتابیس فعلی این سرور بک‌آپ بگیر — قبلاً rm بی‌پرسش بود
if [ -f "$DB_FILE" ]; then
    cp -p "$DB_FILE" "$DB_FILE.pre-import"
    chmod 600 "$DB_FILE.pre-import"
    echo "  🔒 بک‌آپ دیتابیس قبلی: $DB_FILE.pre-import"
fi
rm -f "$DB_FILE-journal" "$DB_FILE-wal" "$DB_FILE-shm"
if id -u ehsansite &>/dev/null; then
    install -m 600 -o ehsansite -g ehsansite "$TMP/db/custom.db" "$DB_FILE"
else
    # fallback: root-owned (install.sh بعداً chown می‌کنه)
    install -m 600 "$TMP/db/custom.db" "$DB_FILE"
    chown root:root "$DB_FILE"
fi
# v1.1.2 (CRITICAL fix): وقتی app از .next/standalone اجرا می‌شود، db.ts مسیر cwd را
# استفاده می‌کند → .next/standalone/db/custom.db — اگر این کپی به‌روز نشود، سایت بعد
# از import یک دیتابیس «تازه‌ی» کهنه سرو می‌کند.
if [ -d "$SITE_DIR/.next/standalone/db" ]; then
    rm -f "$SITE_DIR/.next/standalone/db/custom.db-journal" \
          "$SITE_DIR/.next/standalone/db/custom.db-wal" \
          "$SITE_DIR/.next/standalone/db/custom.db-shm"
    cp -f "$DB_FILE" "$SITE_DIR/.next/standalone/db/custom.db"
    chmod 600 "$SITE_DIR/.next/standalone/db/custom.db"
    if id -u ehsansite &>/dev/null; then
        chown ehsansite:ehsansite "$SITE_DIR/.next/standalone/db/custom.db" 2>/dev/null || true
    fi
    echo "  ✅ کپی دیتابیس در .next/standalone/db/ هم به‌روز شد"
fi
# بک‌آپ‌های قدیمی هم برگردن (اگه تو tarball بودن)
if [ -d "$TMP/backups" ]; then
    # v1.1 (fix): بک‌آپ‌های فعلی این سرور حذف نمی‌شوند — بایگانی می‌شوند
    if [ -d "$SITE_DIR/backups" ] && ls "$SITE_DIR/backups"/*.gz >/dev/null 2>&1; then
        mv "$SITE_DIR/backups" "$SITE_DIR/backups.pre-import"
        echo "  🔒 بک‌آپ‌های قبلی به: $SITE_DIR/backups.pre-import منتقل شدند"
    fi
    cp -r "$TMP/backups" "$SITE_DIR/backups"
    chmod 700 "$SITE_DIR/backups" 2>/dev/null || true
    echo "  ✅ دیتابیس + بک‌آپ‌ها نصب شد"
else
    echo "  ✅ دیتابیس نصب شد"
fi

echo "[4/6] merge کردن .env..."
if [ -f "$TMP/.env" ] && [ -f "$SITE_DIR/.env" ]; then
    OLD_ENV="$TMP/.env"
    NEW_ENV="$SITE_DIR/.env"
    # بک‌آپ از .env فعلی این سرور
    cp -p "$NEW_ENV" "$SITE_DIR/.env.pre-migration"
    chmod 600 "$SITE_DIR/.env.pre-migration"
    # v1.1.2 (fix): قبلاً «کل» فایل .env قدیمی append می‌شد و مقادیر قدیمیِ دامنه
    # (NEXT_PUBLIC_SITE_URL، webhook URLها، sitekeyها) مقادیر جدید VPS را
    # override می‌کردند. حالا هر کلید قدیمی فقط وقتی اضافه می‌شود که در .env جدید
    # وجود نداشته باشد — مقادیر جدید همیشه برنده‌اند؛ کلیدهای سفارشیِ قدیمی
    # (توکن‌ها/secretهایی که جدید نداریم) همچنان برگشت می‌خورند.
    grep -v "^DATABASE_URL=" "$NEW_ENV" > "$SITE_DIR/.env.merged" || true
    # کلیدهای فایل قدیمی: فقط اگر در .env جدید نیستند (new wins)
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
        # DATABASE_URL همیشه از .env جدید می‌آید (مسیر همین سرور)
        [ "$KEY" = "DATABASE_URL" ] && continue
        # کلیدی که .env جدید داره، مقدار جدید برنده است — دوباره اضافه نکن
        grep -q "^$KEY=" "$NEW_ENV" && continue
        printf '%s\n' "$line" >> "$SITE_DIR/.env.merged"
    done < "$OLD_ENV"
    # DATABASE_URL جدید آخرِ فایل (اولویت با آخرین تعریف در صورت duplicate)
    grep "^DATABASE_URL=" "$NEW_ENV" | tail -n 1 >> "$SITE_DIR/.env.merged" || true
    mv "$SITE_DIR/.env.merged" "$NEW_ENV"
    chmod 600 "$NEW_ENV"
    if id -u ehsansite &>/dev/null; then
        chown ehsansite:ehsansite "$NEW_ENV" 2>/dev/null || true
    fi
    echo "  ✅ .env merge شد (مقادیر جدید همیشه برنده‌اند + کلیدهای سفارشی قدیمی برگشتن)"
    echo "     بک‌آپ .env قبلی: $SITE_DIR/.env.pre-migration"
elif [ -f "$TMP/.env" ]; then
    # .env روی سرور جدید نبود — کل فایل قدیمی رو بیار (DATABASE_URL مسیر جدید رو هم می‌سازیم)
    cp -p "$TMP/.env" "$SITE_DIR/.env"
    chmod 600 "$SITE_DIR/.env"
    echo "  ⚠ .env از tarball کپی شد (روی سرور جدید .env نبود)"
else
    echo "  ⚠ داخل tarball هم .env نبود — .env فعلی دست نخورده"
fi

echo "[5/6] heal کردن schema (apply_schema.py)..."
# v1.1.2 (fix): شکست schema healing دیگر نادیده گرفته نمی‌شود — دیتابیسِ ناسازگار با
# کد یعنی سرویس یا بالا نمی‌آید یا داده‌ها را خراب می‌کند؛ import باید متوقف شود.
if python3 scripts/apply_schema.py; then
    echo "  ✅ schema همگام شد"
else
    echo "  ❌ apply_schema.py ناموفق بود — import متوقف شد (exit 1)"
    echo "    بک‌آپ دیتابیس قبلی این سرور: $DB_FILE.pre-import (اگر وجود داشت)"
    echo "    بررسی دستی: cd $SITE_DIR && python3 scripts/apply_schema.py"
    exit 1
fi

echo "[6/6] start سرویس..."
systemctl start personal-site
# v1.1.2 (fix): چک سلامت واقعی به‌جای sleep کور — وضعیت سرویس + تا ۵ تلاش curl
if ! systemctl is-active --quiet personal-site; then
    echo "  ❌ سرویس personal-site فعال نشد — import متوقف شد"
    echo "    بررسی: journalctl -u personal-site -n 30"
    exit 1
fi
HEALTH_OK=""
for i in 1 2 3 4 5; do
    if curl -sf -o /dev/null http://127.0.0.1:3000/; then
        echo "  ✅ سایت روی http://127.0.0.1:3000/ پاسخ می‌دهد (تلاش $i)"
        HEALTH_OK=1
        break
    fi
    echo "  ... تلاش $i ناموفق بود، ۲ ثانیه صبر..."
    sleep 2
done
if [ -z "$HEALTH_OK" ]; then
    echo "  ⚠ سایت بعد از ۵ تلاش پاسخ نداد (fatal نیست — ادامه) — بررسی کن:"
    echo "    journalctl -u personal-site -n 30"
fi

# بررسی ادمین
ADMIN_ROWS=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM AccessUser WHERE username='admin';" 2>/dev/null || echo "0")
echo ""
echo "=========================================="
if [ "$ADMIN_ROWS" = "1" ]; then
    echo "  ✅ Import کامل شد (admin موجود)"
else
    echo "  ⚠ Import انجام شد ولی کاربر admin پیدا نشد ($ADMIN_ROWS)"
    echo "    برای ساخت admin: python3 scripts/seed_access_users.py"
fi
echo "=========================================="
echo ""
echo "  ⚠️ چک‌لیست بعد از مهاجرت:"
echo "    1. Webhookها رو برای دامنه‌ی جدید ثبت کن (Bale/Telegram setWebhook)"
echo "       — آدرس‌ها: /api/bale/webhook و /api/telegram/webhook"
echo "    2. اگه دامنه داری: sudo certbot --nginx -d YOUR_DOMAIN"
echo "    3. تو console گوگل reCAPTCHA، دامنه‌ی جدید رو به سایت اضافه کن"
echo "       (https://www.google.com/recaptcha/admin)"
echo "    4. تست فرم تماس و چت AI"
echo ""
echo "  دستورات مفید:"
echo "    systemctl status personal-site"
echo "    journalctl -u personal-site -n 30"
echo "    sudo bash scripts/reset-admin-password.sh   # ریست رمز ادمین"
echo ""
echo "=========================================="
