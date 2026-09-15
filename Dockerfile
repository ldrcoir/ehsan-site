# ============================================================================
# Dockerfile — Personal Site (فقط با bun + mirrorهای ایرانی/چینی)
# ============================================================================
# مشکل: registry.npmjs.org روی ایران تحریمه
# حل: چند mirror امتحان می‌کنیم تا یکی کار کنه
# ============================================================================

FROM node:22-slim

# نصب نرم‌افزارهای لازم
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    sqlite3 \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# نصب Bun
RUN npm install -g bun

WORKDIR /app

# کپی package.json و bun.lock
COPY package.json bun.lock* ./

# کپی prisma schema
COPY prisma ./prisma/

# ============================================================================
# نصب وابستگی‌ها با bun — چند mirror امتحان می‌کنیم
# ============================================================================
# ترتیب mirrorها:
#   ۱. registry.npmmirror.com (mirror چین — معمولاً کار می‌کنه)
#   ۲. registry.npm.taobao.org (mirror قدیمی چین)
#   ۳. registry.yarnpkg.com (mirror یونایت)
#   ۴. registry.npmjs.org (رسمی — آخرین تلاش)
# ============================================================================

RUN echo "تلاش ۱: registry.npmmirror.com" && \
    BUN_CONFIG_REGISTRY=https://registry.npmmirror.com \
    bun install --no-audit --no-fund 2>&1 || \
    (echo "تلاش ۲: registry.npm.taobao.org" && \
     BUN_CONFIG_REGISTRY=https://registry.npm.taobao.org \
     bun install --no-audit --no-fund 2>&1) || \
    (echo "تلاش ۳: registry.yarnpkg.com" && \
     BUN_CONFIG_REGISTRY=https://registry.yarnpkg.com \
     bun install --no-audit --no-fund 2>&1) || \
    (echo "تلاش ۴: registry.npmjs.org با timeout طولانی" && \
     BUN_CONFIG_REGISTRY=https://registry.npmjs.org \
     bun install --no-audit --no-fund --timeout 300000 2>&1) || \
    (echo "❌ همه mirrorها شکست خوردن" && exit 1)

# تولید Prisma Client
RUN bunx prisma generate 2>&1 || npx prisma generate

# کپی کل کد
COPY . .

# ساخت پوشه‌ی db
RUN mkdir -p /app/db

# اسکریپت entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
