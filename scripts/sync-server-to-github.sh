#!/bin/bash
# ============================================================================
# sync-server-to-github.sh — همگام‌سازی وضعیت سرور با GitHub (v1.0 rev5)
# ============================================================================
# هدف: هر تغییری که روی سرور (online) از طریق کانال نگهداری داده می‌شود،
# باید در GitHub هم منعکس شود تا سه لایه (online server / GitHub repo /
# offline local) یکسان بمانند. این اسکریپت آن کار را می‌کند.
#
# جریان کار:
#   1) maintenance.sh export-all → JSON کامل وضعیت سرور (siteTexts, settings,
#      navItems, clips, equipment, books, articles, tutorials, skills, themes)
#   2) ذخیره در server-state/snapshot.json (با metadata: timestamp, version)
#   3) git add + commit + push به شاخه‌ی server-state در GitHub repo
#      (پیش‌فرض: github.com/ldrcoir/ehsan-site)
#
# این اسکریپت روی سرور اجرا می‌شود (دسترسی لوکال به /api/maintenance).
# برای اجرای دستی:
#   bash scripts/sync-server-to-github.sh
# یا به‌صورت خودکار (cron) — مثال crontab:
#   0 */6 * * *  cd /home/ehsan/personal-site && bash scripts/sync-server-to-github.sh >> /var/log/ehsan-sync.log 2>&1
#
# احراز هویت GitHub: یا SSH key (git@github.com:...) یا token در remote URL
# (https://<token>@github.com/...). اگر GH_TOKEN در env باشد، خودکار در URL
# ست می‌شود.
# ============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

# --- پیکربندی ---------------------------------------------------------------
REPO_URL_DEFAULT="github.com/ldrcoir/ehsan-site"
BRANCH_DEFAULT="server-state"
STATE_DIR="server-state"
SNAPSHOT_FILE="$STATE_DIR/snapshot.json"

# --- متغیرهای قابل override از env -----------------------------------------
REPO_URL="${SYNC_REPO_URL:-}"
GH_TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
BRANCH="${SYNC_BRANCH:-$BRANCH_DEFAULT}"
COMMIT_AUTHOR_NAME="${SYNC_AUTHOR_NAME:-Ehsan Server Sync}"
COMMIT_AUTHOR_EMAIL="${SYNC_AUTHOR_EMAIL:-sync@ehsanmorad.ir}"

# اگر REPO_URL ست نشد، با یا بدون token بساز
if [ -z "$REPO_URL" ]; then
    if [ -n "$GH_TOKEN" ]; then
        REPO_URL="https://${GH_TOKEN}@${REPO_URL_DEFAULT}"
    else
        REPO_URL="git@${REPO_URL_DEFAULT}"
    fi
fi

# --- وابستگی‌ها --------------------------------------------------------------
for cmd in curl git node jq; do
    if ! command -v "$cmd" &>/dev/null; then
        echo "❌ $cmd نصب نیست — نصب کن:  sudo apt install -y $cmd"
        exit 1
    fi
done

# --- مرحله 1: گرفتن export-all از کانال نگهداری ------------------------------
echo "=== [1] گرفتن snapshot از کانال نگهداری ==="
TMP_OUT=$(mktemp /tmp/sync-snapshot.XXXXXX.json)
trap 'rm -f "$TMP_OUT"' EXIT

if ! bash "$SCRIPT_DIR/maintenance.sh" export-all > "$TMP_OUT" 2>&1; then
    echo "❌ export-all ناموفق بود:"
    cat "$TMP_OUT" | head -20
    exit 1
fi

# اعتبارسنجی: باید ok=true باشد و siteTexts داشته باشد
if ! grep -q '"ok"[[:space:]]*:[[:space:]]*true' "$TMP_OUT"; then
    echo "❌ پاسخ export-all ok=true نبود:"
    head -10 "$TMP_OUT"
    exit 1
fi
if ! grep -q '"siteTexts"' "$TMP_OUT"; then
    echo "❌ پاسخ export-all siteTexts ندارد — احتمالاً شکست decrypt یا auth"
    head -10 "$TMP_OUT"
    exit 1
fi
echo "  ✅ snapshot گرفته شد ($(wc -c < "$TMP_OUT") bytes)"

# --- مرحله 2: ساخت snapshot.json با metadata --------------------------------
echo "=== [2] ساخت $SNAPSHOT_FILE با metadata ==="
mkdir -p "$STATE_DIR"

