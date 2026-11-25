# Rahnama-ye Nashr va Hamgasazi-e Seh-Layehe (v1.0 rev5)

> Bara-ye Ehsan Morad (ehsanmorad.ir) — VPS 31.70.76.10, GitHub: ldrcoir/ehsan-site
> Ham-e-ye matn be Finglish (Farsi baa horoof-e Latini) ta shoma betavanid bekhoonid.

---

## 0. Sakhtar-e Jadid-e Repo (v1.0 rev5)

Qabl az in, hameh file-ha dar risheh asli (root) budand ke ashgoft kar mikard. Hala repo be seh posheh-e asasi morattab shode:

```
ehsan-site/                    ← risheh asli
├── EMA/                       ← posheh-ye karbar (chiz-ha-ye ke shoma mikhohid)
│   ├── VERSION.txt            ← tarikhche-ye version-ha + taghirat
│   ├── STATE.md               ← hol-e seh laayeheh (version/tarikh/hash)
│   ├── AUDIT-REPORT-v1.0.md   ← gozaresh-e momtazi-e amniyati
│   ├── PROJECT_LOG.md         ← log-e tamami-e project
│   ├── DEPLOYMENT-GUIDE-FA-v5.md  ← in file-e khod-e
│   └── deployment/            ← pakejh-e nasb-e mofassal
│       ├── 01-UPLOAD-ZIP/     ← pakejh-e nasb-e server (tanha zip-e rasmi)
│       ├── 02-Rahnama-ye-Nasb.docx
│       ├── 03-Rahnama-ye-Vasl-e-AI.docx
│       ├── 04-Rahnama-ye-Agent-Arzontar.docx
│       ├── 05-CHEAT-SHEET.txt
│       └── README.md
│
├── AI/                        ← posheh-ye AI (kar-ha-ye dakheli-e AI)
│   ├── push-to-github.sh      ← push-e code be GitHub
│   ├── package-v1.1.sh        ← sakht-e pakejh-e nasb
│   ├── test-harness.sh        ← 43 test-e kamel
│   ├── smoke-rbac.sh          ← 28 test-e RBAC
│   ├── ai-edit-online.sh      ← virayesh online + sync khodkar
│   ├── sync-server-to-github.sh    ← server state → GitHub
│   ├── sync-from-github-to-offline.sh  ← GitHub → offline local
│   ├── apply-snapshot.mjs     ← apply snapshot.json dar database-e local
│   └── docgen/                ← tolid-e document-ha (tutorial, audit)
│
├── scripts/                   ← script-ha-ye ke dar server runtime run mishavand
│   ├── maintenance.sh         ← client-e kanal-e maintenance
│   ├── maintenance-enc.mjs    ← ramz kardan/baz kardan-e AES-256-GCM
│   ├── auto-backup.sh         ← backup-e shabaneh
│   ├── export-site.sh         ← export-e data
│   ├── import-site.sh         ← import-e data
│   ├── restore-db.sh          ← restore-e database
│   ├── reset-admin-password.sh ← reset-e password-e admin
│   ├── apply_schema.py        ← apply-e schema be DB
│   └── seed_*.py              ← seed-e data-ye avali-ye
│
├── src/                       ← sors-e Next.js 16
├── prisma/                    ← schema-e database
├── public/                    ← icon-ha, manifest, robots
├── install.sh                 ← script-e nasb-e server
├── Dockerfile, docker-compose.yml, Caddyfile, nginx-ehsanmorad.conf
├── package.json, tsconfig.json, next.config.ts
└── .gitignore, .dockerignore
```

**Chiz-ha-ye ke az repo hazf shodand (qadimi va be-dard nakhordan):**
- `scripts/sync-from-online.sh` — superseded by `AI/sync-from-github-to-offline.sh`
- `scripts/apply-online-export.mjs` — superseded by `AI/apply-snapshot.mjs`
- `scripts/package-v1.sh` — superseded by `AI/package-v1.1.sh`
- `scripts/package-dated.sh` — superseded by `AI/package-v1.1.sh` (RELEASE_OUT)
- `scripts/generate_tutorial_v1_1.py` — bara-ye v1.1-e qadimi bud
- `scripts/list_messages.py` — abzar-e debug-e mostaghim-e DB
- `scripts/add-persian-comments.py` — abzar-e yek-bar-masraf
- Tamami-e zip-ha-ye qadimi-e v17/v18 az tarikhche-e git paak shodand (filter-repo)

