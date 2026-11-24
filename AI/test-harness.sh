#!/bin/bash
# ============================================================================
# test-harness.sh — تست کامل rev3 روی بیلد production (v1.0 rev3)
# ============================================================================
# 1) کپی standalone به /tmp/rbac-test
# 2) دیتابیس تست تازه + سه کاربر (owner/admin/limited)
# 3) اجرای سرور روی 127.0.0.1:3100 با MAINTENANCE tokens + ENC key
# 4) smoke-rbac.sh (۲۸ چک RBAC)
# 5) تست کانال رمزنگاری‌شده: status رمز → 200؛ plaintext → 426؛ replay → 400
# ============================================================================
set -eo pipefail
ROOT="/home/z/my-project"
T=/tmp/rbac-test

echo "=== [1] آماده‌سازی محیط تست ==="
rm -rf "$T"
mkdir -p "$T"
cp -a "$ROOT/.next/standalone/." "$T/"
mkdir -p "$T/db" "$T/scripts" "$T/backups"
# اسکریپت‌های لازم
cp "$ROOT/scripts/maintenance.sh" "$ROOT/scripts/maintenance-enc.mjs" "$ROOT/AI/sync-server-to-github.sh" "$ROOT/AI/ai-edit-online.sh" "$ROOT/AI/sync-from-github-to-offline.sh" "$ROOT/AI/apply-snapshot.mjs" "$ROOT/AI/smoke-rbac.sh" "$T/scripts/"
chmod +x "$T"/scripts/*.sh
# v1.0 rev3: bcryptjs — در standalone trace نمی‌آید (فقط اسکریپت‌ها استفاده می‌کنند)
# بدون آن reset/seed رمز ادمین در تست fatal می‌شود
mkdir -p "$T/node_modules"
cp -a "$ROOT/node_modules/bcryptjs" "$T/node_modules/bcryptjs"

# دیتابیس تازه با schema کامل
DATABASE_URL="file:$T/db/test.db" npx prisma db push --skip-generate --schema "$ROOT/prisma/schema.prisma" >/dev/null 2>&1
echo "  ✅ دیتابیس تست ساخته شد"

# سه کاربر تست
DATABASE_URL="file:$T/db/test.db" node - <<'EOF'
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  await db.accessUser.create({ data: {
    username: "admin", passwordHash: bcrypt.hashSync("OwnerPass-1234567890", 12),
    displayName: "Owner", role: "owner", active: true, loginCount: 0, deactivatedReason: "",
  }});
  await db.accessUser.create({ data: {
    username: "testadmin", passwordHash: bcrypt.hashSync("AdminPass-1234567890", 12),
    displayName: "Admin", role: "admin", active: true, loginCount: 0, deactivatedReason: "",
  }});
  await db.accessUser.create({ data: {
    username: "limited", passwordHash: bcrypt.hashSync("UserPass-12345678", 12),
    displayName: "Limited", role: "user", permissions: "messages,clips", active: true, loginCount: 0, deactivatedReason: "",
  }});
  await db.$disconnect();
  console.log("  ✅ سه کاربر تست ساخته شدند");
})();
EOF

# .env تست
MAINT_TOKEN=$(openssl rand -hex 32)
EDIT_TOKEN=$(openssl rand -hex 32)
ENC_KEY=$(openssl rand -hex 32)
cat > "$T/.env" <<EOF
DATABASE_URL="file:$T/db/test.db"
NODE_ENV="production"
PORT=3100
HOSTNAME="127.0.0.1"
SESSION_SECRET="test-session-secret-0123456789abcdef0123456789abcdef"
BALE_WEBHOOK_SECRET="bale-test-secret-0123456789abcdef0123"
TELEGRAM_WEBHOOK_SECRET="tg-test-secret-0123456789abcdef012345"
MAINTENANCE_TOKEN="$MAINT_TOKEN"
MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN"
MAINTENANCE_ENC_KEY="$ENC_KEY"
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3100"
TRUST_PROXY="true"
EOF
chmod 600 "$T/.env"

echo "=== [2] اجرای سرور تست روی :3100 ==="
cd "$T"
# v1.0 rev3: هر سرور قدیمی روی 3100 باید کشته شود — next-server نام پروسس را
# عوض می‌کند (next-server (v1...)) و pkill -f "node server.js" نمی‌گیردش؛
# با PID پورت می‌کشیم وگرنه همه‌ی تست‌ها به سرور کهنه می‌خورند
OLDPID=$(ss -tlnp 2>/dev/null | grep ':3100 ' | grep -oP 'pid=\K[0-9]+' | head -1 || true)
if [ -n "$OLDPID" ]; then
    echo "  ⏳ کشتن سرور کهنه روی 3100 (pid=$OLDPID)"
    kill "$OLDPID" 2>/dev/null || true
    sleep 1
    kill -9 "$OLDPID" 2>/dev/null || true
fi
sleep 1
PORT=3100 HOSTNAME=127.0.0.1 DATABASE_URL="file:$T/db/test.db" NODE_ENV=production node server.js > "$T/server.log" 2>&1 &
SRV_PID=$!
trap 'kill $SRV_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://127.0.0.1:3100/ ; then break; fi
  sleep 0.5
done
if grep -q "EADDRINUSE" "$T/server.log" 2>/dev/null; then
  echo "  ❌ پورت 3100 همچنان اشغال است — سرور کهنه کشته نشد"
  exit 1
fi
curl -s -o /dev/null -w "  سرور: HTTP %{http_code}\n" http://127.0.0.1:3100/

echo ""
echo "=== [3] smoke-rbac (۲۸ چک) ==="
cd "$T"
export DATABASE_URL="file:$T/db/test.db"
# توکن‌های نگهداری هم لازمند — smoke چک‌های کانال دارد
export MAINTENANCE_TOKEN="$MAINT_TOKEN" MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN" MAINTENANCE_ENC_KEY="$ENC_KEY"
bash scripts/smoke-rbac.sh || true

echo ""
echo "=== [4] کانال رمزنگاری‌شده (v1.0 rev3) ==="
cd "$T"
export MAINTENANCE_TOKEN="$MAINT_TOKEN" MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN" MAINTENANCE_ENC_KEY="$ENC_KEY" MAINTENANCE_URL="http://127.0.0.1:3100"

echo "--- 4a) status با رمز (انتظار: ok=true و decrypt خودکار) ---"
bash scripts/maintenance.sh status > /tmp/enc-status.json 2>&1 && grep -q '"ok"[[:space:]]*:[[:space:]]*true' /tmp/enc-status.json && echo "  ✅ status رمزشده موفق (پاسخ خودکار decrypt شد)" || { echo "  ❌ status رمزشده شکست:"; head -5 /tmp/enc-status.json; }

echo "--- 4b) درخواست plaintext وقتی کلید هست (انتظار: 426) ---"
PLAIN=$(curl -s -o /tmp/plain-resp.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "Content-Type: application/json" -d '{"action":"status"}')
[ "$PLAIN" = "426" ] && echo "  ✅ plaintext رد شد (426 encryption_required)" || echo "  ❌ انتظار 426 بود، شد $PLAIN"

echo "--- 4c) replay پاکت رمز (انتظار: بار اول 200، بار دوم enc_replay_detected) ---"
node scripts/maintenance-enc.mjs enc "$ENC_KEY" '{"action":"status"}' > /tmp/replay-body.json
REPLAY1=$(curl -s -o /tmp/replay-resp.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "Content-Type: application/json" --data-binary @/tmp/replay-body.json)
REPLAY2=$(curl -s -o /tmp/replay-resp2.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "Content-Type: application/json" --data-binary @/tmp/replay-body.json)
node scripts/maintenance-enc.mjs dec "$ENC_KEY" "$(cat /tmp/replay-resp2.json)" > /tmp/replay-dec.json 2>/dev/null || cp /tmp/replay-resp2.json /tmp/replay-dec.json
if grep -q "enc_replay_detected" /tmp/replay-dec.json; then
  echo "  ✅ replay رد شد (بار اول $REPLAY1، بار دوم $REPLAY2 → enc_replay_detected)"
else
  echo "  ❌ replay رد نشد! بار اول=$REPLAY1 بار دوم=$REPLAY2 پاسخ:"; head -3 /tmp/replay-dec.json
fi

echo "--- 4d) ts کهنه (انتظار: enc_stale_timestamp) ---"
OLD=$(node -e "
const {createCipheriv, randomBytes} = require('crypto');
const key = Buffer.from('$ENC_KEY','hex');
const payload = JSON.stringify({ts: Date.now() - 700000, n: randomBytes(16).toString('hex'), action:'status'});
const iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([c.update(payload,'utf8'), c.final()]);
process.stdout.write(JSON.stringify({enc:'v1', data: Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64')}));
")
OLDRES=$(curl -s -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "Content-Type: application/json" -d "$OLD")
echo "$OLDRES" | grep -q "enc_stale_timestamp" && echo "  ✅ ts کهنه رد شد" || { echo "  ❌ ts کهنه رد نشد: $OLDRES"; }

echo "--- 4e) export-all رمزشده (برای sync آفلاین) ---"
bash scripts/maintenance.sh export-all > /tmp/enc-export.json 2>&1 && grep -q '"ok"[[:space:]]*:[[:space:]]*true' /tmp/enc-export.json && grep -q '"siteTexts"' /tmp/enc-export.json && echo "  ✅ export-all رمزشده موفق" || { echo "  ❌ export-all شکست:"; head -3 /tmp/enc-export.json; }

echo ""
echo "=== [5] v1.0 rev5 — AI-bind + IP allowlist ==="
cd "$T"

echo "--- 5a) status بدون EDIT_TOKEN وقتی AI_BIND=1 نیست (legacy — انتظار: ok=true) ---"
unset MAINTENANCE_AI_BIND
bash scripts/maintenance.sh status > /tmp/legacy-status.json 2>&1
grep -q '"ok"[[:space:]]*:[[:space:]]*true' /tmp/legacy-status.json && echo "  ✅ legacy mode بدون EDIT_TOKEN موفق" || { echo "  ❌ legacy شکست:"; head -3 /tmp/legacy-status.json; }

echo "--- 5b) status بدون EDIT_TOKEN وقتی AI_BIND=1 (انتظار: 403 edit_token_required) ---"
# سرور را با AI_BIND=1 ری‌استارت کن
kill $SRV_PID 2>/dev/null || true
sleep 1
MAINTENANCE_AI_BIND=1 PORT=3100 HOSTNAME=127.0.0.1 DATABASE_URL="file:$T/db/test.db" NODE_ENV=production \
    MAINTENANCE_TOKEN="$MAINT_TOKEN" MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN" MAINTENANCE_ENC_KEY="$ENC_KEY" \
    TRUST_PROXY=true \
    node server.js > "$T/server-aibind.log" 2>&1 &
SRV_PID=$!
for i in $(seq 1 20); do
  curl -s -o /dev/null http://127.0.0.1:3100/ 2>/dev/null && break
  sleep 0.5
done
# درخواست status بدون EDIT_TOKEN → باید 403
NOEDIT_BODY=$(node scripts/maintenance-enc.mjs enc "$ENC_KEY" '{"action":"status"}')
NOEDIT_CODE=$(curl -s -o /tmp/no-edit-resp.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "Content-Type: application/json" --data-binary "$(printf '%s' "$NOEDIT_BODY")")
node scripts/maintenance-enc.mjs dec "$ENC_KEY" "$(cat /tmp/no-edit-resp.json)" > /tmp/no-edit-dec.json 2>/dev/null || cp /tmp/no-edit-resp.json /tmp/no-edit-dec.json
if [ "$NOEDIT_CODE" = "403" ] && grep -q "edit_token_required" /tmp/no-edit-dec.json; then
    echo "  ✅ AI-bind بدون EDIT_TOKEN رد شد (403 edit_token_required)"
else
    echo "  ❌ انتظار 403 + edit_token_required بود، شد $NOEDIT_CODE — پاسخ:"; head -3 /tmp/no-edit-dec.json
fi

echo "--- 5c) status با EDIT_TOKEN در AI_BIND=1 (انتظار: ok=true) ---"
bash scripts/maintenance.sh --ai-bind status > /tmp/aibind-status.json 2>&1
grep -q '"ok"[[:space:]]*:[[:space:]]*true' /tmp/aibind-status.json && echo "  ✅ AI-bind با EDIT_TOKEN موفق" || { echo "  ❌ AI-bind شکست:"; head -3 /tmp/aibind-status.json; }

echo "--- 5d) IP allowlist با IP مجاز (انتظار: ok=true) ---"
# سرور را با IP allowlist فقط 127.0.0.1 ری‌استارت کن
kill $SRV_PID 2>/dev/null || true
sleep 1
MAINTENANCE_IP_ALLOWLIST="127.0.0.1" PORT=3100 HOSTNAME=127.0.0.1 DATABASE_URL="file:$T/db/test.db" NODE_ENV=production \
    MAINTENANCE_TOKEN="$MAINT_TOKEN" MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN" MAINTENANCE_ENC_KEY="$ENC_KEY" \
    TRUST_PROXY=true \
    node server.js > "$T/server-ip.log" 2>&1 &
SRV_PID=$!
for i in $(seq 1 20); do
  curl -s -o /dev/null http://127.0.0.1:3100/ 2>/dev/null && break
  sleep 0.5
done
# X-Forwarded-For: 127.0.0.1 → باید ok
ALLOW_BODY=$(node scripts/maintenance-enc.mjs enc "$ENC_KEY" '{"action":"status"}')
ALLOW_CODE=$(curl -s -o /tmp/allow-resp.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "X-Forwarded-For: 127.0.0.1" -H "Content-Type: application/json" --data-binary "$(printf '%s' "$ALLOW_BODY")")
[ "$ALLOW_CODE" = "200" ] && echo "  ✅ IP مجاز قبول شد (200)" || { echo "  ❌ انتظار 200 بود، شد $ALLOW_CODE"; head -3 /tmp/allow-resp.json; }

echo "--- 5e) IP allowlist با IP غیرمجاز (انتظار: 403 forbidden) ---"
BLOCK_BODY=$(node scripts/maintenance-enc.mjs enc "$ENC_KEY" '{"action":"status"}')
BLOCK_CODE=$(curl -s -o /tmp/block-resp.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "X-Forwarded-For: 8.8.8.8" -H "Content-Type: application/json" --data-binary "$(printf '%s' "$BLOCK_BODY")")
if [ "$BLOCK_CODE" = "403" ] && grep -q "forbidden" /tmp/block-resp.json; then
    echo "  ✅ IP غیرمجاز رد شد (403 forbidden)"
else
    echo "  ❌ انتظار 403 + forbidden بود، شد $BLOCK_CODE — پاسخ:"; head -3 /tmp/block-resp.json
fi

echo "--- 5f) CIDR تطبیق (198.51.100.0/24 با 198.51.100.50 → انتظار: 200) ---"
# ری‌استارت با CIDR
kill $SRV_PID 2>/dev/null || true
sleep 1
MAINTENANCE_IP_ALLOWLIST="198.51.100.0/24,127.0.0.1" PORT=3100 HOSTNAME=127.0.0.1 DATABASE_URL="file:$T/db/test.db" NODE_ENV=production \
    MAINTENANCE_TOKEN="$MAINT_TOKEN" MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN" MAINTENANCE_ENC_KEY="$ENC_KEY" \
    TRUST_PROXY=true \
    node server.js > "$T/server-cidr.log" 2>&1 &
SRV_PID=$!
for i in $(seq 1 20); do
  curl -s -o /dev/null http://127.0.0.1:3100/ 2>/dev/null && break
  sleep 0.5
done
CIDR_BODY=$(node scripts/maintenance-enc.mjs enc "$ENC_KEY" '{"action":"status"}')
CIDR_CODE=$(curl -s -o /tmp/cidr-resp.json -w "%{http_code}" -X POST http://127.0.0.1:3100/api/maintenance \
  -H "X-Maintenance-Token: $MAINT_TOKEN" -H "X-Forwarded-For: 198.51.100.50" -H "Content-Type: application/json" --data-binary "$(printf '%s' "$CIDR_BODY")")
[ "$CIDR_CODE" = "200" ] && echo "  ✅ CIDR تطبیق کرد (198.51.100.50 داخل 198.51.100.0/24)" || { echo "  ❌ انتظار 200 بود، شد $CIDR_CODE"; head -3 /tmp/cidr-resp.json; }

echo "--- 5g) sync-server-to-github.sh syntax check ---"
bash -n scripts/sync-server-to-github.sh && echo "  ✅ sync-server-to-github.sh syntax ok" || echo "  ❌ syntax خطا"

echo "--- 5h) ai-edit-online.sh syntax check ---"
bash -n scripts/ai-edit-online.sh && echo "  ✅ ai-edit-online.sh syntax ok" || echo "  ❌ syntax خطا"

echo "--- 5i) sync-from-github-to-offline.sh syntax check ---"
bash -n scripts/sync-from-github-to-offline.sh && echo "  ✅ sync-from-github-to-offline.sh syntax ok" || echo "  ❌ syntax خطا"

echo "--- 5j) apply-snapshot.mjs syntax check ---"
node -c scripts/apply-snapshot.mjs && echo "  ✅ apply-snapshot.mjs syntax ok" || echo "  ❌ syntax خطا"

echo ""
echo "=== نتیجه ==="
echo "تست کامل شد — لاگ سرور: $T/server.log"
echo "  rev3 کانال رمز: 4a/4b/4c/4d/4e"
echo "  rev5 AI-bind + IP allowlist: 5a/5b/5c/5d/5e/5f/5g/5h/5i/5j"
