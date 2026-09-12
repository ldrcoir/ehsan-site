// ============================================================================
// generate-complete-tutorial.js
// تولید فایل Word آموزشی کامل ساخت سایت از صفر تا صد
// با کد منبع خط‌به‌خط با کامنت فارسی
// ============================================================================

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, Footer, Header, PageNumber, NumberFormat,
  TableOfContents,
} = require("docx");

// ----------------------------------------------------------------------------
// تنظیمات
// ----------------------------------------------------------------------------
const FONT_FA = "Vazirmatn";
const FONT_CODE = "Courier New";
const COLOR_PRIMARY = "008F11";
const COLOR_BRIGHT = "39FF14";
const COLOR_HEADING = "006400";
const COLOR_DIM = "4A7A4A";
const COLOR_CODE_BG = "F5F5F5";
const COLOR_NOTE_BG = "FFF8E1";
const COLOR_NOTE_BORDER = "FFB000";

// ----------------------------------------------------------------------------
// توابع کمکی
// ----------------------------------------------------------------------------
function faPara(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22, ...opts })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 360, after: 120 },
    bidirectional: true,
  });
}

function faBold(text) {
  return new TextRun({ text, font: FONT_FA, size: 22, bold: true, color: COLOR_PRIMARY });
}

function faNormal(text) {
  return new TextRun({ text, font: FONT_FA, size: 22 });
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
  const lines = code.split("\n");
  return lines.map(line => codePara(line));
}

function heading(text, level = 1) {
  const sizes = { 1: 36, 2: 30, 3: 26, 4: 22 };
  const colors = { 1: COLOR_HEADING, 2: COLOR_PRIMARY, 3: COLOR_PRIMARY, 4: COLOR_DIM };
  const headingLevels = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
  };
  return new Paragraph({
    heading: headingLevels[level],
    children: [new TextRun({ text, font: FONT_FA, size: sizes[level], bold: true, color: colors[level] })],
    spacing: { before: 400, after: 200 },
    bidirectional: true,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 22 })],
    bullet: { level },
    spacing: { line: 340, after: 80 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

function noteBox(text) {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT_FA, size: 20, color: "795548" })],
    shading: { type: ShadingType.CLEAR, fill: COLOR_NOTE_BG, color: "auto" },
    spacing: { line: 320, before: 120, after: 120 },
    indent: { left: 240, right: 240 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_NOTE_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_NOTE_BORDER },
      left: { style: BorderStyle.SINGLE, size: 6, color: COLOR_NOTE_BORDER },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_NOTE_BORDER },
    },
    bidirectional: true,
  });
}

function makeTable(rows, headers) {
  const tableRows = [];
  tableRows.push(new TableRow({
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, font: FONT_FA, size: 20, bold: true, color: "FFFFFF" })],
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

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ----------------------------------------------------------------------------
// ساخت محتوا
// ----------------------------------------------------------------------------
const children = [];

// === جلد ===
children.push(new Paragraph({ children: [new TextRun({ text: " ", size: 48 })], spacing: { before: 3000 } }));
children.push(new Paragraph({
  children: [new TextRun({ text: "آموزش کامل برنامه‌نویسی وب", font: FONT_FA, size: 60, bold: true, color: COLOR_BRIGHT })],
  alignment: AlignmentType.CENTER, spacing: { after: 240 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "از صفر تا ساخت سایت کامل", font: FONT_FA, size: 40, color: COLOR_PRIMARY })],
  alignment: AlignmentType.CENTER, spacing: { after: 600 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "HTML • CSS • JavaScript • TypeScript • React • Next.js", font: FONT_CODE, size: 24, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER, spacing: { after: 120 },
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "Tailwind CSS • Prisma • SQLite • Docker", font: FONT_CODE, size: 24, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER, spacing: { after: 2400 },
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "با کد منبع خط‌به‌خط با کامنت فارسی", font: FONT_FA, size: 26, color: COLOR_PRIMARY })],
  alignment: AlignmentType.CENTER, spacing: { after: 240 }, bidirectional: true,
}));
children.push(new Paragraph({
  children: [new TextRun({ text: "نسخه ۱.۰ — ۱۴۰۳", font: FONT_FA, size: 22, color: COLOR_DIM })],
  alignment: AlignmentType.CENTER, bidirectional: true,
}));
children.push(pageBreak());

// === فهرست ===
children.push(new Paragraph({
  children: [new TextRun({ text: "فهرست مطالب", font: FONT_FA, size: 36, bold: true, color: COLOR_HEADING })],
  alignment: AlignmentType.CENTER, spacing: { after: 360 }, bidirectional: true,
}));
children.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new TextRun({ text: " ", size: 18 }), new PageBreak()] }));

