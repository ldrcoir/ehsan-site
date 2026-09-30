#!/bin/bash
# ============================================================================
# reset-admin-password.sh — ریست رمز ادمین از سرور
# ============================================================================
# اگه ادمین رمز رو فراموش کرد، این اسکریپت رو روی سرور اجرا کن:
#
#   cd /home/ehsan/personal-site
#   sudo bash scripts/reset-admin-password.sh
#
# رمز ادمین به "admin123" برگردانده می‌شه.
# بعداً از پنل می‌تونی رمز جدید بذاری.
# ============================================================================

set -eo pipefail

echo "=========================================="
echo "  ریست رمز ادمین"
echo "=========================================="
echo ""

# پیدا کردن مسیر پروژه
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

echo "مسیر پروژه: $PROJECT_DIR"
echo ""

# V18.3: رمز رو به stdout چاپ نمی‌کنیم (info leak)
NEW_PASSWORD="admin123"

# تولید هش bcrypt
echo "در حال تولید هش..."

HASH=$(node -e "
const bcrypt = require('./node_modules/bcryptjs');
const hash = bcrypt.hashSync('$NEW_PASSWORD', 10);
process.stdout.write(hash);
" 2>/dev/null)

if [ -z "$HASH" ]; then
    echo "❌ خطا در تولید هش. مطمئن شو node_modules نصب هست:"
    echo "   npm install --legacy-peer-deps"
    exit 1
fi

echo "هش تولید شد."
echo ""

# آپدیت دیتابیس
echo "در حال آپدیت دیتابیس..."
sqlite3 db/custom.db "UPDATE AccessUser SET passwordHash = '$HASH', active = 1 WHERE username = 'admin';" 2>/dev/null

# بررسی
COUNT=$(sqlite3 db/custom.db "SELECT count(*) FROM AccessUser WHERE username = 'admin';" 2>/dev/null)

if [ "$COUNT" = "1" ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ رمز ادمین ریست شد!"
    echo "=========================================="
    echo ""
    echo "  رمز پیش‌فرض تنظیم شد. برای دیدن رمز:"
    echo "    grep NEW_PASSWORD scripts/reset-admin-password.sh"
    echo ""
    echo "  حالا می‌تونی وارد بشی:"
    echo "    URL: http://YOUR_IP:3000/user-login"
    echo "    username: admin"
    echo ""
    echo "  ⚠️ بعد از ورود، از پنل رمز رو عوض کن!"
    echo ""
    echo "=========================================="
else
    echo ""
    echo "❌ کاربر admin پیدا نشد!"
    echo ""
    echo "برای ساخت کاربر admin جدید:"
    echo "  python3 scripts/seed_access_users.py"
    exit 1
fi
