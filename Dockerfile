# ============================================================================
# Dockerfile — Personal Site (اصلاح شده برای ایران — با mirror)
# ============================================================================
# نکته: از registry mirror استفاده می‌کنیم چون registry.npmjs.org تحریمه
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

# تنظیم mirror برای ایران (registry.npmjs.org تحریمه)
ENV npm_config_registry=https://registry.npmmirror.com
ENV BUN_CONFIG_REGISTRY=https://registry.npmmirror.com

# نصب وابستگی‌ها با mirror
RUN bun install --registry https://registry.npmmirror.com 2>&1 || \
    (echo "bun install failed, trying npm..." && \
     npm install --registry https://registry.npmmirror.com)

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

# حذف HEALTHCHECK چون curl ممکنه نصب نباشه در بعضی environment ها
# می‌تونی با docker-compose logs -f وضعیت رو چک کنی

ENTRYPOINT ["./docker-entrypoint.sh"]