// ============================================================================
// فصل ۱: مقدمه
// ============================================================================
children.push(heading("فصل ۱: مقدمه — برنامه‌نویسی وب چیست؟", 1));

children.push(faPara("سلام! توی این آموزش، قدم‌به‌قدم یاد می‌گیریم چطور یه سایت کامل بسازیم. قرار نیست فقط یه صفحه ساده باشه — یه سایت حرفه‌ای با پنل ادمین، چت هوش مصنوعی، دیتابیس و امکانات کامل."));

children.push(heading("۱.۱ سایت چطور کار می‌کنه؟", 2));
children.push(faPara("وقتی شما یه سایت رو توی مرورگر باز می‌کنید، این اتفاقا می‌افته:"));
children.push(bullet("مرورگر شما (Firefox، Chrome) یه درخواست به یه کامپیوتر دور می‌فرسته که بهش می‌گیم «سرور»"));
children.push(bullet("سرور فایل‌های سایت رو پیدا می‌کنه و به مرورگر شما می‌فرسته"));
children.push(bullet("مرورگر اون فایل‌ها رو نمایش می‌ده — این چیزیه که شما می‌بینید"));

children.push(noteBox("نکته: کامپیوتری که سایت رو نشون می‌ده «کلاینت» (Client) نامیده می‌شه، و کامپیوتری که فایل‌های سایت رو نگه می‌داره «سرور» (Server)."));

children.push(heading("۱.۲ تکنولوژی‌هایی که یاد می‌گیریم", 2));
children.push(makeTable(
  [
    ["HTML", "زبان نشانه‌گذاری", "ساختار صفحه (متن، عکس، لینک)"],
    ["CSS", "زبان استایل", "ظاهر صفحه (رنگ، فونت، چیدمان)"],
    ["JavaScript", "زبان برنامه‌نویسی", "رفتار صفحه (کلیک، انیمیشن)"],
    ["TypeScript", "زبان برنامه‌نویسی", "مثل JavaScript ولی با type"],
    ["React", "کتابخانه UI", "ساخت کامپوننت‌های قابل استفاده مجدد"],
    ["Next.js", "فریم‌ورک", "سرور + کلاینت توی یه جا"],
    ["Tailwind CSS", "فریم‌ورک CSS", "استایل‌نویسی سریع با کلاس"],
    ["Prisma", "ORM", "کار با دیتابیس با TypeScript"],
    ["SQLite", "دیتابیس", "ذخیره داده‌ها توی یه فایل"],
    ["Docker", "container", "اجرای سایت روی هر سرور"],
  ],
  ["تکنولوژی", "نوع", "کاربرد"]
));

children.push(heading("۱.۳ پیش‌نیازها", 2));
children.push(faPara("برای شروع، فقط اینا رو نیاز داری:"));
children.push(bullet("یه کامپیوتر (ویندوز، مک یا لینوکس)"));
children.push(bullet("اینترنت برای دانلود نرم‌افزارها"));
children.push(bullet("اشتیاق برای یادگیری!"));

children.push(faPara("تجربه‌ی قبلی برنامه‌نویسی لازم نیست — همه چیز رو از صفر توضیح می‌دم."));

children.push(pageBreak());

// ============================================================================
// فصل ۲: HTML
// ============================================================================
children.push(heading("فصل ۲: HTML — ساختار صفحه", 1));

children.push(faPara("HTML (HyperText Markup Language) زبان پایه‌ی وب هست. به مرورگر می‌گه چه چیزی نشون بده — متن، عکس، لینک و..."));

children.push(heading("۲.۱ ساختار پایه HTML", 2));
children.push(faPara("هر صفحه‌ی HTML این ساختار رو داره:"));

