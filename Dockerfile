# ============================================================================
# Dockerfile — Personal Site (فقط npm، بدون bun — پایدار برای ایران)
# ============================================================================

FROM node:22-slim

# نصب نرم‌افزارهای لازم
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    sqlite3 \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# کپی package.json و bun.lock
COPY package.json bun.lock* ./

# کپی prisma schema
COPY prisma ./prisma/

# ============================================================================
# نصب وابستگی‌ها با npm — چند mirror امتحان می‌کنیم
# ============================================================================
# npm به‌طور پیش‌فرض با Node.js نصبه — همیشه کار می‌کنه
# برای ایران از mirror چین استفاده می‌کنیم
# ============================================================================

# تلاش ۱: mirror چین (معمولاً کار می‌کنه)
RUN npm config set registry https://registry.npmmirror.com && \
    npm install --no-audit --no-fund --timeout=300000 2>&1 || \
    (echo "تلاش ۲: mirror taobao" && \
     npm config set registry https://registry.npm.taobao.org && \
     npm install --no-audit --no-fund --timeout=300000 2>&1) || \
    (echo "تلاش ۳: mirror رسمی با timeout طولانی" && \
     npm config set registry https://registry.npmjs.org && \
     npm install --no-audit --no-fund --timeout=600000 2>&1) || \
    (echo "❌ همه mirrorها شکست خوردن" && exit 1)

# تولید Prisma Client
RUN npx prisma generate 2>&1

# کپی کل کد
COPY . .

# ساخت پوشه‌ی db
RUN mkdir -p /app/db

# اسکریپت entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