---

## 1. Kholase-ye Chehrey-e Harekat

Seh laayeheh dar site-e shoma vojood darand ke bayad yeki bashand:

```
   ┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
   │  Online Server   │ ←─── │  GitHub Repo      │ ───→ │  Offline Local  │
   │  (VPS 31.70.76.10)│      │  (ldrcoir/ehsan-site)│    │  (laptop-e shoma)│
   └─────────────────┘       └──────────────────┘       └─────────────────┘
        ↑                            ↑                          ↑
        │                            │                          │
   AI yek virayesh             automatic sync               git pull +
   mikonad (kanal-e           ba sync-server-to-           apply-snapshot
   maintenance)               github.sh                    az snapshot.json
```

**Qavanin-e asasi:**
- Har taghiri ke online anjam mishe, baed az an be GitHub sync mishe
- Local-e shoma az GitHub snapshot ra migirad va dar database-e local apply mikonad
- Hich-taghi-ei be mostaghim az local be server nemire (hamesha az tarigh-e GitHub ya kanal-e maintenance)

---

## 2. Abzar-ha-ye Jadid (v1.0 rev5)

### 2.1. Kanal-e Maintenance ba 4 laayeheh amniyati

| Laayeheh | Moteghayer-e .env | Tawzeeh |
|----------|------------------|---------|
| 1. IP Allowlist | `MAINTENANCE_IP_ALLOWLIST` | Faghat IP haye mashin-e AI (ya CIDR) ghabel-e vasl shodan |
| 2. Read Token | `MAINTENANCE_TOKEN` | Bara-ye khondan-e status, messages, db-stats, ... |
| 3. Edit Token | `MAINTENANCE_EDIT_TOKEN` | Bara-ye virayesh-e matn, clips, nav, settings, ... |
| 4. Encryption | `MAINTENANCE_ENC_KEY` | AES-256-GCM bara-ye ramz kardan-e request + response |

**Bonz-e khabari:** Hata agar yeki 3 ta az in 4 laayeheh ra dashteh bashe, faghat ba tavajoh be IP mishe vasl shod. Yani agar IP-e khareji-e AI shoma ba set-e dade-ye shoma che-megardad:

```bash
# Bare-e didan-e IP-e khareji-e khodetoon (az kharej-e Iran):
curl -s https://api.ipify.org
# ya
curl -s https://ifconfig.me
```

### 2.2. Halat-e AI-Bind (Faghat Man)

Agar `MAINTENANCE_AI_BIND=1` dar .env bashad, hata action-ha-ye khoondan (status, db-stats, messages, ...) ham niaz be **Edit Token** darand. Yani faghat kasi ke Edit Token ra darad mishe chizi bebineh.

### 2.3. Script-ha-ye Jadid

| Script | Posheh | Kar |
|--------|--------|-----|
| `sync-server-to-github.sh` | `AI/` | Export-e server state + commit + push be GitHub (shakhe-ye `server-state`) |
| `ai-edit-online.sh` | `AI/` | Virayesh az tarigh-e kanal + sync-e automatic be GitHub |
| `sync-from-github-to-offline.sh` | `AI/` | Snapshot az GitHub begir + dar database-e local apply kon |
| `apply-snapshot.mjs` | `AI/` | apply-e snapshot.json be database-e local (upsert by id/key) |

**Tavajjoh:** Dar pakejh-e nasb-e server (zip), hameh in script-ha dar `scripts/` gharar migirand ta installer peydashan konad. Vali dar repo-ye development, AI-ha dar `AI/` va script-ha-ye runtime dar `scripts/` hastand.

---

## 3. Marahele Nasb-e Avvali-e VPS

### 3.1. Backup az Server-e Qabli

