#!/bin/bash
# ============================================================================
# ai-edit-online.sh — ویرایش آنلاین سایت + sync خودکار به GitHub (v1.0 rev5)
# ============================================================================
# این اسکریپت «ابزار دستیار» است — یک فرمان واحد برای:
#   1) ویرایش محتوای سایت از طریق کانال نگهداری امن (با رمز AES-256-GCM)
#   2) sync خودکار snapshot جدید به GitHub (شاخه‌ی server-state)
#
# جریان:
#   ai-edit-online.sh <action> [--data '<json>']
#   ↓
#   maintenance.sh <action> --data '...'   ← ویرایش روی سرور
#   ↓ (اگر موفق)
#   sync-server-to-github.sh               ← snapshot به GitHub
#
# نمونه‌ها:
#   # خواندن وضعیت (با AI-bind اگر لازم باشد)
#   bash scripts/ai-edit-online.sh status
#   bash scripts/ai-edit-online.sh texts.get
#
#   # ویرایش متن سه‌زبانه
#   bash scripts/ai-edit-online.sh texts.set --data '{"key":"hero.greeting","valueFa":"سلام","valueEn":"Hello"}'
#
#   # افزودن لینک به منو
#   bash scripts/ai-edit-online.sh nav.add --data '{"labelFa":"بلاگ","labelEn":"Blog","href":"/blog","target":"_self","visible":true}'
#
#   # افزودن کلیپ آپارات
#   bash scripts/ai-edit-online.sh clip.add --data '{"title":"معرفی آزمایشگاه","embedCode":"<iframe ...></iframe>","category":"intro","visible":true}'
#
#   # تغییر وضعیت دستگاه
#   bash scripts/ai-edit-online.sh equipment.set --data '{"id":"<id>","status":"maintenance"}'
#
# محیط:
#   MAINTENANCE_TOKEN, MAINTENANCE_EDIT_TOKEN, MAINTENANCE_ENC_KEY  — از env / .env
#   MAINTENANCE_URL — آدرس سرور (پیش‌فرض: http://127.0.0.1:3000 روی خود سرور)
#   GH_TOKEN یا GITHUB_TOKEN — برای push به GitHub
#   SYNC_REPO_URL (optional) — پیش‌فرض github.com/ldrcoir/ehsan-site
#
# روی سرور نصب کن (یک بار):
#   sudo cp scripts/ai-edit-online.sh /usr/local/bin/ai-edit
#   sudo chmod +x /usr/local/bin/ai-edit
# سپس از هر کجا:  ai-edit status
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# v1.0 rev5 — maintenance.sh ممکن است در همان پوشه باشد (در zip: scripts/)
# یا در پوشه‌ی کناری (در development: AI/ ولی maintenance.sh در scripts/)
find_script() {
    local name="$1"
    if [ -f "$SCRIPT_DIR/$name" ]; then
        echo "$SCRIPT_DIR/$name"
    elif [ -f "$SCRIPT_DIR/../scripts/$name" ]; then
        echo "$SCRIPT_DIR/../scripts/$name"
    else
        echo ""
    fi
}
MAINT_SCRIPT=$(find_script "maintenance.sh")
SYNC_SCRIPT=$(find_script "sync-server-to-github.sh")

# flag --no-sync برای رد کردن مرحله‌ی sync (در صورت خرابی GitHub)
NO_SYNC=0
NEW_ARGS=()
for a in "$@"; do
    if [ "$a" = "--no-sync" ]; then
        NO_SYNC=1
    else
        NEW_ARGS+=("$a")
    fi
done
set -- "${NEW_ARGS[@]}"

ACTION="${1:-help}"
if [ "$ACTION" = "help" ] || [ "$ACTION" = "-h" ] || [ "$ACTION" = "--help" ]; then
    cat <<'EOF'
ai-edit-online.sh — ویرایش آنلاین + sync خودکار به GitHub

استفاده:
  bash scripts/ai-edit-online.sh <action> [--data '<json>'] [--no-sync]

actionهای خواندن:
  status, db-stats, security-logs, messages, chats, help

actionهای ویرایشی (نیاز به EDIT_TOKEN):
  texts.get, texts.set, settings.get, settings.set
  nav.get, nav.add, nav.set-visible, nav.delete
  clips.get, clip.add, clip.set-visible, clip.delete
  equipment.get, equipment.set, content.get, content.set-visible
  export-all

flagها:
  --no-sync   فقط ویرایش را انجام بده، sync به GitHub را رد کن
  --ai-bind   حالت AI-bind (EDIT_TOKEN برای همه‌ی actionها لازم است)

نمونه:
  bash scripts/ai-edit-online.sh texts.set --data '{"key":"hero.title","valueFa":"عنوان جدید"}'

متغیرهای محیطی:
  MAINTENANCE_TOKEN, MAINTENANCE_EDIT_TOKEN, MAINTENANCE_ENC_KEY, MAINTENANCE_URL
  GH_TOKEN یا GITHUB_TOKEN (برای push به GitHub)
EOF
    exit 0
fi

# --- مرحله 1: اجرای ویرایش از طریق کانال نگهداری ----------------------------
echo "=== [1] اجرای action از طریق کانال نگهداری ==="
echo "  action: $ACTION"
echo "  server: ${MAINTENANCE_URL:-http://127.0.0.1:3000 (default)}"
echo ""

if [ -z "$MAINT_SCRIPT" ]; then
    echo "❌ maintenance.sh پیدا نشد — نه در $SCRIPT_DIR/ و نه در $SCRIPT_DIR/../scripts/"
    exit 1
fi
if ! bash "$MAINT_SCRIPT" "$@"; then
    echo ""
    echo "❌ ویرایش ناموفق بود — sync به GitHub انجام نشد"
    exit 1
fi

# --- مرحله 2: sync به GitHub (مگر --no-sync) --------------------------------
if [ "$NO_SYNC" = "1" ]; then
    echo ""
    echo "=== [2] sync رد شد (--no-sync) ==="
    exit 0
fi

echo ""
echo "=== [2] sync snapshot جدید به GitHub ==="
if [ -z "$SYNC_SCRIPT" ]; then
    echo "  ⚠️  sync-server-to-github.sh پیدا نشد — sync رد شد"
    exit 0
fi

if ! bash "$SYNC_SCRIPT"; then
    echo ""
    echo "⚠️  sync به GitHub ناموفق بود — ویرایش روی سرور اعمال شده ولی snapshot در GitHub نیست"
    echo "    بعداً می‌توانی دستی اجرا کنی:  bash $SYNC_SCRIPT"
    exit 2  # exit code 2 = ویرایش موفق، sync ناموفق
fi

echo ""
echo "=== ✅ همه‌چیز موفق ==="
echo "  ویرایش روی سرور اعمال شد + snapshot به GitHub push شد"
echo "  سه لایه (online / GitHub / offline) هم‌رنگ هستند"
