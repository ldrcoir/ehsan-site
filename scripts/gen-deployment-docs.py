#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tolid-e seh sanad-e Word bara-ye EMA/deployment/:
  1. Rahnama-ye-Nasb.docx              — rahnama-ye mofassal-e nasb-e site roye VPS
  2. Rahnama-ye-Vasl-e-AI.docx          — rahnama-ye tanzim-e kanal bara-ye vasl-e AI
  3. Rahnama-ye-Agent-Arzontar.docx     — rahnama-ye estefadeh az agent-e arzontar

Hameh matn be Finglish (Farsi baa horoof-e Latini) ta shoma betavanid bekhoonid.
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUT_DIR = "/home/z/my-project/EMA/deployment"
os.makedirs(OUT_DIR, exist_ok=True)

# ---- Helpers ---------------------------------------------------------------

def set_rtl(paragraph):
    """Set paragraph direction to RTL."""
    pPr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)

def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = 'Noto Sans Arabic'
        run.font.size = Pt(16 if level == 1 else 13 if level == 2 else 11)
        if level == 1:
            run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
        elif level == 2:
            run.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
        else:
            run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
    return h

def add_para(doc, text, bold=False, italic=False, size=11, color=None, align=None):
    p = doc.add_paragraph()
    if align == 'center':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == 'right':
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    elif align == 'left':
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    run = p.add_run(text)
    run.font.name = 'Noto Sans Arabic'
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    return p

def add_code_block(doc, code_text):
    """Add a monospace code block with light grey background."""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.right_indent = Cm(0.5)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15
    # Background shading
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F2F2F2')
    pPr.append(shd)
    run = p.add_run(code_text)
    run.font.name = 'Consolas'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x10, 0x40, 0x60)
    return p

def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.4
    run = p.add_run(text)
    run.font.name = 'Noto Sans Arabic'
    run.font.size = Pt(11)
    return p

def add_numbered(doc, text):
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.4
    run = p.add_run(text)
    run.font.name = 'Noto Sans Arabic'
    run.font.size = Pt(11)
    return p

def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.autofit = True
    # Header row
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = ''
        p = hdr_cells[i].paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(10)
        run.font.name = 'Noto Sans Arabic'
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        # Set background color (dark blue) for header
        tcPr = hdr_cells[i]._tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '2E74B5')
        tcPr.append(shd)
    # Data rows
    for r_idx, row in enumerate(rows):
        cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row):
            cells[c_idx].text = ''
            p = cells[c_idx].paragraphs[0]
            run = p.add_run(str(val))
            run.font.size = Pt(10)
            run.font.name = 'Noto Sans Arabic'
    # Optional column widths
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)
    return table

def add_page_break(doc):
    doc.add_page_break()

def add_callout(doc, title, body, color='FFF4CE'):
    """Yellow callout box for important notes."""
    table = doc.add_table(rows=1, cols=1)
    table.autofit = True
    cell = table.rows[0].cells[0]
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color)
    tcPr.append(shd)
    cell.text = ''
    p = cell.paragraphs[0]
    run = p.add_run(title + '\n')
    run.bold = True
    run.font.size = Pt(11)
    run.font.name = 'Noto Sans Arabic'
    run.font.color.rgb = RGBColor(0xC0, 0x50, 0x00)
    run2 = p.add_run(body)
    run2.font.size = Pt(10)
    run2.font.name = 'Noto Sans Arabic'
    doc.add_paragraph()  # spacer

def setup_doc_styles(doc):
    style = doc.styles['Normal']
    style.font.name = 'Noto Sans Arabic'
    style.font.size = Pt(11)

def add_cover(doc, title, subtitle, doc_num):
    """Cover page with title and subtitle."""
    # Vertical spacer
    for _ in range(4):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("EMA — Ehsan Morad Personal Site")
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    run.italic = True

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(title)
    run.font.size = Pt(28)
    run.bold = True
    run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(subtitle)
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)

    for _ in range(2):
        doc.add_paragraph()

    # Document number badge
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(doc_num)
    run.font.size = Pt(36)
    run.bold = True
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)

    for _ in range(6):
        doc.add_paragraph()

    # Footer info
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Site: ehsanmorad.ir  |  VPS: 31.70.76.10  |  GitHub: ldrcoir/ehsan-site")
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("Version 1.0 rev5  |  1405-09-05")
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

    add_page_break(doc)


# ============================================================================
# Document 1: Rahnama-ye-Nasb (Installation Guide)
# ============================================================================