children.push(...codeBlock(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>عنوان صفحه</title>
</head>
<body>
    <h1>سلام دنیا!</h1>
    <p>این اولین صفحه‌ی من هست.</p>
</body>
</html>`));

children.push(faPara("توضیح خط‌به‌خط:"));
children.push(bullet("<!DOCTYPE html> — به مرورگر می‌گه این HTML5 هست"));
children.push(bullet("<html> — عنصر ریشه (root) — همه چیز داخلشه"));
children.push(bullet("lang=\"fa\" — زبان صفحه فارسی هست"));
children.push(bullet("dir=\"rtl\" — جهت متن راست به چپ (مهم برای فارسی)"));
children.push(bullet("<head> — اطلاعات صفحه که نشون داده نمی‌شن (مثل عنوان)"));
children.push(bullet("<body> — محتوای صفحه که نشون داده می‌شه"));

children.push(heading("۲.۲ عناصر رایج HTML", 2));

children.push(makeTable(
  [
    ["<h1> تا <h6>", "سرتیتر (h1 بزرگ‌ترین، h6 کوچک‌ترین)"],
    ["<p>", "پاراگراف متن"],
    ["<a>", "لینک — <a href=\"url\">متن</a>"],
    ["<img>", "عکس — <img src=\"url\" alt=\"توضیح\">"],
    ["<div>", "بخش (برای گروه‌بندی)"],
    ["<span>", "بخش کوچک (مثل div ولی inline)"],
    ["<ul>, <li>", "لیست نقطه‌ای"],
    ["<ol>, <li>", "لیست شماره‌ای"],
    ["<button>", "دکمه"],
    ["<input>", "فیلد ورودی"],
    ["<form>", "فرم (برای دریافت اطلاعات)"],
  ],
  ["عنصر", "کاربرد"]
));

children.push(heading("۲.۳ مثال کامل", 2));

children.push(...codeBlock(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>صفحه‌ی من</title>
</head>
<body>
    <!-- سرتیتر -->
    <h1>خوش آمدید به سایت من</h1>
    
    <!-- پاراگراف -->
    <p>من یک برنامه‌نویس هستم.</p>
    
    <!-- لینک -->
    <a href="https://example.com">کلیک کنید</a>
    
    <!-- عکس -->
    <img src="photo.jpg" alt="عکس من">
    
    <!-- لیست -->
    <ul>
        <li>مورد اول</li>
        <li>مورد دوم</li>
        <li>مورد سوم</li>
    </ul>
    
    <!-- دکمه -->
    <button onclick="alert('سلام!')">کلیک کن</button>
</body>
</html>`));

children.push(noteBox("تمرین: یه فایل به نام index.html بساز، کد بالا رو توش بذار، و با مرورگر بازش کن. باید صفحه رو ببینی!"));

children.push(pageBreak());

// ============================================================================
// فصل ۳: CSS
// ============================================================================
children.push(heading("فصل ۳: CSS — ظاهر صفحه", 1));

children.push(faPara("CSS (Cascading Style Sheets) به صفحه‌ی HTML ظاهر می‌ده — رنگ، فونت، اندازه، چیدمان و..."));

children.push(heading("۳.۱ سه روش استفاده از CSS", 2));

children.push(faPara("روش ۱: داخل عنصر (Inline) — پیشنهاد نمی‌شه:"));
children.push(...codeBlock(`<p style="color: red; font-size: 20px;">متن قرمز</p>`));

children.push(faPara("روش ۲: داخل تگ <style> (Internal):"));
children.push(...codeBlock(`<head>
<style>
    p {
        color: red;
        font-size: 20px;
    }
</style>
</head>`));

children.push(faPara("روش ۳: فایل جدا (External) — پیشنهادی:"));
children.push(...codeBlock(`<!-- HTML -->
<link rel="stylesheet" href="style.css">`));
children.push(...codeBlock(`/* style.css */
p {
    color: red;
    font-size: 20px;
}`));

children.push(heading("۳.۲ انتخابگرها (Selectors)", 2));
children.push(faPara("CSS با انتخابگرها کار می‌کنه — بهش می‌گه کدوم عنصر رو استایل بده:"));

children.push(makeTable(
  [
    ["element", "p { }", "همه‌ی <p> ها"],
    [".class", ".red { }", "همه‌ی عنصرهایی که class=\"red\" دارن"],
    ["#id", "#header { }", "عنصری که id=\"header\" داره"],
    ["descendant", "div p { }", "همه‌ی <p> هایی که داخل <div> هستن"],
    ["child", "div > p { }", "<p> هایی که مستقیم داخل <div> هستن"],
    [":hover", "a:hover { }", "وقتی موس روی لینک میره"],
  ],
  ["نوع", "مثال", "انتخاب می‌کنه"]
));

children.push(heading("۳.۳ ویژگی‌های مهم CSS", 2));

children.push(...codeBlock(`/* رنگ و پس‌زمینه */
color: #00ff41;              /* رنگ متن */
background-color: #000;      /* پس‌زمینه */
background-image: url('bg.jpg');

/* متن */
font-family: 'Vazirmatn', sans-serif;
font-size: 16px;
font-weight: bold;
text-align: center;          /* چپ، راست، وسط */
line-height: 1.6;            /* فاصله خطوط */

/* جعبه (Box Model) */
margin: 20px;                /* فاصله بیرونی */
padding: 10px;               /* فاصله داخلی */
border: 1px solid #ccc;      /* حاشیه */
border-radius: 8px;          /* گوشه‌های گرد */

/* اندازه */
width: 300px;
height: 200px;
max-width: 100%;

/* چیدمان */
display: flex;               /* فلکس‌باکس */
justify-content: center;     /* افقی */
align-items: center;         /* عمودی */
gap: 20px;                   /* فاصله بین عنصرها */`));

children.push(heading("۳.۴ مثال کامل", 2));

