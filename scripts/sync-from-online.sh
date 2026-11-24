// ============================================================================
// sync-from-online.sh — v1.0
// همگام‌سازی نسخه‌ی آفلاین با آنلاین: export-all از کانال نگهداری → فایل JSON در db/.
// ============================================================================

#!/bin/bash
# ============================================================================
# sync-from-online.sh — همگام‌سازی نسخه‌ی آفلاین با نسخه‌ی آنلاین (v1.0)
# ============================================================================
# هدف: وقتی سایتِ روی VPS از راه دور (کانال ویرایش) ویرایش شد، این اسکریپت
# «dump کامل» جدول‌های قابل ویرایش را از سرور می‌گیرد و در فایل JSON کنار
# دیتابیس آفلاین ذخیره می‌کند؛ بعد «apply-online-export.mjs» همان JSON را
# در دیتابیس آفلاین اعمال می‌کند تا نسخه‌ی آفلاین دقیقاً مثل آنلاین شود.
#
# استفاده:
#   export MAINTENANCE_URL=https://ehsanmorad.ir
#   export MAINTENANCE_TOKEN=...            (توکن خواندن از .env سرور)
#   export MAINTENANCE_EDIT_TOKEN=...       (توکن ویرایش از .env سرور)
#   bash scripts/sync-from-online.sh
#   node scripts/apply-online-export.mjs   (روی نسخه‌ی آفلاین)
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
ENV_FILE="$PROJECT_ROOT/.env"

# --- توکن‌ها: env یا .env ----------------------------------------------------
TOKEN="${MAINTENANCE_TOKEN:-}"
EDIT_TOKEN="${MAINTENANCE_EDIT_TOKEN:-}"
if [ -f "$ENV_FILE" ]; then
    [ -z "$TOKEN" ] && TOKEN=$(grep -E '^MAINTENANCE_TOKEN=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
    [ -z "$EDIT_TOKEN" ] && EDIT_TOKEN=$(grep -E '^MAINTENANCE_EDIT_TOKEN=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
fi
if [ -f "$PROJECT_ROOT/db/.maintenance-edit-token.txt" ] && [ -z "$EDIT_TOKEN" ]; then
    EDIT_TOKEN=$(head -1 "$PROJECT_ROOT/db/.maintenance-edit-token.txt" | tr -d '\r\n')
fi
if [ -z "$TOKEN" ] || [ -z "$EDIT_TOKEN" ]; then
    echo "❌ MAINTENANCE_TOKEN و MAINTENANCE_EDIT_TOKEN لازم است (env یا .env)"
    exit 1
fi

# --- آدرس سرور ---------------------------------------------------------------
URL="${MAINTENANCE_URL:-}"
if [ -z "$URL" ] && [ -f "$ENV_FILE" ]; then
    URL=$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
fi
[ -z "$URL" ] && { echo "❌ MAINTENANCE_URL ست نشده (مثلاً https://ehsanmorad.ir)"; exit 1; }

STAMP=$(date +%Y%m%d-%H%M%S)
OUT_FILE="$PROJECT_ROOT/db/online-export-$STAMP.json"
TMP=$(mktemp) || exit 1
trap 'rm -f "$TMP"' EXIT

echo "⇩  گرفتن export-all از $URL ..."
HTTP=$(curl -s -o "$TMP" -w "%{http_code}" -X POST "$URL/api/maintenance" \
    -H "X-Maintenance-Token: $TOKEN" \
    -H "X-Maintenance-Edit-Token: $EDIT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"action":"export-all"}')

if [ "$HTTP" != "200" ]; then
    echo "❌ HTTP $HTTP:"
    cat "$TMP"; echo ""
    exit 1
fi

# فقط data را جدا کن (پاسخ: {ok, action, data:{...}})
if command -v jq &>/dev/null; then
    jq '.data' "$TMP" > "$OUT_FILE"
else
    node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('$TMP','utf8'));fs.writeFileSync('$OUT_FILE',JSON.stringify(j.data,null,2));"
fi

echo "✅ خروجی ذخیره شد: $OUT_FILE"
echo ""
echo "قدم بعدی (روی نسخه‌ی آفلاین):"
echo "  node scripts/apply-online-export.mjs $OUT_FILE"
echo ""
echo "بعد از اعمال، نسخه‌ی آفلاین را commit و push کن تا گیت هم با آنلاین هم‌سرو شود:"
echo "  git add -A && git commit -m 'sync: online content -> offline' && git push"