def build_doc1_nasb():
    doc = Document()
    setup_doc_styles(doc)

    add_cover(doc,
              "Rahnama-ye Nasb-e Site",
              "Gham be gham: az VPS-e khali ta site-e kamel",
              "01")

    # ---- Section: Mokhaddameh ----
    add_heading(doc, "1. Mokhaddameh — In Sanad Cheh Miguyad?", level=1)
    add_para(doc,
        "In sanad ra baraye shoma neveshtam ta bedoonid az koja shoroo konid va cheh "
        "konid ke site-e shakhsi-e Ehsan Morad (ehsanmorad.ir) roye VPS shoma ba "
        "mooshkel-e kamel bala biyayad. Hameh matn be Finglish ast — yani Farsi baa "
        "horoof-e Latini — ta shoma bedoon-e keyboard-e Farsi ham betavanid be-khoonid.")

    add_para(doc,
        "VPS shoma: 31.70.76.10. Domain: ehsanmorad.ir. GitHub repo: "
        "github.com/ldrcoir/ehsan-site. In seh ta mohem-tarin etelaat-e hast ke "
        "hameh ja bayad yadet bashad.")

    add_para(doc,
        "Pish az inke shoroo konim, yek nega-ye koli be ancheh mikhohim anjam bedim: "
        "shoma yek pakejh-e zip az AI migirid (in pakejh dar posheh-e 01-UPLOAD-ZIP "
        "gharar darad). In zip ra be VPS upload mikonid, an ra baz mikonid, va yek "
        "script-e nasb (install.sh) ra run mikonid. In script hameh chiz ra khodcar "
        "anjam midahad: nasb-e Node.js, nasb-e nginx, sakht-e database, tolid-e "
        "password-e admin, nasb-e systemd service, va nasb-e backup-e shabaneh.")

    add_callout(doc,
        "Muhem:",
        "Agar VPS shoma tazeh ast va hich-chiz roye an nist (ya ghablan shoma site "
        "nadashtid), backup lazem nist. Faghat zip ra upload konid va nasb konid. "
        "Agar ghablan yek site roye VPS bud, avval az an backup begirid (bakhsh-e 2).")

    # ---- Section: Pish-niyaz-ha ----
    add_heading(doc, "2. Pish-niyaz-ha — Chiz-ha-ye Lazem", level=1)
    add_para(doc,
        "Qabl az shoroo, motmaen bashid ke in chiz-ha ra darid:")

    add_table(doc,
        ["Chiz", "Tawzeeh", "Cheh konam?"],
        [
            ["VPS", "Yek server-e Linux (Ubuntu 22.04 ya 24.04) baa access-e root", "ssh root@31.70.76.10"],
            ["Domain", "ehsanmorad.ir ke DNS an be IP-e VPS eshareh mikonad", "Cloudflare DNS: A record → 31.70.76.10"],
            ["SSH access", "Username + password ya SSH key bara-ye root", "az laptop: ssh root@31.70.76.10"],
            ["Zip file", "ehsan-site-v1.0-rev5-1405-09-05.zip", "dar posheh-e 01-UPLOAD-ZIP"],
            ["GitHub token", "Personal Access Token baa dastresi-e repo (bara-ye sync)", "GitHub Settings → Developer settings"],
            ["reCAPTCHA", "Google reCAPTCHA v2 Site Key + Secret", "recaptcha.admin"],
        ],
        col_widths=[3, 6, 6])

    add_para(doc, "")

    # ---- Section: Backup az Server-e Qabli ----
    add_heading(doc, "3. Backup az Server-e Qabli (Faghat agar site-e qadimi darid)", level=1)
    add_para(doc,
        "Agar VPS shoma khaali ast (hich site-e qadimi nist), in bakhsh ra rad konid "
        "va beravid be bakhsh-e 4. Vali agar ghablan yek nasb-e site roye an bud, "
        "avval az an backup begirid ta hich data-ei az dast narahavad.")

    add_heading(doc, "3.1. Backup az File-ha", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site   # ya koja site ghablan nasb shodeh bud\n"
        "tar -czf /root/backup-pre-rev5-$(date +%Y%m%d).tar.gz .\n"
        "ls -lh /root/backup-pre-rev5-*.tar.gz   # motmaen shav file sakht shod")

    add_heading(doc, "3.2. Backup az Database", level=2)
    add_code_block(doc,
        "# Hameh baazi sqlite3 dar server:\n"
        "sqlite3 db/custom.db \".backup '/root/custom-db-pre-rev5-$(date +%Y%m%d).db'\"\n"
        "ls -lh /root/custom-db-pre-rev5-*.db")

    add_heading(doc, "3.3. Backup az .env (muhem!)", level=2)
    add_para(doc,
        "File-e .env shamel-e hameh token-ha va secret-hast. Hatman az an yek copy "
        "amn begirid (in file baed dar nasb-e jadid niaz mishavad bara-ye hifz-e "
        "token-ha-ye qadimi):")
    add_code_block(doc,
        "cp /home/ehsan/personal-site/.env /root/env-backup-$(date +%Y%m%d).txt\n"
        "chmod 600 /root/env-backup-*.txt")

    add_callout(doc,
        "Hoshdar:",
        "File-e .env ra hargiz be kasi nadeh. In file shamel-e password-e admin, "
        "token-ha-ye Bale/Telegram bot, API key-ha-ye AI provider-ha, va "
        "token-ha-ye maintenance ast. Hata baraye backup ham baazesh konid baa "
        "chmod 600.", color="FCE4E4")

    # ---- Section: Upload-e Zip ----
    add_heading(doc, "4. Upload-e Zip be VPS", level=1)
    add_para(doc,
        "Hala zip ra az laptop-e khodetoon be VPS upload mikonim. Do rahesh hast:")

    add_heading(doc, "4.1. Raves-e Avval: scp (sadeh-tarin)", level=2)
    add_code_block(doc,
        "# Dar laptop-e shoma (Windows: PowerShell; Mac/Linux: terminal):\n"
        "scp EMA/deployment/01-UPLOAD-ZIP/ehsan-site-v1.0-rev5-1405-09-05.zip \\\n"
        "    root@31.70.76.10:/root/")

    add_heading(doc, "4.2. Raves-e Dovvom: agar scp kheili sust ast", level=2)
    add_para(doc,
        "Agar internet-e shoma sust ast ya scp ghaat misheh, mitonid az raves-e "
        "zir estefadeh konid:")
    add_numbered(doc, "Yek service mesl-e transfer.sh ya wormhole.app ra baz konid.")
    add_numbered(doc, "Zip ra upload konid va yek link begirid.")
    add_numbered(doc, "Dar VPS: wget <link> -O /root/ehsan-site-v1.0-rev5-1405-09-05.zip")
    add_numbered(doc, "Motmaen shavid ke andaze-ye file dorost ast: ls -lh /root/ehsan-site-v1.0-rev5-1405-09-05.zip")

    add_heading(doc, "4.3. Verify-e Upload", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "ls -lh /root/ehsan-site-v1.0-rev5-*.zip\n"
        "# Bayad andaze-ye file taghriban 13.8 MB bashad")

    # ---- Section: Baz kardan-e Zip ----
    add_heading(doc, "5. Baz kardan-e Zip roye VPS", level=1)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "mkdir -p /home/ehsan/personal-site-rev5\n"
        "cd /home/ehsan/personal-site-rev5\n"
        "unzip -q /root/ehsan-site-v1.0-rev5-1405-09-05.zip\n"
        "ls -la\n"
        "# Bayad yek posheh be esm-e 'personal-site' bebinid")

    add_para(doc,
        "Vorood be posheh-e personal-site va motmaen shavid ke file-e install.sh "
        "vojood darad:")
    add_code_block(doc,
        "cd personal-site\n"
        "ls -la install.sh\n"
        "# Hata agar ghablan 'sudo apt install unzip' nakhordah bud, avval an ra nasb konid:\n"
        "# apt update && apt install -y unzip")

    # ---- Section: Run-e install.sh ----
    add_heading(doc, "6. Run-e install.sh baa Flag-ha-ye AI-Bind", level=1)

    add_heading(doc, "6.1. Avval IP-e Khareji-e Khod ra Peyda Konid", level=2)
    add_para(doc,
        "Qabl az run-e install.sh, bayad bedoonid AI az cheh IP-i vasl mishavad. "
        "AI yani hamin agent-e ke baraye shoma kar mikonad. Agar shoma VPN ya "
        "proxy estefadeh mikonid, IP-e khareji-e shoma baed az inke az Iran "
        "kharej mishavid mohem ast (nah IP-e dakheli-e Iran).")

    add_code_block(doc,
        "# Az laptop-e shoma (ba VPN/proxy roshan):\n"
        "curl -s https://api.ipify.org && echo\n"
        "# ya:\n"
        "curl -s https://ifconfig.me && echo\n"
        "\n"
        "# Natijeh mesl-e: 203.0.113.42\n"
        "# In IP ra yad daashteh bashid.")

    add_callout(doc,
        "Tavajjoh:",
        "IP-e AI mitavanad taghir konad agar shoma VPN ya proxy taghir dahid. "
        "Dar in soorat bayad install.sh ra dobareh baa IP-e jadid run konid "
        "(bakhsh-e 6.4).")

    add_heading(doc, "6.2. Run-e install.sh", level=2)
    add_para(doc,
        "Hala install.sh ra baa do flag-e muhem run mikonim:")
    add_code_block(doc,
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "sudo ./install.sh --ai-bind --ip-allowlist \"203.0.113.42\"")
    add_para(doc,
        "(Jaye-ye 203.0.113.42, IP-e khareji-e khodetoon ra qarar dahid.)")

    add_heading(doc, "6.3. Cheh etefaq mi-oftad?", level=2)
    add_para(doc,
        "install.sh in kar-ha ra anjam midahad (tak-tak tozih midaham):")
    add_table(doc,
        ["Qadam", "Kar", "Moddat-e zaman"],
        [
            ["1", "Update-e apt va nasb-e baste-ha-ye lazem (node, nginx, sqlite3, certbot, ...)", "1-3 daqiqe"],
            ["2", "Sakht-e user-e ehsansite (system user, non-root)", "< 1 daqiqe"],
            ["3", "Tolid-e 4 token-e amniyati (TOKEN, EDIT_TOKEN, ENC_KEY, SESSION_SECRET)", "< 1 daqiqe"],
            ["4", "Set kardan-e MAINTENANCE_AI_BIND=1 va IP allowlist dar .env", "< 1 daqiqe"],
            ["5", "Sakht-e database (sqlite) + apply-e schema + seed-e admin", "1 daqiqe"],
            ["6", "Build-e Next.js (production build)", "2-5 daqiqe"],
            ["7", "Nasb-e systemd service (personal-site.service)", "< 1 daqiqe"],
            ["8", "Nasb-e nginx config + restart-e nginx", "< 1 daqiqe"],
            ["9", "Certbot: dar-khast-e SSL certificate bara-ye ehsanmorad.ir", "1-2 daqiqe"],
            ["10", "Nasb-e cron job bara-ye backup-e shabaneh", "< 1 daqiqe"],
            ["11", "Chap-e hameh token-ha va password-e admin (faghat yek bar!)", "fawri"],
        ],
        col_widths=[1.5, 10, 3])

    add_heading(doc, "6.4. Taghir-e IP baed az nasb", level=2)
    add_para(doc,
        "Agar baed az nasb, IP-e AI shoma taghir kard (mesl-e taghir-e VPN), "
        "mitonid faghat baa yek farman IP-e jadid ra ezafeh konid:")
    add_code_block(doc,
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "sudo ./install.sh --ip-allowlist \"IP-E-JADID\"")
    add_para(doc,
        "Ya agar mikhohid chand IP ra mojaz konid (mesl-e IP-e laptop va IP-e VPS):")
    add_code_block(doc,
        "sudo ./install.sh --ip-allowlist \"203.0.113.42,192.168.1.5\"")

    add_callout(doc,
        "Hoshdar-e Muhem:",
        "Vaqti install.sh chap mikonad 'MAINTENANCE_TOKEN' va 'MAINTENANCE_EDIT_TOKEN' "
        "va 'MAINTENANCE_ENC_KEY' — in se ta ra dar ja-ye amn yad daashteh bashid "
        "(ya dar yek file-e matni baa chmod 600). In se ta hameh chiz-e hast ke AI "
        "baraye vasl shodan be server niaz darad. Agar gom shavand, AI nemitavanad "
        "vasl shavad va bayad install.sh ra dobareh run konid (ke token-ha-ye jadid "
        "tolid mishavand).", color="FCE4E4")

    # ---- Section: Vorood-e Avvali-e Admin ----
    add_heading(doc, "7. Vorood-e Avvali-e Admin", level=1)
    add_para(doc,
        "Baed az nasb-e movaffagh, install.sh yek password-e tasadofi bara-ye "
        "admin chap mikonad (faghat yek bar). Bayad an ra yad daashteh bashid.")

    add_heading(doc, "7.1. Yaftan-e Password agar faramoosh shod", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "sudo cat /home/ehsan/personal-site-rev5/personal-site/db/.admin-initial-password.txt")

    add_heading(doc, "7.2. Vorood be site", level=2)
    add_code_block(doc,
        "# Dar browser:\n"
        "https://ehsanmorad.ir/user-login\n"
        "# ya agar DNS hanooz set nashodeh:\n"
        "http://31.70.76.10/user-login")
    add_para(doc,
        "Username: admin")
    add_para(doc,
        "Password: (chizi ke install.sh chap kard)")

    add_heading(doc, "7.3. Taghir-e fawri-e password", level=2)
    add_callout(doc,
        "Hatman anjam bedid!",
        "Password-e admin ra fawran az panel → Settings → Password taghir dahid. "
        "Password-e tasadofi-e avvali ra hargiz be-khoob nadaarid.")

    # ---- Section: reCAPTCHA ----
    add_heading(doc, "8. Tanzim-e reCAPTCHA (Lazem bara-ye form-e contact)", level=1)
    add_para(doc,
        "Bedoon-e reCAPTCHA, form-e contact-e site kar nemikonad (khatah midahad). "
        "Bara-ye tanzim:")
    add_numbered(doc, "Be https://www.google.com/recaptcha/admin beravid.")
    add_numbered(doc, "Yek label mesl-e 'ehsanmorad.ir' vared konid.")
    add_numbered(doc, "Type ra reCAPTCHA v2 ('I am not a robot' checkbox) entekhab konid.")
    add_numbered(doc, "Domain-ha ra ezafeh konid: ehsanmorad.ir va 31.70.76.10")
    add_numbered(doc, "Submit konid va Site Key va Secret ra begirid.")
    add_numbered(doc, "Dar VPS, in do ta ra dar .env set konid:")

    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "sudo nano .env\n"
        "# In do khat ra peyda kon va taghir bedeh:\n"
        "RECAPTCHA_SECRET=\"<secret-key-ke-be-shoma-dadeh-shod>\"\n"
        "NEXT_PUBLIC_RECAPTCHA_SITEKEY=\"<site-key-ke-be-shoma-dadeh-shod>\"\n"
        "# Ctrl+O bara-ye save, Ctrl+X bara-ye khoroj\n"
        "sudo systemctl restart personal-site")

    # ---- Section: Bot-ha ----
    add_heading(doc, "9. Tanzim-e Bot-ha (Ikhityari)", level=1)
    add_para(doc,
        "Site-e shoma dost ba Bale va Telegram bot-ha hast. Bara-ye faal kardan-e "
        "in bot-ha, bayad dar panel-e admin (Settings) token-e bot ra vared konid.")

    add_heading(doc, "9.1. Bale Bot", level=2)
    add_numbered(doc, "Dar Bale, @BotFather ra start konid.")
    add_numbered(doc, "/newbot ra befrestid va yek bot jadid besazid.")
    add_numbered(doc, "Token ra begirid.")
    add_numbered(doc, "Be panel-e admin → Settings → Bale Bot beravid va token ra vared konid.")
    add_numbered(doc, "Dokmeh-ye Test ra bezanid — bayad 'OK' begirid.")
    add_numbered(doc, "Webhook URL ra set konid: https://ehsanmorad.ir/api/bale/webhook")

    add_heading(doc, "9.2. Telegram Bot", level=2)
    add_numbered(doc, "Dar Telegram, @BotFather ra start konid.")
    add_numbered(doc, "/newbot ra befrestid va yek bot jadid besazid.")
    add_numbered(doc, "Token ra begirid.")
    add_numbered(doc, "Be panel-e admin → Settings → Telegram Bot beravid va token ra vared konid.")
    add_numbered(doc, "Dokmeh-ye Test ra bezanid — bayad 'OK' begirid.")
    add_numbered(doc, "Webhook URL ra set konid: https://ehsanmorad.ir/api/telegram/webhook")

    # ---- Section: Test-e kanal ----
    add_heading(doc, "10. Test-e Kanal-e Maintenance az AI", level=1)
    add_para(doc,
        "Hala ke site bala omad, bayad motmaen shavim ke kanal-e maintenance "
        "dorost kar mikonad. In kanal chizi hast ke AI az tarigh-e an be server "
        "vasl mishavad va taghirat anjam midahad.")

    add_heading(doc, "10.1. Yaftan-e Token-ha az Server", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "\n"
        "# Read token:\n"
        "sudo cat db/.maintenance-token.txt\n"
        "\n"
        "# Edit token:\n"
        "sudo cat db/.maintenance-edit-token.txt\n"
        "\n"
        "# Encryption key:\n"
        "sudo cat db/.maintenance-enc-key.txt\n"
        "\n"
        "# Ya hameh ra yek ja bebin:\n"
        "sudo grep -E '^MAINTENANCE_(TOKEN|EDIT_TOKEN|ENC_KEY|AI_BIND|IP_ALLOWLIST)=' .env")

    add_heading(doc, "10.2. Test-e Vasl az Server-e Khod", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "\n"
        "# Test-e status:\n"
        "bash scripts/maintenance.sh --ai-bind status\n"
        "\n"
        "# Bayad natije-ye mesle in begirid:\n"
        "# {\"ok\":true,\"action\":\"status\",\"data\":{\"version\":\"1.0\",...}}")

    add_heading(doc, "10.3. Test-e Vasl az Kharej-e Server (az laptop)", level=2)
    add_code_block(doc,
        "# Dar laptop-e shoma:\n"
        "export MAINTENANCE_TOKEN=\"<read-token>\"\n"
        "export MAINTENANCE_EDIT_TOKEN=\"<edit-token>\"\n"
        "export MAINTENANCE_ENC_KEY=\"<enc-key>\"\n"
        "export MAINTENANCE_URL=\"https://ehsanmorad.ir\"\n"
        "\n"
        "# Bara-ye test, script ra az repo-e local run kon:\n"
        "cd /home/z/my-project\n"
        "bash scripts/maintenance.sh --ai-bind status\n"
        "\n"
        "# Ya faghat baa curl:\n"
        "curl -s -H \"X-Maintenance-Token: $MAINTENANCE_TOKEN\" \\\n"
        "     -H \"X-Maintenance-Edit-Token: $MAINTENANCE_EDIT_TOKEN\" \\\n"
        "     $MAINTENANCE_URL/api/maintenance?action=status")

    add_callout(doc,
        "Agar 'ok: true' gereftid:",
        "Tabrik! Kanal-e maintenance dorost kar mikonad. Hala AI nemitavanad be "
        "server vasl shavad va hameh chiz ra az dur taghir dahad.")

    # ---- Section: Khata-ha ----
    add_heading(doc, "11. Khata-ha-ye Momken va Hal-e An-ha", level=1)
    add_table(doc,
        ["Khata", "Tawzeeh", "Hal"],
        [
            ["403 Forbidden", "IP dar allowlist nist", "curl ifconfig.me kon va IP ra be install.sh --ip-allowlist ezafeh kon"],
            ["401 Unauthorized", "MAINTENANCE_TOKEN eshtebah ast", "az server: sudo cat db/.maintenance-token.txt"],
            ["403 edit_token_required", "AI_BIND=1 vali EDIT_TOKEN nist", "export MAINTENANCE_EDIT_TOKEN=... az server"],
            ["426 encryption_required", "ENC_KEY dar server vali dar client nist", "export MAINTENANCE_ENC_KEY=... az server"],
            ["503 maintenance_disabled", "TOKEN kamtar az 32 char", "sudo ./install.sh dobareh"],
            ["400 enc_stale_timestamp", "saat-e client va server >5min", "sudo systemctl restart systemd-timesyncd"],
            ["502 Bad Gateway", "Next.js service run nist", "sudo systemctl status personal-site"],
            ["Let's Encrypt rate limit", "bisyar SSL dar-khast dadeh shod", "5 saat sabr kon ya --staging estefadeh kon"],
        ],
        col_widths=[3.5, 5, 6.5])

    # ---- Section: Tavsiyeh-ha ----
    add_heading(doc, "12. Tavsiyeh-ha-ye Payani", level=1)
    add_bullet(doc, "Password-e admin ra fawran taghir dahid (az panel).")
    add_bullet(doc, "Token-ha-ye maintenance ra dar yek file-e amn (chmod 600) dar laptop-e khodetoon nigh darid.")
    add_bullet(doc, "Backup-e shabaneh automatic hast (cron) — motmaen shavid /var/cron.d/personal-site-backup vojood darad.")
    add_bullet(doc, "Hare mah yek bar bash AI/test-harness.sh ra run konid ta motmaen bashid hameh laayehe-ha-ye amniyati hanooz kar mikonand.")
    add_bullet(doc, "Agar token-e GitHub leak shod, fawran regenerate konid.")
    add_bullet(doc, "Agar mikhohid site ra be server-e digar taghir dahid, az scripts/export-site.sh estefadeh konid.")

    add_para(doc, "")
    add_para(doc,
        "Bara-ye rahnama-ye vasl-e AI be server, sanad-e dovom (02-Rahnama-ye-Vasl-e-AI.docx) "
        "ra be-khoonid. Bara-ye estefadeh az yek agent-e arzontar (agar in agent gheymat-e "
        "bish az 20 darsad-e budget shoma shavad), sanad-e sevom (03-Rahnama-ye-Agent-Arzontar.docx) "
        "ra be-khoonid.", italic=True)

    out_path = os.path.join(OUT_DIR, "02-Rahnama-ye-Nasb.docx")
    doc.save(out_path)
    print(f"[OK] {out_path}")
    return out_path


