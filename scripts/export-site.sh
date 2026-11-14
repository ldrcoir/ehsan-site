#!/bin/bash
# export-site.sh — export site state for migration to another VPS (v1.1)
# Usage: bash scripts/export-site.sh   (run on the OLD server)
set -eo pipefail
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAMP=$(date +%Y%m%d-%H%M%S)
TMP="$(mktemp -d)"
# v1.1.2 (security): هر خروجی از اسکریپت (خطا/سیگنال) دایرکتوری tmp شامل db + .env را
# پاک می‌کند — بدون این trap، رازها در /tmp باقی می‌ماندند
trap 'rm -rf "$TMP"' EXIT
# v1.0 (audit W41-45 #6): resolve_db همان‌طور که بقیه اسکریپت‌ها دارند —
# وقتی app از standalone اجرا می‌شود DATABASE_URL به مسیر دیگری اشاره می‌کند و
# export قبلی «موفق» اما از دیتابیس کهنه بود.
resolve_db() {
    local url=""
    if [ -f "$SITE_DIR/.env" ]; then
        url=$(grep -E '^DATABASE_URL=' "$SITE_DIR/.env" | head -1 | cut -d'=' -f2- | tr -d '"')
    fi
    local candidates=()
    if [ -n "$url" ]; then
        local c="${url#file:}"
        c="${c%%\?*}"
        [ "${c:0:1}" != "/" ] && c="$SITE_DIR/$c"
        candidates+=("$c")
    fi
    candidates+=("$SITE_DIR/db/custom.db" "$SITE_DIR/.next/standalone/db/custom.db")
    for c in "${candidates[@]}"; do
        if [ -f "$c" ]; then
            echo "$c"
            return 0
        fi
    done
    echo ""
}
DB_FILE="$(resolve_db)"
if [ -z "$DB_FILE" ] || [ ! -f "$DB_FILE" ]; then
    echo "❌ export-site: دیتابیس پیدا نشد (resolve_db خالی برگرداند)"
    rm -rf "$TMP"
    exit 1
fi
echo "  دیتابیس مبدا: $DB_FILE"
mkdir -p "$TMP/db"
# consistent snapshot (service can stay running)
sqlite3 "$DB_FILE" ".backup '$TMP/db/custom.db'"
[ -f "$SITE_DIR/.env" ] && cp -p "$SITE_DIR/.env" "$TMP/.env"
[ -d "$SITE_DIR/backups" ] && cp -r "$SITE_DIR/backups" "$TMP/backups"
OUT="$HOME/site-migration-$STAMP.tar.gz"
tar -czf "$OUT" -C "$TMP" .
rm -rf "$TMP"
chmod 600 "$OUT"
echo "✅ Export: $OUT"
echo "Copy to the new server:"
echo "  scp $OUT root@NEW_SERVER_IP:/root/"
echo "Then on the new server (after running install.sh):"
echo "  cd /home/ehsan/personal-site && sudo bash scripts/import-site.sh /root/site-migration-$STAMP.tar.gz"
