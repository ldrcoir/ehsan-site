#!/bin/bash
# ============================================================================
# restore-db.sh — بازگرداندن بک‌آپ شبانه دیتابیس (v1.1.2)
# ============================================================================
# Usage:
#   sudo bash scripts/restore-db.sh                                  # جدیدترین بک‌آپ (backups/db_*.gz بر اساس mtime)
#   sudo bash scripts/restore-db.sh backups/db_20240101_030000.db.gz # بک‌آپ مشخص
#
# کارهایی که می‌کند:
#   1) بک‌آپ را در فایل موقت امن (mktemp + umask 077) gunzip می‌کند
#   2) PRAGMA integrity_check — اگر ok نبود، هیچ‌چیز را دست نمی‌زند
#   3) سرویس personal-site را stop می‌کند
#   4) دیتابیس را با install -m600 و owner صحیح (ehsansite) نصب می‌کند
#      (+ کپی .next/standalone/db در صورت وجود — مثل import-site.sh)
#   5) سرویس را start می‌کند و سلامت را چک می‌کند
# ============================================================================
set -euo pipefail
umask 077

if [ "$(id -u)" != "0" ]; then
    echo "❌ این اسکریپت باید با sudo اجرا بشه:"
    echo "   sudo bash scripts/restore-db.sh [backup.gz]"
    exit 1
fi

# نام‌ها با install.sh / import-site.sh هماهنگ است (سرویس: personal-site، کاربر: ehsansite)
SERVICE_NAME="personal-site"
SERVICE_USER="ehsansite"

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"

