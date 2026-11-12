#!/bin/bash
# export-site.sh — export site state for migration to another VPS (v1.1)
# Usage: bash scripts/export-site.sh   (run on the OLD server)
set -eo pipefail
SITE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAMP=$(date +%Y%m%d-%H%M%S)
TMP="$(mktemp -d)"
# v1.1 (fix): دیتابیس نبود → قبلاً sqlite3 یک فایل خالی می‌ساخت و export «موفق»
# اما خالی بود. حالا صریحاً خطا بده.
if [ ! -f "$SITE_DIR/db/custom.db" ]; then
    echo "❌ export-site: دیتابیس پیدا نشد: $SITE_DIR/db/custom.db"
    rm -rf "$TMP"
    exit 1
fi
mkdir -p "$TMP/db"
# consistent snapshot (service can stay running)
sqlite3 "$SITE_DIR/db/custom.db" ".backup '$TMP/db/custom.db'"
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
