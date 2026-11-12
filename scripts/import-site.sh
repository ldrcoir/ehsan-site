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
#      - از فایل قدیمی این کلیدها میاد: SESSION_SECRET،
#        BALE_WEBHOOK_SECRET، TELEGRAM_WEBHOOK_SECRET، RECAPTCHA_SECRET،
#        NEXT_PUBLIC_RECAPTCHA_SITEKEY، NEXT_PUBLIC_SITE_URL،
#        BALE_BOT_TOKEN، BALE_CHAT_ID، TELEGRAM_BOT_TOKEN، TELEGRAM_CHAT_ID
#   5) apply_schema.py اجرا می‌شه (heal کردن schema drift)
#   6) سرویس start می‌شه و admin بررسی می‌شه
# ============================================================================
set -eo pipefail

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
    # v1.1 (fix): قبلاً فقط یک whitelist ثابت merge می‌شد و بقیه‌ی کلیدهای قدیمی
    # (توکن‌ها/secretهای سفارشی که با EXIT trap حذف می‌شدند) برای همیشه از دست
    # می‌رفتند. حالا «همه‌ی» کلیدهای فایل قدیمی برمی‌گردند؛ فقط DATABASE_URL جدید می‌ماند.
    # DATABASE_URL جدید حفظ می‌شه (مسیر همین سرور)؛ بقیه‌ی کلیدهای جدید هم می‌مونن.
    grep -v "^DATABASE_URL=" "$NEW_ENV" > "$SITE_DIR/.env.merged" || true
    # همه‌ی کلیدهای فایل قدیمی (به‌جز DATABASE_URL قدیمی) اضافه می‌شوند
    grep -v "^DATABASE_URL=" "$OLD_ENV" >> "$SITE_DIR/.env.merged" || true
    # DATABASE_URL جدید آخرِ فایل (اولویت با آخرین تعریف در صورت duplicate)
    grep "^DATABASE_URL=" "$NEW_ENV" | tail -n 1 >> "$SITE_DIR/.env.merged" || true
    mv "$SITE_DIR/.env.merged" "$NEW_ENV"
    chmod 600 "$NEW_ENV"
    if id -u ehsansite &>/dev/null; then
        chown ehsansite:ehsansite "$NEW_ENV" 2>/dev/null || true
    fi
    echo "  ✅ .env merge شد (DATABASE_URL جدید + همه‌ی کلیدهای قدیمی برگشتن)"
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
if python3 scripts/apply_schema.py; then
    echo "  ✅ schema همگام شد"
else
    echo "  ⚠ apply_schema.py خطا داد — ادامه می‌دیم"
fi

echo "[6/6] start سرویس..."
systemctl start personal-site
sleep 5

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
