# STATE — وضعیت سه‌لایه (Online / GitHub / Offline)

> Bara-ye Ehsan Morad (ehsanmorad.ir) — in file har-ta ke yeki az se laayehe
> taghir mikoneh, bayad update besheh. Akharin update: 1405-09-05 (2026-11-25)

---

## 1. Version-e Rasmi

| Chiz | Meghdar |
|------|---------|
| Version | v1.0 rev6 |
| Tarikh-e release | 1405-09-05 (2026-11-25) |
| Commit-e main | (bebin: `git log --oneline -1`) |
| Branch-e state | `server-state` (snapshot.json) |
| Repo | github.com/ldrcoir/ehsan-site (public) |
| VPS | 31.70.76.10 (hanooz nasb nashodeh) |
| Domain | ehsanmorad.ir (Cloudflare → 31.70.76.10) |

## 2. Hol-e Har Laayeheh (Alaan)

### 2.1. Offline (laptop-e shoma / sandbox-e AI)

| Chiz | Hol |
|------|-----|
| Database | db/custom.db — SQLite, 24 table, **0 record** (schema-e tazeh) |
| Code | Next.js 16 + TypeScript + Prisma 6.11 — test-harness 43/43 sabz |
| Hal | Dev-ready vali **khaali** — hich content-i (matn/clip/nav) seed nashodeh |

### 2.2. GitHub (ldrcoir/ehsan-site)

| Chiz | Hol |
|------|-----|
| main | code-e kamel + EMA/ + AI/ + scripts/ + zip-e rasmi |
| server-state | snapshot.json-e avali (offline-initial — khaali, ba metadata) |
| Andaze | ~13.5 MB pack (ba filter-repo tamame zip-ha-ye qadimi az tarikhche paak shodand) |

### 2.3. Online (VPS 31.70.76.10)

| Chiz | Hol |
|------|-----|
| Hol | **Nasb nashodeh** — VPS hanooz khaali ast |
| Gham-e badi | zip ra upload kon → install.sh --ai-bind --ip-allowlist → baed token-ha be AI |

## 3. Zip-e Rasmi-e Nashr (faghat yek ja!)

| Chiz | Meghdar |
|------|---------|
| Masir | `EMA/deployment/01-UPLOAD-ZIP/ehsan-site-v1.0-rev5-1405-09-05.zip` |
| Andaze | 13,796,820 bytes (~13.8 MB) |
| MD5 | 6051dd5a65b2a52031d25e1f38744689 |
| Sha256 | (bebin: `sha256sum EMA/deployment/01-UPLOAD-ZIP/*.zip`) |
| Mohataviat | standalone (server.js + node_modules + .next/static) + src + install.sh + scripts |

**Chera 13.8 MB?** (soal-e shoma — javab-e kamel):

```
Mohataviat-e zip (ghabl az compress: 41 MB, baad az compress: 13.8 MB):

  node_modules/           33 MB  →  zarooriat-e runtime (npm install nakhiah!)
    .prisma/              17 MB  →  query engine-e SQLite (binary — Linux debian)
    next/                 13 MB  →  framework-e Next.js 16
    react-dom + react    1.6 MB  →  React 19
    baghiye (bcryptjs…)  1.4 MB  →  koochak
  .next/                 6.3 MB  →  build-e production (4.1 server + 1.8 static)
  src/                   1.3 MB  →  sors-e site (24 route, 21 component)
  scripts/ + install.sh  200 KB  →  abzar-ha-ye server
  docs/ + README          10 KB

Pas: 41 MB → 13.8 MB (JavaScript ~3:1 compress mishavad)
```

Nemisheh kamtaresh kard:
- `.prisma` engine (17 MB) binary-e asli-e database hast — bedoon-e an site
  ba SQLite kar nemikoneh. Qablan 5 engine dashtim (~80 MB) — ba rev4 faqat
  hamin yeki (debian-openssl-3.0.x, mosavi-e VPS) munde.
- `next/` framework hast — nemisheh hazf kard.
- Age node_modules hazf besheh, VPS majboor misheh npm install bezaneh —
  yani niaz be internet + 5-10 daqiqe + risk-e version drift. Standalone
  yani «unzip va run» — amiin-tarin rah.

## 4. Ghanun-e Sync-e Seh Laayeheh

```
  Online (VPS) ──1──▶ GitHub (server-state) ──2──▶ Offline (laptop)
      ▲                    │
      └────────3───────────┘
```

1. **Online → GitHub**: `bash scripts/sync-server-to-github.sh` (rooye VPS)
2. **GitHub → Offline**: `bash AI/sync-from-github-to-offline.sh` (rooye laptop)
3. **AI → Online**: `bash scripts/ai-edit-online.sh <action>` (az har ja)

Baed az har virayesh: snapshot-e jadid ba metadata (snapshotAt, snapshotBy,
version) be branch-e `server-state` push misheh. Pas dar har lahze tarikhche-ye
taghirat-e site ba tarikh va version dar repo munde misheh.

## 5. Cheh Version-e Jadid Bechinish? (checklist)

- [ ] Code ra taghir dahid → `bash AI/test-harness.sh` (43/43 sabz)
- [ ] VERSION.txt ra update konid (bakhsh-e balaye file)
- [ ] In file (EMA/STATE.md) ra update konid (version, tarikh, hol-e laayeheha)
- [ ] Zip-e jadid besazid: `RELEASE_OUT="EMA/deployment/01-UPLOAD-ZIP/ehsan-site-v1.0-<TARIKH>.zip" bash AI/package-v1.1.sh`
- [ ] Zip-e ghodimi az 01-UPLOAD-ZIP hazf konid (faghat yek zip dar repo!)
- [ ] MD5/Sha256-e zip-e jadid ra bekhonid va inja benavisid
- [ ] `bash AI/push-to-github.sh` (ya export GITHUB_TOKEN va push)

## 6. Mahramaneh

- In repo **public** hast — hargiz token/secret/DB commit nakonid.
- Token-ha-ye maintenance dar `.env`-e server (chmod 600) va dar laptop dar
  file-e shakhsi (chmod 600) — hargiz dar repo na.
- Snapshot-e server-state hargiz: ContactMessage, ChatMessage, AccessUser
  (password hash), AiProvider (API key) — nemigireh. Token-ha-ye bot mask
  mishavand (`••••••••last4`).
