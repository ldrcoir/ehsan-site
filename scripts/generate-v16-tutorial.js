// generate-v16-tutorial.js — تولید فایل Word آموزشی V16

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, Footer, Header, PageNumber, TableOfContents,
} = require("docx");

const FONT_FA = "Vazirmatn";
const FONT_CODE = "Consolas";
const COLOR_PRIMARY = "008F11";
const COLOR_HEADING = "006400";
const COLOR_DIM = "4A7A4A";
const COLOR_CODE_BG = "F5F5F5";
const COLOR_NOTE_BG = "FFF8E1";

function faPara(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22, rightToLeft: true, ...opts })],
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 120 }, bidirectional: true,
  });
}
function codePara(text) {
  return new Paragraph({
    children: [new TextRun({ text: text || " ", font: FONT_CODE, size: 18, color: "333333" })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_CODE_BG, color: "auto" },
    spacing: { line: 280, after: 0 }, indent: { left: 240 },
  });
}
function codeBlock(code) { return code.split("\n").map(line => codePara(line)); }
function heading(text, level = 1) {
  const sizes = { 1: 36, 2: 30, 3: 26 };
  const colors = { 1: COLOR_HEADING, 2: COLOR_PRIMARY, 3: COLOR_PRIMARY };
  const levels = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };
  return new Paragraph({
    heading: levels[level],
    children: [new TextRun({ text, font: FONT_FA, size: sizes[level], bold: true, color: colors[level], rightToLeft: true })],
    spacing: { before: 400, after: 200 }, bidirectional: true,
  });
}
function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22, rightToLeft: true })],
    bullet: { level: 0 }, spacing: { line: 340, after: 80 }, bidirectional: true, alignment: AlignmentType.RIGHT,
  });
}
function noteBox(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 20, color: "795548", rightToLeft: true })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_NOTE_BG, color: "auto" },
    spacing: { line: 320, before: 120, after: 120 }, indent: { left: 240, right: 240 },
    border: { top: { style: BorderStyle.SINGLE, size: 1, color: "FFB000" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "FFB000" }, left: { style: BorderStyle.SINGLE, size: 6, color: "FFB000" }, right: { style: BorderStyle.SINGLE, size: 1, color: "FFB000" } },
    bidirectional: true,
  });
}
function makeTable(rows, headers) {
  const tableRows = [new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT_FA, size: 20, bold: true, color: "FFFFFF", rightToLeft: true })], alignment: AlignmentType.CENTER, bidirectional: true })],
      shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY, color: "auto" }, margins: { top: 80, bottom: 80, left: 80, right: 80 },
    })), tableHeader: true,
  })];
  for (const row of rows) {
    tableRows.push(new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(cell), font: FONT_FA, size: 18, rightToLeft: true })], bidirectional: true })],
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })), cantSplit: true,
    }));
  }
  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

const children = [];

// جلد
children.push(new Paragraph({ children: [new TextRun({ text: " ", size: 48 })], spacing: { before: 3000 } }));
children.push(new Paragraph({
  children: [new TextRun({ text: "آموزش کامل ساخت سایت شخصی", font: FONT_FA, size: 60, bold: true, color: "39FF14", rightToLeft: true })],
  alignment: AlignmentType.CENTER, spacing: { after: 240 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "نسخه V16.0 — ۱۴۰۳", font: FONT_FA, size: 36, color: COLOR_PRIMARY, rightToLeft: true })],
  alignment: AlignmentType.CENTER, spacing: { after: 600 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "Next.js 16 · TypeScript · Prisma · SQLite", font: FONT_CODE, size: 24, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER, spacing: { after: 2400 },
}));
children.push(pageBreak());

children.push(heading("فهرست مطالب", 1));
children.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(pageBreak());