```bash
ssh root@31.70.76.10
cd /home/ehsan/personal-site
# Backup kamel az site-e feli
tar -czf /root/backup-pre-rev5-$(date +%Y%m%d).tar.gz .
# Backup az database
sqlite3 db/custom.db ".backup '/root/custom-db-pre-rev5-$(date +%Y%m%d).db'"
```

### 3.2. Upload-e Zip-e Jadid be Server

```bash
# Az local (laptop-e shoma):
scp EMA/deployment/01-UPLOAD-ZIP/ehsan-site-v1.0-rev5-1405-09-05.zip root@31.70.76.10:/root/

# Dar server:
ssh root@31.70.76.10
mkdir -p /home/ehsan/personal-site-rev5
cd /home/ehsan/personal-site-rev5
unzip -q /root/ehsan-site-v1.0-rev5-1405-09-04.zip
cd personal-site
```

### 3.3. Nasb ba Flag-ha-ye AI-Bind

```bash
# Avval IP-e khareji-e khod ra peyda kon (ba proxy ya VPN ke baraye AI estefadeh mishavad)
# Farz mikonim: 203.0.113.42

sudo ./install.sh --ai-bind --ip-allowlist "203.0.113.42"
```

In kar:
- `MAINTENANCE_AI_BIND=1` dar .env set mishavad
- `MAINTENANCE_IP_ALLOWLIST="203.0.113.42"` dar .env set mishavad
- Hame-ye token-ha (TOKEN, EDIT_TOKEN, ENC_KEY) automatic tolid mishavand
- Nginx + systemd + cron backup nasb mishavand

### 3.4. Test-e Kanal-e Maintenance az AI

```bash
# Dar server (az local be server vasl mishim):
export MAINTENANCE_TOKEN=$(grep "^MAINTENANCE_TOKEN=" /home/ehsan/personal-site-rev5/.env | cut -d'=' -f2- | tr -d '"')
export MAINTENANCE_EDIT_TOKEN=$(grep "^MAINTENANCE_EDIT_TOKEN=" /home/ehsan/personal-site-rev5/.env | cut -d'=' -f2- | tr -d '"')
export MAINTENANCE_ENC_KEY=$(grep "^MAINTENANCE_ENC_KEY=" /home/ehsan/personal-site-rev5/.env | cut -d'=' -f2- | tr -d '"')
export MAINTENANCE_URL="http://127.0.0.1:3000"

cd /home/ehsan/personal-site-rev5/personal-site

# Test:
bash scripts/maintenance.sh --ai-bind status
```

Bayad natije-ye mesle in begirid:
```json
{
  "ok": true,
  "action": "status",
  "data": {
    "version": "1.0",
    "uptimeSeconds": 42,
    "counts": { ... }
  }
}
```

### 3.5. Push-e Nakha-ye rev5 be GitHub

Az laptop-e shoma (ke token darad):

```bash
cd /home/z/my-project
# Token azlan dar file-e .gh-token zakhireh shode (chmod 600)
bash AI/push-to-github.sh
```

In kar hame-ye taghirat-e rev5 ra be `github.com/ldrcoir/ehsan-site` push mikone.

---

## 4. Workflow-e Har Rooz (Bara-ye AI)

### 4.1. Virayesh-e Online + Automatic Sync

Yek farman — AI yek taghir online anjam midahad va automatic be GitHub sync mishavad:

```bash
# Misal: taghir-e matn-e hero.greeting
bash scripts/ai-edit-online.sh texts.set --data '{
  "key": "hero.greeting",
  "valueFa": "Salam, man Ehsan Morad hastam",
  "valueEn": "Hello, I am Ehsan Morad",
  "valueDe": "Hallo, ich bin Ehsan Morad"
}'
```

In yek farman:
1. `texts.set` ra az tarigh-e kanal-e maintenance (ramz shode) anjam midahad
2. Agar movaffagh shod, `sync-server-to-github.sh` ra seda mizanad
3. Snapshot-e jadid dar `server-state/snapshot.json` commit mishavad
4. Be shakhe-ye `server-state` dar GitHub push mishavad

