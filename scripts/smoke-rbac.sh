// ============================================================================
// smoke-rbac.sh — v1.0
// تست دودی RBAC و کانال نگهداری — ۲۸ چک: سلسله‌مراتب نقش‌ها، immutability مالک،
// ادمین‌سازی فقط توسط مالک، تغییر رمز مالک، توکن ویرایش، export-all.
// ============================================================================

#!/bin/bash
# ============================================================================
# smoke-rbac.sh — تست دودی RBAC و کانال نگهداری (v1.0)
# ============================================================================
# سرور باید روی 127.0.0.1:3100 اجرا شده باشد (بعد از build + seed کاربران تست).
# تست‌ها:
#   1. ورود owner / admin / limited  → کوکی session
#   2. owner لیست کاربران را می‌بیند؛ admin هم می‌بیند؛ limited 401/403 می‌گیرد
#   3. admin نمی‌تواند حساب owner را ویرایش/حذف کند (403 owner_account_immutable)
#   4. admin نمی‌تواند ادمین جدید بسازد (403 only_owner_creates_admin)
#   5. owner نمی‌تواند نقش خودش را تغییر دهد (403 owner_role_immutable)
#   6. owner ادمین می‌سازد و حذف می‌کند (200)
#   7. limited نمی‌تواند کاربر بسازد (401)
#   8. تغییر رمز owner از /api/admin/security کار می‌کند (قبلاً 404 می‌داد!)
#   9. کانال نگهداری: status با توکن؛ texts.set بدون توکن ویرایش → 403؛
#      با توکن ویرایش → 200؛ توکن اشتباه → 401
# ============================================================================

set -u
BASE="http://127.0.0.1:3100"
PASS=0; FAIL=0

say() { echo "— $1"; }
ok()  { PASS=$((PASS+1)); echo "   ✅ $1"; }
bad() { FAIL=$((FAIL+1)); echo "   ❌ $1"; }

check() { # check <desc> <expected> <actual>
  if [ "$2" = "$3" ]; then ok "$1 (=$3)"; else bad "$1 — expected $2, got $3"; fi
}

# ---------- 1) logins ----------
login() { # login <user> <pass> -> cookie file path via $1
  local u=$1 p=$2 f=$3
  local code=$(curl -s -o /tmp/resp.json -w "%{http_code}" -c "$f" -X POST "$BASE/api/user/login" \
    -H "Content-Type: application/json" -H "Origin: $BASE" \
    -d "{\"username\":\"$u\",\"password\":\"$p\"}")
  echo "$code"
}

OW=/tmp/ck_owner.txt; AD=/tmp/ck_admin.txt; LM=/tmp/ck_limited.txt
# idempotent: رمز owner را قبل از هر اجرا به مقدار تست برمی‌گردانیم (تست قبلی عوضش می‌کند)
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.accessUser.update({ where: { username: 'admin' }, data: { passwordHash: bcrypt.hashSync('OwnerPass-1234567890', 12) } }).then(() => db.\$disconnect());
" 2>/dev/null
check "login owner"        200 "$(login admin OwnerPass-1234567890 $OW)"
check "login admin"        200 "$(login testadmin AdminPass-1234567890 $AD)"
check "login limited"      200 "$(login limited UserPass-12345678 $LM)"

# ---------- 2) users list ----------
code() { curl -s -o /tmp/r.json -b "$2" -w "%{http_code}" "$BASE$1"; }
check "GET users (owner)"   200 "$(code /api/admin/users $OW)"
check "GET users (admin)"   200 "$(code /api/admin/users $AD)"
check "GET users (limited)" 401 "$(code /api/admin/users $LM)"

OWNER_ID=$(jq -r '.users[] | select(.username=="admin") | .id' /tmp/r.json 2>/dev/null)
# re-fetch as owner for ids
curl -s -b "$OW" "$BASE/api/admin/users" > /tmp/users.json
OWNER_ID=$(jq -r '.users[] | select(.username=="admin") | .id' /tmp/users.json)
LIMITED_ID=$(jq -r '.users[] | select(.username=="limited") | .id' /tmp/users.json)

# ---------- 3) admin cannot touch owner ----------
check "PUT owner by admin → 403" 403 "$(curl -s -o /tmp/r.json -b "$AD" -w "%{http_code}" -X PUT "$BASE/api/admin/users/$OWNER_ID" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"displayName":"hacked"}')"
check "DELETE owner by admin → 403" 403 "$(curl -s -o /tmp/r.json -b "$AD" -w "%{http_code}" -X DELETE "$BASE/api/admin/users/$OWNER_ID" -H "Origin: $BASE")"
jq -e '.error=="owner_cannot_be_deleted"' /tmp/r.json >/dev/null && ok "error code owner_cannot_be_deleted" || bad "wrong error: $(cat /tmp/r.json)"