// فصل ۱
children.push(heading("فصل ۱: مقدمه", 1));
children.push(faPara("این آموزش کامل ساخت یه سایت شخصی حرفه‌ای با پنل ادمین، سیستم کاربران، امنیت کامل و امکانات گسترده رو آموزش می‌ده."));
children.push(heading("۱.۱ امکانات سایت V16", 2));
children.push(makeTable([
  ["صفحه اصلی", "معرفی، مهارت‌ها، کتاب‌ها، مقالات، آموزش‌ها، کلیپ‌ها، تماس"],
  ["پنل ادمین", "۱۰ تب مدیریت کامل"],
  ["سیستم کاربران", "ورود/خروج، دسترسی زمانی، دسترسی بخش‌بندی"],
  ["کلیپ آپارات", "مدیریت ویدیو با sanitize امن"],
  ["هوش مصنوعی", "چت با Ollama/OpenAI/Groq"],
  ["امنیت", "bcrypt، session، rate limit، XSS prevention، timingSafeEqual"],
  ["SEO", "OpenGraph، Twitter، JSON-LD، sitemap، robots، manifest"],
], ["بخش", "توضیح"]));
children.push(pageBreak());

// فصل ۲
children.push(heading("فصل ۲: نصب", 1));
children.push(faPara("نصب با یه دستور:"));
children.push(...codeBlock(`wget https://github.com/ldrcoir/ehsan-site/raw/main/public/install-v16.zip
unzip install-v16.zip
cd personal-site
sudo ./install.sh`));
children.push(noteBox("اسکریپت خودش Node.js، Nginx، Swap، SESSION_SECRET رو نصب/تولید می‌کنه."));
children.push(pageBreak());

// فصل ۳
children.push(heading("فصل ۳: امنیت (V16)", 1));
children.push(heading("۳.۱ احراز هویت یکپارچه", 2));
children.push(faPara("سیستم checkAdminAuth هم session cookie و هم password رو چک می‌کنه:"));
children.push(...codeBlock(`// ۱. اول session cookie
const session = getSessionFromRequest(request);
if (session) { /* check admin role */ }
// ۲. اگه نشد، password
if (password) { return checkAdminPassword(password); }`));
children.push(heading("۳.۲ محدودیت ورود", 2));
children.push(...codeBlock(`// ۵ تلاش در ۱۵ دقیقه
const rateLimitKey = ip || "unknown";
if (!checkRateLimit(rateLimitKey)) {
  return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
}`));
children.push(heading("۳.۳ جلوگیری از XSS", 2));
children.push(faPara("کد امبد آپارات فقط iframe از دامنه‌های مجاز قبول می‌کنه:"));
children.push(...codeBlock(`const ALLOWED_DOMAINS = ["aparat.com", "youtube.com", "youtu.be"];
// فقط iframe با src مجاز — بقیه تگ‌ها حذف می‌شن`));
children.push(heading("۳.۴ SESSION_SECRET اجباری", 2));
children.push(...codeBlock(`if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET env var is required");
}`));
children.push(heading("۳.۵ timingSafeEqual", 2));
children.push(faPara("برای جلوگیری از timing attack در مقایسه HMAC:"));
children.push(...codeBlock(`const sigBuf = Buffer.from(sig, "hex");
const expBuf = Buffer.from(expectedSig, "hex");
if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf))
  return null;`));
children.push(heading("۳.۶ Cookie امن", 2));
children.push(...codeBlock(`response.cookies.set("access_session", token, {
  httpOnly: true,
  secure: true,        // همیشه
  sameSite: "strict",  // ضد CSRF
  path: "/",
  maxAge: 60 * 60 * 24,
});`));
children.push(heading("۳.۷ Security Headers", 2));
children.push(...codeBlock(`// next.config.ts
headers: [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
]`));
children.push(heading("۳.۸ reCAPTCHA اجباری", 2));
children.push(...codeBlock(`// اگه captcha نباشه → 400
// اگه network error بشه → 503 (fail-closed)
// با URLSearchParams (جلوگیری از param injection)`));
children.push(pageBreak());

