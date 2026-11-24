#!/bin/bash
# ============================================================================
# push-to-github.sh — یک‌فرمانیِ push نسخه‌ی v1.0 به GitHub (v1.0 rev3)
# ============================================================================
# استفاده (روی هر ماشینی که گیت این ریپو را دارد — مثلاً VPS):
#
#   export GITHUB_TOKEN=<توکن شخصی GitHub با دسترسی repo>
#   bash scripts/push-to-github.sh
#
# توکن فقط در همین اجرا استفاده می‌شود؛ نه چاپ می‌شود نه ذخیره می‌شود نه
# در تاریخچه‌ی گیت می‌رود. اگر اشتباه بدهی، گیت خودش رد می‌کند.
#
# کارهایی که می‌کند:
#   1) تاریخچه‌ی فعلیِ main روی گیت‌هاب را در شاخه‌ی پشتیبان
#      backup/v1.1-pre-v1-reset نگه می‌دارد (هیچ چیزی از بین نمی‌رود)
#   2) main محلی (v1.0 rev3) را به‌صورت force روی main اصلی می‌گذارد —
#      چون تاریخچه‌ی v1.0 بازنویسی تمیز است و با ۱۲۴ کامیت قدیمیِ v1.1
#      ریشه‌ی مشترک ندارد (merge unrelated فقط شلوغی می‌ساخت)
# ============================================================================
set -eo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
    echo "❌ اول توکن را export کن:  export GITHUB_TOKEN=<personal access token>"
    echo "   (Settings → Developer settings → Personal access tokens → repo)"
    exit 1
fi

git remote remove public-auth 2>/dev/null || true
git remote add public-auth "https://x-access-token:${GITHUB_TOKEN}@github.com/ldrcoir/ehsan-site.git"

cleanup() { git remote remove public-auth 2>/dev/null || true; }
trap cleanup EXIT

echo "۱/۲ — پشتیبان‌گیری از main فعلی گیت‌هاب در backup/v1.1-pre-v1-reset ..."
git push public-auth "refs/remotes/public/main:refs/heads/backup/v1.1-pre-v1-reset" --force 2>&1 | tail -2

echo "۲/۲ — push نسخه‌ی v1.0 به main ..."
git push public-auth main:main --force 2>&1 | tail -3

echo ""
echo "✅ تمام شد. main روی گیت‌هاب الان آخرین rev محلی (v1.0 rev4) است؛"
echo "   تاریخچه‌ی قدیمی هم در شاخه‌ی backup/v1.1-pre-v1-reset محفوظ ماند."
