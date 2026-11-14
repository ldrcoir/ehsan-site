#!/bin/bash
# ============================================================================
# package-dated.sh — خروجی نهایی انتشار با تاریخ شمسی در نام فایل
# ============================================================================
# خروجی: download/ehsan-site-v1.0-<Shamsi date>.zip
#   personal-site/  → پکیج کامل نصب (standalone + install.sh + scripts + docs)
#   source/         → snapshot کامل سورس (از git archive HEAD)
#   TUTORIAL_FA_1.0.docx → آموزش کامل فارسی
#   DELIVERY-README.txt  → راهنمای محتویات و نصب
# ============================================================================
set -eo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

OUT_DIR="$PROJECT_DIR/download"
mkdir -p "$OUT_DIR"

# --- تاریخ شمسی (Tehran) -----------------------------------------------------
read -r JY JM JD <<<"$(python3 - <<'PYEOF'
import datetime
def g2j(gy, gm, gd):
    g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334]
    gy2 = gy+1 if gm>2 else gy
    days = 355666 + 365*gy + (gy2+3)//4 - (gy2+99)//100 + (gy2+399)//400 + gd + g_d_m[gm-1]
    jy = -1595 + 33*(days//12053); days %= 12053
    jy += 4*(days//1461); days %= 1461
    if days > 365:
        jy += (days-1)//365; days = (days-1)%365
    if days < 186:
        jm = 1+days//31; jd = 1+(days%31)
    else:
        jm = 7+(days-186)//30; jd = 1+((days-186)%30)
    return jy, jm, jd
now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3, minutes=30)))
jy, jm, jd = g2j(now.year, now.month, now.day)
print(jy, f"{jm:02d}", f"{jd:02d}")
PYEOF
)"
OUT_ZIP="$OUT_DIR/ehsan-site-v1.0-${JY}-${JM}-${JD}.zip"

echo "=========================================="
echo "  خروجی نهایی v1.1 — تاریخ شمسی ${JY}/${JM}/${JD}"
echo "  out: $OUT_ZIP"
echo "=========================================="

# --- 1) پکیج نصب (stage + install zip) ---------------------------------------
bash "$PROJECT_DIR/scripts/package-v1.1.sh"

STAGE="/tmp/install-v1.0/personal-site"
if [ ! -d "$STAGE" ] || [ ! -f "$STAGE/server.js" ]; then
    echo "❌ stage پکیج نصب پیدا نشد"; exit 1
fi

# --- 2) snapshot سورس از git (فایلهای tracked در HEAD) ------------------------
SRC_ROOT="/tmp/ehsan-dated"
rm -rf "$SRC_ROOT"
mkdir -p "$SRC_ROOT/source"
git archive HEAD | tar -x -C "$SRC_ROOT/source"
echo "✅ سورس snapshot از HEAD ساخته شد ($(find "$SRC_ROOT/source" -type f | wc -l | tr -d ' ') فایل)"

# --- 3) README تحویل ----------------------------------------------------------
TUTORIAL="$STAGE/public/TUTORIAL_FA_1.0.docx"
cat > "$SRC_ROOT/DELIVERY-README.txt" << EOF
Ehsan Morad Personal Site — نسخه ۱ (v1.0)
Delivery date (Shamsi): ${JY}/${JM}/${JD}
====================================================

محتویات:
  personal-site/           پکیج کامل نصب روی VPS (بدون نیاز به npm install)
                           — standalone build + install.sh + scripts + nginx conf
  source/                  snapshot کامل سورس‌کد (git HEAD، همین نسخه — کامنت‌دار)
  TUTORIAL_FA_1.0.docx     آموزش کامل فارسی (۱۴ فصل — ساخت و کار با سایت)
  AUDIT-REPORT-v1.0.md     گزارش کامل ممیزی ۶۰ کارگر (امنیت/پنل/کد/استقرار)
  DELIVERY-README.txt      همین فایل

نصب سریع (Ubuntu 22/24، دسترسی sudo):
  unzip ehsan-site-v1.0-${JY}-${JM}-${JD}.zip
  cd personal-site
  sudo ./install.sh