# نسخه‌ی اپ از خود پاسخ می‌آیم — در data.version هست
APP_VERSION=$(jq -r '.data.exportedAt // "unknown"' "$TMP_OUT" 2>/dev/null || echo "unknown")
SNAPSHOT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SNAPSHOT_HOST=$(hostname -f 2>/dev/null || hostname || echo "unknown")

# metadata + payload در یک JSON ترکیب کن
jq --arg ts "$SNAPSHOT_TIME" \
   --arg host "$SNAPSHOT_HOST" \
   --arg script "sync-server-to-github.sh v1.0 rev5" \
   '{snapshotAt: $ts, snapshotHost: $host, snapshotBy: $script, payload: .}' \
   "$TMP_OUT" > "$SNAPSHOT_FILE"

echo "  ✅ $SNAPSHOT_FILE ساخته شد ($(wc -c < "$SNAPSHOT_FILE") bytes)"

# --- مرحله 3: git commit + push به شاخه‌ی server-state -----------------------
echo "=== [3] commit و push به شاخه‌ی $BRANCH ==="

# مطمئن شو git repo هست — اگر نیست، init کن
if [ ! -d .git ]; then
    echo "  ⏳ git repo نیست — init می‌کنم"
    git init -q
    git config user.name "$COMMIT_AUTHOR_NAME"
    git config user.email "$COMMIT_AUTHOR_EMAIL"
fi

# remote را ست کن اگر نیست یا تفاوت دارد
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
# برای مقایسه، URL را بدون token نرمال کن
NORMALIZED_NEW=$(echo "$REPO_URL" | sed -E 's#https://[^@]+@#https://#')
NORMALIZED_CURRENT=$(echo "$CURRENT_REMOTE" | sed -E 's#https://[^@]+@#https://#')
if [ "$NORMALIZED_NEW" != "$NORMALIZED_CURRENT" ]; then
    echo "  ⏳ ست کردن remote origin"
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REPO_URL"
fi

# شاخه را fetch کن و یا بساز
git fetch origin "$BRANCH" 2>/dev/null || {
    echo "  ⏳ شاخه‌ی $BRANCH روی remote نیست — ساخته می‌شود"
    # از main شروع کن اگر هست
    git fetch origin main 2>/dev/null && {
        git checkout -q -B "$BRANCH" origin/main
    } || {
        git checkout -q -b "$BRANCH"
        # اولین commit خالی برای ساختن شاخه
        git commit -q --allow-empty -m "chore: init $BRANCH branch (sync-server-to-github v1.0 rev5)" || true
    }
}

# روی شاخه باش
git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -B "$BRANCH"

# اگر upstream هست، reset کن به آن (fast-forward) — تا commitهای محلی نریزد
if git rev-parse -q --verify "origin/$BRANCH" >/dev/null; then
    git reset -q --hard "origin/$BRANCH" 2>/dev/null || true
fi

# فایل را add کن
git add "$SNAPSHOT_FILE"

# اگر تغییری نبود، خروجی بدون خطا
if git diff --cached --quiet; then
    echo "  ✅ تغییری نسبت به snapshot قبلی نیست — چیزی برای push نیست"
    exit 0
fi

# commit
git commit -q -m "chore(server-state): snapshot $SNAPSHOT_TIME

Host: $SNAPSHOT_HOST
Generated by: sync-server-to-github.sh (v1.0 rev5)
Source: /api/maintenance export-all via encrypted channel"

# push
echo "  ⏳ push به origin $BRANCH"
if git push -q origin "$BRANCH" 2>/tmp/sync-push-err; then
    echo "  ✅ push موفق"
else
    echo "  ❌ push ناموفق:"
    cat /tmp/sync-push-err | head -10
    echo ""
    echo "  راهنما:"
    echo "    - اگر 'remote: Permission denied' → GH_TOKEN اشتباه یا بدون scope repo"
    echo "    - اگر 'non-fast-forward' → snapshot محلی قدیمی است؛ دوباره تلاش کن"
    echo "    - اگر 'Could not resolve host' → شبکه/اینترنت سرور قطع است"
    rm -f /tmp/sync-push-err
    exit 1
fi
rm -f /tmp/sync-push-err

echo ""
echo "=== نتیجه ==="
echo "  snapshot: $SNAPSHOT_FILE"
echo "  branch:   $BRANCH"
echo "  commit:   $(git rev-parse --short HEAD)"
echo "  time:     $SNAPSHOT_TIME"
echo ""
echo "برای دیدن snapshot روی GitHub:"
echo "  https://${REPO_URL_DEFAULT}/tree/${BRANCH}/${STATE_DIR}"
