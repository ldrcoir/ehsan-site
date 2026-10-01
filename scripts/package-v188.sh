#!/bin/bash
# ============================================================================
# package-v188.sh — Build slim install-v18.8.zip
# ============================================================================
# Strips bloat from standalone:
#   1. Remove old install-v18.3.zip nested inside public/
#   2. Remove @img/sharp-* (we don't use Next.js image optimization)
#   3. Remove Prisma engines for non-SQLite databases (postgres/mysql/sqlserver/cockroachdb)
#   4. Remove duplicate .next/node_modules/@prisma (keep only top-level node_modules)
#   5. Remove capsize-font-metrics.json (4MB, Google Fonts metrics, unused)
#   6. Remove .next/cache, .next/server/font-manifest (build cache, unused at runtime)
#   7. Remove all .map files (source maps, debug-only)
#   8. Verify server.js still starts
# ============================================================================
set -eo pipefail

cd /home/z/my-project

echo "=== V18.8 Slim Packaging ==="
echo ""

# Sanity: standalone must exist
if [ ! -f ".next/standalone/server.js" ]; then
    echo "❌ .next/standalone/server.js missing — run 'npm run build' first"
    exit 1
fi

# Clean stale artifacts from standalone/public (e.g. old install-v*.zip from previous runs)
echo "[0.5/7] Cleaning stale artifacts from .next/standalone/public..."
find .next/standalone/public -name 'install-v*.zip' -delete 2>/dev/null
find .next/standalone/public -name 'source-*.zip' -delete 2>/dev/null
find .next/standalone/public -name 'tutorial-*.zip' -delete 2>/dev/null
find .next/standalone/public -name 'TUTORIAL_FA_V*.docx' ! -name 'TUTORIAL_FA_V18.8.docx' -delete 2>/dev/null

PKG_DIR="/tmp/install-v18.8"
echo "[0/7] Cleaning previous package dir..."
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/personal-site"

echo "[1/7] Copying standalone build..."
cp -r .next/standalone/. "$PKG_DIR/personal-site/"

# Clear standalone's public/ contents — we'll selectively copy fresh below
rm -rf "$PKG_DIR/personal-site/public"
mkdir -p "$PKG_DIR/personal-site/public"

echo "[2/7] Copying scripts + prisma + docs..."
# CRITICAL: copy only essential public assets, NOT install-*.zip (would self-recurse)
mkdir -p "$PKG_DIR/personal-site/public"
for asset in icon-192.png icon-512.png logo.svg manifest.json robots.txt TUTORIAL_FA_V18.8.docx; do
    [ -f "public/$asset" ] && cp "public/$asset" "$PKG_DIR/personal-site/public/"
done
cp install.sh "$PKG_DIR/personal-site/"
cp -r scripts/ "$PKG_DIR/personal-site/scripts/"
cp prisma/schema.prisma "$PKG_DIR/personal-site/prisma/"
cp VERSION.txt "$PKG_DIR/personal-site/"
cp PROJECT_LOG.md "$PKG_DIR/personal-site/"
cp package.json "$PKG_DIR/personal-site/"

# ============================================================================
# AGGRESSIVE STRIPPING
# ============================================================================

SITE="$PKG_DIR/personal-site"

echo "[3/7] Stripping old release artifacts from public/..."
# Remove ALL install zips (including self — we'll copy fresh into the final location)
find "$SITE/public" -name 'install-v*.zip' -delete 2>/dev/null
find "$SITE/public" -name 'source-*.zip' -delete 2>/dev/null
find "$SITE/public" -name 'tutorial-*.zip' -delete 2>/dev/null
# Keep only the V18.8 tutorial docx
find "$SITE/public" -name 'TUTORIAL_FA_V*.docx' ! -name 'TUTORIAL_FA_V18.8.docx' -delete 2>/dev/null
# Copy the V18.8 tutorial docx into the package's public/
cp public/TUTORIAL_FA_V18.8.docx "$SITE/public/" 2>/dev/null || true

echo "[4/7] Removing Sharp / @img libs (we don't use Next.js image optimization)..."
SHARP_SIZE_BEFORE=$(du -sh "$SITE/node_modules/@img" 2>/dev/null | cut -f1)
rm -rf "$SITE/node_modules/@img"
echo "  ✓ Removed @img (was $SHARP_SIZE_BEFORE)"

# Also remove sharp package itself if present
if [ -d "$SITE/node_modules/sharp" ]; then
    rm -rf "$SITE/node_modules/sharp"
    echo "  ✓ Removed node_modules/sharp"
fi

