#!/bin/bash
# ============================================================================
# test-clip-update.sh — تست عمل clip.update جدید (v1.0 rev5)
# ============================================================================
# این اسکریپت روی محیط تست /tmp/rbac-test کار می‌کند (بعد از test-harness.sh)
# ۱) سرور را روی :3100 بالا می‌آورد
# ۲) clip.add با order=5 → کلیپ آزمایشی می‌سازد
# ۳) clips.get → id کلیپ را برمی‌دارد
# ۴) clip.update → عنوان و توضیح و ترتیب را عوض می‌کند
# ۵) clips.get → تأیید نهایی که تغییرات اعمال شده
# ۶) clip.delete → پاک‌سازی کلیپ آزمایشی
# ============================================================================
set -eo pipefail
T=/tmp/rbac-test
cd "$T"

MAINT_TOKEN=$(grep "^MAINTENANCE_TOKEN=" .env | sed 's/^MAINTENANCE_TOKEN=//' | tr -d '"' | tr -d '\r\n ')
EDIT_TOKEN=$(grep "^MAINTENANCE_EDIT_TOKEN=" .env | sed 's/^MAINTENANCE_EDIT_TOKEN=//' | tr -d '"' | tr -d '\r\n ')
ENC_KEY=$(grep "^MAINTENANCE_ENC_KEY=" .env | sed 's/^MAINTENANCE_ENC_KEY=//' | tr -d '"' | tr -d '\r\n ')

echo "کلید‌ها: TOKEN=${#MAINT_TOKEN} chars, EDIT=${#EDIT_TOKEN} chars, ENC=${#ENC_KEY} chars"

# راه‌اندازی سرور
DATABASE_URL="file:$T/db/test.db" NODE_ENV=production PORT=3100 HOSTNAME=127.0.0.1 \
  MAINTENANCE_TOKEN="$MAINT_TOKEN" MAINTENANCE_EDIT_TOKEN="$EDIT_TOKEN" MAINTENANCE_ENC_KEY="$ENC_KEY" \
  SESSION_SECRET="test-session-secret-0123456789abcdef0123456789abcdef" TRUST_PROXY=true \
  node server.js > "$T/server-clip.log" 2>&1 &
SRV_PID=$!
trap 'kill $SRV_PID 2>/dev/null || true' EXIT
sleep 4
curl -s -o /dev/null -w "سرور: HTTP %{http_code}\n" http://127.0.0.1:3100/

# تابع ارسال درخواست رمزشده
send() {
    local action_json="$1"
    printf '%s' "$action_json" | node scripts/maintenance-enc.mjs enc "$ENC_KEY" > /tmp/clip-t-body.json
    curl -s -X POST http://127.0.0.1:3100/api/maintenance \
      -H "X-Maintenance-Token: $MAINT_TOKEN" \
      -H "X-Maintenance-Edit-Token: $EDIT_TOKEN" \
      -H "Content-Type: application/json" \
      --data-binary @/tmp/clip-t-body.json > /tmp/clip-t-resp.json
    node scripts/maintenance-enc.mjs dec "$ENC_KEY" "$(cat /tmp/clip-t-resp.json)" 2>/dev/null || cat /tmp/clip-t-resp.json
}

echo ""
echo "=== [۱] clip.add با order=5 ==="
ADD_RESULT=$(send '{"action":"clip.add","title":"کلیپ آزمایشی آپارات","embedCode":"<iframe src=\"https://www.aparat.com/video/video/embed/videohash/test123/vt/frame\" allowfullscreen=\"true\"></iframe>","description":"توضیح اولیه","category":"test","order":5}')
echo "$ADD_RESULT" | head -8
CLIP_ID=$(echo "$ADD_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")
echo "  id کلیپ: $CLIP_ID"

echo ""
echo "=== [۲] clip.update — تغییر عنوان و توضیح و ترتیب ==="
UPD_RESULT=$(send "{\"action\":\"clip.update\",\"id\":\"$CLIP_ID\",\"title\":\"عنوان جدید و قشنگ\",\"description\":\"توضیح جدید و کامل‌تر برای کلیپ\",\"order\":2,\"category\":\"intro\"}")
echo "$UPD_RESULT" | head -10

echo ""
echo "=== [۳] clips.get — تأیید تغییرات ==="
GET_RESULT=$(send '{"action":"clips.get"}')
echo "$GET_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
clips = d.get('data', {}).get('clips', [])
for c in clips:
    if c.get('id') == '$CLIP_ID':
        print(f\"  عنوان: {c['title']}\")
        print(f\"  توضیح: {c['description']}\")
        print(f\"  دسته: {c['category']}\")
        print(f\"  ترتیب: {c['order']}\")
        print(f\"  نمایش: {c['visible']}\")
        break
" 2>/dev/null || echo "$GET_RESULT" | head -20

echo ""
echo "=== [۴] clip.update با فیلد خالی (nothing_to_update انتظار) ==="
EMPTY_RESULT=$(send "{\"action\":\"clip.update\",\"id\":\"$CLIP_ID\"}")
echo "$EMPTY_RESULT" | head -5

echo ""
echo "=== [۵] پاک‌سازی — clip.delete ==="
DEL_RESULT=$(send "{\"action\":\"clip.delete\",\"id\":\"$CLIP_ID\"}")
echo "$DEL_RESULT" | head -5

echo ""
echo "=== نتیجه ==="
if echo "$UPD_RESULT" | grep -q '"ok": *true'; then
    echo "✅ clip.update کار می‌کند"
else
    echo "❌ clip.update مشکل دارد"
fi
