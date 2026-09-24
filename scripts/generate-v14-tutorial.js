// ============================================================================
// generate-v14-tutorial.js — تولید فایل Word آموزشی نسخه V15
// ============================================================================

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, Footer, Header, PageNumber,
  TableOfContents,
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
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 },
    bidirectional: true,
  });
}

function codePara(text) {
  return new Paragraph({
    children: [new TextRun({ text: text || " ", font: FONT_CODE, size: 18, color: "333333" })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_CODE_BG, color: "auto" },
    spacing: { line: 280, after: 0 },
    indent: { left: 240 },
  });
}

function codeBlock(code) {
  return code.split("\n").map(line => codePara(line));
}

function heading(text, level = 1) {
  const sizes = { 1: 36, 2: 30, 3: 26, 4: 22 };
  const colors = { 1: COLOR_HEADING, 2: COLOR_PRIMARY, 3: COLOR_PRIMARY, 4: COLOR_DIM };
  const headingLevels = {
    1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4,
  };
  return new Paragraph({
    heading: headingLevels[level],
    children: [new TextRun({ text, font: FONT_FA, size: sizes[level], bold: true, color: colors[level], rightToLeft: true })],
    spacing: { before: 400, after: 200 },
    bidirectional: true,
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22, rightToLeft: true })],
    bullet: { level: 0 },
    spacing: { line: 340, after: 80 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

function noteBox(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 20, color: "795548", rightToLeft: true })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_NOTE_BG, color: "auto" },
    spacing: { line: 320, before: 120, after: 120 },
    indent: { left: 240, right: 240 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "FFB000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "FFB000" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "FFB000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "FFB000" },
    },
    bidirectional: true,
  });
}

function makeTable(rows, headers) {
  const tableRows = [];
  tableRows.push(new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: FONT_FA, size: 20, bold: true, color: "FFFFFF", rightToLeft: true })],
        alignment: AlignmentType.CENTER,
        bidirectional: true,
      })],
      shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY, color: "auto" },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
    })),
    tableHeader: true,
  }));
  for (const row of rows) {
    tableRows.push(new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(cell), font: FONT_FA, size: 18, rightToLeft: true })],
          bidirectional: true,
        })],
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })),
      cantSplit: true,
    }));
  }
  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

const children = [];

// === جلد ===
children.push(new Paragraph({ children: [new TextRun({ text: " ", size: 48 })], spacing: { before: 3000 } }));
children.push(new Paragraph({
  children: [new TextRun({ text: "آموزش کامل ساخت سایت شخصی", font: FONT_FA, size: 60, bold: true, color: "39FF14", rightToLeft: true })],
  alignment: AlignmentType.CENTER, spacing: { after: 240 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "نسخه V15.0 — ۱۴۰۳", font: FONT_FA, size: 36, color: COLOR_PRIMARY, rightToLeft: true })],
  alignment: AlignmentType.CENTER, spacing: { after: 600 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "Next.js 16 · TypeScript · Prisma · SQLite · Docker", font: FONT_CODE, size: 24, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER, spacing: { after: 2400 },
}));
children.push(pageBreak());

// === فهرست ===
children.push(heading("فهرست مطالب", 1));
children.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(pageBreak());

// === فصل ۱: مقدمه ===
children.push(heading("فصل ۱: مقدمه", 1));
children.push(faPara("این آموزش کامل ساخت یه سایت شخصی حرفه‌ای با پنل ادمین، سیستم کاربران، و امکانات کامل رو آموزش می‌ده."));

children.push(heading("۱.۱ امکانات سایت", 2));
children.push(makeTable(
  [
    ["صفحه اصلی", "معرفی، مهارت‌ها، کتاب‌ها، مقالات، آموزش‌ها، کلیپ‌ها، تماس"],
    ["پنل ادمین", "۱۰ تب مدیریت کامل"],
    ["سیستم کاربران", "ورود/خروج، دسترسی زمانی، دسترسی بخش‌بندی"],
    ["کلیپ آپارات", "مدیریت ویدیو از پنل"],
    ["هوش مصنوعی", "چت با Ollama/OpenAI/Groq"],
    ["امنیت", "bcrypt، session، rate limit، XSS prevention"],
  ],
  ["بخش", "توضیح"]
));

