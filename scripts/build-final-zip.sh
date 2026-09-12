#!/bin/bash
# ============================================================================
# build-final-zip.sh — ساخت فایل zip نهایی با همه چیز داخلش
# ============================================================================

set -e

cd /home/z/my-project

OUTPUT="download/EhsanMorad-site-final.zip"
TMP_DIR="/tmp/ehsanmorad-final"

echo "🧹 Cleaning up..."
rm -rf "$TMP_DIR"
rm -f "$OUTPUT"

echo "📦 Copying source files..."
mkdir -p "$TMP_DIR/personal-site"

# فایل‌های اصلی source
cp -r src/ "$TMP_DIR/personal-site/"
cp -r prisma/ "$TMP_DIR/personal-site/"
cp -r scripts/ "$TMP_DIR/personal-site/"
cp -r public/ "$TMP_DIR/personal-site/"
cp -r mini-services/ "$TMP_DIR/personal-site/" 2>/dev/null || true

# فایل‌های config
cp package.json bun.lock* "$TMP_DIR/personal-site/"
cp next.config.ts tsconfig.json "$TMP_DIR/personal-site/"
cp postcss.config.mjs components.json "$TMP_DIR/personal-site/" 2>/dev/null || true
cp .dockerignore .gitignore "$TMP_DIR/personal-site/" 2>/dev/null || true

# Docker
cp Dockerfile docker-compose.yml docker-entrypoint.sh "$TMP_DIR/personal-site/"
chmod +x "$TMP_DIR/personal-site/docker-entrypoint.sh"

# .env
cat > "$TMP_DIR/personal-site/.env" << 'EOF'
# Database
DATABASE_URL="file:./db/custom.db"

# Server
NODE_ENV="production"
PORT=3000
HOSTNAME="0.0.0.0"

# Session secret (CHANGE THIS to a random string!)
# Generate with: openssl rand -hex 32
SESSION_SECRET="change-this-to-a-random-secret"

# Optional: AI providers (leave empty to use demo mode)
# OPENAI_API_KEY=""
# ANTHROPIC_API_KEY=""
# GROQ_API_KEY=""
# OPENROUTER_API_KEY=""
EOF

# دیتابیس اولیه
mkdir -p "$TMP_DIR/personal-site/db"
cp db/custom.db "$TMP_DIR/personal-site/db/" 2>/dev/null || echo "  (no db, will be created on first run)"

# README
cat > "$TMP_DIR/personal-site/README.md" << 'EOF'
# Personal Site — EhsanMorad

## Quick Start

```bash
# 1. Extract
unzip EhsanMorad-site-final.zip
cd personal-site

# 2. Run with Docker
docker-compose up -d --build

# 3. Wait 60 seconds, then check
curl http://localhost:3000/
# Should return HTTP 200
```

## First Time Setup

### 1. Change SESSION_SECRET (IMPORTANT!)

```bash
# Generate a random secret:
openssl rand -hex 32
# Copy the output, then:
nano .env
# Replace SESSION_SECRET="change-this-to-a-random-secret" with your generated secret
```

Then rebuild: `docker-compose up -d --build`

### 2. Change Admin Password (IMPORTANT!)

- URL: http://localhost:3000#admin (or Ctrl+Shift+A)
- Username: admin
- Password: admin123
- Change password from Settings tab immediately!

### 3. Configure Domains (already done for you)

Your domains are already configured:
- ehsanmorad.ir
- ehsan-morad.ir
- ehsanmorad.id.ir
- 31.70.76.10 (VPS IP)

If you need to add more domains, edit:
- src/app/page.tsx → authorizedDomains array
- src/lib/canvas-protect.ts → AUTHORIZED_DOMAINS array

### 4. Personalize Your Site

Edit src/lib/content.ts:
- handle: your username
- fullName: your name
- tagline: your tagline
- email: your email

Or use admin panel (recommended):
- Content tab: books, articles, tutorials
- Text tab: 36 editable texts
- Themes tab: custom theme builder

## User Login (Access Control)

- URL: http://localhost:3000/user-login
- Admin → Users tab → New User
- Set allowed hours, days, expiry

## AI Chat

The chat works in demo mode by default. To enable real AI:
- Admin → Settings → AI Providers
- Add API key for OpenAI, Anthropic, Groq, or OpenRouter
- Or use local Ollama

## Useful Commands

```bash
docker-compose logs -f          # View logs
docker-compose restart          # Restart site
docker-compose down             # Stop site
docker-compose up -d --build    # Rebuild after changes
```

## Version

V19.3 — 2026-09-03
EOF

