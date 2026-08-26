#!/bin/bash
# Auto-backup script for personal-site database
# Add to crontab: 0 2 * * * /app/scripts/auto-backup.sh

BACKUP_DIR="/app/backups"
DB_FILE="/app/db/custom.db"
MAX_BACKUPS=7

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_$DATE.db"

# Copy database
cp "$DB_FILE" "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

# Remove old backups (keep last 7)
ls -t "$BACKUP_DIR"/db_*.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm

echo "[$DATE] Backup saved: $BACKUP_FILE.gz"