children.push(...codeBlock(`/* style.css */
body {
    background: #000;
    color: #0f0;
    font-family: 'Vazirmatn', sans-serif;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #00ff41;
    text-align: center;
    border-bottom: 2px solid #00ff41;
    padding-bottom: 10px;
}

.button {
    background: #00ff41;
    color: #000;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
}

.button:hover {
    background: #39ff14;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
}`));

children.push(pageBreak());

// ============================================================================
// فصل ۴: JavaScript
// ============================================================================
children.push(heading("فصل ۴: JavaScript — رفتار صفحه", 1));

children.push(faPara("JavaScript زبان برنامه‌نویسی وب هست. به صفحه‌ت جان می‌ده — کلیک، انیمیشن، دریافت داده و..."));

children.push(heading("۴.۱ متغیرها", 2));

children.push(...codeBlock(`// متغیرها (جای ذخیره داده)
let name = "احمد";              // متغیر قابل تغییر
const age = 25;                // ثابت (غیرقابل تغییر)
var old = true;                // روش قدیمی (استفاده نکنید)

// انواع داده
let text = "متن";              // رشته (String)
let number = 42;               // عدد (Number)
let isActive = true;           // بولی (Boolean)
let items = [1, 2, 3];         // آرایه (Array)
let user = { name: "احمد", age: 25 };  // شیء (Object)`));

children.push(heading("۴.۲ توابع", 2));

children.push(...codeBlock(`// تابع ساده
function greet(name) {
    return "سلام " + name + "!";
}

// فراخوانی تابع
let message = greet("احمد");
console.log(message);  // "سلام احمد!"

// تابع فلش (Arrow Function) — روش مدرن‌تر
const add = (a, b) => a + b;
console.log(add(5, 3));  // 8

// تابع با چند خط
const calculate = (x, y) => {
    let sum = x + y;
    let product = x * y;
    return { sum, product };
};`));

children.push(heading("۴.۳ شرط‌ها و حلقه‌ها", 2));

children.push(...codeBlock(`// شرط if
let age = 18;
if (age >= 18) {
    console.log("بزرگسال");
} else if (age >= 13) {
    console.log("نوجوان");
} else {
    console.log("کودک");
}

// شرط switch
let day = "monday";
switch (day) {
    case "monday":
        console.log("دوشنبه");
        break;
    case "tuesday":
        console.log("سه‌شنبه");
        break;
    default:
        console.log("روز دیگه");
}

// حلقه for
for (let i = 0; i < 5; i++) {
    console.log(i);  // 0, 1, 2, 3, 4
}

// حلقه for...of (برای آرایه)
let fruits = ["سیب", "موز", "پرتقال"];
for (let fruit of fruits) {
    console.log(fruit);
}

// حلقه for...in (برای شیء)
let user = { name: "احمد", age: 25 };
for (let key in user) {
    console.log(key + ": " + user[key]);
}`));

children.push(heading("۴.۴ کار با DOM", 2));
children.push(faPara("DOM (Document Object Model) نمایش صفحه‌ی HTML توی JavaScript هست."));

children.push(...codeBlock(`// انتخاب عنصر
let heading = document.querySelector("h1");     // اولین h1
let buttons = document.querySelectorAll("button");  // همه دکمه‌ها

// تغییر محتوا
heading.textContent = "عنوان جدید";

// تغییر استایل
heading.style.color = "red";

// اضافه/حذف کلاس
heading.classList.add("active");
heading.classList.remove("active");
heading.classList.toggle("active");  // اگه هست حذف، اگه نیست اضافه

// افزودن event listener (وقتی کلیک شد)
let button = document.querySelector("button");
button.addEventListener("click", function() {
    alert("دکمه کلیک شد!");
});

// ایجاد عنصر جدید
let newDiv = document.createElement("div");
newDiv.textContent = "بخش جدید";
document.body.appendChild(newDiv);  // اضافه به body`));

children.push(pageBreak());

// ============================================================================
// فصل ۵: TypeScript
// ============================================================================
children.push(heading("فصل ۵: TypeScript — JavaScript با نوع", 1));

children.push(faPara("TypeScript (TS) مثل JavaScript هست، ولی type داره. یعنی به متغیرها می‌گه چه نوع داده‌ای قبول می‌کنن. این کار خطاها رو کم می‌کنه."));

children.push(heading("۵.۱ نصب TypeScript", 2));
children.push(...codeBlock(`# نصب TypeScript
npm install -g typescript

# کامپایل فایل
tsc file.ts`));

children.push(heading("۵.۲ نوع‌ها (Types)", 2));

