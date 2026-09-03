// ============================================================================
// generate_full_tutorial_v19.js
// تولید فایل Word آموزشی کامل سایت شخصی — از صفر تا صد
// زبان: فارسی ساده با مثال‌های زیاد
// ============================================================================

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, Footer, Header, PageNumber, NumberFormat,
  TableOfContents, StyleLevel, LevelFormat, convertInchesToTwip,
} = require("docx");

// ----------------------------------------------------------------------------
// تنظیمات کلی
// ----------------------------------------------------------------------------
const FONT_FA = "Vazirmatn";
const FONT_CODE = "Courier New";
const COLOR_PRIMARY = "00FF41";
const COLOR_HEADING = "008F11";
const COLOR_DIM = "4A7A4A";
const COLOR_CODE_BG = "F5F5F5";

// ----------------------------------------------------------------------------
// توابع کمکی برای ساخت محتوا
// ----------------------------------------------------------------------------

// پاراگراف متن فارسی
function faPara(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22, ...opts })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 },
    bidirectional: true,
  });
}

// پاراگراف با چند ران (مثلاً برای بولد کردن بخشی از متن)
function faParaRich(runs, opts = {}) {
  return new Paragraph({
    children: runs.map(r => new TextRun({ font: FONT_FA, size: 22, ...r })),
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 },
    bidirectional: true,
    ...opts,
  });
}

// بلوک کد
function codeBlock(code, lang = "") {
  const lines = code.split("\n");
  return lines.map(line => new Paragraph({
    children: [new TextRun({ text: line || " ", font: FONT_CODE, size: 18, color: "333333" })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_CODE_BG, color: "auto" },
    spacing: { line: 280, after: 0 },
    indent: { left: 240 },
  }));
}

// تیتر
function heading(text, level = 1) {
  const sizes = { 1: 32, 2: 28, 3: 24, 4: 22 };
  const colors = { 1: COLOR_HEADING, 2: COLOR_HEADING, 3: COLOR_PRIMARY, 4: COLOR_PRIMARY };
  const headingLevels = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
  };
  return new Paragraph({
    heading: headingLevels[level],
    children: [new TextRun({ text, font: FONT_FA, size: sizes[level], bold: true, color: colors[level] })],
    spacing: { before: 360, after: 180 },
    bidirectional: true,
  });
}

// بولت پوینت
function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22 })],
    bullet: { level },
    spacing: { line: 340, after: 80 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

// جدول ساده
function makeTable(rows, headers) {
  const tableRows = [];
  // هدر
  tableRows.push(new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: FONT_FA, size: 20, bold: true, color: "FFFFFF" })],
        alignment: AlignmentType.CENTER,
        bidirectional: true,
      })],
      shading: { type: ShadingType.CLEAR, fill: "008F11", color: "auto" },
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
    })),
    tableHeader: true,
  }));
  // ردیف‌ها
  for (const row of rows) {
    tableRows.push(new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: String(cell), font: FONT_FA, size: 18 })],
          bidirectional: true,
        })],
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })),
      cantSplit: true,
    }));
  }
  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// خط جداکننده
function hr() {
  return new Paragraph({
    children: [new TextRun({ text: "─────────────────────────────────────────────", color: COLOR_DIM, size: 18 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
  });
}

// ----------------------------------------------------------------------------
// ساخت محتوای آموزش
// ----------------------------------------------------------------------------

const children = [];

// === جلد ===
children.push(new Paragraph({
  children: [new TextRun({ text: " ", size: 48 })],
  spacing: { before: 2400 },
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "آموزش کامل ساخت سایت شخصی", font: FONT_FA, size: 56, bold: true, color: COLOR_PRIMARY })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "از صفر تا صد — با مثال‌های فراوان", font: FONT_FA, size: 36, color: COLOR_HEADING })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
  bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "Next.js 16 + TypeScript + Prisma + SQLite", font: FONT_CODE, size: 24, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 2400 },
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "نسخه V19.0 — ۱۴۰۵/۰۶/۱۳", font: FONT_FA, size: 22, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER,
  bidirectional: true,
}));
children.push(new Paragraph({
  children: [new PageBreak()],
}));

// === فهرست ===
children.push(new Paragraph({
  children: [new TextRun({ text: "فهرست مطالب", font: FONT_FA, size: 36, bold: true, color: COLOR_HEADING })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 360 },
  bidirectional: true,
}));
children.push(new TableOfContents("Table of Contents", {
  hyperlink: true,
  headingStyleRange: "1-3",
}));
children.push(new Paragraph({
  children: [new TextRun({ text: " ", size: 18 }), new PageBreak()],
}));

// ============================================================================
// فصل ۱: مقدمه
// ============================================================================
children.push(heading("فصل ۱: مقدمه — چرا سایت شخصی؟", 1));

children.push(faPara(
  "سلام! توی این آموزش، قدم‌به‌قدم یاد می‌گیریم چطور یه سایت شخصی حرفه‌ای بسازیم. این سایت قرار نیست فقط یه صفحه ساده باشه — قراره یه پلتفرم کامل باشه که توش می‌تونی:"
));
children.push(bullet("محتوای خودت (کتاب‌ها، مقالات، آموزش‌ها) رو نشون بدی"));
children.push(bullet("با بازدیدکنندگان چت کنی (با کمک AI)"));
children.push(bullet("پیام‌های تماس رو مدیریت کنی (مثل یه CRM کوچیک)"));
children.push(bullet("از پنل ادمین همه‌چیز رو کنترل کنی"));
children.push(bullet("کاربران با دسترسی زمانی بسازی"));
children.push(bullet("تم رنگی سایت رو عوض کنی"));