children.push(heading("۱.۲ امکانات پنل ادمین", 2));
children.push(makeTable(
  [
    ["📊 داشبورد", "اطلاعات کاربر، وضعیت دسترسی"],
    ["📨 پیام‌ها", "مشاهده، پاسخ، حذف پیام‌های تماس"],
    ["📁 محتوا", "کتاب، مقاله، آموزش، مهارت، تجهیزات"],
    ["📝 متن‌ها", "۳۶+ متن قابل ویرایش"],
    ["🧭 منو", "مدیریت منوی ناوبری"],
    ["🎨 تم‌ها", "۷ تم آماده + تم‌ساز"],
    ["👥 کاربران", "ساخت کاربر با دسترسی بخش‌بندی"],
    ["🎬 کلیپ‌ها", "مدیریت ویدیوهای آپارات"],
    ["🔤 فونت", "۵ فونت قابل انتخاب"],
    ["⚙️ تنظیمات", "تغییر رمز، AI providers، ایمیل"],
  ],
  ["تب", "کاربرد"]
));

children.push(pageBreak());

// === فصل ۲: نصب ===
children.push(heading("فصل ۲: نصب", 1));
children.push(faPara("نصب با یه دستور:"));
children.push(...codeBlock(`unzip install.zip
cd personal-site
sudo ./install.sh`));

children.push(noteBox("اسکریپت خودش Node.js، Nginx، Swap، SSL رو نصب می‌کنه. فقط Docker لازم نیست."));

children.push(pageBreak());

// === فصل ۳: امنیت ===
children.push(heading("فصل ۳: امنیت", 1));

children.push(heading("۳.۱ احراز هویت", 2));
children.push(faPara("سیستم احراز هویت از bcrypt برای هش رمز و HMAC-SHA256 برای session token استفاده می‌کنه."));
children.push(...codeBlock(`// هش رمز با bcrypt (salt rounds = 10)
const hash = await bcrypt.hash(password, 10);

// بررسی رمز
const ok = await bcrypt.compare(password, hash);

// ساخت session token با HMAC
const token = createSessionToken(userId);
// token = base64(userId.expiry.hmac_signature)`));

children.push(heading("۳.۲ محدودیت ورود (Rate Limit)", 2));
children.push(faPara("برای جلوگیری از brute force، ۵ تلاش در ۱۵ دقیقه محدود شده:"));
children.push(...codeBlock(`// Rate limit check
if (ip && !checkRateLimit(ip)) {
  return NextResponse.json(
    { ok: false, error: "rate_limit" },
    { status: 429 }
  );
}`));

children.push(heading("۳.۳ جلوگیری از XSS", 2));
children.push(faPara("کد امبد آپارات قبل از نمایش sanitize می‌شه — فقط iframe از دامنه‌های مجاز:"));
children.push(...codeBlock(`const ALLOWED_DOMAINS = [
  "aparat.com",
  "youtube.com",
  "youtu.be",
  "player.vimeo.com",
];

export function sanitizeEmbed(input: string): string {
  // فقط iframe با src مجاز قبول می‌شه
  const srcMatch = iframeTag.match(/src=["']([^"']*)["']/i);
  const url = new URL(src);
  if (!ALLOWED_DOMAINS.includes(url.hostname)) return "";
  return \`<iframe src="\${src}" ...></iframe>\`;
}`));

children.push(heading("۳.۴ SESSION_SECRET", 2));
children.push(faPara("در production، SESSION_SECRET اجباریه. اگه ست نشده باشه، app اجرا نمی‌شه:"));
children.push(...codeBlock(`const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET env var is required");
}`));

children.push(pageBreak());

// === فصل ۴: سیستم کاربران ===
children.push(heading("فصل ۴: سیستم کاربران", 1));

children.push(heading("۴.۱ دسترسی زمانی", 2));
children.push(faPara("ادمین می‌تونه برای هر کاربر ساعت/روز/تاریخ انقضا تعیین کنه:"));
children.push(...codeBlock(`// بررسی دسترسی
if (user.allowedHourStart !== null && user.allowedHourEnd !== null) {
  const currentHour = now.getUTCHours();
  if (currentHour < start || currentHour >= end) {
    return { allowed: false, reason: "access_denied_off_hours" };
  }
}`));

children.push(heading("۴.۲ دسترسی بخش‌بندی", 2));
children.push(faPara("ادمین می‌تونه به هر کاربر فقط بخش‌های مشخصی دسترسی بده:"));
children.push(makeTable(
  [
    ["messages", "پیام‌های تماس"],
    ["clips", "کلیپ‌های آپارات"],
    ["content", "محتوا (کتاب/مقاله/...)"],
    ["text", "متن‌های سایت"],
    ["nav", "منوی ناوبری"],
    ["themes", "تم‌های رنگی"],
  ],
  ["کد دسترسی", "بخش"]
));
children.push(faPara("اگه کاربر هیچ دسترسی نداشته باشه، فقط تب داشبورد و تنظیمات رو می‌بینه."));

children.push(heading("۴.۳ ریست رمز از سرور", 2));
children.push(faPara("اگه ادمین رمز رو فراموش کنه، از سرور می‌تونه ریست کنه:"));
children.push(...codeBlock(`cd /home/ehsan/personal-site
sudo bash scripts/reset-admin-password.sh
# رمز به admin123 برمی‌گرده`));