children.push(...codeBlock(`// نوع‌های پایه
let name: string = "احمد";        // رشته
let age: number = 25;             // عدد
let isActive: boolean = true;     // بولی
let items: string[] = ["a", "b"]; // آرایه از رشته
let anyValue: any = "هر چی";      // هر نوعی (استفاده نکنید)

// نوع سفارشی (Type)
type Role = "admin" | "user" | "guest";
let myRole: Role = "admin";

// اینترفیس (Interface) — برای شیءها
interface User {
    id: string;
    name: string;
    age: number;
    email?: string;   // علامت ? یعنی اختیاری
}

let user: User = {
    id: "1",
    name: "احمد",
    age: 25,
};`));

children.push(heading("۵.۳ توابع با نوع", 2));

children.push(...codeBlock(`// تابع با نوع ورودی و خروجی
function add(a: number, b: number): number {
    return a + b;
}

// تابع فلش با نوع
const greet = (name: string): string => {
    return "سلام " + name;
};

// تابع با ورودی اختیاری
function createUser(name: string, age?: number): User {
    return {
        id: Math.random().toString(),
        name: name,
        age: age || 0,
    };
}`));

children.push(noteBox("نکته: TypeScript به تنهایی اجرا نمی‌شه — اول به JavaScript کامپایل می‌شه بعد اجرا. اما Next.js این کار رو خودکار می‌کنه."));

children.push(pageBreak());

// ============================================================================
// فصل ۶: React
// ============================================================================
children.push(heading("فصل ۶: React — ساخت کامپوننت", 1));

children.push(faPara("React کتابخانه‌ای برای ساخت رابط کاربری (UI) هست. ایده‌ی اصلی: صفحه‌ت رو از قطعات کوچک به نام «کامپوننت» بساز."));

children.push(heading("۶.۱ کامپوننت چیست؟", 2));
children.push(faPara("کامپوننت یه تابع JavaScript هست که HTML برمی‌گردونه (JSX). مثلاً یه دکمه، یه کارت، یه فرم."));

children.push(...codeBlock(`// کامپوننت ساده
function Hello() {
    return <h1>سلام دنیا!</h1>;
}

// استفاده
<Hello />`));

children.push(heading("۶.۲ Props — ورودی کامپوننت", 2));
children.push(faPara("Props ورودی‌های کامپوننت هستن. مثل پارامتر تابع:"));

children.push(...codeBlock(`// کامپوننت با props
function Greeting({ name, age }: { name: string; age: number }) {
    return (
        <div>
            <h1>سلام {name}!</h1>
            <p>سن شما: {age}</p>
        </div>
    );
}

// استفاده
<Greeting name="احمد" age={25} />`));

children.push(heading("۶.۳ useState — متغیر reactive", 2));
children.push(faPara("useState یه hook هست که به کامپوننت «حافظه» می‌ده. وقتی متغیر تغییر کنه، صفحه آپدیت می‌شه."));

children.push(...codeBlock(`import { useState } from "react";

function Counter() {
    // count: متغیر
    // setCount: تابع برای تغییر
    // 0: مقدار اولیه
    const [count, setCount] = useState(0);
    
    return (
        <div>
            <p>شمارنده: {count}</p>
            <button onClick={() => setCount(count + 1)}>+</button>
            <button onClick={() => setCount(count - 1)}>-</button>
        </div>
    );
}`));

children.push(heading("۶.۴ useEffect — عوارض جانبی", 2));
children.push(faPara("useEffect برای کارهایی هست که خارج از render انجام می‌شن — مثل fetch از API:"));

children.push(...codeBlock(`import { useState, useEffect } from "react";

function UserProfile({ userId }: { userId: string }) {
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        // این فقط بعد از mount اجرا می‌شه
        fetch(\`/api/users/\${userId}\`)
            .then(r => r.json())
            .then(data => setUser(data));
    }, [userId]);  // فقط وقتی userId تغییر کنه
    
    if (!user) return <p>در حال بارگذاری...</p>;
    return <div>{user.name}</div>;
}`));

children.push(pageBreak());

// ============================================================================
// فصل ۷: Next.js
// ============================================================================
children.push(heading("فصل ۷: Next.js — فریم‌ورک کامل", 1));

children.push(faPara("Next.js فریم‌ورکی بالای React هست. بهت امکانات اضافه می‌ده: routing خودکار، API routes، SSR (Server-Side Rendering) و..."));

children.push(heading("۷.۱ ساخت پروژه", 2));

children.push(...codeBlock(`# ساخت پروژه جدید
npx create-next-app@latest my-site

# سوالات رو جواب بده:
✔ TypeScript? Yes
✔ ESLint? Yes
✔ Tailwind CSS? Yes
✔ src/ directory? Yes
✔ App Router? Yes

# وارد پوشه شو
cd my-site

# اجرای سرور توسعه
npm run dev
# سایت روی http://localhost:3000`));

children.push(heading("۷.۲ App Router — مسیریابی", 2));
children.push(faPara("Next.js از فایل‌ها برای routing استفاده می‌کنه:"));

