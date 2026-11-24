#!/bin/bash
# ============================================================================
# sync-from-online.sh — همگام‌سازی نسخه‌ی آفلاین با نسخه‌ی آنلاین (v1.0 rev3)
# ============================================================================
# هدف: وقتی سایتِ روی VPS از راه دور (کانال ویرایش) ویرایش شد، این اسکریپت
# «dump کامل» جدول‌های قابل ویرایش را از سرور می‌گیرد و در فایل JSON کنار
# دیتابیس آفلاین ذخیره می‌کند؛ بعد «apply-online-export.mjs» همان JSON را
# در دیتابیس آفلاین اعمال می‌کند تا نسخه‌ی آفلاین دقیقاً مثل آنلاین شود.
#
# v1.0 rev3: اگر MAINTENANCE_ENC_KEY ست باشد (env یا .env یا db/.maintenance-enc-key.txt)
# درخواست به‌صورت پاکت AES-256-GCM رمز می‌شود (scripts/maintenance-enc.mjs) و
# پاسخِ رمزشده هم باز می‌شود — سرور وقتی کلید دارد، درخواست متنی را با 426 رد می‌کند.
#
# استفاده:
#   export MAINTENANCE_URL=https://ehsanmorad.ir
#   export MAINTENANCE_TOKEN=...            (توکن خواندن از .env سرور)
#   export MAINTENANCE_EDIT_TOKEN=...       (توکن ویرایش از .env سرور)
#   [export MAINTENANCE_ENC_KEY=...]        (اختیاری — کلید رمزنگاری ۶۴ hex)
#   bash scripts/sync-from-online.sh
#   node scripts/apply-online-export.mjs   (روی نسخه‌ی آفلاین)
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
ENV_FILE="$PROJECT_ROOT/.env"

# --- توکن‌ها: env یا .env یا فایل‌های 600 -------------------------------------
TOKEN="${MAINTENANCE_TOKEN:-}"
EDIT_TOKEN="${MAINTENANCE_EDIT_TOKEN:-}"
if [ -f "$ENV_FILE" ]; then
    [ -z "$TOKEN" ] && TOKEN=$(grep -E '^MAINTENANCE_TOKEN=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
    [ -z "$EDIT_TOKEN" ] && EDIT_TOKEN=$(grep -E '^MAINTENANCE_EDIT_TOKEN=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
fi
# v1.0 rev3 (audit DEPLOY-d LOW): فallback فایل برای توکن اصلی هم اضافه شد
# (قبلاً فقط توکن ویرایش fallback داشت و اگر .env خراب می‌شد کانال خواندن کار نمی‌کرد)
if [ -f "$PROJECT_ROOT/db/.maintenance-token.txt" ] && [ -z "$TOKEN" ]; then
    TOKEN=$(head -1 "$PROJECT_ROOT/db/.maintenance-token.txt" | tr -d '\r\n')
fi
if [ -f "$PROJECT_ROOT/db/.maintenance-edit-token.txt" ] && [ -z "$EDIT_TOKEN" ]; then
    EDIT_TOKEN=$(head -1 "$PROJECT_ROOT/db/.maintenance-edit-token.txt" | tr -d '\r\n')
fi
if [ -z "$TOKEN" ] || [ -z "$EDIT_TOKEN" ]; then
    echo "❌ MAINTENANCE_TOKEN و MAINTENANCE_EDIT_TOKEN لازم است (env یا .env)"
    exit 1
fi

# --- کلید رمزنگاری (v1.0 rev3) ------------------------------------------------
ENC_KEY="${MAINTENANCE_ENC_KEY:-}"
if [ -z "$ENC_KEY" ] && [ -f "$ENV_FILE" ]; then
    ENC_KEY=$(grep -E '^MAINTENANCE_ENC_KEY=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
fi
if [ -z "$ENC_KEY" ] && [ -f "$PROJECT_ROOT/db/.maintenance-enc-key.txt" ]; then
    ENC_KEY=$(head -1 "$PROJECT_ROOT/db/.maintenance-enc-key.txt" | tr -d '\r\n')
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
TMPBODY=$(mktemp) || exit 1
trap 'rm -f "$TMP" "$TMPBODY"' EXIT

echo "⇩  گرفتن export-all از $URL ..."

# --- ساخت بدنه‌ی درخواست (رمز یا ساده) ----------------------------------------
if [ -n "$ENC_KEY" ]; then
    echo "🔐 کانال رمزنگاری‌شده فعال است (AES-256-GCM)"
    node "$SCRIPT_DIR/maintenance-enc.mjs" enc "$ENC_KEY" '{"action":"export-all"}' > "$TMPBODY"
    HTTP=$(curl -s -o "$TMP" -w "%{http_code}" -X POST "$URL/api/maintenance" \
        -H "X-Maintenance-Token: $TOKEN" \
        -H "X-Maintenance-Edit-Token: $EDIT_TOKEN" \
        -H "Content-Type: application/json" \
        --data-binary @"$TMPBODY")
else
    HTTP=$(curl -s -o "$TMP" -w "%{http_code}" -X POST "$URL/api/maintenance" \
        -H "X-Maintenance-Token: $TOKEN" \
        -H "X-Maintenance-Edit-Token: $EDIT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"action":"export-all"}')
fi

if [ "$HTTP" != "200" ]; then
    echo "❌ HTTP $HTTP:"
    cat "$TMP"; echo ""
    exit 1
fi

# --- بازکردن پاسخ (اگر پاکت رمز بود) -------------------------------------------
if [ -n "$ENC_KEY" ]; then
    node "$SCRIPT_DIR/maintenance-enc.mjs" dec "$ENC_KEY" "$(cat "$TMP")" > "$TMP"
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