# ============================================================================
# Document 2: Rahnama-ye-Vasl-e-AI (AI Connection Guide)
# ============================================================================

def build_doc2_ai_vasl():
    doc = Document()
    setup_doc_styles(doc)

    add_cover(doc,
              "Rahnama-ye Vasl-e AI",
              "Tanzim-e kanal-e maintenance bara-ye dastresi-e AI be server",
              "02")

    # ---- Section: Mokhaddameh ----
    add_heading(doc, "1. Mokhaddameh — Kanal-e Maintenance Cheh Hast?", level=1)
    add_para(doc,
        "Kanal-e maintenance yek rah-e amn va khosoosi hast ke AI (man) az tarigh-e "
        "an be server-e shoma vasl mishavad va mitavanad data ra be-khanad, taghir "
        "dahad, ya backup begirad. In kanal 4 laayeheh amniyati darad ke hich "
        "mohemi nemitavanad az an gozashteh besheh.")

    add_para(doc,
        "Maqsad az in kanal: AI niaz nist SSH dashteh bashad be server. Niaz nist "
        "password-e admin ra bedooneh. Niaz nist code ra modify konad. AI faghat "
        "az tarigh-e in HTTP API ba server harf mizanad va hameh kar-ha dar "
        "SecurityLog sabt mishavand.")

    # ---- Section: 4 Layeheh ----
    add_heading(doc, "2. 4 Laayeheh-e Amniyati-e Kanal", level=1)

    add_table(doc,
        ["#", "Laayeheh", "Moteghayer-e .env", "Tawzeeh"],
        [
            ["1", "IP Allowlist", "MAINTENANCE_IP_ALLOWLIST",
             "Faghat IP haye mashin-e AI ghabel-e vasl. Hata agar kasi 3 laayeheh digar ra dashteh bashad, agar IP ash dar list nist, vasl nemishavad."],
            ["2", "Read Token", "MAINTENANCE_TOKEN",
             "Yek rishteh-ye tasadofi (>= 32 char) bara-ye khondan-e status, db-stats, security-logs, messages, chats, backup."],
            ["3", "Edit Token", "MAINTENANCE_EDIT_TOKEN",
             "Yek rishteh-ye tasadofi (>= 48 char) bara-ye virayesh-e matn-ha, clips, nav, settings, equipment, va hameh action-ha-ye taghiri."],
            ["4", "Encryption", "MAINTENANCE_ENC_KEY",
             "Yek kelid-e 64-hex (32 byte) bara-ye ramz kardan-e hameh request-ha va response-ha baa AES-256-GCM. Server baed az inke in kelid ra dasht, plaintext ra radd mikonad (426)."],
        ],
        col_widths=[1, 2.5, 4, 7.5])

    add_callout(doc,
        "Banz-e khabari:",
        "Hata agar yeki 3 ta az in 4 laayeheh ra dashteh bashad (masalan token-ha "
        "ra az koja peyda kardeh), agar IP ash dar allowlist nist, nemitavanad vasl "
        "shavad. In yani agar token-ha leak shavand, hana faghat az IP haye mojaz "
        "ghabel-e estefadeh-and.")

    add_heading(doc, "2.1. Halat-e AI-Bind (Faghat Man)", level=2)
    add_para(doc,
        "Agar MAINTENANCE_AI_BIND=1 dar .env set shavad, hata action-ha-ye khoondan "
        "(status, db-stats, messages, ...) ham niaz be Edit Token darand. Yani "
        "faghat kasi ke Edit Token ra darad mitavanad chizi bebineh. In halat "
        "bar-kasi-e kanal ra be sifr mirasanad.")

    # ---- Section: Yaftan-e token-ha ----
    add_heading(doc, "3. Yaftan-e Token-ha az Server", level=1)
    add_para(doc,
        "Baed az nasb-e movaffagh, install.sh in se ta ra dar file-ha-ye 600 zakhireh "
        "mikonad. Bara-ye didan-e an-ha:")

    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "\n"
        "# Read token (bara-ye khoondan):\n"
        "sudo cat db/.maintenance-token.txt\n"
        "\n"
        "# Edit token (bara-ye virayesh — muhem-tarin!):\n"
        "sudo cat db/.maintenance-edit-token.txt\n"
        "\n"
        "# Encryption key (64 hex char):\n"
        "sudo cat db/.maintenance-enc-key.txt\n"
        "\n"
        "# Ya hameh ra yek ja:\n"
        "sudo grep -E '^MAINTENANCE_' .env")

    add_callout(doc,
        "In se ta ra dar ja-ye amn zakhireh konid:",
        "Mitonid dar laptop-e khodetoon dar yek file-e matni baa chmod 600 negah "
        "darid (mesl-e ~/.ehsan-maintenance-tokens.txt). Hargiz in file ra be "
        "kasi nadeh. Bara-ye dadan be agent-e arzontar, be-khoonid sanad-e 03.",
        color="FCE4E4")

    # ---- Section: Yaftan-e IP ----
    add_heading(doc, "4. Yaftan-e IP-e Khareji-e Khod", level=1)
    add_para(doc,
        "Bara-ye inke AI betavanad vasl shavad, bayad bedoonim AI az cheh IP-i "
        "ersal mikonad. Agar AI dar yek server-e cloud (mesl-e in sand box) run "
        "meshavad, IP-e khareji-e an server mohem ast. Agar az laptop run mishavad, "
        "IP-e laptop baed az VPN/proxy mohem ast.")

    add_code_block(doc,
        "# Dar har ja ke AI run mishavad:\n"
        "curl -s https://api.ipify.org && echo\n"
        "# ya:\n"
        "curl -s https://ifconfig.me && echo\n"
        "\n"
        "# Mesal-e natijeh: 203.0.113.42")

    add_para(doc,
        "Hala in IP ra be install.sh --ip-allowlist dahid (bakhsh-e 5).")

    # ---- Section: Tanzim-e IP allowlist ----
    add_heading(doc, "5. Tanzim-e IP Allowlist", level=1)
    add_heading(doc, "5.1. Ezafeh kardan-e yek IP", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "sudo ./install.sh --ip-allowlist \"203.0.113.42\"")
    add_para(doc,
        "In kar .env ra update mikonad va systemd service ra restart mikonad.")

    add_heading(doc, "5.2. Ezafeh kardan-e chand IP", level=2)
    add_code_block(doc,
        "sudo ./install.sh --ip-allowlist \"203.0.113.42,198.51.100.7\"")

    add_heading(doc, "5.3. Ezafeh kardan-e yek CIDR (range-e IP)", level=2)
    add_para(doc,
        "Agar AI az yek range-e IP estefadeh mikonad (mesl-e yek company ke "
        "chand server darad), mitonid CIDR dahid:")
    add_code_block(doc,
        "sudo ./install.sh --ip-allowlist \"203.0.113.0/24\"  # hameh 203.0.113.x")

    add_heading(doc, "5.4. Khamoosh kardan-e IP allowlist (hameh IP-ha mojaz)", level=2)
    add_code_block(doc,
        "sudo ./install.sh --ip-allowlist \"\"")
    add_callout(doc,
        "Hoshdar:",
        "Khamoosh kardan-e IP allowlist yani hameh IP-ha mitonand vasl shavand "
        "(faghat baa token). In amniyat ra paeeen miyavarad. Faghat dar sorat-e "
        "loozom anjam bedid.", color="FCE4E4")

    # ---- Section: Faal kardan-e AI-Bind ----
    add_heading(doc, "6. Faal ya Khamoosh kardan-e AI-Bind", level=1)
    add_code_block(doc,
        "# Faal kardan (faghat Edit Token mitavanad chizi bebineh):\n"
        "sudo ./install.sh --ai-bind\n"
        "\n"
        "# Khamoosh kardan (Read Token ham kafi ast bara-ye khoondan):\n"
        "sudo ./install.sh --no-ai-bind")

    # ---- Section: Test-e vasl ----
    add_heading(doc, "7. Test-e Vasl az AI", level=1)
    add_para(doc,
        "Hala ke hameh chiz tanzim shod, AI bayad betavanad vasl shavad. AI in "
        "env variable-ha ra niaz darad:")
    add_code_block(doc,
        "export MAINTENANCE_TOKEN=\"<read-token>\"\n"
        "export MAINTENANCE_EDIT_TOKEN=\"<edit-token>\"\n"
        "export MAINTENANCE_ENC_KEY=\"<enc-key>\"\n"
        "export MAINTENANCE_URL=\"https://ehsanmorad.ir\"")
    add_para(doc, "Baad test konid:")
    add_code_block(doc,
        "bash scripts/maintenance.sh --ai-bind status")
    add_para(doc,
        "Bayad natije-ye mesle in begirid:")
    add_code_block(doc,
        '{\n'
        '  "ok": true,\n'
        '  "action": "status",\n'
        '  "data": {\n'
        '    "version": "1.0",\n'
        '    "uptimeSeconds": 42,\n'
        '    "counts": { "users": 1, "messages": 0, "chats": 0, ... }\n'
        '  }\n'
        '}')

    # ---- Section: Action-ha ----
    add_heading(doc, "8. List-e Tamam-e Action-ha-ye Kanal", level=1)

    add_heading(doc, "8.1. Action-ha-ye Khoondan (Read)", level=2)
    add_table(doc,
        ["Action", "Tawzeeh", "Niaz be Edit Token?"],
        [
            ["status", "Hal-e server, version, uptime, count-ha", "Agar AI_BIND=1: bale"],
            ["db-stats", "Tedad-e record-ha dar har table", "Agar AI_BIND=1: bale"],
            ["security-logs", "50 rokhad-e akhir-e amniyati", "Agar AI_BIND=1: bale"],
            ["messages", "50 payam-e akhir-e contact form", "Agar AI_BIND=1: bale"],
            ["chats", "List-e sessions-e chat-e bazdid-konandegan", "Agar AI_BIND=1: bale"],
            ["backup", "Backup-e fori-e database (ta 7 version)", "Agar AI_BIND=1: bale"],
            ["help", "List-e tamam-e action-ha", "Na"],
            ["texts.get", "Hameh matn-ha-ye site (3 zaban)", "Bale"],
            ["settings.get", "Hameh settings-ha (ba mask-e secret-ha)", "Bale"],
            ["nav.get", "Hameh item-ha-ye menu", "Bale"],
            ["clips.get", "Hameh clip-ha-ye Aparat", "Bale"],
            ["equipment.get", "Hameh dastgah-ha-ye azmayeshgah", "Bale"],
            ["content.get", "Hameh book/article/tutorial/skill", "Bale"],
            ["export-all", "Snapshot-e kamel-e data (bara-ye sync)", "Bale"],
        ],
        col_widths=[3, 7.5, 4])

    add_heading(doc, "8.2. Action-ha-ye Virayesh (Edit)", level=2)
    add_table(doc,
        ["Action", "Tawzeeh", "Mesal"],
        [
            ["texts.set", "Taghir ya ezafeh-e yek matn (3 zaban)",
             '{"key":"hero.greeting","valueFa":"Salam","valueEn":"Hello","valueDe":"Hallo"}'],
            ["settings.set", "Taghir-e yek setting (ghair-e secret)",
             '{"key":"contact_email","value":"info@ehsanmorad.ir"}'],
            ["nav.add", "Ezafeh kardan-e link be menu",
             '{"labelFa":"Blog","labelEn":"Blog","href":"/blog","visible":true}'],
            ["nav.update", "Taghir-e yek nav item",
             '{"id":"<id>","visible":false}'],
            ["clip.add", "Ezafeh kardan-e clip-e Aparat",
             '{"title":"Demo","embedCode":"<iframe...>","category":"intro","visible":true}'],
            ["clip.update", "Taghir-e yek clip",
             '{"id":"<id>","title":"Title-e jadid"}'],
            ["clip.set-visible", "Taghir-e visible-e yek clip",
             '{"id":"<id>","visible":false}'],
            ["equipment.set", "Taghir-e yek dastgah-e azmayeshgah",
             '{"id":"<id>","status":"maintenance"}'],
            ["content.set-visible", "Taghir-e visible-e yek content",
             '{"id":"<id>","type":"book","visible":true}'],
            ["help-edit", "List-e action-ha-ye virayesh", "(bedoon data)"],
            ["version", "Version-e server", "(bedoon data)"],
        ],
        col_widths=[3, 4.5, 7])

    # ---- Section: Misal-ha-ye amali ----
    add_heading(doc, "9. Misal-ha-ye Amali (Workflow-e Har Rooz)", level=1)

    add_heading(doc, "9.1. Didan-e Payam-ha-ye Jaded-e Contact Form", level=2)
    add_code_block(doc,
        "bash scripts/maintenance.sh --ai-bind messages")
    add_para(doc,
        "AI mitavanad in ra bekhohanad va be shoma beguyad: '3 payam-e jadid dari, "
        "az alan: Ali rezaa qabl az 2 saat: salam, gheymat-e ...?'")

    add_heading(doc, "9.2. Didan-e Chat-ha-ye Bazdid-konandegan", level=2)
    add_code_block(doc,
        "bash scripts/maintenance.sh --ai-bind chats")
    add_para(doc,
        "AI mitavanad chat-ha-ye faal ra bekhohanad va be shoma report dahad.")

    add_heading(doc, "9.3. Ezafeh kardan-e yek Clip-e Aparat", level=2)
    add_code_block(doc,
        "bash scripts/maintenance.sh --ai-bind clip.add --data '{\n"
        "  \"title\": \"Moqaddeme-ye Azmayeshgah\",\n"
        "  \"embedCode\": \"<iframe src=\\\"https://www.aparat.com/video/...\\\" "
        "width=\\\"640\\\" height=\\\"360\\\" allowfullscreen=\\\"true\\\"></iframe>\",\n"
        "  \"category\": \"intro\",\n"
        "  \"visible\": true\n"
        "}'")

    add_heading(doc, "9.4. Taghir-e matn-e Hero", level=2)
    add_code_block(doc,
        "bash scripts/maintenance.sh --ai-bind texts.set --data '{\n"
        "  \"key\": \"hero.greeting\",\n"
        "  \"valueFa\": \"Salam, man Ehsan Morad hastam\",\n"
        "  \"valueEn\": \"Hello, I am Ehsan Morad\",\n"
        "  \"valueDe\": \"Hallo, ich bin Ehsan Morad\"\n"
        "}'")

    add_heading(doc, "9.5. Backup-e Fori", level=2)
    add_code_block(doc,
        "bash scripts/maintenance.sh --ai-bind backup")
    add_para(doc,
        "Backup dar posheh-e backups/ dar server zakhireh mishavad. 7 version-e "
        "akhar negah midarad.")

    # ---- Section: Sync be GitHub ----
    add_heading(doc, "10. Sync-e Server be GitHub (Bara-ye Hamgasazi-e seh-layeheh)", level=1)
    add_para(doc,
        "Baed az har taghir-e virayeshi, bayad server be GitHub sync shavad ta "
        "offline-e shoma ham hamoon taghir ra bebinad. In kar baa yek farman:")
    add_code_block(doc,
        "# Bara-ye sync-e faghat (bedoon-e virayesh):\n"
        "bash scripts/sync-server-to-github.sh\n"
        "\n"
        "# Ya yek farman: virayesh + sync-e khodkar:\n"
        "bash scripts/ai-edit-online.sh texts.set --data '{...}'")
    add_para(doc,
        "ai-edit-online.sh avval virayesh ra anjam midahad, va agar movaffagh "
        "shavad, sync-server-to-github.sh ra seda mizanad ke snapshot.json ra be "
        "shakhe-ye server-state dar GitHub push konad.")

    # ---- Section: Khata-ha ----
    add_heading(doc, "11. Khata-ha-ye Momken", level=1)
    add_table(doc,
        ["HTTP", "Khata", "Hal"],
        [
            ["403", "forbidden", "IP dar allowlist nist — curl ifconfig.me kon va be install.sh --ip-allowlist ezafeh kon"],
            ["401", "unauthorized", "MAINTENANCE_TOKEN eshtebah — az server: sudo cat db/.maintenance-token.txt"],
            ["403", "edit_token_required", "AI_BIND=1 va EDIT_TOKEN nist — export MAINTENANCE_EDIT_TOKEN=..."],
            ["426", "encryption_required", "ENC_KEY dar server vali dar client nist — export MAINTENANCE_ENC_KEY=..."],
            ["503", "maintenance_disabled", "TOKEN kamtar az 32 char — sudo ./install.sh dobareh"],
            ["400", "enc_stale_timestamp", "saat-e client va server >5min — sudo systemctl restart systemd-timesyncd"],
            ["400", "enc_replay_detected", "haman request dobarh ersal shode — script khod nonce-e jadid tolid mikonad"],
            ["429", "rate_limit", "bish az 60 request dar 5 daqiqe — sabr kon"],
        ],
        col_widths=[1.5, 4, 9.5])

    add_para(doc, "")
    add_para(doc,
        "Bara-ye estefadeh az yek agent-e arzontar agar in agent gheymat-e bish "
        "az 20 darsad-e budget shoma shavad, sanad-e sevom (03-Rahnama-ye-Agent-Arzontar.docx) "
        "ra be-khoonid.", italic=True)

    out_path = os.path.join(OUT_DIR, "03-Rahnama-ye-Vasl-e-AI.docx")
    doc.save(out_path)
    print(f"[OK] {out_path}")
    return out_path