children.push(makeTable(
  [
    ["src/app/page.tsx", "/ (صفحه اصلی)"],
    ["src/app/about/page.tsx", "/about"],
    ["src/app/blog/page.tsx", "/blog"],
    ["src/app/blog/[id]/page.tsx", "/blog/123 (داینامیک)"],
    ["src/app/api/hello/route.ts", "/api/hello (API)"],
  ],
  ["فایل", "URL"]
));

children.push(heading("۷.۳ ساخت یه API ساده", 2));

children.push(...codeBlock(`// src/app/api/hello/route.ts
import { NextResponse } from "next/server";

// GET /api/hello
export async function GET() {
    return NextResponse.json({ message: "سلام!" });
}

// POST /api/hello
export async function POST(request: Request) {
    const body = await request.json();
    return NextResponse.json({ received: body });
}`));

children.push(heading("۷.۴ layout.tsx — قالب کلی", 2));

children.push(...codeBlock(`// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "سایت من",
    description: "توضیحات سایت",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fa" dir="rtl">
            <body>{children}</body>
        </html>
    );
}`));

children.push(pageBreak());

// ============================================================================
// فصل ۸: Tailwind CSS
// ============================================================================
children.push(heading("فصل ۸: Tailwind CSS — استایل سریع", 1));

children.push(faPara("Tailwind CSS فریم‌ورکی هست که به‌جای نوشتن CSS، از کلاس‌های آماده استفاده می‌کنی."));

children.push(heading("۸.۱ مقایسه", 2));

children.push(faPara("روش قدیمی (CSS):"));
children.push(...codeBlock(`/* style.css */
.button {
    background: blue;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
}`));
children.push(...codeBlock(`<!-- HTML -->
<button class="button">کلیک</button>`));

children.push(faPara("روش Tailwind:"));
children.push(...codeBlock(`<!-- HTML -->
<button class="bg-blue-500 text-white px-5 py-2 rounded">
    کلیک
</button>`));

children.push(heading("۸.۲ کلاس‌های رایج", 2));

children.push(makeTable(
  [
    ["bg-blue-500", "پس‌زمینه آبی"],
    ["text-white", "متن سفید"],
    ["text-2xl", "متن بزرگ"],
    ["font-bold", "متن ضخیم"],
    ["p-4", "padding 1rem"],
    ["m-2", "margin 0.5rem"],
    ["rounded", "گوشه‌های گرد"],
    ["flex", "display: flex"],
    ["justify-center", "وسط افقی"],
    ["items-center", "وسط عمودی"],
    ["gap-4", "فاصله 1rem"],
    ["w-full", "عرض 100%"],
    ["h-screen", "ارتفاع صفحه"],
  ],
  ["کلاس", "کاربرد"]
));

children.push(heading("۸.۳ مثال کامل", 2));

children.push(...codeBlock(`// کامپوننت با Tailwind
function Card() {
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                عنوان کارت
            </h2>
            <p className="text-gray-600 mb-4">
                این توضیحات کارت هست.
            </p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                کلیک کن
            </button>
        </div>
    );
}`));

children.push(pageBreak());

// ============================================================================
// فصل ۹: Prisma + SQLite
// ============================================================================
children.push(heading("فصل ۹: Prisma + SQLite — دیتابیس", 1));

children.push(faPara("دیتابیس جاییه که داده‌ها ذخیره می‌شن — مثل کاربرها، پست‌ها، پیام‌ها. SQLite سبک‌ترین دیتابیس هست (یه فایل فقط). Prisma ابزاریه که کار با دیتابیس رو با TypeScript راحت می‌کنه."));

children.push(heading("۹.۱ نصب", 2));

children.push(...codeBlock(`# نصب Prisma
bun add prisma @prisma/client

# راه‌اندازی با SQLite
bunx prisma init --datasource-provider sqlite`));

children.push(heading("۹.۲ تعریف مدل", 2));
children.push(faPara("توی فایل prisma/schema.prisma مدل‌ها رو تعریف می‌کنیم:"));

children.push(...codeBlock(`// prisma/schema.prisma

datasource db {
    provider = "sqlite"
    url      = env("DATABASE_URL")
}

generator client {
    provider = "prisma-client-js"
}

// مدل کاربر
model User {
    id        String   @id @default(cuid())  // کلید اصلی
    name      String                          // نام
    email     String   @unique                // ایمیل یکتا
    age       Int?                            // سن (اختیاری)
    createdAt DateTime @default(now())       // تاریخ ساخت
    posts     Post[]                          // رابطه با پست‌ها
}

// مدل پست
model Post {
    id        String   @id @default(cuid())
    title     String
    content   String?
    published Boolean  @default(false)
    authorId  String
    author    User     @relation(fields: [authorId], references: [id])
    createdAt DateTime @default(now())
}`));