// فصل ۴
children.push(heading("فصل ۴: سیستم کاربران", 1));
children.push(heading("۴.۱ دسترسی بخش‌بندی", 2));
children.push(makeTable([
  ["messages", "پیام‌های تماس"],
  ["clips", "کلیپ‌های آپارات"],
  ["content", "محتوا"],
  ["text", "متن‌ها"],
  ["nav", "منو"],
  ["themes", "تم‌ها"],
], ["کد", "بخش"]));
children.push(heading("۴.۲ ریست رمز از سرور", 2));
children.push(...codeBlock(`cd /home/ehsan/personal-site
sudo bash scripts/reset-admin-password.sh`));
children.push(pageBreak());

// فصل ۵
children.push(heading("فصل ۵: کلیپ آپارات", 1));
children.push(faPara("ادمین کد امبد رو از آپارات کپی می‌کنه و در پنل اضافه می‌کنه. کد قبل از نمایش sanitize می‌شه."));
children.push(pageBreak());

// فصل ۶
children.push(heading("فصل ۶: هوش مصنوعی محلی", 1));
children.push(faPara("برای فعال‌سازی چت AI، فایل OLLAMA_GUIDE_FA.md رو بخون."));
children.push(...codeBlock(`curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
# پنل ادمین → Settings → AI Providers → Type: ollama`));
children.push(pageBreak());

// فصل ۷
children.push(heading("فصل ۷: SEO", 1));
children.push(bullet("✅ Open Graph (فیسبوک، تلگرام)"));
children.push(bullet("✅ Twitter Card"));
children.push(bullet("✅ JSON-LD structured data"));
children.push(bullet("✅ Sitemap.xml"));
children.push(bullet("✅ RSS Feed"));
children.push(bullet("✅ robots.txt کامل"));
children.push(bullet("✅ manifest.json (PWA)"));
children.push(pageBreak());

// فصل ۸
children.push(heading("فصل ۸: جمع‌بندی", 1));
children.push(faPara("این سایت شامل تمام امکانات لازم برای یه پورتفولیو حرفه‌ای هست:"));
children.push(bullet("✅ پنل ادمین کامل (۱۰ تب)"));
children.push(bullet("✅ سیستم کاربران با دسترسی بخش‌بندی"));
children.push(bullet("✅ کلیپ آپارات با sanitize"));
children.push(bullet("✅ چت AI (Ollama/OpenAI/Groq)"));
children.push(bullet("✅ امنیت کامل (bcrypt، rate limit، XSS prevention، timingSafeEqual)"));
children.push(bullet("✅ SEO کامل"));
children.push(bullet("✅ ۳ زبان (FA/EN/DE)"));
children.push(bullet("✅ ۷ تم + ۵ فونت"));
children.push(bullet("✅ PWA"));
children.push(faPara(""));
children.push(faPara("موفق باشی! 🚀"));

const doc = new Document({
  creator: "Personal Site V16",
  title: "آموزش کامل ساخت سایت شخصی V16",
  styles: { default: { document: { run: { font: FONT_FA, size: 22 }, paragraph: { spacing: { line: 360 } } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: FONT_FA, size: 36, bold: true, color: COLOR_HEADING }, paragraph: { spacing: { before: 400, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: FONT_FA, size: 30, bold: true, color: COLOR_PRIMARY }, paragraph: { spacing: { before: 300, after: 150 } } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "آموزش سایت شخصی — V16.0", font: FONT_FA, size: 16, color: COLOR_DIM, rightToLeft: true })], alignment: AlignmentType.CENTER, bidirectional: true })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT_FA, size: 16, color: COLOR_DIM }), new TextRun({ text: " / ", font: FONT_FA, size: 16, color: COLOR_DIM }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_FA, size: 16, color: COLOR_DIM })], alignment: AlignmentType.CENTER })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/TUTORIAL_FA_V16.docx", buffer);
  console.log(`✅ Tutorial V16 generated: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => { console.error("❌ Error:", err); process.exit(1); });