children.push(pageBreak());

// === فصل ۵: کلیپ آپارات ===
children.push(heading("فصل ۵: کلیپ آپارات", 1));

children.push(faPara("ادمین می‌تونه ویدیوهای آپارات رو از پنل اضافه کنه:"));
children.push(...codeBlock(`// از سایت آپارات:
// 1. ویدیو رو باز کن
// 2. اشتراک‌گذاری → جای‌گذاری در وبلاگ
// 3. کد iframe رو کپی کن
// 4. پنل ادمین → تب کلیپ‌ها → کلیپ جدید
// 5. عنوان + کد امبد رو وارد کن`));

children.push(noteBox("کد امبد قبل از نمایش sanitize می‌شه تا XSS نباشه."));

children.push(pageBreak());

// === فصل ۶: هوش مصنوعی ===
children.push(heading("فصل ۶: هوش مصنوعی محلی (Ollama)", 1));

children.push(faPara("برای فعال‌سازی چت AI، فایل OLLAMA_GUIDE_FA.md رو بخون."));

children.push(heading("۶.۱ نصب Ollama", 2));
children.push(...codeBlock(`# نصب
curl -fsSL https://ollama.com/install.sh | sh
systemctl start ollama
systemctl enable ollama

# دانلود مدل
ollama pull llama3.2

# تنظیم در پنل ادمین:
# Settings → AI Providers
# Type: ollama
# Model: llama3.2
# Base URL: http://localhost:11434`));

children.push(pageBreak());

// === فصل ۷: SEO ===
children.push(heading("فصل ۷: SEO", 1));

children.push(faPara("سایت برای موتورهای جستجو بهینه‌سازی شده:"));
children.push(bullet("✅ Open Graph (فیسبوک، تلگرام، واتساپ)"));
children.push(bullet("✅ Twitter Card"));
children.push(bullet("✅ JSON-LD structured data"));
children.push(bullet("✅ Sitemap.xml"));
children.push(bullet("✅ RSS Feed"));
children.push(bullet("✅ robots.txt کامل"));
children.push(bullet("✅ manifest.json (PWA)"));
children.push(bullet("✅ Canonical URL"));

children.push(pageBreak());

// === فصل ۸: جمع‌بندی ===
children.push(heading("فصل ۸: جمع‌بندی", 1));
children.push(faPara("این سایت شامل تمام امکانات لازم برای یه پورتفولیو حرفه‌ای هست:"));
children.push(bullet("✅ پنل ادمین کامل (۱۰ تب)"));
children.push(bullet("✅ سیستم کاربران با دسترسی زمانی و بخش‌بندی"));
children.push(bullet("✅ کلیپ آپارات"));
children.push(bullet("✅ چت AI (Ollama/OpenAI/Groq)"));
children.push(bullet("✅ امنیت کامل (bcrypt، rate limit، XSS prevention)"));
children.push(bullet("✅ SEO کامل"));
children.push(bullet("✅ ۳ زبان (FA/EN/DE)"));
children.push(bullet("✅ ۷ تم رنگی"));
children.push(bullet("✅ ۵ فونت"));
children.push(bullet("✅ PWA (نصب به‌عنوان اپ)"));

children.push(faPara("موفق باشی! 🚀"));

// ----------------------------------------------------------------------------
// ساخت سند
// ----------------------------------------------------------------------------
const doc = new Document({
  creator: "Personal Site V15",
  title: "آموزش کامل ساخت سایت شخصی V15",
  styles: {
    default: {
      document: {
        run: { font: FONT_FA, size: 22 },
        paragraph: { spacing: { line: 360 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal",
        run: { font: FONT_FA, size: 36, bold: true, color: COLOR_HEADING },
        paragraph: { spacing: { before: 400, after: 200 } },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal",
        run: { font: FONT_FA, size: 30, bold: true, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 300, after: 150 } },
      },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: "آموزش سایت شخصی — V15.0", font: FONT_FA, size: 16, color: COLOR_DIM, rightToLeft: true })],
          alignment: AlignmentType.CENTER, bidirectional: true,
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ children: [PageNumber.CURRENT], font: FONT_FA, size: 16, color: COLOR_DIM }),
            new TextRun({ text: " / ", font: FONT_FA, size: 16, color: COLOR_DIM }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_FA, size: 16, color: COLOR_DIM }),
          ],
          alignment: AlignmentType.CENTER,
        })],
      }),
    },
    children,
  }],
});

const outputPath = "/home/z/my-project/download/TUTORIAL_FA_V15.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Tutorial generated: ${outputPath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