children.push(heading("۹.۳ اعمال schema", 2));

children.push(...codeBlock(`# اعمال تغییرات به دیتابیس
bunx prisma db push

# تولید Prisma Client (تایپ‌های TypeScript)
bunx prisma generate`));

children.push(heading("۹.۴ استفاده از Prisma Client", 2));

children.push(...codeBlock(`// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;`));

children.push(heading("۹.۵ عملیات CRUD", 2));

children.push(faPara("Create (ساخت):"));
children.push(...codeBlock(`// ساخت کاربر جدید
const user = await db.user.create({
    data: {
        name: "احمد",
        email: "ahmad@example.com",
        age: 25,
    },
});`));

children.push(faPara("Read (خواندن):"));
children.push(...codeBlock(`// همه کاربرها
const users = await db.user.findMany();

// یک کاربر با شرط
const user = await db.user.findUnique({
    where: { email: "ahmad@example.com" },
});

// کاربرها با فیلتر
const adults = await db.user.findMany({
    where: { age: { gte: 18 } },
    orderBy: { name: "asc" },
});`));

children.push(faPara("Update (به‌روزرسانی):"));
children.push(...codeBlock(`const updated = await db.user.update({
    where: { id: "1" },
    data: { age: 26 },
});`));

children.push(faPara("Delete (حذف):"));
children.push(...codeBlock(`await db.user.delete({
    where: { id: "1" },
});`));

children.push(pageBreak());

// ============================================================================
// فصل ۱۰: ساخت سایت — کد واقعی
// ============================================================================
children.push(heading("فصل ۱۰: ساخت سایت — کد واقعی", 1));

children.push(faPara("حالا که همه چیز رو یاد گرفتی، بیا سایت واقعی بسازیم. این کد واقعی پروژه‌ئه که توش همه چیز استفاده شده."));

children.push(heading("۱۰.۱ ساخت صفحه اصلی", 2));

children.push(...codeBlock(`// src/app/page.tsx
"use client";  // این کامپوننت توی مرورگر اجرا می‌شه

import { useState, useEffect } from "react";

export default function Home() {
    // متغیرهای state
    const [count, setCount] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    
    // effect: وقتی اسکرول کردیم
    useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 100);
        };
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    
    return (
        <main>
            {/* هدر */}
            <header className={scrolled ? "scrolled" : ""}>
                <h1>سایت من</h1>
                <nav>
                    <a href="#about">درباره</a>
                    <a href="#contact">تماس</a>
                </nav>
            </header>
            
            {/* بخش اصلی */}
            <section className="hero">
                <h2>خوش آمدید</h2>
                <p>این سایت من هست.</p>
                <button onClick={() => setCount(count + 1)}>
                    کلیک شده: {count}
                </button>
            </section>
        </main>
    );
}`));

children.push(heading("۱۰.۲ ساخت API برای فرم تماس", 2));

children.push(...codeBlock(`// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/contact
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, message } = body;
        
        // اعتبارسنجی
        if (!name || !email || !message) {
            return NextResponse.json(
                { ok: false, error: "همه فیلدها لازم است" },
                { status: 400 }
            );
        }
        
        // ذخیره توی دیتابیس
        const msg = await db.contactMessage.create({
            data: { name, email, message },
        });
        
        return NextResponse.json({ ok: true, id: msg.id });
    } catch (error) {
        return NextResponse.json(
            { ok: false, error: "خطای سرور" },
            { status: 500 }
        );
    }
}`));

children.push(heading("۱۰.۳ سیستم احراز هویت", 2));

children.push(faPara("سیستم ورود کاربران با bcrypt برای هش رمز:"));

children.push(...codeBlock(`// src/lib/auth.ts
import bcrypt from "bcryptjs";
import crypto from "crypto";

// هش کردن رمز
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

// بررسی رمز
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// ساخت session token
export function createSessionToken(userId: string): string {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعت
    const payload = \`\${userId}.\${expiresAt}\`;
    const sig = crypto
        .createHmac("sha256", process.env.SESSION_SECRET!)
        .update(payload)
        .digest("hex");
    return Buffer.from(\`\${payload}.\${sig}\`).toString("base64");
}`));

children.push(heading("۱۰.۴ API ورود", 2));

children.push(...codeBlock(`// src/app/api/user/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const { username, password } = await request.json();
    
    // پیدا کردن کاربر
    const user = await db.user.findUnique({
        where: { username: username.toLowerCase() },
    });
    
    // اگه کاربر نبود یا رمز اشتباه بود
    if (!user) {
        return NextResponse.json(
            { ok: false, error: "invalid_credentials" },
            { status: 401 }
        );
    }
    
    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
        return NextResponse.json(
            { ok: false, error: "invalid_credentials" },
            { status: 401 }
        );
    }
    
    // ورود موفق — ساخت session
    const token = createSessionToken(user.id);
    const response = NextResponse.json({ ok: true, user: { ...user } });
    
    // ست کردن cookie
    response.cookies.set("session", token, {
        httpOnly: true,        // جلوگیری از XSS
        secure: true,          // فقط HTTPS
        sameSite: "lax",       // جلوگیری از CSRF
        path: "/",
        maxAge: 60 * 60 * 24,  // 24 ساعت
    });
    
    return response;
}`));