Natije: taghir dar **online server** va **GitHub repo** hamzaman hast. Offline local baed az `sync-from-github-to-offline.sh` be hamoon vaziat mirasad.

### 4.2. List-e Tamam-e Action-ha-ye Virayeshi

```bash
# Khondan-e hame-ye matn-ha
bash scripts/ai-edit-online.sh texts.get

# Khondan-e hame-ye clips
bash scripts/ai-edit-online.sh clips.get

# Ezafeh kardan-e clip-e jadid
bash scripts/ai-edit-online.sh clip.add --data '{
  "title": "Moqaddeme-ye Azmayeshgah",
  "embedCode": "<iframe src=\"https://www.aparat.com/video/...\" ...></iframe>",
  "category": "intro",
  "visible": true
}'

# Ezafeh kardan-e link be menu
bash scripts/ai-edit-online.sh nav.add --data '{
  "labelFa": "Blog",
  "labelEn": "Blog",
  "labelDe": "Blog",
  "href": "/blog",
  "target": "_self",
  "visible": true
}'

# Taghir-e visible-e yek clip
bash scripts/ai-edit-online.sh clip.set-visible --data '{"id":"<clip-id>","visible":false}'

# Taghir-e status-e yek dastgah-e azmayeshgah
bash scripts/ai-edit-online.sh equipment.set --data '{"id":"<device-id>","status":"maintenance"}'

# Taghir-e contact email
bash scripts/ai-edit-online.sh settings.set --data '{"key":"contact_email","value":"info@ehsanmorad.ir"}'

# Backup-e fori-e database
bash scripts/ai-edit-online.sh backup
```

### 4.3. Sync Manual (Bedoon-e Virayesh)

```bash
# Faghat sync-e hal-e server be GitHub (bedoon-e taghir):
bash scripts/sync-server-to-github.sh
```

### 4.4. Khordan-e Taghirat az GitHub be Local (Offline Sync)

```bash
# Dar laptop-e shoma (offline):
cd /home/z/my-project

# Yek farman — snapshot az GitHub begir dar database-e local apply kon:
bash AI/sync-from-github-to-offline.sh

# Ya faghat bbin bedoon-e apply (dry-run):
bash AI/sync-from-github-to-offline.sh --dry-run
```

In farman:
1. `git fetch origin server-state` mikoneh
2. `server-state/snapshot.json` ra az GitHub extract mikoneh
3. `node AI/apply-snapshot.mjs` ra seda mizaneh ke hame-ye record-ha ra dar database-e local upsert mikoneh

**Javabe-ha-ye sync shavand:**
- SiteText (by key), SiteSetting (by key — bot tokens maaask shode rad mishavand)
- NavItem, AparatClip, LabEquipment, Book, Article, Tutorial, Skill, CustomTheme (all by id)

**Javabe-ha-ye sync NEMISHAVAND (data-e khosusi):**
- ContactMessage, ChatSession, ChatMessage (payam-ha-ye karbaran)
- AccessUser (shamel-e passwordHash)
- AiProvider (shamel-e API keys)
- AccessLog, SecurityLog, PageView, BlockedIp (log-ha va analytics)

**Tavajjoh:** Bot tokens dar snapshot hamesheh maaask shode-hastand (mesl-e `••••••••abcd`) chon GitHub repo public ast. Bara-ye inke offline ham bot-ha kaar konand, bayad token-ha-ye vaghei ra manually dar local config dahid (ya az yek backup-e amn copy konid).

### 4.5. Verify-e Offline == Online

Bara-ye motalae-e inke offline daghighan mesl-e online ast:

```bash
# Dar offline — snapshot az GitHub begir:
bash AI/sync-from-github-to-offline.sh

# Baad server-e local ro run kon:
cd /home/z/my-project
npm run dev

# Dar browser: http://localhost:3000
# Hame-ye matn-ha, clips, nav, equipment bayad hamoon online bashand
```

Agar yek taghir-e virayeshi dar offline bedid va mikhohid online ham besheh, az tarigh-e kanal-e maintenance anjam bedid (na mostaghim dar database-e local):