children.push(heading("۱.۱ پیش‌نیازها", 2));
children.push(faPara(
  "قبل از شروع، باید با این مفاهیم آشنایی داشته باشی:"
));
children.push(bullet("HTML و CSS پایه — می‌دونی div چیه و class چطوری کار می‌کنه"));
children.push(bullet("JavaScript — متغیر، تابع، آرایه، و async/await رو بلدی"));
children.push(bullet("خط فرمان (Terminal) — می‌تونی دستورات رو اجرا کنی"));
children.push(bullet("Node.js نصب شده روی سیستمتمون (نسخه ۱۸ یا بالاتر)"));

children.push(faPara(
  "اگه با React کار نکردی نگران نباش — توی فصل ۳ از صفر آموزش می‌دم. همینطور اگه با دیتابیس کار نکردی، توی فصل ۶ Prisma رو از اول توضیح می‌دم."
));

children.push(heading("۱.۲ تکنولوژی‌هایی که استفاده می‌کنیم", 2));
children.push(faPara("یه نگاه به ابزارهایی که توی این پروژه استفاده می‌کنیم بندازیم:"));

children.push(makeTable(
  [
    ["Next.js", "۱۶.۱.۳", "فریم‌ورک اصلی — هم frontend هم backend"],
    ["TypeScript", "۵.۰", "مثل JavaScript ولی با type safety"],
    ["React", "۱۹", "کتابخانه‌ی UI"],
    ["Prisma", "۶.۱۹", "ORM برای کار با دیتابیس"],
    ["SQLite", "—", "دیتابیس سبک — یه فایل فقط"],
    ["Tailwind CSS", "۴.۰", "استایل‌نویسی سریع"],
    ["Bun", "—", "جایگزین npm — سریع‌تر"],
  ],
  ["تکنولوژی", "نسخه", "کاربرد"]
));

