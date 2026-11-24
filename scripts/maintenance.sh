#!/bin/bash
# ============================================================================
# maintenance.sh — کلاینت کانال نگهداری (v1.0 rev5)
# ============================================================================
# استفاده:
#   bash scripts/maintenance.sh status
#   bash scripts/maintenance.sh db-stats
#   bash scripts/maintenance.sh security-logs
#   bash scripts/maintenance.sh messages
#   bash scripts/maintenance.sh chats
#   bash scripts/maintenance.sh backup
#   bash scripts/maintenance.sh help
#
# actionهای ویرایشی (نیاز به MAINTENANCE_EDIT_TOKEN — با هدر X-Maintenance-Edit-Token):
#   bash scripts/maintenance.sh texts.get
#   bash scripts/maintenance.sh texts.set --data '{"key":"hero.greeting","valueFa":"سلام"}'
#   bash scripts/maintenance.sh settings.get
#   bash scripts/maintenance.sh settings.set --data '{"key":"contact_email","value":"info@ehsanmorad.ir"}'
#   bash scripts/maintenance.sh nav.get | clip.add | equipment.set | content.get | export-all
#
# v1.0 rev5 — حالت AI-bind:
#   bash scripts/maintenance.sh --ai-bind status
# یا export MAINTENANCE_AI_BIND=1
#   در این حالت، حتی actionهای خواندن هم نیاز به EDIT_TOKEN دارند. سرور باید
#   MAINTENANCE_AI_BIND=1 در .env داشته باشد. مناسب «کانال کاملاً خصوصی با
#   دستیار». وقتی سرور AI_BIND=1 باشد و کلاینت --ai-bind ندهد، خواندن‌ها
#   403 می‌گیرند.
#
# توکن و آدرس از همین ترتیب خوانده می‌شود:
#   1. متغیر محیطی  MAINTENANCE_TOKEN (و MAINTENANCE_EDIT_TOKEN) و MAINTENANCE_URL
#   2. فایل .env همین پوشه (MAINTENANCE_TOKEN=...) و NEXT_PUBLIC_SITE_URL
#   3. فایل‌های 600 کنار دیتابیس: db/.maintenance-token.txt / .maintenance-edit-token.txt
#
# v1.0 rev3 — رمزنگاری: اگر MAINTENANCE_ENC_KEY ست باشد (env / .env /
#   db/.maintenance-enc-key.txt)، بدنه با AES-256-GCM رمز می‌شود
#   (scripts/maintenance-enc.mjs) و پاسخ رمزشده هم خودکار باز می‌شود.
#   سرور وقتی کلید دارد، درخواست متنیِ خام را با 426 رد می‌کند.
#
# مثال روی سرور (بعد از نصب):
#   cd /home/ehsan/personal-site
#   bash scripts/maintenance.sh status
#   bash scripts/maintenance.sh backup
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# v1.0 rev5 — تشخیص flag --ai-bind (هر کجای argv) و حذفش از action
AI_BIND=0
NEW_ARGS=()
for a in "$@"; do
    if [ "$a" = "--ai-bind" ]; then
        AI_BIND=1
    else
        NEW_ARGS+=("$a")
    fi
done
set -- "${NEW_ARGS[@]}"
if [ "$MAINTENANCE_AI_BIND" = "1" ] || [ "$MAINTENANCE_AI_BIND" = "true" ]; then
    AI_BIND=1
fi

ACTION="${1:-help}"
# v1.0: بدنه‌ی JSON اختیاری برای actionهای ویرایشی — بعد از --data
BODY_DATA=""
if [ "$2" = "--data" ] && [ -n "$3" ]; then
    BODY_DATA="$3"
fi

# v1.0 (audit W56-60 #5): فایل خروجی موقت با mktemp (غیرقابل حدس) + پاکسازی با trap
OUT=$(mktemp /tmp/maintenance-out.XXXXXX) || { echo "❌ ساخت فایل موقت ناموفق بود"; exit 1; }
trap 'rm -f "$OUT"' EXIT

# --- پیدا کردن توکن ---------------------------------------------------------
TOKEN="${MAINTENANCE_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f "$ENV_FILE" ]; then
    # v1.0 (audit W56-60 #6): پارس مقاوم — نقل‌قول دوتایی/تکی، CRLF و کامنت انتهایی را پوشش می‌دهد
    TOKEN=$(grep -E '^MAINTENANCE_TOKEN=' "$ENV_FILE" | head -1 \
        | sed -e 's/^MAINTENANCE_TOKEN=//' -e 's/\r$//' -e "s/[\"']//g" -e 's/[[:space:]]*#.*//' -e 's/[[:space:]]*$//')