```bash
bash scripts/ai-edit-online.sh texts.set --data '{"key":"hero.title","valueFa":"عنوان جدید"}'
```

In kar taghir ro dar online server anjam midahad + automatic snapshot be GitHub push mishavad + shoma mitonid dar offline `sync-from-github-to-offline.sh` run konid ta hamoon taghir ra be-bryd.

---

## 5. Cron Job Bara-ye Sync-e Khodkar

Bara-ye inke server har chand saat yek bar automatic be GitHub sync shavad:

```bash
ssh root@31.70.76.10
crontab -e
```

In khat ra ezafeh konid (har 6 saat yek bar):

```
0 */6 * * * cd /home/ehsan/personal-site-rev5/personal-site && bash scripts/sync-server-to-github.sh >> /var/log/ehsan-sync.log 2>&1
```

**Tavajjoh:** Bara-ye inke cron betavanad push konad, bayad GH_TOKEN dar env-e cron bashad:

```bash
# Dar /root/.sync-env (ba chmod 600):
echo 'GH_TOKEN=<token-e shoma>' > /root/.sync-env
chmod 600 /root/.sync-env

# Dar crontab:
0 */6 * * * . /root/.sync-env && cd /home/ehsan/personal-site-rev5/personal-site && bash scripts/sync-server-to-github.sh >> /var/log/ehsan-sync.log 2>&1
```

---

## 6. Taghir-e IP-e AI (Agar IP-e Shoma Taghir Kard)

Agar IP-e khareji-e shoma taghir kard (mesl-e taghir-e VPN ya proxy), bayad .env ra update konid:

```bash
ssh root@31.70.76.10
cd /home/ehsan/personal-site-rev5/personal-site
sudo ./install.sh --ip-allowlist "IP-E-JADID"
# In kar .env ra update mikone va systemd service ra restart mikonad
```

Bara-ye khamoosh kardan-e IP allowlist (hame-ye IP-ha mojaz):

```bash
sudo ./install.sh --ip-allowlist ""
```

---

## 7. Khorooji-e Khata-ha-ye Momken

| Khata | Tawzeeh | Hal |
|-------|---------|-----|
| `403 forbidden` | IP dar allowlist nist | IP khod ra check kon: `curl ifconfig.me` va be `install.sh --ip-allowlist` ezafeh kon |
| `401 unauthorized` | MAINTENANCE_TOKEN eshtebah ast | `export MAINTENANCE_TOKEN=...` az .env server |
| `403 edit_token_required` | MAINTENANCE_AI_BIND=1 va EDIT_TOKEN nadari | `export MAINTENANCE_EDIT_TOKEN=...` ya flag `--ai-bind` be maintenance.sh bedeh |
| `426 encryption_required` | MAINTENANCE_ENC_KEY dar .env server hast vali dar env-e client nist | `export MAINTENANCE_ENC_KEY=...` az `db/.maintenance-enc-key.txt` server |
| `503 maintenance_disabled` | MAINTENANCE_TOKEN dar .env server kamtar az 32 char hast | `sudo ./install.sh` dobareh run kon |
| `400 enc_stale_timestamp` | Saat-e client va server bishtar az 5 daqiqe farq darad | `sudo ntpdate pool.ntp.org` dar server ya `sudo systemctl restart systemd-timesyncd` |
| `400 enc_replay_detected` | Yek haman request dobarh ersal shode | Script `maintenance-enc.mjs` har bar nonce-e jadid tolid mikone; agar manually request sakhti, nonce-e jadid estefadeh kon |

---

## 8. Test-e Tamam-e Layeheh-ha

Bara-ye motalae-e inke hame-ye 4 laayeheh amniyati dorost kar mikonand:

```bash
# Dar posheh-ye project (development):
cd /home/z/my-project
bash AI/test-harness.sh
```