echo "📋 Adding Caddyfile..."
cat > "$TMP_DIR/personal-site/Caddyfile" << 'EOF'
# Caddyfile — 3 domains for EhsanMorad
# Place this at /etc/caddy/Caddyfile on your VPS
# Then: sudo systemctl restart caddy

ehsanmorad.ir, www.ehsanmorad.ir {
    reverse_proxy localhost:3000
    encode gzip zstd
}

ehsan-morad.ir, www.ehsan-morad.ir {
    reverse_proxy localhost:3000
    encode gzip zstd
}

ehsanmorad.id.ir, www.ehsanmorad.id.ir {
    reverse_proxy localhost:3000
    encode gzip zstd
}
EOF

echo "📜 Adding setup script..."
cat > "$TMP_DIR/setup.sh" << 'EOF'
#!/bin/bash
# setup.sh — one-command setup for EhsanMorad site on VPS
# Run as root: sudo ./setup.sh

set -e

echo "=========================================="
echo "  EhsanMorad Site Setup"
echo "  IP: 31.70.76.10"
echo "  Domains: ehsanmorad.ir, ehsan-morad.ir, ehsanmorad.id.ir"
echo "=========================================="

# 1. Install Docker
echo "[1/5] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "  ✅ Docker installed"
else
    echo "  ✅ Docker already installed"
fi

# 2. Install Caddy
echo "[2/5] Installing Caddy..."
if ! command -v caddy &> /dev/null; then
    apt update
    apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt update
    apt install -y caddy
    echo "  ✅ Caddy installed"
else
    echo "  ✅ Caddy already installed"
fi

# 3. Configure Caddy
echo "[3/5] Configuring Caddy..."
cp personal-site/Caddyfile /etc/caddy/Caddyfile
systemctl restart caddy
systemctl enable caddy
echo "  ✅ Caddy configured"

# 4. Start site
echo "[4/5] Starting site..."
cd personal-site
docker-compose up -d --build
echo "  Waiting 60 seconds for startup..."
sleep 60
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -q "200"; then
    echo "  ✅ Site is running on localhost:3000"
else
    echo "  ⚠ Check: docker-compose logs -f"
fi
cd ..

# 5. Firewall
echo "[5/5] Setting up firewall..."
apt install -y ufw 2>/dev/null || true
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "  ✅ Firewall configured (ports 22, 80, 443 open)"

# Generate SESSION_SECRET
SECRET=$(openssl rand -hex 32)
cd personal-site
sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=\"$SECRET\"/g" .env
echo ""
echo "=========================================="
echo "  ✅ Setup complete!"
echo "=========================================="
echo ""
echo "  Your sites:"
echo "    https://ehsanmorad.ir"
echo "    https://ehsan-morad.ir"
echo "    https://ehsanmorad.id.ir"
echo ""
echo "  Admin login:"
echo "    https://ehsanmorad.ir#admin"
echo "    username: admin"
echo "    password: admin123"
echo "    ⚠️ Change password from Settings tab!"
echo ""
echo "  Useful commands:"
echo "    cd personal-site && docker-compose logs -f"
echo "    cd personal-site && docker-compose restart"
echo "    sudo systemctl status caddy"
echo ""
echo "=========================================="
EOF
chmod +x "$TMP_DIR/setup.sh"

echo "📄 Adding DNS guide..."
cat > "$TMP_DIR/DNS-SETUP.txt" << 'EOF'
==========================================
  DNS Setup Guide — EhsanMorad
==========================================

Go to your domain registrar (iranserver.com, nic.ir, etc.)
and add these A records for EACH domain:

Domain 1: ehsanmorad.ir
-------------------------------------
  Type:  A
  Name:  @  (or empty)
  Value: 31.70.76.10

  Type:  A
  Name:  www
  Value: 31.70.76.10


Domain 2: ehsan-morad.ir
-------------------------------------
  Type:  A
  Name:  @  (or empty)
  Value: 31.70.76.10

  Type:  A
  Name:  www
  Value: 31.70.76.10


Domain 3: ehsanmorad.id.ir
-------------------------------------
  Type:  A
  Name:  @  (or empty)
  Value: 31.70.76.10

  Type:  A
  Name:  www
  Value: 31.70.76.10


After adding DNS records:
  - Wait 1-24 hours for DNS propagation
  - Check with: dig ehsanmorad.ir
  - Should return: 31.70.76.10

==========================================
EOF

echo "🗜️  Creating zip..."
cd /tmp
zip -r "/home/z/my-project/$OUTPUT" ehsanmorad-final/ -x "*/node_modules/*" "*/.next/*" "*/.git/*" > /dev/null

echo ""
echo "✅ Done!"
echo "   File: $OUTPUT"
ls -lh "/home/z/my-project/$OUTPUT"

# پاک‌سازی
rm -rf "$TMP_DIR"
