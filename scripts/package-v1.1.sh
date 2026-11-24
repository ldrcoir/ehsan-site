#!/bin/bash
# ============================================================================
# package-v1.1.sh — ساخت پکیج انتشار public/install-v1.0.zip (v1.1)
# ============================================================================
# استفاده (بعد از build کامل — یعنی .next/standalone/server.js موجود باشه):
#   bash scripts/package-v1.1.sh
#
# مراحل:
#   0) pre-check: .next/standalone/server.js
#   1) پاک‌سازی artifactهای کهنه از .next/standalone/public
#   2) stage به /tmp/install-v1.0/personal-site
#      (standalone + public انتقادی + install.sh + scripts بدون ابزار dev
#       + prisma/schema.prisma + VERSION.txt + package.json + nginx conf)
#   3) لاغر کردن node_modules (حذف @img/sharp، engineهای غیر-sqlite
#      پرisma، *.map، cacheها، capsize)
#   4) اطمینان از وجود bcryptjs
#   5) پاک‌سازی فایلهای راه‌گونه (*.db، .env*، *.log، *.tsbuildinfo، *.zip)
#   6) README.md و .env.example فارسی
#   7) node --check + zip -9 → public/install-v1.0.zip
#   8) assert سایز < 25MB + گزارش نهایی
# ============================================================================
set -eo pipefail

VERSION="1.1.2"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

STAGE_ROOT="/tmp/install-v1.0"
STAGE="$STAGE_ROOT/personal-site"
# v1.0 rev3: خروجی قابل override — برای zip رسمی با تاریخ شمسی:
#   RELEASE_OUT=releases/ehsan-site-v1.0-1405-09-03.zip bash scripts/package-v1.1.sh
OUT="${RELEASE_OUT:-$PROJECT_DIR/public/install-v1.0.zip}"
MAX_BYTES=$((25 * 1024 * 1024))   # 25MB سقف پکیج

SCRIPTS_KEEP="apply_schema.py seed_access_users.py seed_content.py seed_equipment.py seed_texts.py reset-admin-password.sh auto-backup.sh export-site.sh import-site.sh restore-db.sh maintenance.sh maintenance-enc.mjs sync-from-online.sh apply-online-export.mjs push-to-github.sh"
# v1.1: list_messages.py حذف شد — ابزار dump مستقیم DB بود و دلیلی برای ارسال به نصب‌کننده نداشت
# v1.1.2: آموزش از dist/ هم پیدا می‌شود (از public/ خارج شد تا build لاغر بماند)
PUBLIC_KEEP="icon-192.png icon-512.png favicon.ico manifest.json robots.txt"

echo "=========================================="
echo "  package v$VERSION — slim packaging"
echo "  project: $PROJECT_DIR"
echo "  out:     $OUT"
echo "=========================================="
echo ""

# ----------------------------------------------------------------------------
# ۰) pre-check
# ----------------------------------------------------------------------------
if [ ! -f "$PROJECT_DIR/.next/standalone/server.js" ]; then
    echo "❌ .next/standalone/server.js پیدا نشد."
    echo "   اول build بزن:  npm run build"
    echo "   بعد دوباره این اسکریپت رو اجرا کن."
    exit 1
fi
# v1.1 (fix): استاتیک‌ها و public باید داخل standalone باشن وگرنه سرور بدون JS/CSS بالا میاد
if [ ! -d "$PROJECT_DIR/.next/standalone/.next/static" ]; then
    echo "❌ .next/standalone/.next/static پیدا نشد — build ناقص است (npm run build این را کپی می‌کند)."
    exit 1
