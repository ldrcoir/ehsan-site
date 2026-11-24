# EMA/deployment/ — Pakejh-e Nasb-e Site bara-ye VPS

> Bara-ye Ehsan Morad (ehsanmorad.ir) — VPS 31.70.76.10, GitHub: ldrcoir/ehsan-site
> Hameh matn be Finglish (Farsi baa horoof-e Latini) ta shoma betavanid bekhoonid.
> Version 1.0 rev5 — 1405-09-05

---

## Moqaddameh

In posheh hameh chiz-e hast ke shoma niaz darid bara-ye nasb-e site-e Ehsan Morad
roye yek VPS-e tazeh (ya server-e qadimi ke mikhohid taghir dahid). Hameh file-ha
ba shomareh-e tartibi gharar gereft-and ta bedoonid cheh bahs be-khoonid.

## Sakhtar-e Posheh

```
EMA/deployment/
├── README.md                            ← in file-e khod-e
├── 01-UPLOAD-ZIP/                       ← zip-e ke bayad be VPS upload shavad
│   └── ehsan-site-v1.0-rev5-1405-09-05.zip   (≈13.8 MB)
├── 02-Rahnama-ye-Nasb.docx              ← rahnama-ye mofassal-e nasb (Word)
├── 03-Rahnama-ye-Vasl-e-AI.docx          ← rahnama-ye vasl-e AI be server (Word)
├── 04-Rahnama-ye-Agent-Arzontar.docx     ← rahnama-ye estefadeh az agent-e arzontar (Word)
└── 05-CHEAT-SHEET.txt                   ← hameh farman-ha dar yek file-e matni
```

## Tartib-e Khundan

1. **Avval** `02-Rahnama-ye-Nasb.docx` ra be-khoonid. In tozih midahad cheh
   konid: az koja shoroo konid, cheh chiz-ha-ye pish-niyaz hast, va cheh
   gham be gham site roye VPS nasb mishavad.

2. **Baed** `03-Rahnama-ye-Vasl-e-AI.docx` ra be-khoonid. In tozih midahad
   cheh konid vaqti site bala omad: cheh token-ha-ye kanal-e maintenance ra
   az server begirim, cheh IP-e khod ra peyda konam, va cheh test konam ke
   AI mitoneh vasl beshe.

3. **Akhar** `04-Rahnama-ye-Agent-Arzontar.docx` ra be-khoonid. In muhem-tarin
   sanad ast agar shoma nigaraneh-e gheymat-e in AI hastid. In tozih midahad
   cheh konid agar in agent gheymat-e bish az 20 darsad-e budget shoma shavad:
   cheh konid, cheh agent-e arzontar ra entekhab konid, va cheh behesh system
   prompt bedehid ta an betoneh az kanal estefadeh konad.

4. **Hamesheh ba khodetoon dashteh bashid** `05-CHEAT-SHEET.txt` ra. In file
   hameh farman-ha-ye mohemm ra dar yek ja daarad. Mitavanid an ra print
   konid ya dar phone dashteh bashid.

## Moqaddam chin-e Muhem

- **VPS**: 31.70.76.10
- **Domain**: ehsanmorad.ir (Cloudflare DNS be IP-e VPS)
- **GitHub**: github.com/ldrcoir/ehsan-site (public)
- **SSH access**: root@31.70.76.10 (baa password ya SSH key)
- **Version-e feli**: v1.0 rev5 (1405-09-05)
- **Andaze-ye zip**: 13.8 MB

## Tavajjoh-ha

1. **Hargiz token-ha ra be kasi nadeh.** MAINTENANCE_TOKEN,
   MAINTENANCE_EDIT_TOKEN, MAINTENANCE_ENC_KEY faghat bayad dar `.env` server
   (chmod 600) bashand. Bara-ye dadan be agent-e arzontar, file-e amn baa
   chmod 600 besazid.

2. **Password-e admin ra fawran taghir dahid.** Password-e tasadofi-e avvali
   ke install.sh chap mikonad ra hargiz be-khoob nadaarid. Az panel →
   Settings → Password taghir dahid.

3. **Backup-e shabaneh automatic hast.** Cron nasb shodeh: har shab saat 3
   bamaad, auto-backup.sh run mishavad. 7 version-e akhar negah midarad.

4. **Test-e kanal-e maintenance ra har mah yek bar anjam dahid.** Ta motmaen
   bashid hameh laayehe-ha-ye amniyati hanooz kar mikonand.

5. **Agar token-e GitHub leak shod, fawran regenerate konid.** Dar GitHub:
   Settings → Developer settings → Personal access tokens → Regenerate.

## Isterat-e Khalk-e Sanad

Hameh sanad-ha-ye Word baa estefadeh az `scripts/gen-deployment-docs.py` sakhte
shod-and. Bara-ye taghir-e an-ha, in script ra modify konid va dobareh run
konid:

```bash
cd /home/z/my-project
python3 scripts/gen-deployment-docs.py
```

## Tamas

- Repo: https://github.com/ldrcoir/ehsan-site
- Site: https://ehsanmorad.ir
- VPS: 31.70.76.10

---

*Version 1.0 rev5 — Tarikh: 1405-09-05 — Bara-ye Ehsan Morad*
