#!/bin/bash
# ============================================================================
# package-v1.sh — ساخت بسته‌ی انتشار رسمی «نسخه‌ی یک» (v1.0) — v1.0
# ============================================================================
# خروجی: ehsan-site-v1.0-<تاریخ شمسی>.zip
#   مثال: ehsan-site-v1.0-1405-09-03.zip
#
# محتوای zip (طبق سفارش):
#   - سورس کامل سایت با کامنت‌گذاری فارسی (src, prisma, public, scripts)
#   - فایل آموزشی Word فارسی (docs/TUTORIAL_FA_v1.docx)
#   - گزارش ممیزی Word فارسی (docs/AUDIT-REPORT-FA_v1.docx)
#   - اسکریپت نصب و انتقال آسان (install.sh + scripts/*)
#   - VERSION.txt، README.md، .env.example، nginx/Docker configs
#
# بدون: node_modules، .next، دیتابیس واقعی، .env واقعی، بک‌آپ‌ها، توکن‌ها.
# استفاده:  bash scripts/package-v1.sh
# ============================================================================

set -eo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
VERSION="1.0"

# --- تاریخ شمسی از Python (تقویم جلالی استاندارد) -----------------------------
JALALI=$(python3 -c "
from datetime import datetime, timezone, timedelta
d = datetime.now(timezone(timedelta(hours=3, minutes=30)))
g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334]
gy, gm, gd = d.year, d.month, d.day
days = 355666 + 365*gy + (gy+3)//4 - (gy+99)//100 + (gy+399)//400 + gd + g_d_m[gm-1]
if gm > 2 and ((gy%4==0 and gy%100!=0) or gy%400==0): days += 1
jy = -1595 + 33*(days//12053); days %= 12053
jy += 4*(days//1461); days %= 1461
if days > 365:
    jy += (days-1)//365; days = (days-1)%365
if days < 186:
    jm = 1 + days//31; jd = 1 + days%31
else:
    jm = 7 + (days-186)//30; jd = 1 + (days-186)%30
print('%04d-%02d-%02d' % (jy, jm, jd))
")

ZIP_NAME="ehsan-site-v${VERSION}-${JALALI}.zip"
STAGE="/tmp/stage-v1-$$"
STAGE_NAME="personal-site"

echo "⏳ staging در $STAGE ..."
rm -rf "$STAGE"; mkdir -p "$STAGE/$STAGE_NAME"
S="$STAGE/$STAGE_NAME"

# --- کپی سورس با کامنت فارسی ---------------------------------------------------
cp -r src "$S/"
cp -r prisma "$S/"
cp -r public "$S/"
cp -r scripts "$S/"
cp install.sh "$S/"
cp package.json package-lock.json tsconfig.json next.config.ts \
   postcss.config.mjs eslint.config.mjs "$S/" 2>/dev/null || true
cp Caddyfile Dockerfile docker-compose.yml docker-entrypoint.sh \
   nginx-ehsanmorad.conf "$S/" 2>/dev/null || true
[ -f VERSION.txt ] && cp VERSION.txt "$S/"
[ -f PROJECT_LOG.md ] && cp PROJECT_LOG.md "$S/"
[ -f AUDIT-REPORT-v1.0.md ] && cp AUDIT-REPORT-v1.0.md "$S/"

# --- مستندات Word فارسی --------------------------------------------------------
mkdir -p "$S/docs"
for f in download/TUTORIAL_FA_v1.docx download/AUDIT-REPORT-FA_v1.docx; do
    if [ -f "$f" ]; then cp "$f" "$S/docs/"; else echo "⚠ $f پیدا نشد"; fi
done

# --- پاکسازی staged از راز‌ها و داده‌ها -----------------------------------------
# هرگز داخل zip: .env واقعی، دیتابیس واقعی، توکن‌ها، بک‌آپ‌ها، node_modules
find "$S" -name '.env*' ! -name '.env.example' -delete 2>/dev/null || true
find "$S" -name '*.db' -o -name '*.db-*' -o -name '*.db.gz' -delete 2>/dev/null || true
find "$S" -name '.admin-initial-password.txt' -o -name '.maintenance-token.txt' -o -name '.maintenance-edit-token.txt' -delete 2>/dev/null || true
find "$S" -type d \( -name node_modules -o -name .next -o -name backups -o -name download -o -name __pycache__ \) -exec rm -rf {} + 2>/dev/null || true
find "$S" -name 'online-export-*.json' -delete 2>/dev/null || true

# --- README.md + .env.example فارسی --------------------------------------------
cat > "$S/README.md" << 'MDEOF'
# personal-site — نسخه‌ی یک (v1.0)

وب‌سایت شخصی احسان مرادی — Next.js 16 + SQLite + nginx
سورس کامل با کامنت‌گذاری فارسی + آموزش Word فارسی + گزارش ممیزی + اسکریپت نصب.

## نصب سریع روی VPS

```bash
unzip ehsan-site-v1.0-<تاریخ شمسی>.zip
cd personal-site
sudo ./install.sh
```

- آدرس ورود پنل:  http://YOUR_IP/user-login
- نام کاربری: admin (نقش مالک — owner)
- رمز: توسط install.sh یک بار چاپ می‌شود (هم‌چنین در db/.admin-initial-password.txt با دسترسی 600)
- ⚠️ بعد از اولین ورود، رمز را از پنل → تنظیمات عوض کن!

## کانال نگهداری امن
install.sh دو توکن تولید می‌کند و یک بار چاپ می‌کند:
- MAINTENANCE_TOKEN (خواندن): status | db-stats | security-logs | messages | chats | backup
- MAINTENANCE_EDIT_TOKEN (ویرایش): texts.set | settings.set | nav.* | clip.* | equipment.set | export-all

```bash
cd /home/ehsan/personal-site
bash scripts/maintenance.sh status
bash scripts/maintenance.sh texts.set --data '{"key":"hero.greeting","valueFa":"سلام"}'

# همگام‌سازی نسخه‌ی آفلاین با آنلاین:
export MAINTENANCE_URL=https://ehsanmorad.ir
export MAINTENANCE_TOKEN=... MAINTENANCE_EDIT_TOKEN=...
bash scripts/sync-from-online.sh
node scripts/apply-online-export.mjs db/online-export-<زمان>.json
git add -A && git commit -m "sync" && git push
```

## مستندات
- docs/TUTORIAL_FA_v1.docx — کتاب آموزش کامل فارسی (۱۴ فصل)
- docs/AUDIT-REPORT-FA_v1.docx — گزارش ممیزی فارسی
- VERSION.txt — تاریخچه و راهنمای سریع

## نقش‌ها (RBAC)
- owner (مالک): همه‌چیز؛ فقط از خود سرور ساخته/ریست می‌شود؛ از پنل قابل حذف/تنزل نیست
- admin: همه‌ی پنل به‌جز مدیریت ادمین‌ها؛ فقط کاربران عادی را مدیریت می‌کند
- user: فقط داشبورد + تب‌های واگذارشده (پیام‌ها/کلیپ‌ها/محتوا/متن‌ها/منو/تم‌ها)
MDEOF

cat > "$S/.env.example" << 'ENVEOF'
# personal-site v1.0 — نمونه‌ی کلیدهای محیطی
# install.sh نسخه‌ی واقعی (.env) را با مقدارهای تصادفی می‌سازد؛
# فقط reCAPTCHA و bot tokenها را باید خودت پر کنی.
DATABASE_URL="file:/home/ehsan/personal-site/db/custom.db"
SESSION_SECRET=
NODE_ENV="production"
PORT=3000
HOSTNAME="127.0.0.1"
NEXT_PUBLIC_SITE_URL="https://ehsanmorad.ir"
RECAPTCHA_SECRET=
NEXT_PUBLIC_RECAPTCHA_SITEKEY=
BALE_WEBHOOK_SECRET=
TELEGRAM_WEBHOOK_SECRET=
TRUST_PROXY="true"
# کانال نگهداری (install.sh تولید می‌کند — اینجا فقط نمونه):
MAINTENANCE_TOKEN=
MAINTENANCE_EDIT_TOKEN=
APP_VERSION="1.0"
ENVEOF

# --- بررسی‌های نهایی قبل از zip -------------------------------------------------
if find "$S" -name '*.db' | grep -q .; then echo "❌ خطا: دیتابیس داخل stage است"; exit 1; fi
if grep -rE "^SESSION_SECRET=.+" "$S/.env" 2>/dev/null; then echo "❌ خطا: .env داخل stage است"; exit 1; fi

# --- zip ------------------------------------------------------------------------
cd "$STAGE"
rm -f "$ROOT/download/$ZIP_NAME"
mkdir -p "$ROOT/download" "$ROOT/releases"
zip -r -q "$ROOT/download/$ZIP_NAME" "$STAGE_NAME"
cp "$ROOT/download/$ZIP_NAME" "$ROOT/releases/$ZIP_NAME"
cd "$ROOT"

echo ""
echo "✅ بسته ساخته شد: download/$ZIP_NAME  (کپی در releases/$ZIP_NAME برای commit)"
echo "   حجم: $(du -h "download/$ZIP_NAME" | cut -f1)"
echo "   تاریخ شمسی: $JALALI"