fi
if [ -z "$TOKEN" ] && [ -f "$SCRIPT_DIR/../db/.maintenance-token.txt" ]; then
    # v1.0 rev3 (audit DEPLOY-d LOW): fallback فایل برای توکن اصلی — مثل توکن ویرایش
    TOKEN=$(cat "$SCRIPT_DIR/../db/.maintenance-token.txt" | head -1 | tr -d '\r\n')
fi
if [ -z "$TOKEN" ]; then
    echo "❌ MAINTENANCE_TOKEN پیدا نشد."
    echo "   یا متغیر محیطی ست کن:  export MAINTENANCE_TOKEN=<token>"
    echo "   یا .env کنار پروژه باید شامل  MAINTENANCE_TOKEN=...  باشد (توسط install.sh ساخته می‌شود)"
    exit 1
fi

# --- توکن ویرایش (اختیاری — فقط برای actionهای ویرایشی) ----------------------
EDIT_TOKEN="${MAINTENANCE_EDIT_TOKEN:-}"
if [ -z "$EDIT_TOKEN" ] && [ -f "$ENV_FILE" ]; then
    EDIT_TOKEN=$(grep -E '^MAINTENANCE_EDIT_TOKEN=' "$ENV_FILE" | head -1 \
        | sed -e 's/^MAINTENANCE_EDIT_TOKEN=//' -e 's/\r$//' -e "s/[\"']//g" -e 's/[[:space:]]*#.*//' -e 's/[[:space:]]*$//')
fi
# اگر توکن ویرایش در .env نبود ولی فایل 600 کنار دیتابیس بود، از همان بخوان
if [ -z "$EDIT_TOKEN" ] && [ -f "$SCRIPT_DIR/../db/.maintenance-edit-token.txt" ]; then
    EDIT_TOKEN=$(cat "$SCRIPT_DIR/../db/.maintenance-edit-token.txt" | head -1 | tr -d '\r\n')
fi

# --- کلید رمزنگاری (v1.0 rev3 — اختیاری) -------------------------------------
ENC_KEY="${MAINTENANCE_ENC_KEY:-}"
if [ -z "$ENC_KEY" ] && [ -f "$ENV_FILE" ]; then
    ENC_KEY=$(grep -E '^MAINTENANCE_ENC_KEY=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"\r')
fi
if [ -z "$ENC_KEY" ] && [ -f "$SCRIPT_DIR/../db/.maintenance-enc-key.txt" ]; then
    ENC_KEY=$(cat "$SCRIPT_DIR/../db/.maintenance-enc-key.txt" | head -1 | tr -d '\r\n')
fi

# --- پیدا کردن URL ----------------------------------------------------------
URL="${MAINTENANCE_URL:-}"
if [ -z "$URL" ]; then
    SITE_URL=""
    if [ -f "$ENV_FILE" ]; then
        SITE_URL=$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2- | tr -d '"' || true)
    fi
    if [ -n "$SITE_URL" ] && [ "$SITE_URL" != "https://ehsanmorad.ir" ]; then
        URL="$SITE_URL"
    else
        # پیش‌فرض: لوکال (روی خود سرور) — nginx روی 80 و app روی 3000 loopback
        URL="http://127.0.0.1:3000"
    fi
fi