# ---------------------------------------------------------------------------
# مسیر دیتابیس — همان منطق resolve_db در auto-backup.sh:
# DATABASE_URL از .env (وقتی اپ روی .next/standalone اجرا می‌شود، db.ts مسیر
# cwd جاری را override می‌کند و قبلاً بک‌آپ از فایل کهنه گرفته می‌شد)
# ---------------------------------------------------------------------------
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
            /*) ;;                                  # absolute path — همان می‌ماند
            *) candidate="$PROJECT_DIR/$candidate" ;;
        esac
        if [ -f "$candidate" ]; then echo "$candidate"; return; fi
    fi
    # مسیرهای مرسوم به ترتیب اولویت
    for p in "$PROJECT_DIR/.next/standalone/db/custom.db" "$PROJECT_DIR/db/custom.db"; do
        if [ -f "$p" ]; then echo "$p"; return; fi
    done
    echo "$PROJECT_DIR/db/custom.db"
}

DB_FILE="$(resolve_db)"

# ---------------------------------------------------------------------------
# انتخاب بک‌آپ: آرگومان اول، وگرنه جدیدترین backups/db_*.gz بر اساس mtime
# ---------------------------------------------------------------------------
SRC=""
if [ $# -ge 1 ] && [ -n "$1" ]; then
    SRC="$1"
else
    SRC=$(ls -t "$BACKUP_DIR"/db_*.gz 2>/dev/null | head -n 1 || true)
fi
if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
    echo "❌ بک‌آپ پیدا نشد."
    echo "   usage: sudo bash scripts/restore-db.sh [backup.gz]"
    echo "   بک‌آپ‌ها اینجا هستند: $BACKUP_DIR/db_*.gz"
    exit 1
fi

echo "=========================================="
echo "  بازگرداندن دیتابیس (restore-db)"
echo "  بک‌آپ:   $SRC"
echo "  دیتابیس: $DB_FILE"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# ۱) gunzip به فایل موقت امن (umask 077 → mktemp خودش 600 می‌سازد)
# ---------------------------------------------------------------------------
TMP_SQLITE="$(mktemp)"
trap 'rm -f "$TMP_SQLITE"' EXIT
if ! gunzip -c "$SRC" > "$TMP_SQLITE"; then
    echo "❌ gunzip ناموفق بود — فایل بک‌آپ خراب است؛ دیتابیس فعلی دست نخورد."
    exit 1
fi
chmod 600 "$TMP_SQLITE"
echo "  ✅ بک‌آپ extract شد (فایل موقت: $TMP_SQLITE)"

# ---------------------------------------------------------------------------
# ۲) integrity check — قبل از هر دست‌زدنی به دیتابیس زنده
# ---------------------------------------------------------------------------
INTEGRITY=$(sqlite3 "$TMP_SQLITE" "PRAGMA integrity_check;" 2>&1 | head -n 1 || true)
if [ "$INTEGRITY" != "ok" ]; then
    echo "❌ فایل بک‌آپ خراب است (integrity_check: ${INTEGRITY:-<empty>}) — دیتابیس فعلی دست نخورد."
    exit 1
fi
echo "  ✅ integrity_check: ok"

# ---------------------------------------------------------------------------
# ۳) stop سرویس
# ---------------------------------------------------------------------------
echo "  stop سرویس $SERVICE_NAME..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

# ---------------------------------------------------------------------------
# ۴) نصب دیتابیس (قبلش بک‌آپ از وضعیت فعلی — rollback-safe)
# ---------------------------------------------------------------------------
PRE_RESTORE="$DB_FILE.pre-restore"
if [ -f "$DB_FILE" ]; then
    # v1.0 (audit W41-45 #13): checkpoint WAL قبل از کپی rollback — وگرنه
    # آخرین تراکنش‌ها در -wal می‌ماندند و snapshot بازگشت ناقص بود
    sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null 2>&1 || true
    cp -p "$DB_FILE" "$PRE_RESTORE"
    chmod 600 "$PRE_RESTORE"
    echo "  🔒 بک‌آپ وضعیت فعلی: $PRE_RESTORE"
fi
mkdir -p "$(dirname "$DB_FILE")"
rm -f "$DB_FILE-journal" "$DB_FILE-wal" "$DB_FILE-shm"
if id -u "$SERVICE_USER" &>/dev/null; then
    install -m 600 -o "$SERVICE_USER" -g "$SERVICE_USER" "$TMP_SQLITE" "$DB_FILE"
else
    # fallback: کاربر سرویس هنوز ساخته نشده (install.sh بعداً chown می‌کند)
    install -m 600 "$TMP_SQLITE" "$DB_FILE"
fi
echo "  ✅ دیتابیس نصب شد: $DB_FILE"

# کپی .next/standalone/db هم به‌روز شود (مثل import-site.sh) — وگرنه اپ ممکن است
# دیتابیس کهنه را سرو کند
STANDALONE_DB="$PROJECT_DIR/.next/standalone/db/custom.db"
if [ -d "$PROJECT_DIR/.next/standalone/db" ] && [ "$STANDALONE_DB" != "$DB_FILE" ]; then
    rm -f "$STANDALONE_DB-journal" "$STANDALONE_DB-wal" "$STANDALONE_DB-shm"
    cp -f "$DB_FILE" "$STANDALONE_DB"
    chmod 600 "$STANDALONE_DB"
    if id -u "$SERVICE_USER" &>/dev/null; then
        chown "$SERVICE_USER":"$SERVICE_USER" "$STANDALONE_DB" 2>/dev/null || true
    fi
    echo "  ✅ کپی .next/standalone/db/custom.db هم به‌روزرسانی شد"
fi

# ---------------------------------------------------------------------------
# ۵) start سرویس + چک سلامت
# ---------------------------------------------------------------------------
echo "  start سرویس $SERVICE_NAME..."
systemctl start "$SERVICE_NAME"
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

echo ""
echo "=========================================="
if [ -n "$HEALTH_OK" ]; then
    echo "  ✅ Restore کامل شد و سایت بالا آمد"
else
    echo "  ✅ Restore کامل شد (اما سایت هنوز پاسخ نمی‌دهد — بررسی کن)"
fi
echo "=========================================="
echo ""
echo "  ⚠️ چک‌لیست بعد از restore:"
echo "    1. systemctl status $SERVICE_NAME"
echo "    2. journalctl -u $SERVICE_NAME -n 30"
if [ -f "$PRE_RESTORE" ]; then
    echo "    3. اگر مشکلی بود، وضعیت قبلی دیتابیس در $PRE_RESTORE هست — بازگردانی دستی:"
    echo "       sudo systemctl stop $SERVICE_NAME && sudo install -m600 -o $SERVICE_USER -g $SERVICE_USER $PRE_RESTORE $DB_FILE && sudo systemctl start $SERVICE_NAME"
fi
echo "    4. در پنل ادمین داده‌ها را چک کن (پست‌ها، تنظیمات، کاربران)"
echo ""
