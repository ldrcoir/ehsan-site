#!/bin/bash
# ============================================================================
# channel-client.sh — کلاینت اتصال AI به کانال نگهداری سایت (سمت AI)
# ============================================================================
# استفاده:
#   bash AI/channel-client.sh status
#   bash AI/channel-client.sh messages '{"unread":true}'
#   bash AI/channel-client.sh texts.set '{"key":"home_title","value":"..."}' --edit
#
# توکن‌ها از db/.channel-credentials.env خوانده می‌شوند.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="db/.channel-credentials.env"
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE پیدا نشد — توکن‌ها را ذخیره کن"; exit 1; }

# خواندن credentialها
source <(grep -E '^[A-Z_]+=' "$ENV_FILE" | sed 's/^/export /')

ACTION="${1:-help}"
DATA="${2:-{\}}"
NEED_EDIT="${3:-}"

# اگر درخواست edit است یا صراحتاً --edit خواسته شده، توکن ویرایش هم بفرست
case "$ACTION" in
    texts.set|settings.set|nav.add|nav.update|clip.add|clip.update|clip.set-visible|clip.delete|equipment.set|content.set-visible|message.reply|message.mark-read)
        NEED_EDIT="--edit" ;;
esac

# ساخت payload رمزشده
PAYLOAD=$(python3 -c "
import json, sys
try:
    d = json.loads('''$DATA''')
except Exception as e:
    print('INVALID_JSON', file=sys.stderr); sys.exit(1)
d['action'] = '$ACTION'
print(json.dumps(d, ensure_ascii=False))
") || { echo "❌ JSON نامعتبر: $DATA"; exit 1; }

ENVELOPE=$(echo "$PAYLOAD" | node scripts/maintenance-enc.mjs enc "$ENC_KEY")
[ -z "$ENVELOPE" ] && { echo "❌ رمزنگاری شکست خورد"; exit 1; }

# ساخت هدرها
HEADERS=(-H "Content-Type: application/json" -H "x-maintenance-token: $READ_TOKEN")
if [ "$NEED_EDIT" = "--edit" ] || [ -n "${MAINTENANCE_AI_BIND:-}" ]; then
    HEADERS+=(-H "x-maintenance-edit-token: $EDIT_TOKEN")
fi

# ارسال درخواست
HTTP_CODE=$(curl -sS -o /tmp/channel-response.json -w "%{http_code}" --max-time 15 \
    -X POST "${AI_URL:-https://ehsanmorad.ir/api/maintenance}" \
    "${HEADERS[@]}" \
    -d "$ENVELOPE" 2>/tmp/channel-err.txt)

# اگر خطای شبکه
if [ -f /tmp/channel-err.txt ] && [ -s /tmp/channel-err.txt ]; then
    echo "❌ خطای شبکه: $(cat /tmp/channel-err.txt)"
    exit 1
fi

# رمزگشایی پاسخ
if [ "$HTTP_CODE" = "200" ]; then
    DECRYPTED=$(node scripts/maintenance-enc.mjs dec "$ENC_KEY" "$(cat /tmp/channel-response.json)" 2>/dev/null)
    echo "$DECRYPTED" | python3 -m json.tool 2>/dev/null || echo "$DECRYPTED"
else
    echo "❌ HTTP $HTTP_CODE:"
    cat /tmp/channel-response.json 2>/dev/null | head -5
    case "$HTTP_CODE" in
        401) echo "   → توکن اشتباه است" ;;
        403) echo "   → IP در لیست مجاز نیست" ;;
        426) echo "   → رمزنگاری لازم است (این خطا نباید رخ دهد — client رمز می‌کند)" ;;
        503) echo "   → سرویس پایین یا کانال فعال نیست" ;;
    esac
    exit 1
fi
