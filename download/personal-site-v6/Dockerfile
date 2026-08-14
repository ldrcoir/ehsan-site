# Dockerfile — Personal Site
FROM node:22-slim
RUN npm install -g bun
RUN apt-get update && apt-get install -y openssl sqlite3 python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock* ./
COPY prisma ./prisma/
RUN bun install
RUN bunx prisma generate
COPY . .
RUN mkdir -p db
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
