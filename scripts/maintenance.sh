#!/bin/bash
# ============================================================================
# maintenance.sh — کلاینت کانال نگهداری (v1.0)
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
# توکن و آدرس از همین ترتیب خوانده می‌شود:
#   1. متغیر محیطی  MAINTENANCE_TOKEN و MAINTENANCE_URL
#   2. فایل .env همین پوشه (MAINTENANCE_TOKEN=...) و NEXT_PUBLIC_SITE_URL
#
# مثال روی سرور (بعد از نصب):
#   cd /home/ehsan/personal-site
#   bash scripts/maintenance.sh status
#   bash scripts/maintenance.sh backup
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

ACTION="${1:-help}"

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
if [ -z "$TOKEN" ]; then
    echo "❌ MAINTENANCE_TOKEN پیدا نشد."
    echo "   یا متغیر محیطی ست کن:  export MAINTENANCE_TOKEN=<token>"
    echo "   یا .env کنار پروژه باید شامل  MAINTENANCE_TOKEN=...  باشد (توسط install.sh ساخته می‌شود)"
    exit 1
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
        echo "استفاده: bash scripts/maintenance.sh <action>"
        echo ""
        echo "action ها:"
        echo "  status         — وضعیت کلی سایت (نسخه، uptime، حافظه، رکوردها، سلامت دیتابیس)"
        echo "  db-stats       — آمار کامل جدول‌ها + integrity_check"
        echo "  security-logs  — ۵۰ لاگ امنیتی آخر"
        echo "  messages       — ۲۰ پیام تماس آخر"
        echo "  chats          — آمار چت + ۱۰ نشست آخر"
        echo "  backup         — بک‌آپ فوری دیتابیس"
        echo ""
        echo "خروجی JSON زیباسازی‌شده با jq (اگر نصب باشد):"
        echo "  bash scripts/maintenance.sh status | jq ."
        ;;
    *)
        if ! command -v curl &>/dev/null; then
            echo "❌ curl نصب نیست:  sudo apt install -y curl"
            exit 1
        fi
        HTTP_CODE=$(curl -s -o "$OUT" -w "%{http_code}" \
            -X POST "$URL/api/maintenance" \
            -H "X-Maintenance-Token: $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"action\":\"$ACTION\"}") || { echo "❌ اتصال به $URL برقرار نشد"; exit 1; }
        if [ "$HTTP_CODE" = "401" ]; then
            echo "❌ توکن نامعتبر است (401) — مقدار MAINTENANCE_TOKEN را با .env سرور مقایسه کن"
            exit 1
        elif [ "$HTTP_CODE" = "503" ]; then
            echo "❌ کانال نگهداری روی سرور خاموش است (503) — MAINTENANCE_TOKEN در .env سرور ست نشده"
            exit 1
        elif [ "$HTTP_CODE" = "429" ]; then
            echo "❌ محدودیت تعداد درخواست (429) — ۵ دقیقه صبر کن"
            exit 1
        elif [ "$HTTP_CODE" != "200" ]; then
            echo "❌ خطای HTTP $HTTP_CODE:"
            cat "$OUT" 2>/dev/null
            exit 1
        fi
        if command -v jq &>/dev/null; then
            jq . "$OUT"
        else
            cat "$OUT"
            echo ""
        fi
        ;;
esac