# ---------- 4) admin cannot create admin ----------
check "POST admin by admin → 403" 403 "$(curl -s -o /tmp/r.json -b "$AD" -w "%{http_code}" -X POST "$BASE/api/admin/users" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"username":"evil2","password":"AdminPass-99999999","role":"admin"}')"
jq -e '.error=="only_owner_creates_admin"' /tmp/r.json >/dev/null && ok "error code only_owner_creates_admin" || bad "wrong error: $(cat /tmp/r.json)"

# ---------- 5) owner role immutable ----------
check "PUT own role by owner → 403" 403 "$(curl -s -o /tmp/r.json -b "$OW" -w "%{http_code}" -X PUT "$BASE/api/admin/users/$OWNER_ID" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"role":"user"}')"
jq -e '.error=="owner_role_immutable"' /tmp/r.json >/dev/null && ok "error code owner_role_immutable" || bad "wrong error: $(cat /tmp/r.json)"

# ---------- 6) owner creates admin, admin manages limited, delete ----------
NEW_ID=$(curl -s -b "$OW" -X POST "$BASE/api/admin/users" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"username":"tmpadm","password":"TmpAdmin-12345678","role":"admin"}' | jq -r '.user.id // empty')
[ -n "$NEW_ID" ] && ok "owner created admin (tmpadm)" || bad "owner create admin failed: $(cat /tmp/r.json)"
check "DELETE admin by owner → 200" 200 "$(curl -s -o /dev/null -b "$OW" -w "%{http_code}" -X DELETE "$BASE/api/admin/users/$NEW_ID" -H "Origin: $BASE")"

check "PUT limited by admin → 200" 200 "$(curl -s -o /dev/null -b "$AD" -w "%{http_code}" -X PUT "$BASE/api/admin/users/$LIMITED_ID" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"displayName":"LimitedOK"}')"

# ---------- 7) limited cannot create users ----------
check "POST users by limited → 401" 401 "$(curl -s -o /dev/null -b "$LM" -w "%{http_code}" -X POST "$BASE/api/admin/users" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"username":"x1","password":"UserPass-12345678"}')"

# ---------- 8) owner password change (was broken for non-admin roles) ----------
check "change_password owner → 200" 200 "$(curl -s -o /tmp/r.json -b "$OW" -w "%{http_code}" -X POST "$BASE/api/admin/security" -H "Content-Type: application/json" -H "Origin: $BASE" -d '{"action":"change_password","currentPassword":"OwnerPass-1234567890","newPassword":"OwnerPass-New-123456"}')"

# ---------- 9) maintenance channel ----------
MT=$(grep MAINTENANCE_TOKEN= .env | cut -d= -f2- | tr -d '"')
ME=$(grep MAINTENANCE_EDIT_TOKEN= .env | cut -d= -f2- | tr -d '"')
# mreq <json> <with-edit-token: 0|1>
mreq() {
  local json=$1 with=$2
  local args=(-s -o /tmp/m.json -w "%{http_code}" -X POST "$BASE/api/maintenance" \
    -H "X-Maintenance-Token: $MT" -H "Content-Type: application/json" -d "$json")
  [ "$with" = "1" ] && args+=(-H "X-Maintenance-Edit-Token: $ME")
  curl "${args[@]}"
}
check "maintenance status"           200 "$(mreq '{"action":"status"}' 0)"
check "maintenance status bad token" 401 "$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/maintenance" -H "X-Maintenance-Token: WRONGWRONGWRONGWRONGWRONGWRONGWRONGWRONG" -H "Content-Type: application/json" -d '{"action":"status"}')"
check "texts.set WITHOUT edit token → 403" 403 "$(mreq '{"action":"texts.set","key":"hero.greeting","valueFa":"سلام"}' 0)"
check "texts.set WITH edit token → 200" 200 "$(mreq '{"action":"texts.set","key":"hero.greeting","valueFa":"سلام تست"}' 1)"
check "texts.get → 200"              200 "$(mreq '{"action":"texts.get"}' 1)"
jq -e '.data.texts[] | select(.key=="hero.greeting" and .valueFa=="سلام تست")' /tmp/m.json >/dev/null && ok "text really saved" || bad "text not saved: $(cat /tmp/m.json)"
check "settings.set disallowed key → 200 w/ error" 200 "$(mreq '{"action":"settings.set","key":"baleBotToken","value":"x"}' 1)"
jq -e '.data.error=="key_not_allowed"' /tmp/m.json >/dev/null && ok "secret key rejected" || bad "secret key not rejected: $(cat /tmp/m.json)"
check "export-all → 200"             200 "$(mreq '{"action":"export-all"}' 1)"
jq -e '.data.siteTexts' /tmp/m.json >/dev/null && ok "export-all has siteTexts" || bad "export-all broken"

echo ""
echo "==================== PASS=$PASS FAIL=$FAIL ===================="
[ $FAIL -eq 0 ] && echo "ALL GREEN" || echo "SOME FAILED"