case "$ACTION" in
    help|--help|-h)
        echo "استفاده: bash scripts/maintenance.sh <action> [--data '<json>']"
        echo ""
        echo "actionهای خواندن (فقط MAINTENANCE_TOKEN):"
        echo "  status         — وضعیت کلی سایت (نسخه، uptime، حافظه، رکوردها، سلامت دیتابیس)"
        echo "  db-stats       — آمار کامل جدول‌ها + integrity_check"
        echo "  security-logs  — ۵۰ لاگ امنیتی آخر"
        echo "  messages       — ۲۰ پیام تماس آخر"
        echo "  chats          — آمار چت + ۱۰ نشست آخر"
        echo "  backup         — بک‌آپ فوری دیتابیس"
        echo ""
        echo "actionهای ویرایشی (همچنین MAINTENANCE_EDIT_TOKEN لازم است):"
        echo "  texts.get / texts.set / settings.get / settings.set"
        echo "  nav.get / nav.add / nav.set-visible / nav.delete"
        echo "  clips.get / clip.add / clip.set-visible / clip.delete"
        echo "  equipment.get / equipment.set / content.get / content.set-visible"
        echo "  export-all     — dump کامل برای همگام‌سازی نسخه‌ی آفلاین (ببین sync-from-online.sh)"
        echo ""
        echo "مثال ویرایش:"
        echo "  bash scripts/maintenance.sh texts.set --data '{\"key\":\"hero.greeting\",\"valueFa\":\"سلام\"}'"
        echo ""
        echo "خروجی JSON زیباسازی‌شده با jq (اگر نصب باشد):"
        echo "  bash scripts/maintenance.sh status | jq ."
        ;;
    *)
        if ! command -v curl &>/dev/null; then
            echo "❌ curl نصب نیست:  sudo apt install -y curl"
            exit 1
        fi
        # هدر ویرایش — اگر توکن ویرایش موجود باشد یا AI_BIND=1 (حتماً لازم است)
        EDIT_HEADER_ARGS=()
        if [ -n "$EDIT_TOKEN" ]; then
            EDIT_HEADER_ARGS=(-H "X-Maintenance-Edit-Token: $EDIT_TOKEN")
        elif [ "$AI_BIND" = "1" ]; then
            echo "❌ حالت --ai-bind فعال است ولی MAINTENANCE_EDIT_TOKEN پیدا نشد."
            echo "   یا export MAINTENANCE_EDIT_TOKEN=<token> کن یا در .env بگذار"
            exit 1
        fi
        # بدنه — یا --data یا JSON ساده برای actionهای بدون بدنه
        if [ -n "$BODY_DATA" ]; then
            # کلیدهای JSON کاربر در سطح اول body merge می‌شوند (سرور فیلدها را
            # از سطح اول می‌خواند): {"action":"...","key":...}
            PAYLOAD=$(printf '{"action":"%s",%s}' "$ACTION" "$(printf '%s' "$BODY_DATA" | sed -e 's/^{//' -e 's/}$//')")
        else
            PAYLOAD="{\"action\":\"$ACTION\"}"
        fi
        # v1.0 rev3 — رمز کردن بدنه اگر کلید هست (مقصد: TMPBODY)
        TMPBODY=""
        BODY_ARGS=()
        if [ -n "$ENC_KEY" ]; then
            TMPBODY=$(mktemp /tmp/maintenance-body.XXXXXX) || { echo "❌ ساخت فایل موقت ناموفق بود"; exit 1; }
            trap 'rm -f "$OUT" "$TMPBODY"' EXIT
            printf '%s' "$PAYLOAD" | node "$SCRIPT_DIR/maintenance-enc.mjs" enc "$ENC_KEY" > "$TMPBODY"
            BODY_ARGS=(--data-binary "@$TMPBODY")
        else
            BODY_ARGS=(-d "$PAYLOAD")
        fi
        HTTP_CODE=$(curl -s -o "$OUT" -w "%{http_code}" \
            -X POST "$URL/api/maintenance" \
            -H "X-Maintenance-Token: $TOKEN" \
            "${EDIT_HEADER_ARGS[@]}" \
            -H "Content-Type: application/json" \
            "${BODY_ARGS[@]}") || { echo "❌ اتصال به $URL برقرار نشد"; exit 1; }
        if [ "$HTTP_CODE" = "401" ]; then
            echo "❌ توکن نامعتبر است (401) — مقدار MAINTENANCE_TOKEN را با .env سرور مقایسه کن"
            exit 1
        elif [ "$HTTP_CODE" = "403" ]; then
            echo "❌ توکن ویرایش لازم است (403) — MAINTENANCE_EDIT_TOKEN را export کن یا در .env بگذار"
            cat "$OUT" 2>/dev/null; echo ""
            exit 1
        elif [ "$HTTP_CODE" = "503" ]; then
            echo "❌ کانال روی سرور خاموش است (503) — توکن مربوطه در .env سرور ست نشده"
            cat "$OUT" 2>/dev/null; echo ""
            exit 1
        elif [ "$HTTP_CODE" = "429" ]; then
            echo "❌ محدودیت تعداد درخواست (429) — ۵ دقیقه صبر کن"
            exit 1
        elif [ "$HTTP_CODE" = "426" ]; then
            echo "❌ سرور رمزنگاری می‌خواهد (426) — MAINTENANCE_ENC_KEY را export کن یا در .env بگذار"
            cat "$OUT" 2>/dev/null; echo ""
            exit 1
        elif [ "$HTTP_CODE" != "200" ]; then
            echo "❌ خطای HTTP $HTTP_CODE:"
            cat "$OUT" 2>/dev/null
            exit 1
        fi
        # v1.0 rev3 — باز کردن پاسخ رمزشده (اگر کلید هست و پاسخ پاکت بود)
        if [ -n "$ENC_KEY" ] && grep -q '"enc":"v1"' "$OUT" 2>/dev/null; then
            node "$SCRIPT_DIR/maintenance-enc.mjs" dec "$ENC_KEY" "$(cat "$OUT")" > "${OUT}.dec" && mv "${OUT}.dec" "$OUT"
        fi
        if command -v jq &>/dev/null; then
            jq . "$OUT"
        else
            cat "$OUT"
            echo ""
        fi
        ;;
esac