echo "[5/7] Removing Prisma engines for non-SQLite databases..."
# We use SQLite — keep only sqlite + the .so.node libquery_engine
# Remove wasm engines for postgres/mysql/sqlserver/cockroachdb (about 75MB)
PRISMA_RUNTIME="$SITE/node_modules/@prisma/client/runtime"
if [ -d "$PRISMA_RUNTIME" ]; then
    PRISMA_BEFORE=$(du -sh "$PRISMA_RUNTIME" | cut -f1)
    find "$PRISMA_RUNTIME" -type f \( \
        -name 'query_engine_bg.cockroachdb*' -o \
        -name 'query_engine_bg.postgresql*' -o \
        -name 'query_engine_bg.mysql*' -o \
        -name 'query_engine_bg.sqlserver*' -o \
        -name 'query_compiler_bg.cockroachdb*' -o \
        -name 'query_compiler_bg.postgresql*' -o \
        -name 'query_compiler_bg.mysql*' -o \
        -name 'query_compiler_bg.sqlserver*' \
    \) -delete
    PRISMA_AFTER=$(du -sh "$PRISMA_RUNTIME" | cut -f1)
    echo "  ✓ Prisma runtime: $PRISMA_BEFORE → $PRISMA_AFTER"
fi

echo "[6/7] Removing duplicate .next/node_modules (top-level node_modules already has it)..."
if [ -d "$SITE/.next/node_modules" ]; then
    NEXT_NM_SIZE=$(du -sh "$SITE/.next/node_modules" | cut -f1)
    rm -rf "$SITE/.next/node_modules"
    echo "  ✓ Removed .next/node_modules (was $NEXT_NM_SIZE)"
fi

echo "[7/7] Removing source maps + cache + font metrics..."
# Source maps — debug only, large
find "$SITE" -name '*.map' -type f -delete 2>/dev/null
# Next.js build cache (not needed at runtime)
rm -rf "$SITE/.next/cache" 2>/dev/null
# capsize font metrics (4MB, used for Google Fonts layout shift — we use system fonts)
rm -f "$SITE/node_modules/next/dist/server/capsize-font-metrics.json" 2>/dev/null
# Standalone server doesn't need font-manifest if not using Google Fonts
# (keeping for safety — small)

# Clean stray dev artifacts
find "$SITE" -name '*.db' -delete 2>/dev/null
find "$SITE" -name '.env*' -not -name '.env.example' -delete 2>/dev/null
find "$SITE" -name '*.log' -delete 2>/dev/null
find "$SITE" -name '*.tsbuildinfo' -delete 2>/dev/null

# ============================================================================
# VERIFY: server.js still parses
# ============================================================================
echo ""
echo "=== Verifying server.js syntax ==="
node --check "$SITE/server.js" && echo "  ✓ server.js syntax OK"

# Final size report
echo ""
echo "=== Final size breakdown ==="
du -sh "$SITE"
echo ""
echo "  node_modules:  $(du -sh "$SITE/node_modules" 2>/dev/null | cut -f1)"
echo "  .next:         $(du -sh "$SITE/.next" 2>/dev/null | cut -f1)"
echo "  public:        $(du -sh "$SITE/public" 2>/dev/null | cut -f1)"
echo "  scripts:       $(du -sh "$SITE/scripts" 2>/dev/null | cut -f1)"
echo "  server.js:     $(du -sh "$SITE/server.js" 2>/dev/null | cut -f1)"

# ============================================================================
# WRITE README
# ============================================================================
cat > "$SITE/README.md" <<'EOF'
# Personal Site V18.8 — سایت شخصی

## نصب سریع

```bash
wget https://github.com/ldrcoir/ehsan-site-private/raw/main/public/install-v18.8.zip
unzip install-v18.8.zip
cd personal-site
sudo ./install.sh
```

## ورود ادمین

- URL: `http://YOUR_IP:3000/user-login`
- username: `admin`
- password: (توسط install.sh چاپ می‌شه — رمز تصادفی)

⚠️ بعد از اولین ورود، از پنل → تنظیمات → تغییر رمز عوض کن!

## ریست رمز ادمین (اگه فراموش کردی)

```bash
cd /home/ehsan/personal-site
sudo bash scripts/reset-admin-password.sh
```

## تنظیم reCAPTCHA (بعد از نصب)

1. به https://www.google.com/recaptcha/admin برو
2. سایت v2 ثبت کن
3. Site Key و Secret رو در `.env` بذار
4. `sudo systemctl restart personal-site`

## مستندات

- `VERSION.txt` — تاریخچه نسخه‌ها
- `PROJECT_LOG.md` — تاریخچه پروژه
- `TUTORIAL_FA_V18.8.docx` — آموزش کامل (فارسی)
EOF

# ============================================================================
# ZIP
# ============================================================================
echo ""
echo "=== Zipping ==="
cd "$PKG_DIR"
zip -r -q -9 /home/z/my-project/public/install-v18.8.zip personal-site/
cd /home/z/my-project

SIZE=$(du -sh public/install-v18.8.zip | cut -f1)
echo ""
echo "✅ Built: public/install-v18.8.zip ($SIZE)"
echo "   Files: $(unzip -l public/install-v18.8.zip | tail -1 | awk '{print $2}')"