# ============================================================================
# Document 3: Rahnama-ye-Agent-Arzontar (Cheaper Agent Fallback Guide)
# ============================================================================

def build_doc3_agent_arzontar():
    doc = Document()
    setup_doc_styles(doc)

    add_cover(doc,
              "Rahnama-ye Agent-e Arzontar",
              "Cheh konim agar in agent gheymat-e bish az 20 darsad-e budget shoma shavad",
              "03")

    # ---- Section: Mokhaddameh ----
    add_heading(doc, "1. Mokhaddameh — Chera In Sanad?", level=1)
    add_para(doc,
        "Shoma yek moshkel-e muhem darmord kardeed: sherkat-ha-ye AI (mesl-e "
        "Anthropic, OpenAI, Z.ai, ...) betore moratab mahdodiat mi-gozarand va "
        "gheymat-ha-ye an-ha bish az 20 darsad-e budget shoma ast. Yani agar "
        "in agent (man) gheymat-e bish az 20 darsad-e budget shoma shavad ya "
        "ghair-e dastresi shavad, shoma nemitavanid hameh ruz ba man kar konid.")

    add_para(doc,
        "Khoshbakhataneh, kanal-e maintenance ke baraye shoma sakhtam, "
        "ghair-e vabasteh be hich AI-e khasi ast. In yani har agent-e AI "
        "(mesl-e GLM-4 Flash, Claude Haiku, GPT-4o-mini, ya hata yek model-e "
        "local mesl-e Llama 3) mitavanad az in kanal estefadeh konad — faghat "
        "bayad betavanad bash script run konad va curl bezanad.")

    add_callout(doc,
        "Peygham-e asasi:",
        "In sanad ra neveshtam ta bedoonid cheh konid agar man gheymat-e bish "
        "az 20 darsad-e budget shoma shodam. Yek agent-e arzontar ra entekhab "
        "konid, in rahnama ra be-dahid be an, va an mitavanad hameh kar-ha-ye "
        "rozaneh ra anjam dahad.")

    # ---- Section: Chera Mumkin Ast ----
    add_heading(doc, "2. Chera Estefadeh az Agent-e Arzontar Mumkin Ast?", level=1)
    add_para(doc,
        "In kanal baa estefadeh az standard-ha-ye baz (HTTP, JSON, AES-256-GCM, "
        "bash) sakhte shodeh ast. Hich vabastegi-e khasi be yek AI nadorad. Yani "
        "har chizi ke betavaned:")
    add_bullet(doc, "Bash script run konad (Linux ya Mac)")
    add_bullet(doc, "Baa curl HTTP request befrestad")
    add_bullet(doc, "Node.js script run konad (bara-ye ramz kardan-e AES-256-GCM)")
    add_bullet(doc, "JSON ra be-khohanad va befahmad")
    add_bullet(doc, "Finglish (Farsi baa horoof-e Latini) ra be-khohanad va benevisad")
    add_para(doc,
        "...mitavanad az kanal estefadeh konad. Hata yek script-e simple bash "
        "(bedoon-e AI) mitavanad hameh action-ha ra anjam dahad — faghat bayad "
        "shoma yek system prompt-e khoob dahid be agent-e arzontar.")

    # ---- Section: Agent-ha-ye Arzontar ----
    add_heading(doc, "3. Gheyne-ha-ye Mumkin (Agent-ha-ye Arzontar)", level=1)
    add_para(doc,
        "In list-e agent-ha-ye AI hast ke mitonand az kanal estefadeh konand va "
        "gheymat-e an-ha kamtar az man ast (tahminan, bara-ye 1M token):")

    add_table(doc,
        ["Agent", "Sherekat", "Gheymat-e input (~1M token)", "Tavajjoh"],
        [
            ["GLM-4 Flash", "Z.ai", "~$0.10", "Arzontar-in; kheili sust vali kafi"],
            ["Claude Haiku", "Anthropic", "~$0.25", "Sari-e khoob; kheili munaseb"],
            ["GPT-4o-mini", "OpenAI", "~$0.15", "Arzontar; kheili sari"],
            ["Llama 3.1 70B (local)", "—", "$0 (barq-e hardware)", "Agar GPU darid; hich-gheymat"],
            ["DeepSeek V3", "DeepSeek", "~$0.14", "Arzontar; khoob bara-ye code"],
            ["Gemini 1.5 Flash", "Google", "~$0.075", "Arzontar-tarin; baaz limit"],
        ],
        col_widths=[4, 3, 4, 4])

    add_callout(doc,
        "Tavajjoh:",
        "In gheymat-ha tahmini hastand va mitavand taghir konand. Qabl az entekhab, "
        "website-e sherkat ra check konid. Hameh in agent-ha mitavand bash script "
        "run konand agar API-e an-ha dashteh bashid bash script bezanid.")

    # ---- Section: Chiz-ha-ye Lazem ----
    add_heading(doc, "4. Chiz-ha-ye Lazem Bara-ye Agent-e Arzontar", level=1)
    add_para(doc,
        "Bara-ye inke yek agent-e arzontar betavanad az kanal estefadeh konad, "
        "bayad in 5 chiz ra dashteh bashad:")
    add_table(doc,
        ["#", "Chiz", "Kojast?", "Tawzeeh"],
        [
            ["1", "Maintenance.sh script", "scripts/maintenance.sh dar repo-e GitHub",
             "Client-e kanal — hameh action-ha az in run mishavand"],
            ["2", "Maintenance-enc.mjs script", "scripts/maintenance-enc.mjs",
             "Bara-ye ramz kardan-e request/response (AES-256-GCM)"],
            ["3", "MAINTENANCE_TOKEN", "az server: db/.maintenance-token.txt",
             "Read token — bara-ye khoondan"],
            ["4", "MAINTENANCE_EDIT_TOKEN", "az server: db/.maintenance-edit-token.txt",
             "Edit token — bara-ye virayesh (muhem!)"],
            ["5", "MAINTENANCE_ENC_KEY", "az server: db/.maintenance-enc-key.txt",
             "Encryption key (64 hex)"],
        ],
        col_widths=[1, 4.5, 4.5, 4.5])

    add_para(doc,
        "In 5 chiz ra az server begirid va dar yek file-e amn (chmod 600) zakhireh "
        "konid. Hargiz in file ra be kasi nadeh.")

    # ---- Section: Setup-e Agent-e Arzontar ----
    add_heading(doc, "5. Setup-e Agent-e Arzontar — Gham be Gham", level=1)

    add_heading(doc, "5.1. Qadam 1: clone kardan-e repo", level=2)
    add_code_block(doc,
        "# Dar yek directory-e amn dar laptop-e shoma (ya server-e cloud):\n"
        "git clone https://github.com/ldrcoir/ehsan-site.git\n"
        "cd ehsan-site")

    add_heading(doc, "5.2. Qadam 2: tanzim-e env variable-ha", level=2)
    add_code_block(doc,
        "# In khat ra dar yek file-e matni (mesl-e ~/.ehsan-maintenance.env) zakhireh kon:\n"
        "export MAINTENANCE_TOKEN=\"<read-token>\"\n"
        "export MAINTENANCE_EDIT_TOKEN=\"<edit-token>\"\n"
        "export MAINTENANCE_ENC_KEY=\"<enc-key>\"\n"
        "export MAINTENANCE_URL=\"https://ehsanmorad.ir\"\n"
        "export MAINTENANCE_AI_BIND=1\n"
        "\n"
        "# Hifz-e amn:\n"
        "chmod 600 ~/.ehsan-maintenance.env\n"
        "\n"
        "# Bara-ye load kardan dar session-e bash:\n"
        "source ~/.ehsan-maintenance.env")

    add_heading(doc, "5.3. Qadam 3: Test-e vasl", level=2)
    add_code_block(doc,
        "cd ehsan-site\n"
        "bash scripts/maintenance.sh --ai-bind status\n"
        "\n"
        "# Bayad: {\"ok\":true,...}")

    # ---- Section: System Prompt ----
    add_heading(doc, "6. System Prompt Bara-ye Agent-e Arzontar", level=1)
    add_para(doc,
        "In yek system prompt-e aamad-e-khonneh ast ke mitavanid bedahid be "
        "agent-e arzontar. In prompt ra be-ghalb-e conversation-e an copy konid:")

    add_code_block(doc,
        "=== SYSTEM PROMPT BARA-YE AGENT-E EHsan SITE ===\n"
        "\n"
        "To yek dastiar-e AI hasti ke baraye Ehsan Morad (ehsanmorad.ir) kar mikonid.\n"
        "Site-e an roye VPS 31.70.76.10 nasb shodeh va yek kanal-e maintenance\n"
        "khosoosi darad ke shoma az tarigh-e an mitavanid data ra be-khanid va\n"
        "taghir dahid.\n"
        "\n"
        "--- QAEDA-E ASASI ---\n"
        "1. Hameh matn ra be Finglish benevis (Farsi baa horoof-e Latini).\n"
        "   Ehsan keyboard-e Farsi nadarad va nemitavanad horoof-e Farsi be-khohanad.\n"
        "2. Hargiz be-soorat-e mokhtasar pasn bedeh. Hamesheh mofassal tozih bedeh.\n"
        "3. Hargiz code ra mostaghim dar database-e local taghir nadeh.\n"
        "   Hameh taghirat bayad az tarigh-e kanal-e maintenance anjam shavand.\n"
        "\n"
        "--- KANAL-E MAINTENANCE ---\n"
        "Bara-ye anjam kardan-e har action, in farman ra estefadeh kon:\n"
        "\n"
        "  bash scripts/maintenance.sh --ai-bind <action> [--data '{<json>}']\n"
        "\n"
        "Action-ha-ye khoondan: status, db-stats, security-logs, messages,\n"
        "  chats, backup, help, texts.get, settings.get, nav.get, clips.get,\n"
        "  equipment.get, content.get, export-all\n"
        "\n"
        "Action-ha-ye virayesh (bayad --data dashteh bashand):\n"
        "  texts.set, settings.set, nav.add, nav.update, clip.add, clip.update,\n"
        "  clip.set-visible, equipment.set, content.set-visible\n"
        "\n"
        "--- MESAL ---\n"
        "Bara-ye didan-e payam-ha:\n"
        "  bash scripts/maintenance.sh --ai-bind messages\n"
        "\n"
        "Bara-ye ezafeh kardan-e clip-e Aparat:\n"
        "  bash scripts/maintenance.sh --ai-bind clip.add --data '{\n"
        "    \"title\": \"Onvan-e Clip\",\n"
        "    \"embedCode\": \"<iframe src=\\\"https://www.aparat.com/video/...\\\" ...>\",\n"
        "    \"category\": \"intro\",\n"
        "    \"visible\": true\n"
        "  }'\n"
        "\n"
        "--- SYNC BE GITHUB ---\n"
        "Baed az har taghir-e virayeshi, hameh ra be GitHub sync konid:\n"
        "  bash scripts/sync-server-to-github.sh\n"
        "Ya estefadeh az ai-edit-online.sh ke khodkar sync mikonad:\n"
        "  bash scripts/ai-edit-online.sh <action> --data '{<json>}'\n"
        "\n"
        "--- KODAM CHIZ-HA RA NEMITONI ANJAM DAHI ---\n"
        "- Push-e code be GitHub main branch (bayad GITHUB_TOKEN dashteh bashi)\n"
        "- Run-e test-harness (bayad hameh repo dashteh bashi)\n"
        "- Taghir-e code-e Next.js (bayad developer-e asli an ra anjam dahad)\n"
        "\n"
        "--- KODAM CHIZ-HA RA MITONI ANJAM DAHI ---\n"
        "- Hameh action-ha-ye khoondan va virayesh-e maintenance\n"
        "- Ezafeh kardan-e clip-ha-ye Aparat baa cover-e ziba\n"
        "- Taghir-e matn-ha-ye site (3 zaban)\n"
        "- Taghir-e settings (mesl-e contact_email, social URLs, ...)\n"
        "- Ezafeh kardan-e nav item-ha\n"
        "- Didan-e payam-ha-ye contact va chat-ha\n"
        "- Backup-e database\n"
        "- Sync be GitHub (snapshot be shakhe-ye server-state)\n"
        "\n"
        "--- KHATA-HA ---\n"
        "403 Forbidden: IP dar allowlist nist — be Ehsan begoo IP-e jadid ra\n"
        "  ezafeh konad: sudo ./install.sh --ip-allowlist \"<IP>\"\n"
        "401 Unauthorized: TOKEN eshtebah ast\n"
        "426 encryption_required: ENC_KEY set nashodeh — source ~/.ehsan-maintenance.env\n"
        "=== END SYSTEM PROMPT ===")

    # ---- Section: Action-ha-ye Mumkin ----
    add_heading(doc, "7. Action-ha-ye Mumkin bara-ye Agent-e Arzontar", level=1)
    add_para(doc,
        "In list-e hameh chiz-ha-ye ke yek agent-e arzontar mitavanad anjam dahad. "
        "Hameh in baa estefadeh az scripts/maintenance.sh mumkin ast:")

    add_heading(doc, "7.1. Khoondan-e Data", level=2)
    add_bullet(doc, "Payam-ha-ye contact form — messages")
    add_bullet(doc, "Chat-ha-ye bazdid-konandegan — chats")
    add_bullet(doc, "Log-ha-ye amniyati — security-logs")
    add_bullet(doc, "Amar-e server (uptime, count-ha) — status")
    add_bullet(doc, "Tedad-e record-ha dar har table — db-stats")
    add_bullet(doc, "Hameh matn-ha-ye site — texts.get")
    add_bullet(doc, "Hameh settings-ha — settings.get")
    add_bullet(doc, "Hameh nav items — nav.get")
    add_bullet(doc, "Hameh clip-ha-ye Aparat — clips.get")
    add_bullet(doc, "Hameh dastgah-ha-ye azmayeshgah — equipment.get")
    add_bullet(doc, "Hameh book/article/tutorial/skill — content.get")
    add_bullet(doc, "Snapshot-e kamel-e data — export-all")

    add_heading(doc, "7.2. Virayesh-e Data", level=2)
    add_bullet(doc, "Taghir-e matn-e hero, about, contact, ... — texts.set")
    add_bullet(doc, "Taghir-e contact_email, social URLs, AI rules, ... — settings.set")
    add_bullet(doc, "Ezafeh ya taghir-e nav items — nav.add / nav.update")
    add_bullet(doc, "Ezafeh ya taghir-e clip-ha-ye Aparat — clip.add / clip.update")
    add_bullet(doc, "Taghir-e visible-e clip — clip.set-visible")
    add_bullet(doc, "Taghir-e status-e dastgah-e azmayeshgah — equipment.set")
    add_bullet(doc, "Taghir-e visible-e content — content.set-visible")

    add_heading(doc, "7.3. Kar-ha-ye Diger", level=2)
    add_bullet(doc, "Backup-e fori-e database — backup")
    add_bullet(doc, "Sync-e server be GitHub — sync-server-to-github.sh")
    add_bullet(doc, "Yek farman: virayesh + sync — ai-edit-online.sh")

    # ---- Section: Action-ha-ye Mumkin Nist ----
    add_heading(doc, "8. Action-ha-ye ke Agent-e Arzontar Nemitavanad Anjam Dahad", level=1)
    add_para(doc,
        "In chiz-ha baraye developer-e asli (man) hastand. Yek agent-e arzontar "
        "nemitavanad in kar-ha ra anjam dahad chon niaz be GitHub token ya taghir-e "
        "code darad:")

    add_table(doc,
        ["Action", "Tawzeeh", "Hal-e Pishnahadi"],
        [
            ["Push-e code be main branch-e GitHub",
             "Bara-ye taghir-e code-e Next.js",
             "Az developer-e asli (man) be-khohid, ya khodetoon baa GITHUB_TOKEN anjam dahid"],
            ["Run-e test-harness",
             "43 test-e kamel-e amniyati",
             "Az developer-e asli be-khohid"],
            ["Taghir-e schema-e database",
             "Ezafeh kardan-e table-e jadid",
             "Az developer-e asli be-khohid"],
            ["Nasb-ejadid-e site roye VPS",
             "Bara-ye upgrade-e version-e Next.js",
             "Az developer-e asli be-khohid"],
        ],
        col_widths=[4, 4, 6.5])

    # ---- Section: Workflow-e rozaneh ----
    add_heading(doc, "9. Workflow-e Har Rooz baa Agent-e Arzontar", level=1)
    add_para(doc,
        "In yek workflow-e mesal hast ke mitavanid baa agent-e arzontar anjam dahid. "
        "In prompt ra be-dahid be an:")

    add_code_block(doc,
        "Workflow-e har rooz:\n"
        "\n"
        "1. Status-e server ra check kon: bash scripts/maintenance.sh --ai-bind status\n"
        "2. Hameh payam-ha-ye jadid ra be-khohan: bash scripts/maintenance.sh --ai-bind messages\n"
        "3. Hameh chat-ha-ye faal ra be-khohan: bash scripts/maintenance.sh --ai-bind chats\n"
        "4. Hameh rokhad-e amniyati ra be-khohan: bash scripts/maintenance.sh --ai-bind security-logs\n"
        "5. Be Ehsan report bedeh: chand payam-e jadid, chand chat-e faal, khati-e amniyati hast ya na\n"
        "6. Agar Ehsan khast chizi taghir dahid, baa ai-edit-online.sh an ra anjam bedeh\n"
        "7. Baed az har taghir, sync-server-to-github.sh khodkar run mishavad\n"
        "8. Hameh ra be Finglish va mofassal be-nehvis")

    # ---- Section: Test-e kanal bara-ye arzontar ----
    add_heading(doc, "10. Test-e Kanal Bara-ye Agent-e Arzontar", level=1)
    add_para(doc,
        "Qabl az inke be agent-e arzontar etminan dashteh bashid, in test ra "
        "anjam dahid ta motmaen shavid ke an mitavanad vasl shavad:")

    add_code_block(doc,
        "# 1. IP-e mashin-e agent-e arzontar ra peyda kon:\n"
        "curl -s https://api.ipify.org && echo\n"
        "\n"
        "# 2. In IP ra be install.sh --ip-allowlist ezafeh kon (dar server):\n"
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site-rev5/personal-site\n"
        "sudo ./install.sh --ip-allowlist \"<IP-E-AGENT>,<IP-E-GHABL>\"  # hameh IP-ha\n"
        "\n"
        "# 3. Dar mashin-e agent-e arzontar:\n"
        "git clone https://github.com/ldrcoir/ehsan-site.git\n"
        "cd ehsan-site\n"
        "source ~/.ehsan-maintenance.env  # env variables\n"
        "\n"
        "# 4. Test:\n"
        "bash scripts/maintenance.sh --ai-bind status\n"
        "\n"
        "# Bayad: {\"ok\":true,...}")

    # ---- Section: Bahre-bardari az chat-ha ----
    add_heading(doc, "11. Bahre-bardari az Chat-ha (Yek Misal-e Amali)", level=1)
    add_para(doc,
        "Yek misal-e amali bara-ye inke agent-e arzontar chetor mitavanad be "
        "shoma komak konad. Farz mikonim yek bazdid-konandeh payam dadeh ast:")

    add_code_block(doc,
        "# Agent-e arzontar in ra run mikonad:\n"
        "bash scripts/maintenance.sh --ai-bind messages\n"
        "\n"
        "# Natijeh mesl-e in:\n"
        "# {\n"
        "#   \"ok\": true,\n"
        "#   \"data\": {\n"
        "#     \"messages\": [\n"
        "#       {\"id\":\"abc123\",\"name\":\"Ali Rezaa\",\"email\":\"ali@example.com\",\n"
        "#        \"message\":\"Salam, gheymat-e doreh-e training cheqadr ast?\",\n"
        "#        \"createdAt\":\"2025-11-25T10:30:00Z\",\"status\":\"new\"}\n"
        "#     ]\n"
        "#   }\n"
        "# }\n"
        "\n"
        "# Agent-e arzontar be shoma migooyad:\n"
        "# 'Ehsan agha, 1 payam-e jadid dari:\n"
        "#  Ali Rezaa (ali@example.com) qabl az 30 daqiqeh:\n"
        "#  Salam, gheymat-e doreh-e training cheqadr ast?\n"
        "#  Status: hanooz javab nadadeh-eh. Mikhohid javab bedam?'")

    # ---- Section: Bahre-bardari az clip-ha-ye Aparat ----
    add_heading(doc, "12. Ezafeh kardan-e Clip-ha-ye Aparat baa Cover-e Ziba", level=1)
    add_para(doc,
        "Yek misal-e diger: shoma mikhohid yek clip-e Aparat ra be site ezafeh "
        "konid. Agent-e arzontar mitavanad in ra baa cover-e ziba anjam dahad:")

    add_code_block(doc,
        "# Shoma be agent migooyid:\n"
        "# 'In clip ra be site ezafeh kon: https://www.aparat.com/v/abc123\n"
        "#  Onvan: Moqaddeme-ye Azmayeshgah-e Laser\n"
        "#  Bakhsh: intro'\n"
        "\n"
        "# Agent-e arzontar in ra run mikonad:\n"
        "bash scripts/ai-edit-online.sh clip.add --data '{\n"
        "  \"title\": \"Moqaddeme-ye Azmayeshgah-e Laser\",\n"
        "  \"embedCode\": \"<iframe src=\\\"https://www.aparat.com/video/abc123\\\" "
        "width=\\\"640\\\" height=\\\"360\\\" allowfullscreen=\\\"true\\\" "
        "style=\\\"border:none;\\\"></iframe>\",\n"
        "  \"category\": \"intro\",\n"
        "  \"visible\": true\n"
        "}'\n"
        "\n"
        "# Baed az in, automatic sync be GitHub anjam mishavad.\n"
        "# Agent migooyad:\n"
        "# 'Clip-e \"Moqaddeme-ye Azmayeshgah-e Laser\" baa movaffaghiat ezafeh shod.\n"
        "#  ID: <clip-id>\n"
        "#  Hal-e visible: true\n"
        "#  Baed az 5 daqiqeh, snapshot be GitHub push shod.'")

    # ---- Section: Cost comparison ----
    add_heading(doc, "13. Moghaeseh-ye Gheymat (Tahmini)", level=1)
    add_para(doc,
        "In moghaeseh bar asas-e 1 milyoun token-e input dar mah hast (bar asas-e "
        "kar-e rozaneh-e shoma baa AI):")

    add_table(doc,
        ["Agent", "Gheymat-e 1M token (input)", "Gheymat-e mahaneh (tahmini)", "Darsad-e budget agar budget-e shoma $50/mah bashad"],
        [
            ["Man (premium AI)", "$3-15", "$30-150", "60-300%"],
            ["Claude Haiku", "$0.25", "$2.50-5", "5-10%"],
            ["GPT-4o-mini", "$0.15", "$1.50-3", "3-6%"],
            ["GLM-4 Flash", "$0.10", "$1-2", "2-4%"],
            ["Gemini 1.5 Flash", "$0.075", "$0.75-1.50", "1.5-3%"],
            ["Llama 3.1 (local)", "$0 (barq)", "$0-5 (barq)", "0-10%"],
        ],
        col_widths=[3.5, 3, 3, 4])

    add_callout(doc,
        "Tavajjoh:",
        "In gheymat-ha tahmini hastand va mitavand taghir konand. Dar mah-e avval "
        "test-e-agent kon — yek haft baa agent-e arzontar kar kon, va agar "
        "movaffagh bud, be an switch kon.")

    # ---- Section: Bazyabi ----
    add_heading(doc, "14. Bazyabi — Bazgasht be Man agar loozom bud", level=1)
    add_para(doc,
        "Agar agent-e arzontar kar-e muhemi ra nemitavanest anjam dahad ya "
        "kheili sust bud, mitavanid be man (agent-e premium) bargardid. Bara-ye "
        "in kar, faghat man ra dar yek session-e jaded start konid va in "
        "ravenna ra behem bedahid:")

    add_code_block(doc,
        "Bargasht-e session ba agent-e premium:\n"
        "\n"
        "1. Yek session-e jaded ba man (agent-e premium) start kon\n"
        "2. In rahnama ra behem bedeh (copy-paste):\n"
        "   'Man yek site darim (ehsanmorad.ir) ke roye VPS 31.70.76.10 nasb shodeh.\n"
        "    Repo: github.com/ldrcoir/ehsan-site\n"
        "    Hameh script-ha dar scripts/ hastand.\n"
        "    Yek agent-e arzontar baa in kanal kar mikonad vali hanooz ...\n"
        "    (masalan: clip.add ba IP eshtebah kard, mikhoham check koni).'\n"
        "3. Man baed az inke motmaen shodam IP-e man dar allowlist ast, "
        "bash scripts/maintenance.sh --ai-bind status run mikonam.\n"
        "4. Hameh chiz roye server ra mitonam be-binam va taghir daham.")

    # ---- Section: Tavsiyeh-ha ----
    add_heading(doc, "15. Tavsiyeh-ha-ye Payani", level=1)
    add_bullet(doc, "Avval baa man (agent-e premium) kar kon ta hameh chiz nasb va test shavad.")
    add_bullet(doc, "Baed 1-2 haft, yek agent-e arzontar ra test kon (mesl-e Claude Haiku ya GPT-4o-mini).")
    add_bullet(doc, "Agar agent-e arzontar kheili arzontar bud (mesl-e Gemini Flash), mitavanid baa an baaaz-e kar-ha-ye sadeh ra anjam dahid.")
    add_bullet(doc, "Bara-ye kar-ha-ye muhem (code changes, schema), be man (agent-e premium) bargardid.")
    add_bullet(doc, "Hameh token-ha ra dar yek file-e amn (chmod 600) dar laptop negah darid.")
    add_bullet(doc, "Hare mah yek bar test-harness ra run konid (ba man ya baa agent-e arzontar ke mitavanad an ra download va run konad).")

    add_para(doc, "")
    add_para(doc,
        "In sanad tammat shod. Bara-ye rahnama-ye nasb-e avvali-e site, sanad-e "
        "01-Rahnama-ye-Nasb.docx ra be-khoonid. Bara-ye tanzim-e kanal-e maintenance, "
        "sanad-e 02-Rahnama-ye-Vasl-e-AI.docx ra be-khoonid.", italic=True)

    out_path = os.path.join(OUT_DIR, "04-Rahnama-ye-Agent-Arzontar.docx")
    doc.save(out_path)
    print(f"[OK] {out_path}")
    return out_path


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    p1 = build_doc1_nasb()
    p2 = build_doc2_ai_vasl()
    p3 = build_doc3_agent_arzontar()
    print("\n=== Tamam-e sanad-ha sakhte shodand ===")
    for p in [p1, p2, p3]:
        import subprocess
        result = subprocess.run(['ls', '-lh', p], capture_output=True, text=True)
        print(result.stdout.strip())