ورود ادمین:
  https://YOUR_DOMAIN/user-login   (username: admin — رمز تصادفی که install.sh
  فقط یک بار چاپ می‌کند؛ بعد از ورود از پنل رمز را عوض کنید)

کانال نگهداری اختصاصی (v1.0):
  روی خود سرور:   cd personal-site && bash scripts/maintenance.sh status
  action ها: status | db-stats | security-logs | messages | chats | backup | help
  توکن: db/.maintenance-token.txt (chmod 600) یا خروجی install.sh

مهاجرت VPS به VPS:
  سرور قدیمی:  bash scripts/export-site.sh
  سرور جدید (بعد از install):  sudo bash scripts/import-site.sh <tarball>
  بازیابی بکاپ شبانه:  sudo bash scripts/restore-db.sh [backup.gz]

این نسخه (v1.0) نتیجه‌ی ممیزی ۶۰ کارگرِ موازی است:
  امنیت (SSRF/DNS-rebinding، rate-limit، webhook timing، session revocation،
  XSS/URL validation، سقف بدنه‌ها)، تکمیل پنل ادمین (جست‌وجوی پیام‌ها، مسدودسازی
  IP چت، حذف تکی پیام چت، آمار هفته/referrer/CSV/پاک‌سازی، ویرایش username،
  خروجی JSON محتوا، sitekey reCAPTCHA از پنل، تم روی همه‌ی صفحات) و اصلاح
  باگ‌های کد و استقرار (Bale API 404، theme یک‌صفحه‌ای، schema/آرشیو لاگ‌ها،
  permissions دیتابیس standalone، openssl check و ...).
EOF

# --- 4) ساخت zip نهایی --------------------------------------------------------
rm -f "$OUT_ZIP"
STAGE_PARENT=$(dirname "$STAGE")
( cd "$STAGE_PARENT" && zip -r -q -9 "$OUT_ZIP" personal-site )
( cd "$SRC_ROOT" && zip -r -q -9 "$OUT_ZIP" source )
# v1.0: گزارش ممیزی ۶۰ کارگر در ریشه‌ی zip
cp "$PROJECT_DIR/AUDIT-REPORT-v1.0.md" "$SRC_ROOT/AUDIT-REPORT-v1.0.md"
( cd "$SRC_ROOT" && zip -r -q -9 "$OUT_ZIP" AUDIT-REPORT-v1.0.md )
# tutorial در ریشه (فقط اگر موجود بود — داخل پکیج هم هست)
if [ -f "$TUTORIAL" ]; then
    TMPD=$(mktemp -d)
    cp "$TUTORIAL" "$TMPD/TUTORIAL_FA_1.0.docx"
    cp "$SRC_ROOT/DELIVERY-README.txt" "$TMPD/"
    ( cd "$TMPD" && zip -r -q -9 "$OUT_ZIP" TUTORIAL_FA_1.0.docx DELIVERY-README.txt )
    rm -rf "$TMPD"
else
    ( cd "$SRC_ROOT" && zip -r -q -9 "$OUT_ZIP" DELIVERY-README.txt )
fi

# --- 5) گزارش + صحت‌سنجی -------------------------------------------------------
SIZE=$(stat -c%s "$OUT_ZIP")
HUMAN=$(numfmt --to=iec --suffix=B "$SIZE" 2>/dev/null || echo "${SIZE}B")
if unzip -t "$OUT_ZIP" > /dev/null 2>&1; then
    echo "✅ integrity OK (unzip -t)"
else
    echo "❌ zip معیوب است!"; exit 1
fi
echo ""
echo "=========================================="
echo "  ✅ خروجی نهایی: $OUT_ZIP"
echo "  سایز: $HUMAN ($SIZE bytes)"
echo "  فایلها: $(unzip -l "$OUT_ZIP" | tail -1 | awk '{print $2}')"
echo "  تاریخ شمسی: ${JY}/${JM}/${JD}"
echo "=========================================="
unzip -l "$OUT_ZIP" | grep -E "server.js|install.sh|schema.prisma|DELIVERY-README|TUTORIAL|source/HEAD|package.json" | head -8