fi
command -v zip >/dev/null 2>&1 || { echo "❌ zip نصب نیست (apt install -y zip)"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node نصب نیست"; exit 1; }
echo "✅ pre-check OK"

# ----------------------------------------------------------------------------
# ۱) پاک‌سازی artifactهای کهنه از standalone/public
# ----------------------------------------------------------------------------
SA_PUBLIC="$PROJECT_DIR/.next/standalone/public"
if [ -d "$SA_PUBLIC" ]; then
    rm -f "$SA_PUBLIC"/install-v*.zip "$SA_PUBLIC"/source-*.zip "$SA_PUBLIC"/tutorial-*.zip 2>/dev/null || true
    rm -f "$SA_PUBLIC"/TUTORIAL_FA_*.docx 2>/dev/null || true
    echo "✅ stale artifacts پاک شدند (standalone/public)"
fi

# ----------------------------------------------------------------------------
# ۲) stage
# ----------------------------------------------------------------------------
rm -rf "$STAGE_ROOT"
mkdir -p "$STAGE"
cp -a "$PROJECT_DIR/.next/standalone/." "$STAGE/"

# public انتقادی — نه کپی کامل
rm -rf "$STAGE/public"
mkdir -p "$STAGE/public"
for f in $PUBLIC_KEEP; do
    if [ -f "$PROJECT_DIR/public/$f" ]; then
        cp "$PROJECT_DIR/public/$f" "$STAGE/public/$f"
    else
        echo "  ⚠ public/$f تو پروژه نیست — بدون همین میریم"
    fi
done

# v1.1.2: آموزش فارسی — از dist/ به public پکیج + ریشه‌ی خروجی
# v1.0 rev3 (audit DEPLOY-d LOW): مسیر واقعی فایل‌ها download/ است — fallback اضافه شد
TUTORIAL_SRC=""
if [ -f "$PROJECT_DIR/dist/TUTORIAL_FA_1.0.docx" ]; then
    TUTORIAL_SRC="$PROJECT_DIR/dist/TUTORIAL_FA_1.0.docx"
elif [ -f "$PROJECT_DIR/public/TUTORIAL_FA_1.0.docx" ]; then
    TUTORIAL_SRC="$PROJECT_DIR/public/TUTORIAL_FA_1.0.docx"
elif [ -f "$PROJECT_DIR/download/TUTORIAL_FA_v1.docx" ]; then
    TUTORIAL_SRC="$PROJECT_DIR/download/TUTORIAL_FA_v1.docx"
fi
if [ -n "$TUTORIAL_SRC" ] && [ -d "$STAGE/public" ]; then
    cp "$TUTORIAL_SRC" "$STAGE/public/TUTORIAL_FA_1.0.docx"
    echo "✅ TUTORIAL docx به پکیج اضافه شد"
fi

# v1.0 rev3: پوشه‌ی docs با آموزش + گزارش ممیزی (هم‌مثل پکیج سورس)
mkdir -p "$STAGE/docs"
for f in download/TUTORIAL_FA_v1.docx download/AUDIT-REPORT-FA_v1.docx; do
    if [ -f "$PROJECT_DIR/$f" ]; then cp "$PROJECT_DIR/$f" "$STAGE/docs/"; else echo "  ⚠ $f نیست — docs ناقص می‌ماند"; fi
done

# scripts — فقط زیرمجموعه‌ی allow-list (بدون ابزارهای dev)
mkdir -p "$STAGE/scripts"
for s in $SCRIPTS_KEEP; do
    if [ -f "$PROJECT_DIR/scripts/$s" ]; then
        cp "$PROJECT_DIR/scripts/$s" "$STAGE/scripts/$s"
        chmod +x "$STAGE/scripts/$s"
    else
        echo "  ⚠ scripts/$s تو پروژه نیست — بدون همین میریم"
    fi
done

# فایلهای ریشه
mkdir -p "$STAGE/prisma"
cp "$PROJECT_DIR/prisma/schema.prisma" "$STAGE/prisma/schema.prisma"
cp "$PROJECT_DIR/VERSION.txt" "$STAGE/VERSION.txt"
cp "$PROJECT_DIR/package.json" "$STAGE/package.json"
cp "$PROJECT_DIR/install.sh" "$STAGE/install.sh"
chmod +x "$STAGE/install.sh"
# install.sh به این فایل نیاز داره (nginx -t باید پاس بشه)
if [ -f "$PROJECT_DIR/nginx-ehsanmorad.conf" ]; then
    cp "$PROJECT_DIR/nginx-ehsanmorad.conf" "$STAGE/nginx-ehsanmorad.conf"
else
    echo "  ⚠ nginx-ehsanmorad.conf نیست — install.sh ممکنه تو مرحله‌ی Nginx گیر کنه!"
fi

# v1.0 rev3 — سورس کامل با کامنت‌گذاری فارسی هم داخل zip رسمی است
# (درخواست مالک: zip شامل «سورس کامنت‌گذاری فارسی» باشد؛ حالا هم نصبِ بدون npm
# دارد — server.js standalone — هم سورس برای بازبینی/توسعه)
mkdir -p "$STAGE/src"
cp -a "$PROJECT_DIR/src/." "$STAGE/src/"
for rf in tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs; do
    [ -f "$PROJECT_DIR/$rf" ] && cp "$PROJECT_DIR/$rf" "$STAGE/$rf"
done
echo "✅ سورس کامل (src/) + کانفیگ‌های dev اضافه شد"
echo "✅ stage کامل شد"

# ----------------------------------------------------------------------------
# ۳) لاغر کردن node_modules و خروجی build
# ----------------------------------------------------------------------------
# باینریهای سنگین تصویر (استفاده نمی‌شیم)
rm -rf "$STAGE/node_modules/@img" "$STAGE/node_modules/sharp"

# engineهای غیر-sqlite پرisma (ما فقط sqlite هستیم)
PR_RUNTIME="$STAGE/node_modules/@prisma/client/runtime"
if [ -d "$PR_RUNTIME" ]; then
    for DB in cockroachdb postgresql mysql sqlserver; do
        rm -f "$PR_RUNTIME"/query_engine_bg.$DB.* "$PR_RUNTIME"/query_compiler_bg.$DB.*
    done
fi

# باقی بلادها
rm -rf "$STAGE/.next/node_modules"
rm -rf "$STAGE/.next/cache"
find "$STAGE" -type f -name '*.map' -delete
rm -f "$STAGE/node_modules/next/dist/server/capsize-font-metrics.json"
echo "✅ bloat حذف شد (@img/sharp، engineهای غیر-sqlite، *.map، cacheها)"

# ----------------------------------------------------------------------------
# ۴) bcryptjs باید تو پکیج باشه (scripts بهش نیاز دارن)
# ----------------------------------------------------------------------------
if [ ! -d "$STAGE/node_modules/bcryptjs" ]; then
    if [ -d "$PROJECT_DIR/node_modules/bcryptjs" ]; then
        cp -a "$PROJECT_DIR/node_modules/bcryptjs" "$STAGE/node_modules/bcryptjs"
        echo "✅ bcryptjs از پروژه به stage کپی شد"
    else
        echo "❌ bcryptjs نه تو standalone هست نه تو پروژه — seed/reset کار نمی‌کنه!"
        exit 1
    fi
fi

# ----------------------------------------------------------------------------
# ۵) پاک‌سازی فایلهای راه‌گونه
# ----------------------------------------------------------------------------
find "$STAGE" \( -name '*.db' -o -name '*.db-*' -o -name '*.db.gz' \) -delete 2>/dev/null || true
find "$STAGE" -name '.env*' ! -name '.env.example' -delete 2>/dev/null || true
find "$STAGE" \( -name '.admin-initial-password.txt' -o -name '.maintenance-token.txt' -o -name '.maintenance-edit-token.txt' -o -name '.maintenance-enc-key.txt' \) -delete 2>/dev/null || true
find "$STAGE" -name '*.log' -delete 2>/dev/null || true
find "$STAGE" -name '*.tsbuildinfo' -delete 2>/dev/null || true
[ -d "$STAGE/public" ] && find "$STAGE/public" -name '*.zip' -delete 2>/dev/null || true
echo "✅ stray files پاک شدند (*.db، .env*، توکن‌ها، *.log، *.tsbuildinfo، *.zip)"

# ----------------------------------------------------------------------------
# ۶) README.md + .env.example (فارسی)
# ----------------------------------------------------------------------------
cat > "$STAGE/README.md" << 'MDEOF'
# سایت شخصی — v1.1

## نصب سریع (روی VPS تازه — Ubuntu 22/24)

```bash
wget https://github.com/ldrcoir/ehsan-site/raw/main/public/install-v1.0.zip
unzip install-v1.0.zip
cd personal-site
sudo ./install.sh
```

## ورود ادمین

- آدرس: `https://YOUR_DOMAIN/user-login` — nginx روی پورت ۸۰/۴۴۳ سرو می‌کند؛ اپ روی ۱۲۷.۰.۰.۱:3000 داخلی است (پورت ۳۰۰۰ از بیرون بسته است)
- username: `admin`
- password: **یک رمز تصادفی که install.sh فقط یک بار چاپ می‌کنه** — یادداشتش کن!
- بعد از ورود حتماً از پنل → تنظیمات → تغییر رمز، رمز جدید بذار
  (با تغییر رمز همه‌ی sessionهای قبلی خودکار باطل می‌شن — v1.1).

## کانال نگهداری و ویرایش رمزشده (v1.0 rev3)

install.sh سه راز تولید می‌کند و یک بار چاپ می‌کند:
- MAINTENANCE_TOKEN (خواندن): status | db-stats | security-logs | messages | chats | backup
- MAINTENANCE_EDIT_TOKEN (ویرایش): texts.set | settings.set | nav.* | clip.* | equipment.set | export-all
- MAINTENANCE_ENC_KEY (رمزنگاری AES-256-GCM کانال — درخواست و پاسخ هر دو رمز می‌شوند؛
  ts ±۵ دقیقه و nonce یک‌بارمصرف داخل پاکت، ضد replay)

## تنظیم reCAPTCHA (لازم برای فرم تماس)

1. برو به https://www.google.com/recaptcha/admin و یه سایت **v2** ثبت کن.
2. در فایل `.env` این دو خط رو پر کن:
   - `RECAPTCHA_SECRET="<secret-key>"`
   - `NEXT_PUBLIC_RECAPTCHA_SITEKEY="<site-key>"`
3. `sudo systemctl restart personal-site`

## انتقال به سرور دیگر (VPS → VPS)

روی سرور قدیمی: `bash scripts/export-site.sh`
روی سرور جدید (بعد از install.sh): `sudo bash scripts/import-site.sh <tarball>`

## ریست رمز ادمین

```bash
sudo bash scripts/reset-admin-password.sh
```
(یک رمز تصادفی جدید فقط یک بار چاپ می‌شه)

## مستندات

- `public/TUTORIAL_FA_1.0.docx` — آموزش کامل ۱۴ فصلی (فارسی)
- `VERSION.txt` — تاریخچه نسخه‌ها و راهنمای استقرار
- `.env.example` — نمونه‌ی کلیدهای محیطی
MDEOF

cat > "$STAGE/.env.example" << 'ENVEOF'
# personal-site v1.1 — نمونه‌ی کلیدهای محیطی
# install.sh نسخه‌ی واقعی (.env) رو با مقدارهای تصادفی می‌سازه؛
# فقط reCAPTCHA و bot tokenها رو باید خودت پر کنی.
DATABASE_URL="file:/home/ehsan/personal-site/db/custom.db"
SESSION_SECRET=
RECAPTCHA_SECRET=
NEXT_PUBLIC_RECAPTCHA_SITEKEY=
BALE_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_SECRET=
NEXT_PUBLIC_SITE_URL=
TRUST_PROXY="true"
# کانال نگهداری (install.sh تولید می‌کند — اینجا فقط نمونه):
MAINTENANCE_TOKEN=
MAINTENANCE_EDIT_TOKEN=
# v1.0 rev3 — کلید رمزنگاری کانال (۶۴ hex = ۳۲ بایت)
MAINTENANCE_ENC_KEY=
ENVEOF
echo "✅ README.md و .env.example ساخته شدند"

# ----------------------------------------------------------------------------
# ۷) بررسی و zip
# ----------------------------------------------------------------------------
node --check "$STAGE/server.js"
echo "✅ server.js syntax OK"

mkdir -p "$PROJECT_DIR/public"
rm -f "$OUT"
( cd "$STAGE_ROOT" && zip -r -q -9 "$OUT" personal-site )

# ----------------------------------------------------------------------------
# ۸) assert سایز + گزارش
# ----------------------------------------------------------------------------
SIZE=$(stat -c%s "$OUT")
if [ "$SIZE" -ge "$MAX_BYTES" ]; then
    echo ""
    echo "❌ پکیج از 25MB بزرگ‌تره: $SIZE bytes"
    echo "   باید slim‌تر بشه — محتویات node_modules رو بررسی کن."
    exit 1
fi

FILE_COUNT=$(find "$STAGE" -type f | wc -l | tr -d ' ')
HUMAN=$(numfmt --to=iec --suffix=B "$SIZE" 2>/dev/null || echo "${SIZE}B")

echo ""
echo "=========================================="
echo "  ✅ پکیج ساخته شد: public/install-v1.0.zip"
echo "  سایز: $HUMAN ($SIZE bytes) — سقف: 25MB"
echo "  تعداد فایلها: $FILE_COUNT"
echo "=========================================="
echo ""
echo "  مسیر کامل: $OUT"
echo ""
echo "  برای انتشار: به repo پوش کن (public/install-v1.0.zip"
echo "  توزیع با GitHub Releases (در .gitignore است))."
echo ""