children.push(pageBreak());

// ============================================================================
// فصل ۱۱: Docker
// ============================================================================
children.push(heading("فصل ۱۱: Docker — استقرار سایت", 1));

children.push(faPara("Docker ابزاریه که سایتت رو توی یه «container» بسته‌بندی می‌کنه. اینطوری روی هر سروری اجرا می‌شه بدون مشکل."));

children.push(heading("۱۱.۱ Dockerfile", 2));

children.push(...codeBlock(`# Dockerfile
FROM node:22-slim

# نصب نرم‌افزارهای لازم
RUN apt-get update && apt-get install -y openssl sqlite3 python3

# پوشه‌ی کاری
WORKDIR /app

# کپی package.json و نصب وابستگی‌ها
COPY package.json bun.lock* ./
RUN npm install -g bun && bun install

# کپی کد
COPY . .

# تولید Prisma Client
RUN bunx prisma generate

# پورت
EXPOSE 3000

# اجرای سرور
CMD ["bun", "run", "start"]`));

children.push(heading("۱۱.۲ docker-compose.yml", 2));

children.push(...codeBlock(`# docker-compose.yml
services:
    website:
        build: .
        ports:
            - "3000:3000"
        volumes:
            - ./db:/app/db  # ذخیره دیتابیس
        environment:
            - DATABASE_URL=file:/app/db/custom.db
            - NODE_ENV=production
        restart: unless-stopped`));

children.push(heading("۱۱.۳ اجرا", 2));

children.push(...codeBlock(`# ساخت و اجرا
docker-compose up -d

# مشاهده لاگ
docker-compose logs -f

# توقف
docker-compose down

# بازسازی بعد از تغییر
docker-compose up -d --build`));

children.push(pageBreak());

// ============================================================================
// فصل ۱۲: جمع‌بندی
// ============================================================================
children.push(heading("فصل ۱۲: جمع‌بندی و قدم‌های بعدی", 1));

children.push(faPara("تبریک! تاحالا یاد گرفتی:"));
children.push(bullet("HTML — ساختار صفحه"));
children.push(bullet("CSS — ظاهر صفحه"));
children.push(bullet("JavaScript — رفتار صفحه"));
children.push(bullet("TypeScript — JavaScript با نوع"));
children.push(bullet("React — ساخت کامپوننت"));
children.push(bullet("Next.js — فریم‌ورک کامل"));
children.push(bullet("Tailwind CSS — استایل سریع"));
children.push(bullet("Prisma + SQLite — دیتابیس"));
children.push(bullet("Docker — استقرار"));

children.push(heading("۱۲.۱ قدم‌های بعدی", 2));
children.push(faPara("برای توسعه‌ی بیشتر:"));
children.push(bullet("یادگیری بیشتر React hooks (useMemo، useCallback، useContext)"));
children.push(bullet("یادگیری Next.js middleware"));
children.push(bullet("استفاده از WebSocket برای چت زنده"));
children.push(bullet("اضافه‌کردن Redis برای cache"));
children.push(bullet("یادگیری CI/CD (GitHub Actions)"));
children.push(bullet("یادگیری Kubernetes (برای规模化)"));

children.push(heading("۱۲.۲ منابع", 2));
children.push(bullet("MDN Web Docs: developer.mozilla.org"));
children.push(bullet("React docs: react.dev"));
children.push(bullet("Next.js docs: nextjs.org/docs"));
children.push(bullet("Prisma docs: prisma.io/docs"));
children.push(bullet("Tailwind docs: tailwindcss.com/docs"));
children.push(bullet("Docker docs: docs.docker.com"));

children.push(faPara(""));
children.push(faPara("موفق باشی! 🚀"));

// ----------------------------------------------------------------------------
// ساخت سند
// ----------------------------------------------------------------------------
const doc = new Document({
  creator: "Tutorial Generator",
  title: "آموزش کامل برنامه‌نویسی وب",
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
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal",
        run: { font: FONT_FA, size: 26, bold: true, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
    ],
  },
  sections: [{
    properties: {
      page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({
            text: "آموزش کامل برنامه‌نویسی وب",
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
// ذخیره
// ----------------------------------------------------------------------------
const outputPath = "/home/z/my-project/download/COMPLETE_TUTORIAL_FA.docx";

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`✅ Tutorial generated: ${outputPath}`);
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
