#!/bin/bash
# ============================================================================
# auto-backup.sh — بک‌آپ شبانه دیتابیس (v1.1)
# ============================================================================
# توسط install.sh به‌صورت cron نصب می‌شه:
#   /etc/cron.d/personal-site-backup  →  هر روز ساعت ۳ بامداد
# خروجی: backups/db_YYYYMMDD_HHMMSS.db.gz (نگه‌داری ۷ نسخه آخر)
# ============================================================================
set -eo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
MAX_BACKUPS=7

# v1.1 (fix): مسیر دیتابیس را از DATABASE_URL در .env حل کن — وقتی اپ روی
# .next/standalone اجرا می‌شود، db.ts مسیر cwd جاری را override می‌کند و
# قبلاً بک‌آپ از یک فایل کهنه گرفته می‌شد.
resolve_db() {
    local url=""
    if [ -f "$PROJECT_DIR/.env" ]; then
        url=$(grep "^DATABASE_URL=" "$PROJECT_DIR/.env" | tail -n 1 | cut -d= -f2- | tr -d '"' || true)
    fi
    local candidate=""
    if [ -n "$url" ]; then
        candidate="${url#file:}"
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

if [ ! -f "$DB_FILE" ]; then
    echo "auto-backup: دیتابیس پیدا نشد ($DB_FILE) — چیزی برای بک‌آپ نیست"
    exit 0
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_$STAMP.db"

# v1.1: snapshot سازگار با sqlite3 (.backup) — سرویس می‌تونه روشن بمونه؛ fallback: cp
if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
else
    cp "$DB_FILE" "$BACKUP_FILE"
fi

gzip -f "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE.gz"

# نگه‌داری ۷ نسخه‌ی آخر — بقیه حذف
ls -t "$BACKUP_DIR"/db_*.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm 2>/dev/null || true

# ---------------------------------------------------------------------------
# v1.1.1 (audit S6-M3): retention لاگ‌ها — جدول‌های PageView / SecurityLog /
# AccessLog هر رویداد را برای همیشه نگه می‌داشتند و با سوءاستفادهی چرخش IP
# دیسک پر می‌شد. حالا nightly، ردیف‌های قدیمی‌تر از ۳۰ روز پاک می‌شوند.
# مقایسه با strftime epoch-ms برای ردیف‌های INTEGERِ Prisma درست است؛
# ردیف‌های TEXT قدیمی (seed) هرگز < عدد نیستند → حذف نمی‌شوند (امن).
# ---------------------------------------------------------------------------
if command -v sqlite3 >/dev/null 2>&1; then
    CUTOFF_MS=$(( $(date -u +%s) - 30*86400 ))000
    PRUNED=$(sqlite3 "$DB_FILE" "
        DELETE FROM PageView WHERE createdAt < $CUTOFF_MS;
        SELECT changes();
        DELETE FROM SecurityLog WHERE createdAt < $CUTOFF_MS;
        SELECT changes();
        DELETE FROM AccessLog WHERE createdAt < $CUTOFF_MS;
        SELECT changes();
    " 2>/dev/null | paste -sd+ - | bc 2>/dev/null || echo "?")
    echo "[$STAMP] retention: لاگ‌های قدیمی‌تر از ۳۰ روز پاک شد ($PRUNED ردیف)"
    # VACUUM سبک بعد از پاکسازی — فضای دیسک واقعاً آزاد شود
    sqlite3 "$DB_FILE" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
fi

echo "[$STAMP] بک‌آپ ذخیره شد: $BACKUP_FILE.gz (نگه‌داری: $MAX_BACKUPS نسخه‌ی آخر)"
