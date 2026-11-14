# ============================================================================
# Dockerfile — Personal Site (فقط npm، بدون bun — پایدار برای ایران)
# v1.1.1 (audit S10-H1/M5/Q2):
#   - build داخل image انجام می‌شود (قبلاً اولین بوت داخل کانتینر build می‌کرد —
#     کند، با root، و «npx next build» خالی standalone را بدون static می‌ساخت)
#   - کانتینر با کاربر node اجرا می‌شود (قبلاً root بود — RCE اپ = root کانتینر)
#   - npm ci به‌جای npm install (lockfile داریم) + حذف bun.lock مرده
#   - HEALTHCHECK در خود image
# نکته‌ی مالکیت: چون کانتینر با uid 1000 (node) اجرا می‌شود، پوشه‌ی ./db روی host
# باید برای uid 1000 قابل نوشتن باشد:   chown -R 1000:1000 db/
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

# کپی package.json + package-lock.json (bun.lock حذف شد — stale)
COPY package.json package-lock.json* ./

# کپی prisma schema
COPY prisma ./prisma/

# ============================================================================
# نصب وابستگی‌ها با npm ci — چند mirror امتحان می‌کنیم
# ============================================================================
RUN npm ci --no-audit --no-fund --timeout=300000 2>/dev/null || \
    (echo "retry: npmmirror" && \
     npm config set registry https://registry.npmmirror.com && \
     npm ci --no-audit --no-fund --timeout=300000) || \
    (echo "retry: official registry" && \
     npm config set registry https://registry.npmjs.org && \
     npm ci --no-audit --no-fund --timeout=600000) || \
    (echo "npm install fallback (no lockfile)" && \
     npm config set registry https://registry.npmjs.org && \
     npm install --no-audit --no-fund --timeout=600000) || \
    (echo "❌ همه mirrorها شکست خوردن" && exit 1)

# تولید Prisma Client
RUN npx prisma generate 2>&1

# کپی کل کد (dockerignore: db/, backups/, .env*, zips — هیچ secret ای اینجا نیست)
COPY . .

# v1.1.1 (S10-M5): build در زمان ساخت image — standalone کامل (با static و public)
RUN npm run build

# پوشه‌ی db + مالکیت برای کاربر node (uid 1000)
RUN mkdir -p /app/db && chown -R node:node /app/db /app/.next \
    # v1.0 (audit W46-50 #11): client پرisma برای node قابل نوشتن — entrypoint's
    # prisma generate دیگر EACCES بی‌صدا نمی‌گیرد
    && chown -R node:node /app/node_modules/.prisma /app/node_modules/@prisma 2>/dev/null || true

USER node

# اسکریپت entrypoint
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/content').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