children.push(faPara(
  "نکته: شاید بپرسی چرا Next.js نه React خالی؟ چون Next.js به ما API routes می‌ده — یعنی می‌تونیم همون‌جا backend بنویسیم. لازم نیست یه سرور Express جداگانه بسازیم."
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۲: نصب و راه‌اندازی
// ============================================================================
children.push(heading("فصل ۲: نصب و راه‌اندازی پروژه", 1));

children.push(heading("۲.۱ نصب Node.js و Bun", 2));
children.push(faPara("اول از همه باید Node.js نصب باشه. از سایت nodejs.org نسخه‌ی LTS رو دانلود کن."));
children.push(faPara("بعد Bun رو نصب می‌کنیم — Bun یه package manager هست که خیلی سریع‌تر از npm هست:"));

children.push(...codeBlock(`# نصب Bun روی Linux/Mac
curl -fsSL https://bun.sh/install | bash

# تست نصب
bun --version
# باید یه نسخه‌ی عددی نشون بده، مثلا 1.3.x`));

children.push(heading("۲.۲ ساخت پروژه Next.js", 2));
children.push(faPara("حالا یه پروژه‌ی Next.js جدید می‌سازیم:"));

children.push(...codeBlock(`# ساخت پروژه جدید
npx create-next-app@latest personal-site

# سوالات رو این‌طوری جواب بده:
✔ Would you like to use TypeScript? Yes
✔ Would you like to use ESLint? Yes
✔ Would you like to use Tailwind CSS? Yes
✔ Would you like your code inside a 'src/' directory? Yes
✔ Would you like to use App Router? (recommended) Yes
✔ Would you like to use Turbopack? Yes
✔ Would you like to customize the import alias? No

# وارد پوشه‌ی پروژه شو
cd personal-site

# اجرای سرور توسعه
bun dev`));

children.push(faPara(
  "حالا اگه مرورگر رو باز کنی و به http://localhost:3000 بروی، صفحه‌ی خوش‌آمدگویی Next.js رو می‌بینی."
));

children.push(heading("۲.۳ نصب Prisma و دیتابیس", 2));
children.push(faPara("Prisma یه ORM هست — یعنی به‌جای نوشتن SQL خام، با TypeScript دیتابیس رو مدیریت می‌کنیم:"));

children.push(...codeBlock(`# نصب Prisma
bun add prisma @prisma/client

# راه‌اندازی Prisma با SQLite
bunx prisma init --datasource-provider sqlite`));

children.push(faPara(
  "این دستور یه فایل `prisma/schema.prisma` و یه فایل `.env` می‌سازه. فایل schema جایی هست که مدل‌های دیتابیس رو تعریف می‌کنیم."
));

children.push(heading("۲.۴ ساختار پوشه‌ها", 2));
children.push(faPara("بعد از نصب، ساختار پروژه این‌طوری می‌شه:"));

children.push(...codeBlock(`personal-site/
├── prisma/
│   └── schema.prisma          ← تعریف مدل‌های دیتابیس
├── src/
│   ├── app/
│   │   ├── page.tsx           ← صفحه‌ی اصلی
│   │   ├── layout.tsx         ← قالب کلی صفحه
│   │   ├── globals.css        ← استایل‌های سراسری
│   │   └── api/               ← API routes (backend)
│   ├── components/            ← کامپوننت‌های React
│   └── lib/                   ← توابع کمکی
├── public/                    ← فایل‌های استاتیک (عکس‌ها، آیکون‌ها)
├── package.json
├── tsconfig.json
└── .env                       ← متغیرهای محیطی`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۳: مفاهیم React و Next.js
// ============================================================================
children.push(heading("فصل ۳: مفاهیم پایه‌ی React و Next.js", 1));

children.push(heading("۳.۱ کامپوننت چیست؟", 2));
children.push(faPara(
  "کامپوننت (Component) یه تیکه از UI هست که می‌تونی reuse کنی. مثلاً یه دکمه، یه فرم، یه کارت محصول — همشون کامپوننت هستن."
));

children.push(faPara("یه مثال ساده:"));

children.push(...codeBlock(`// src/components/Hello.tsx
export default function Hello({ name }: { name: string }) {
  return (
    <div>
      <h1>سلام {name}!</h1>
      <p>خوش اومدی به سایت من.</p>
    </div>
  );
}`));

children.push(faPara("حالا می‌تونی این کامپوننت رو هر جا خواستی استفاده کنی:"));

children.push(...codeBlock(`// src/app/page.tsx
import Hello from "@/components/Hello";

export default function Home() {
  return <Hello name="سalar" />;
}`));

children.push(heading("۳.۲ useState — متغیرهای reactive", 2));
children.push(faPara(
  "وقتی می‌خوای یه متغیر داشته باشی که تغییرش باعث re-render بشه، از useState استفاده می‌کنی:"
));

children.push(...codeBlock(`import { useState } from "react";

export default function Counter() {
  // count یه متغیره، setCount تابعیه برای تغییرش
  // عدد ۰ مقدار اولیه‌ست
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>شمارنده: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>−</button>
    </div>
  );
}`));

children.push(faPara(
  "هر بار که setCount صدا زده بشه، کامپوننت دوباره render می‌شه و UI آپدیت می‌شه. این بهش می‌گن reactivity."
));

children.push(heading("۳.۳ useEffect — عوارض جانبی", 2));
children.push(faPara(
  "useEffect برای کارهایی هست که خارج از render انجام می‌شن — مثل fetch از API، subscribe به event، یا تغییر DOM:"
));

children.push(...codeBlock(`import { useState, useEffect } from "react";

export default function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // این فقط بعد از mount اجرا می‌شه
    fetch(\`/api/users/\${userId}\`)
      .then(r => r.json())
      .then(data => setUser(data));
  }, [userId]); // فقط وقتی userId تغییر کنه دوباره اجرا می‌شه

  if (!user) return <p>در حال بارگذاری...</p>;
  return <div>{user.name}</div>;
}`));

children.push(heading("۳.۴ App Router و فایل‌های خاص", 2));
children.push(faPara("Next.js 16 از App Router استفاده می‌کنه. فایل‌های خاص:"));

children.push(makeTable(
  [
    ["page.tsx", "صفحه‌ی یه مسیر — مثلاً src/app/about/page.tsx برای /about"],
    ["layout.tsx", "قالب مشترک بین چندین صفحه"],
    ["loading.tsx", "نمایش loading حین بارگذاری"],
    ["error.tsx", "نمایش خطا"],
    ["route.ts", "API endpoint — داخل پوشه‌ی api/"],
  ],
  ["فایل", "کاربرد"]
));

children.push(faPara("مثال — ساخت یه API ساده:"));

children.push(...codeBlock(`// src/app/api/hello/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "سلام دنیا!" });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ received: body });
}`));

children.push(faPara(
  "حالا اگه GET /api/hello بزنی، { message: 'سلام دنیا!' } رو می‌گیری. و اگه POST بزنی با body، همون body رو برمی‌گردونه."
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۴: ساختار صفحه اصلی
// ============================================================================
children.push(heading("فصل ۴: ساخت صفحه‌ی اصلی سایت", 1));

children.push(heading("۴.۱ layout.tsx — قالب کلی", 2));
children.push(faPara("فایل layout.tsx قالب کلی همه‌ی صفحات هست. این‌جا فونت‌ها، metadata، و ساختار HTML رو تعریف می‌کنیم:"));

children.push(...codeBlock(`// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Vazirmatn } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const vazirmatn = Vazirmatn({ variable: "--font-vazir", subsets: ["arabic", "latin"] });

export const metadata: Metadata = {
  title: "سایت من",
  description: "پورتفولیو شخصی",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={\`\${geist.variable} \${vazirmatn.variable}\`}>
        {children}
      </body>
    </html>
  );
}`));

children.push(faPara(
  "نکته: suppressHydrationWarning روی <html> و <body> مهمه — چون ما توی useEffect مقدار lang و dir رو عوض می‌کنیم، React هشدار hydration mismatch می‌ده. این attribute اون هشدار رو خاموش می‌کنه."
));

children.push(heading("۴.۲ page.tsx — صفحه‌ی اصلی", 2));
children.push(faPara("حالا صفحه‌ی اصلی رو می‌سازیم. یه صفحه‌ی ساده با hero section و درباره من:"));

children.push(...codeBlock(`// src/app/page.tsx
"use client";

import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <main>
      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "100px 20px" }}>
        <h1>سلام، من سالم هستم</h1>
        <p>برنامه‌نویس فول‌استک</p>
        <button onClick={() => setCount(count + 1)}>
          کلیک شده: {count}
        </button>
      </section>

      {/* About Section */}
      <section style={{ padding: "60px 20px", background: "#f5f5f5" }}>
        <h2>درباره من</h2>
        <p>من یه برنامه‌نویس با ۵ سال تجربه هستم...</p>
      </section>
    </main>
  );
}`));

children.push(faPara(
  "نکته: \"use client\" اول فایل یعنی این کامپوننت توی مرورگر اجرا می‌شه (نه فقط توی سرور). اگه از useState یا useEffect استفاده می‌کنی، این خط لازمه."
));

children.push(heading("۴.۳ اضافه کردن استایل", 2));
children.push(faPara("می‌تونی از Tailwind CSS استفاده کنی یا CSS خالی. برای پروژه‌ی ما، یه فایل personal.css می‌سازیم:"));

children.push(...codeBlock(`/* src/app/personal.css */
:root {
  --bg: #000000;
  --bg-panel: #050505;
  --primary: #00ff41;
  --primary-dim: #008f11;
  --primary-bright: #39ff14;
  --text: #c8ffc8;
  --text-dim: #4a7a4a;
  --border: #1a3a1a;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-vazir), monospace;
  margin: 0;
}

.btn {
  background: var(--primary);
  color: #000;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: monospace;
  text-transform: uppercase;
}

.btn:hover {
  background: var(--primary-bright);
}`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۵: تم ترمینال و کامپوننت‌ها
// ============================================================================
children.push(heading("فصل ۵: ساخت تم ترمینال و کامپوننت‌ها", 1));

children.push(heading("۵.۱ تم ترمینال — چرا؟", 2));
children.push(faPara(
  "تم ترمینال (سبز روی مشکی) حس هکر/RF Engineer رو می‌ده. برای سایت شخصی یه برنامه‌نویس، این تم خیلی جذابه."
));

children.push(heading("۵.۲ کامپوننت MatrixRain", 2));
children.push(faPara("یه پس‌زمینه‌ی ماتریکسی ساده با canvas:"));

children.push(...codeBlock(`// src/components/MatrixRain.tsx
"use client";
import { useEffect, useRef } from "react";

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const fontSize = 14;
    let columns = Math.floor(width / fontSize);
    let drops = new Array(columns).fill(0).map(() => Math.random() * height / fontSize);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    const draw = () => {
      // محو تدریجی فریم قبلی
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = \`\${fontSize}px monospace\`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // سر روشن‌تره
        ctx.fillStyle = Math.random() > 0.975
          ? "rgba(180, 255, 180, 0.9)"
          : "rgba(0, 255, 65, 0.45)";
        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, zIndex: -1 }} />;
}`));

children.push(heading("۵.۳ کامپوننت SignalLab — اسیلوسکوپ و ژنراتور", 2));
children.push(faPara("حالا یه مثال پیچیده‌تر — یه اسیلوسکوپ و ژنراتور سیگنال با مدولاسیون AM/FM:"));

children.push(faPara("اول مدل‌های مشترک رو تعریف می‌کنیم:"));

children.push(...codeBlock(`type Waveform = "sine" | "square" | "triangle" | "sawtooth";
type Modulation = "NONE" | "AM" | "FM";`));

children.push(faPara("حالا تابع تولید شکل موج:"));

children.push(...codeBlock(`// تولید مقدار موج در یه فاز مشخص
function waveValue(phase: number, wf: Waveform, amp: number): number {
  const t = phase % (2 * Math.PI);
  switch (wf) {
    case "sine":     return Math.sin(t) * amp;
    case "square":   return (Math.sin(t) >= 0 ? 1 : -1) * amp;
    case "triangle": return (2 / Math.PI) * Math.asin(Math.sin(t)) * amp;
    case "sawtooth": return (2 * (t / (2 * Math.PI) - Math.floor(t / (2 * Math.PI) + 0.5))) * amp;
  }
}`));

children.push(faPara("و تابع sampling با مدولاسیون:"));

children.push(...codeBlock(`// نمونه‌برداری از سیگنال (با مدولاسیون) در زمان t
function signalAtTime(t: number, freq: number, mod: Modulation, modFreq: number, modDepth: number): number {
  const carrierPhase = 2 * Math.PI * freq * t;

  if (mod === "AM") {
    // AM: amplitude با سیگنال مدولاسیون تغییر می‌کنه
    const modSignal = Math.sin(2 * Math.PI * modFreq * t);
    const amFactor = 1 + modDepth * modSignal;
    return waveValue(carrierPhase, "sine", 1) * amFactor / (1 + modDepth);
  }

  if (mod === "FM") {
    // FM: فاز با سیگنال مدولاسیون تغییر می‌کنه
    // beta = modDepth * 5 → شاخص مدولاسیون
    const beta = modDepth * 5;
    const fmPhase = carrierPhase + beta * Math.sin(2 * Math.PI * modFreq * t);
    return waveValue(fmPhase, "sine", 1);
  }

  // بدون مدولاسیون
  return waveValue(carrierPhase, "sine", 1);
}`));

children.push(faPara("حالا تابع رسم روی canvas:"));

children.push(...codeBlock(`// رسم موج روی canvas
function drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const timeWindow = 0.5; // نصف ثانیه
  const samples = 800;

  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const frac = i / samples;
    const time = frac * timeWindow;
    const v = signalAtTime(time, 3, "FM", 10, 0.5);

    // مپ کردن به مختصات صفحه
    const x = frac * w;          // کل عرض canvas
    const y = h / 2 - (v / 10) * (h / 2 - 8);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#39ff14";
  ctx.lineWidth = 1.8;
  ctx.stroke();
}`));

children.push(faPara(
  "نکته مهم: همیشه از x = frac * w استفاده کن، نه x = i. اگه از i استفاده کنی و samples کمتر از عرض canvas باشه، فقط بخشی از صفحه پر می‌شه."
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۶: دیتابیس با Prisma
// ============================================================================
children.push(heading("فصل ۶: دیتابیس با Prisma", 1));

children.push(heading("۶.۱ تعریف مدل", 2));
children.push(faPara("توی فایل prisma/schema.prisma مدل‌ها رو تعریف می‌کنیم. مثلاً مدل پیام تماس:"));

children.push(...codeBlock(`// prisma/schema.prisma
model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  message   String
  ip        String?
  userAgent String?
  status    String   @default("new") // new, read, replied, archived
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([email])
}`));

children.push(faPara("توضیح فیلدها:"));
children.push(bullet("@id — این فیلد کلید اصلیه"));
children.push(bullet("@default(cuid()) — خودکار یه ID یکتا ساخته می‌شه"));
children.push(bullet("String? — علامت ? یعنی nullable (میتونه خالی باشه)"));
children.push(bullet("@@index — روی این فیلد index می‌سازه برای جستجوی سریع‌تر"));

children.push(heading("۶.۲ اعمال schema به دیتابیس", 2));

children.push(...codeBlock(`# اعمال تغییرات schema به دیتابیس
bunx prisma db push

# تولید Prisma Client (تایپ‌های TypeScript)
bunx prisma generate`));

children.push(heading("۶.۳ استفاده از Prisma Client", 2));
children.push(faPara("اول یه فایل db.ts می‌سازیم:"));

children.push(...codeBlock(`// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;`));

children.push(faPara("حالا توی API routes می‌تونی ازش استفاده کنی:"));

children.push(...codeBlock(`// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, email, message } = body;

  // ذخیره توی دیتابیس
  const msg = await db.contactMessage.create({
    data: { name, email, message },
  });

  return NextResponse.json({ ok: true, id: msg.id });
}

export async function GET() {
  // گرفتن همه پیام‌ها
  const messages = await db.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ messages });
}`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۷: سیستم احراز هویت
// ============================================================================
children.push(heading("فصل ۷: سیستم احراز هویت با دسترسی زمانی", 1));

children.push(faPara(
  "این یکی از مهم‌ترین فصوله. توی نسخه‌ی V19.0 یه سیستم کامل ساختم که ادمین می‌تونه کاربر بسازه که فقط در ساعت/روزهای مشخص دسترسی داشته باشه."
));

children.push(heading("۷.۱ مدل AccessUser", 2));

children.push(...codeBlock(`// prisma/schema.prisma
model AccessUser {
  id              String   @id @default(cuid())
  username        String   @unique
  passwordHash    String                     // هش رمز (bcrypt)
  displayName     String   @default("")
  role            String   @default("user")  // user | admin
  allowedHourStart Int?                      // 0-23, null = بدون محدودیت
  allowedHourEnd   Int?                      // 0-23, null = بدون محدودیت
  allowedDays     String?                    // "1,2,3,4,5" = دوشنبه تا جمعه
  expiresAt       DateTime?                  // تاریخ انقضا
  active          Boolean  @default(true)
  loginCount      Int      @default(0)
  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  accessLogs      AccessLog[]
}`));

children.push(heading("۷.۲ هش کردن رمز با bcrypt", 2));
children.push(faPara("هرگز رمز رو به‌صورت plain text ذخیره نکن! همیشه هش کن:"));

children.push(...codeBlock(`// src/lib/access-auth.ts
import bcrypt from "bcryptjs";

// هش کردن رمز
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);  // 2^10 = 1024 دور
  return bcrypt.hash(password, salt);
}

// بررسی رمز
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}`));

children.push(faPara("مثال استفاده:"));

children.push(...codeBlock(`// هش کردن
const hash = await hashPassword("myPassword123");
// hash = "$2a$10$N9qo8uLOickgx2ZMRZoMy..."

// بررسی (وقتی کاربر لاگین می‌کنه)
const ok = await verifyPassword("myPassword123", hash);
// ok = true

const wrong = await verifyPassword("wrongPassword", hash);
// wrong = false`));

children.push(heading("۷.۳ session token با HMAC", 2));
children.push(faPara("بعد از لاگین موفق، یه session token می‌سازیم که توی cookie ذخیره می‌شه:"));

children.push(...codeBlock(`// ساخت session token
function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعت
  const payload = \`\${userId}.\${expiresAt}\`;
  const sig = hmac(payload);  // HMAC-SHA256 امضا
  return Buffer.from(\`\${payload}.\${sig}\`).toString("base64");
}

// بررسی session token
function verifySessionToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [userId, expiresAtStr, sig] = decoded.split(".");
    const expiresAt = parseInt(expiresAtStr, 10);

    // بررسی انقضا
    if (Date.now() > expiresAt) return null;

    // بررسی امضا
    if (sig !== hmac(\`\${userId}.\${expiresAt}\`)) return null;

    return { userId, expiresAt };
  } catch {
    return null;
  }
}`));

children.push(heading("۷.۴ بررسی دسترسی بر اساس زمان", 2));
children.push(faPara("حالا مهم‌ترین بخش — بررسی اینکه آیا کاربر در این زمان دسترسی داره:"));

children.push(...codeBlock(`export async function checkAccess(userId: string) {
  const user = await db.accessUser.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, reason: "user_not_found" };
  if (!user.active) return { allowed: false, reason: "access_denied_inactive" };

  const now = new Date();

  // بررسی انقضا
  if (user.expiresAt && now > user.expiresAt) {
    return { allowed: false, reason: "access_denied_expired" };
  }

  // بررسی روز هفته (0=یکشنبه، 1=دوشنبه، ...)
  if (user.allowedDays) {
    const todayDay = now.getUTCDay();
    const allowedDays = user.allowedDays
      .split(",")
      .map(d => parseInt(d.trim(), 10));
    if (allowedDays.length > 0 && !allowedDays.includes(todayDay)) {
      return { allowed: false, reason: "access_denied_off_day" };
    }
  }

  // بررسی ساعت
  if (user.allowedHourStart !== null && user.allowedHourEnd !== null) {
    const currentHour = now.getUTCHours();
    const start = user.allowedHourStart;
    const end = user.allowedHourEnd;

    if (start <= end) {
      // حالت عادی: مثلاً 9 تا 17
      if (currentHour < start || currentHour >= end) {
        return { allowed: false, reason: "access_denied_off_hours" };
      }
    } else {
      // حالت شب‌بیداری: مثلاً 22 تا 6
      if (currentHour < start && currentHour >= end) {
        return { allowed: false, reason: "access_denied_off_hours" };
      }
    }
  }

  return { allowed: true, reason: "ok" };
}`));

children.push(faPara(
  "نکته: ساعت و روز بر اساس UTC بررسی می‌شه، نه localtime. این مهمه چون سرور ممکنه توی هر منطقه‌ی زمانی باشه."
));

children.push(heading("۷.۵ API لاگین", 2));

children.push(...codeBlock(`// src/app/api/user/login/route.ts
export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  // پیدا کردن کاربر
  const user = await db.accessUser.findUnique({
    where: { username: username.toLowerCase() },
  });

  // پیام یکسان برای جلوگیری از user enumeration
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );
  }

  // بررسی رمز
  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 }
    );
  }

  // بررسی فعال بودن
  if (!user.active) {
    return NextResponse.json(
      { ok: false, error: "account_inactive" },
      { status: 403 }
    );
  }

  // ورود موفق — ساخت session
  const token = createSessionToken(user.id);
  await db.accessUser.update({
    where: { id: user.id },
    data: {
      loginCount: { increment: 1 },
      lastLoginAt: new Date(),
    },
  });

  // ست کردن cookie
  const response = NextResponse.json({ ok: true, user: { ... } });
  response.cookies.set("access_session", token, {
    httpOnly: true,        // جلوگیری از XSS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,  // 24 ساعت
  });

  return response;
}`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۸: پنل ادمین
// ============================================================================
children.push(heading("فصل ۸: پنل ادمین کامل", 1));

children.push(faPara("پنل ادمین قلب سایت شماست. توی این پروژه ۹ تب داریم:"));

children.push(makeTable(
  [
    ["Messages", "مدیریت پیام‌های تماس"],
    ["Chats", "مشاهده چت‌های AI با کاربران"],
    ["Content", "مدیریت کتاب‌ها، مقالات، آموزش‌ها"],
    ["Text", "ویرایش ۳۶ متن سایت"],
    ["Nav", "مدیریت منوی ناوبری"],
    ["Themes", "تم‌ساز رنگی"],
    ["Settings", "تنظیمات API، ایمیل، Bale/Telegram"],
    ["Users", "مدیریت کاربران با دسترسی زمانی (V19)"],
  ],
  ["تب", "کاربرد"]
));

children.push(heading("۸.۱ ساخت تب جدید توی پنل", 2));
children.push(faPara("برای اضافه کردن تب Users، این کارا رو کردم:"));

children.push(faPara("اول type تب‌ها رو آپدیت کردم:"));

children.push(...codeBlock(`// قبل
const [adminTab, setAdminTab] = useState<
  "messages" | "chats" | "content" | "text" | "nav" | "themes" | "settings"
>("messages");

// بعد
const [adminTab, setAdminTab] = useState<
  "messages" | "chats" | "content" | "text" | "nav" | "themes" | "settings" | "users"
>("messages");`));

children.push(faPara("بعد دکمه‌ی تب رو اضافه کردم:"));

children.push(...codeBlock(`<button
  className={\`admin-tab \${adminTab === "users" ? "active" : ""}\`}
  onClick={() => setAdminTab("users")}
>
  {lang === "fa" ? "کاربران" : "users"}
</button>`));

children.push(faPara("و در نهایت محتوای تب:"));

children.push(...codeBlock(`{adminTab === "users" && (
  <AccessUserManager />
)}`));

children.push(heading("۸.۲ کامپوننت AccessUserManager", 2));
children.push(faPara("این کامپوننت یه جدول از کاربران نشون می‌ده و یه فرم برای ساخت/ویرایش:"));

children.push(...codeBlock(`// ساخت کاربر جدید
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  const body = {
    username: form.username,
    password: form.password,
    displayName: form.displayName,
    role: form.role,
    allowedHourStart: form.allowedHourStart || null,
    allowedHourEnd: form.allowedHourEnd || null,
    allowedDays: form.allowedDays.length > 0
      ? form.allowedDays.join(",")
      : null,
    expiresAt: form.expiresAt || null,
    active: form.active,
  };

  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.ok) {
    fetchUsers();  // refresh لیست
    setShowForm(false);
  }
}`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۹: رفع خطای hydration
// ============================================================================
children.push(heading("فصل ۹: رفع خطای Hydration", 1));

children.push(faPara(
  "خطای hydration یکی از خطاهای رایج توی Next.js هست. این خطا وقتی پیش میاد که HTML که سرور render کرده با HTML که مرورگر render کرده فرق داشته باشه."
));

children.push(heading("۹.۱ علت خطا", 2));
children.push(faPara("توی پروژه‌ی ما، علت این بود که reCAPTCHA script توی <head> بود:"));

children.push(...codeBlock(`// مشکل: توی layout.tsx
<head>
  <script src="https://www.google.com/recaptcha/api.js" async defer />
</head>`));

children.push(faPara(
  "وقتی این script لود می‌شه، یه iframe و div به‌صورت runtime به داخل div با کلاس .g-recaptcha تزریق می‌کنه. ولی توی SSR این iframe وجود نداره. پس وقتی React سعی می‌کنه hydrate کنه، می‌بینه DOM با چیزی که سرور فرستاده فرق داره و خطا می‌ده."
));

children.push(heading("۹.۲ راه‌حل", 2));
children.push(faPara("راه‌حل: script رو از <head> حذف کن و فقط بعد از mount توی client load کن:"));

children.push(...codeBlock(`// 1. حذف script از layout.tsx
// قبل:
<head>
  <script src="https://www.google.com/recaptcha/api.js" async defer />
</head>

// بعد:
<head />  // خالی

// 2. توی page.tsx، یه state برای mounted بساز
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
  // script رو فقط توی client و فقط بعد از mount لود کن
  if (!document.getElementById("recaptcha-api-script")) {
    const s = document.createElement("script");
    s.id = "recaptcha-api-script";
    s.src = "https://www.google.com/recaptcha/api.js";
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }
}, []);

// 3. div reCAPTCHA رو فقط بعد از mount رندر کن
{mounted ? (
  <div className="g-recaptcha" data-sitekey="..." data-theme="dark" />
) : (
  <div style={{ width: 304, height: 78, background: "rgba(0,255,65,0.05)" }} />
)}`));

children.push(faPara("توضیح منطق:"));
children.push(bullet("سرور: mounted = false، پس div خالی رندر می‌شه"));
children.push(bullet("اولین client render: mounted = false (همون سرور)، div خالی رندر می‌شه — یعنی hydration موفق"));
children.push(bullet("بعد useEffect اجرا می‌شه، mounted = true می‌شه، script لود می‌شه"));
children.push(bullet("re-render: mounted = true، div .g-recaptcha رندر می‌شه و grecaptcha iframe رو تزریق می‌کنه"));

children.push(faPara("نکته‌ی دیگه: suppressHydrationWarning روی <html> و <body> هم لازمه چون useEffect مقدار lang، dir، data-theme رو تغییر می‌ده:"));

children.push(...codeBlock(`<html lang="en" dir="ltr" suppressHydrationWarning>
  <body suppressHydrationWarning>
    {children}
  </body>
</html>`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۱۰: Docker و استقرار
// ============================================================================
children.push(heading("فصل ۱۰: Docker و استقرار", 1));

children.push(heading("۱۰.۱ Dockerfile", 2));
children.push(faPara("برای deploy روی VPS، از Docker استفاده می‌کنیم. Dockerfile:"));

children.push(...codeBlock(`# Dockerfile
FROM node:22-slim
RUN npm install -g bun
RUN apt-get update && apt-get install -y openssl sqlite3 python3

WORKDIR /app
COPY package.json bun.lock* ./
COPY prisma ./prisma/
RUN bun install
RUN bunx prisma generate

COPY . .
RUN mkdir -p db
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \\
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]`));

children.push(heading("۱۰.۲ docker-compose.yml", 2));

children.push(...codeBlock(`# docker-compose.yml
version: "3.8"
services:
  website:
    build: .
    container_name: personal-site
    ports:
      - "3000:3000"
    volumes:
      - site-db:/app/db
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/db/custom.db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
volumes:
  site-db:`));

children.push(heading("۱۰.۳ docker-entrypoint.sh", 2));

children.push(...codeBlock(`#!/bin/bash
set -e
echo "[1/3] Pushing database schema..."
bunx prisma db push --accept-data-loss 2>&1 || true

echo "[2/3] Seeding content..."
python3 scripts/seed_content.py 2>&1 || true
python3 scripts/seed_equipment.py 2>&1 || true
python3 scripts/seed_access_users.py 2>&1 || true

echo "[3/3] Starting Next.js production server..."
exec bun run start --host 0.0.0.0`));

children.push(heading("۱۰.۴ استقرار روی VPS", 2));
children.push(faPara("از صفر روی یه VPS جدید:"));

children.push(...codeBlock(`# 1. فایل zip رو روی VPS آپلود کن
scp personal-site-final.zip user@your-vps:/home/user/

# 2. از حالت فشرده خارج کن
ssh user@your-vps
unzip personal-site-final.zip
cd personal-site-final

# 3. اجرا
docker-compose up -d

# 4. بررسی
docker-compose ps
curl http://localhost:3000/

# 5. لاگ‌ها
docker-compose logs -f`));

children.push(heading("۱۰.۵ انتقال به VPS جدید (با حفظ داده‌ها)", 2));

children.push(...codeBlock(`# روی VPS قدیمی:
docker cp personal-site:/app/db/custom.db ./backup.db
zip -r site-backup.zip personal-site-final/ backup.db

# روی VPS جدید:
unzip site-backup.zip
cd personal-site-final
docker-compose up -d
docker cp ../backup.db personal-site:/app/db/custom.db
docker-compose restart

# اگه دامنه جدید داری:
# - به AUTHORIZED_DOMAINS در src/lib/canvas-protect.ts اضافه کن
# - به AUTHORIZED_DOMAINS در src/app/page.tsx اضافه کن
docker-compose up -d --build`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۱۱: نکات امنیتی
// ============================================================================
children.push(heading("فصل ۱۱: نکات امنیتی", 1));

children.push(heading("۱۱.۱ هرگز رمز رو plain text ذخیره نکن", 2));
children.push(faPara("همیشه از bcrypt استفاده کن:"));

children.push(...codeBlock(`// ❌ اشتباه
const user = await db.user.create({
  data: { username, password: password },  // plain text!
});

// ✅ درست
const hash = await hashPassword(password);
const user = await db.user.create({
  data: { username, passwordHash: hash },
});`));

children.push(heading("۱۱.۲ از user enumeration جلوگیری کن", 2));
children.push(faPara("وقتی کاربر اسم اشتباه می‌زنه، نگه \"کاربر وجود ندارد\":"));

children.push(...codeBlock(`// ❌ اشتباه — به مهاجم می‌گه کدوم username وجود داره
if (!user) return res.json({ error: "user_not_found" });
if (!passwordOk) return res.json({ error: "wrong_password" });

// ✅ درست — پیام یکسان
if (!user || !passwordOk) {
  return res.json({ error: "invalid_credentials" });
}`));

children.push(heading("۱۱.۳ cookie‌ها رو httpOnly کن", 2));

children.push(...codeBlock(`response.cookies.set("session", token, {
  httpOnly: true,   // JavaScript نمی‌تونه بهش دسترسی پیدا کنه — جلوگیری از XSS
  secure: true,     // فقط روی HTTPS
  sameSite: "lax",  // جلوگیری از CSRF
  path: "/",
  maxAge: 60 * 60 * 24,
});`));

children.push(heading("۱۱.۴ rate limiting", 2));
children.push(faPara("برای جلوگیری از brute force، IP رو rate limit کن:"));

children.push(...codeBlock(`// ساده‌ترین روش — شمارش درخواست‌ها توی یه زمان مشخص
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60000 }); // 1 دقیقه
    return true;
  }

  if (record.count >= 5) return false; // حداکثر 5 درخواست در دقیقه
  record.count++;
  return true;
}`));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// فصل ۱۲: جمع‌بندی و قدم‌های بعدی
// ============================================================================
children.push(heading("فصل ۱۲: جمع‌بندی و قدم‌های بعدی", 1));

children.push(faPara("تبریک! تاحالا یاد گرفتی:"));
children.push(bullet("پروژه‌ی Next.js بسازی"));
children.push(bullet("کامپوننت‌های React بنویسی"));
children.push(bullet("با Prisma دیتابیس مدیریت کنی"));
children.push(bullet("API routes بنویسی"));
children.push(bullet("سیستم احراز هویت با دسترسی زمانی بسازی"));
children.push(bullet("خطاهای hydration رو رفع کنی"));
children.push(bullet("با Docker deploy کنی"));
children.push(bullet("نکات امنیتی رو رعایت کنی"));

children.push(heading("۱۲.۱ قدم‌های بعدی", 2));
children.push(faPara("برای توسعه‌ی بیشتر، می‌تونی:"));
children.push(bullet("بلاگ با Markdown اضافه کنی (با react-markdown)"));
children.push(bullet("سیستم کامنت اضافه کنی"));
children.push(bullet("آپلود فایل/عکس اضافه کنی (با S3 یا Cloudinary)"));
children.push(bullet("اعلان‌های push اضافه کنی"));
children.push(bullet("PWA بسازی (offline support)"));
children.push(bullet("چندزبانه‌ی کامل (i18n) با next-intl"));

children.push(heading("۱۲.۲ منابع برای یادگیری بیشتر", 2));
children.push(bullet("Next.js docs: nextjs.org/docs"));
children.push(bullet("Prisma docs: prisma.io/docs"));
children.push(bullet("React docs: react.dev"));
children.push(bullet("TypeScript handbook: typescriptlang.org/docs/handbook"));

children.push(hr());
children.push(faPara(
  "امیدوارم این آموزش برات مفید بوده باشه. اگه سوالی داری، توی بخش چت سایت می‌تونی بپرسی. موفق باشی! 🚀"
));

// ----------------------------------------------------------------------------
// ساخت سند نهایی
// ----------------------------------------------------------------------------

const doc = new Document({
  creator: "Personal Site Tutorial Generator",
  title: "آموزش کامل ساخت سایت شخصی",
  description: "از صفر تا صد — با مثال‌های فراوان",
  styles: {
    default: {
      document: {
        run: { font: FONT_FA, size: 22 },
        paragraph: { spacing: { line: 360 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: { font: FONT_FA, size: 32, bold: true, color: COLOR_HEADING },
        paragraph: { spacing: { before: 360, after: 180 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: { font: FONT_FA, size: 28, bold: true, color: COLOR_HEADING },
        paragraph: { spacing: { before: 240, after: 120 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        run: { font: FONT_FA, size: 24, bold: true, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 180, after: 100 } },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({
            text: "آموزش کامل ساخت سایت شخصی — V19.0",
            font: FONT_FA, size: 16, color: COLOR_DIM,
          })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
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

// ----------------------------------------------------------------------------
// ذخیره فایل
// ----------------------------------------------------------------------------
const outputPath = "/home/z/my-project/download/FULL_TUTORIAL_FA_V19.docx";

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Tutorial generated: ${outputPath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("❌ Error generating tutorial:", err);
  process.exit(1);
});