Bayad 43/43 test sabz shavad:
- 28 RBAC test (owner > admin > user hierarchy)
- 5 Encrypted channel test (status, plaintext reject, replay reject, stale ts, export-all)
- 10 rev5 test (legacy mode, AI-bind without/with EDIT_TOKEN, IP allowlist with allowed/blocked, CIDR match, syntax checks for 4 new scripts)

---

## 9. Kholaase-ye File-ha-ye Mohem

| File | Posheh | Tawzeeh |
|------|--------|---------|
| `route.ts` | `src/app/api/maintenance/` | API endpoint ba 4 laayeheh amniyati |
| `maintenance-crypto.ts` | `src/lib/` | AES-256-GCM + nonce + ts validation |
| `maintenance.sh` | `scripts/` | Client-e kanal (ba --ai-bind flag) |
| `maintenance-enc.mjs` | `scripts/` | Ramz kardan/baz kardan-e request/response |
| `sync-server-to-github.sh` | `AI/` (dev) / `scripts/` (zip) | Export-e server state → GitHub |
| `ai-edit-online.sh` | `AI/` (dev) / `scripts/` (zip) | Yek-framan: virayesh + sync |
| `sync-from-github-to-offline.sh` | `AI/` (dev) / `scripts/` (zip) | GitHub → offline local |
| `apply-snapshot.mjs` | `AI/` (dev) / `scripts/` (zip) | apply-e snapshot.json be DB |
| `test-harness.sh` | `AI/` | 43/43 test-e kamel |
| `package-v1.1.sh` | `AI/` | Sakht-e pakejh-e nasb |
| `push-to-github.sh` | `AI/` | Push-e code be GitHub |
| `install.sh` | root | Nasb-e server ba --ai-bind / --ip-allowlist flags |
| `VERSION.txt` | `EMA/` | Tarikhche-ye version-ha + taghirat |

---

## 10. Tavsiyeh-ha-ye Amniyati

1. **Token-ha ra dar kasi nadeh.** MAINTENANCE_TOKEN, MAINTENANCE_EDIT_TOKEN, MAINTENANCE_ENC_KEY faghat bayad dar `.env` server (chmod 600) bashand.
2. **GH_TOKEN ra joda negah dar.** Token-e GitHub faghat baraye sync-e server→GitHub estefadeh mishavad. Dar `/root/.sync-env` (chmod 600) negah dar. Dar development, AI an ra dar `.gh-token` (chmod 600, gitignored) negah midarad.
3. **Cron backup ra faramoosh nakon.** `auto-backup.sh` har shab database ra backup mikonad (7 version negah midarad).
4. **Test-harness ra har mah yek bar run kon.** Ta az inke hame-ye laayeheh-ha hanooz dorost kar mikonand motmaen bashi.
5. **Agar token-e GitHub leak shod, fawran regenerate kon.** Dar GitHub: Settings → Developer settings → Personal access tokens → Regenerate. Baed `.gh-token` ra ba token-e jadeed update kon.

---

## 11. Rahnama-ye Kootah (Cheat Sheet)

```bash
# === Dar server (online) ===
# Test:
bash scripts/maintenance.sh --ai-bind status

# Virayesh + sync:
bash scripts/ai-edit-online.sh texts.set --data '{"key":"hero.title","valueFa":"عنوان جدید"}'

# Faghat sync:
bash scripts/sync-server-to-github.sh

# === Dar local (offline / development) ===
# Push-e code be GitHub:
bash AI/push-to-github.sh

# Sakht-e pakejh-e nasb:
RELEASE_OUT="EMA/deployment/01-UPLOAD-ZIP/ehsan-site-v1.0-<date>.zip" bash AI/package-v1.1.sh

# Test-e kamel:
bash AI/test-harness.sh

# Pull-e snapshot az GitHub + apply dar database-e local:
bash AI/sync-from-github-to-offline.sh

# === IP taghir kard ===
sudo ./install.sh --ip-allowlist "IP-E-JADID"

# === Khamoosh kardan-e AI-bind ===
sudo ./install.sh --no-ai-bind
```

---

*Version 1.0 rev5 — Tarikh: 1405-09-04 — Bara-ye Ehsan Morad (ehsanmorad.ir)*
