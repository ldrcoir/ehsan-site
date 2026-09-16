/**
 * generate-complete-tutorial.js
 * -----------------------------------------------------------
 * ساخت یک فایل Word آموزشی کامل (فارسی، راست‌چین) با ۱۳ فصل.
 * خروجی: /home/z/my-project/download/TUTORIAL_FA.docx
 *
 * وابستگی: پکیج docx (نصب‌شده در node_modules)
 * اجرا:    node scripts/generate-complete-tutorial.js
 * -----------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  LevelFormat,
  convertInchesToTwip,
} = require('docx');

// ---------- تنظیمات فونت ----------
const FA_FONT = 'Tahoma';      // فونت فارسی (در اکثر سیستم‌ها موجود است)
const CODE_FONT = 'Consolas';  // فونت کد (monospace)

// ---------- کمک‌توابع ----------

// پاراگراف فارسی راست‌چین
function p(text, opts = {}) {
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align || AlignmentType.RIGHT,
    spacing: { after: 140, line: 360 },
    children: [
      new TextRun({
        text,
        font: FA_FONT,
        rightToLeft: true,
        size: opts.size || 22, // 11pt
        bold: opts.bold || false,
        color: opts.color,
      }),
    ],
  });
}

// پاراگراف نکته (با رنگ متمایز)
function note(text) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 140, line: 360 },
    shading: { type: ShadingType.CLEAR, fill: 'FFF4D6' },
    children: [
      new TextRun({
        text: 'نکته: ',
        font: FA_FONT,
        rightToLeft: true,
        bold: true,
        size: 22,
        color: 'B45309',
      }),
      new TextRun({
        text,
        font: FA_FONT,
        rightToLeft: true,
        size: 22,
        color: '92400E',
      }),
    ],
  });
}

// عنوان فارسی
function h(text, level = HeadingLevel.HEADING_1) {
  const sizeMap = {
    [HeadingLevel.HEADING_1]: 36,
    [HeadingLevel.HEADING_2]: 28,
    [HeadingLevel.HEADING_3]: 24,
  };
  return new Paragraph({
    bidirectional: true,
    heading: level,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 280, after: 160 },
    children: [
      new TextRun({
        text,
        font: FA_FONT,
        rightToLeft: true,
        bold: true,
        size: sizeMap[level] || 28,
        color: '1F2937',
      }),
    ],
  });
}

// خط کد (چپ‌چین، monospace)
function codeLine(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 0, line: 280 },
    shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' },
    children: [
      new TextRun({
        text: text.length === 0 ? ' ' : text,
        font: CODE_FONT,
        size: 18, // 9pt
        color: '111827',
      }),
    ],
  });
}

// بلاک کد کامل (می‌تواند چندخطی باشد)
function codeBlock(code) {
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  return lines.map((line) => codeLine(line));
}

// لیست نقطه‌ای فارسی
function bullet(text) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80, line: 340 },
    bullet: { level: 0 },
    children: [
      new TextRun({
        text,
        font: FA_FONT,
        rightToLeft: true,
        size: 22,
      }),
    ],
  });
}

// سلول جدول (فارسی)
function tCell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 33, type: WidthType.PERCENTAGE },
    shading: opts.header
      ? { type: ShadingType.CLEAR, fill: '1F2937' }
      : { type: ShadingType.CLEAR, fill: opts.fill || 'FFFFFF' },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text,
            font: FA_FONT,
            rightToLeft: true,
            size: 20,
            bold: opts.header || false,
            color: opts.header ? 'FFFFFF' : '111827',
          }),
        ],
      }),
    ],
  });
}

// سلول کد در جدول (چپ‌چین)
function tCellCode(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 33, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: opts.fill || 'F9FAFB' },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 0 },
        children: [
          new TextRun({
            text,
            font: CODE_FONT,
            size: 18,
            color: '111827',
          }),
        ],
      }),
    ],
  });
}

// ساخت جدول مرجع
function refTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((hText, i) =>
      tCell(hText, { header: true, width: i === 0 ? 30 : i === 1 ? 40 : 30 })
    ),
  });

  const bodyRows = rows.map((row, idx) => {
    const fill = idx % 2 === 0 ? 'FFFFFF' : 'F3F4F6';
    // ردیف‌هایی که ستون اولشان کد است (معمولاً)
    return new TableRow({
      children: row.map((cellText, i) => {
        // اگر متن با // یا کلمه کلیدی شروع می‌شود، به‌صورت کد نمایش بده
        const isCodeLike = /^[a-zA-Z<>/.*=#@-]/.test(cellText) && i === 0;
        return isCodeLike
          ? tCellCode(cellText, { fill, width: i === 0 ? 30 : i === 1 ? 40 : 30 })
          : tCell(cellText, { fill, width: i === 0 ? 30 : i === 1 ? 40 : 30 });
      }),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    rows: [headerRow, ...bodyRows],
  });
}

// جداکننده فصل
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ---------- محتوای فصل‌ها ----------

const children = [];

// ============== جلد ==============
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 240 },
    children: [
      new TextRun({
        text: 'آموزش جامع توسعه‌ی وب مدرن',
        font: FA_FONT,
        rightToLeft: true,
        bold: true,
        size: 56,
        color: '1F2937',
      }),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [
      new TextRun({
        text: 'از HTML تا Next.js ، Prisma و Docker',
        font: FA_FONT,
        rightToLeft: true,
        size: 32,
        color: '374151',
      }),
    ],
  })
);
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 1200 },
    children: [
      new TextRun({
        text: 'راهنمای فارسی، با مثال و کامنت خط‌به‌خط',
        font: FA_FONT,
        rightToLeft: true,
        size: 26,
        color: '6B7280',
      }),
    ],
  })
);
children.push(pageBreak());

// ============== فهرست ==============
children.push(h('فهرست مطالب', HeadingLevel.HEADING_1));
const toc = [
  '۱. مقدمه — برنامه‌نویسی وب چیست؟',
  '۲. HTML — ساختار صفحه',
  '۳. CSS — ظاهر صفحه',
  '۴. JavaScript — رفتار صفحه',
  '۵. TypeScript — JavaScript با نوع',
  '۶. React — ساخت کامپوننت',
  '۷. Next.js — فریم‌ورک کامل',
  '۸. Tailwind CSS — استایل سریع',
  '۹. Prisma + SQLite — دیتابیس',
  '۱۰. Docker — استقرار',
  '۱۱. SEO — بهینه‌سازی برای موتورهای جستجو',
  '۱۲. امنیت — نکات امنیتی',
  '۱۳. جمع‌بندی',
];
toc.forEach((t) => children.push(p(t, { size: 24 })));
children.push(pageBreak());

// ============================================================
// فصل ۱: مقدمه
// ============================================================
children.push(h('فصل ۱: مقدمه — برنامه‌نویسی وب چیست؟', HeadingLevel.HEADING_1));

children.push(
  p('برنامه‌نویسی وب یعنی ساخت برنامه‌هایی که در مرورگر (یا روی سرور) اجرا می‌شوند و از طریق اینترنت در دسترس کاربران قرار می‌گیرند. هر وب‌سایت یا وب‌اپلیکیشن از سه لایه‌ی اصلی تشکیل می‌شود: ساختار، ظاهر و رفتار.')
);
children.push(
  p('در گذشته، این سه لایه با HTML، CSS و JavaScript نوشته می‌شد. اما امروزه ابزارهای مدرنی مثل TypeScript، React، Next.js و Prisma کار توسعه را ساده‌تر، امن‌تر و سریع‌تر کرده‌اند. هدف این کتاب، آشنایی گام‌به‌گام و کاربردی با این ابزارهاست.')
);
children.push(
  p('یک برنامه‌نویس وب مدرن (Full-Stack) باید بداند چطور رابط کاربری بسازد، دیتابیس را مدیریت کند، کد را امن نگه دارد و در نهایت آن را روی سرور مستقر سازد. این مسیر یادگیری، دقیقاً همان چیزی است که در ۱۳ فصلِ پیش رو با هم طی می‌کنیم.')
);

children.push(h('سه لایه‌ی اصلیِ وب', HeadingLevel.HEADING_2));
children.push(bullet('ساختار (HTML): تعیین می‌کند چه چیزی روی صفحه باشد — مثل متن، تصویر و دکمه.'));
children.push(bullet('ظاهر (CSS): تعیین می‌کند هر چیز چطور نمایش داده شود — رنگ، اندازه و چیدمان.'));
children.push(bullet('رفتار (JavaScript): تعیین می‌کند برنامه چه واکنشی به کاربر بدهد — کلیک، فرم و انیمیشن.'));

children.push(h('مثال: یک درخواست ساده‌ی HTTP', HeadingLevel.HEADING_2));
children.push(p('وقتی آدرس سایت را در مرورگر وارد می‌کنید، اتفاقی شبیه زیر رخ می‌دهد:'));

children.push(
  ...codeBlock(`// 1) مرورگر یک درخواست (request) به سرور می‌فرستد
GET /users HTTP/1.1
Host: example.com

// 2) سرور پاسخ (response) می‌دهد: کد وضعیت + داده (معمولاً JSON)
HTTP/1.1 200 OK
Content-Type: application/json

[
  { "id": 1, "name": "احمد" },
  { "id": 2, "name": "مریم" }
]`)
);

children.push(h('جدول مرجع: مفاهیم کلیدی وب', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['مفهوم', 'توضیح کوتاه', 'مثال'],
    [
      ['Frontend', 'بخشی که کاربر در مرورگر می‌بیند', 'HTML, CSS, React'],
      ['Backend', 'بخشی که روی سرور اجرا می‌شود', 'Node.js, Next.js API'],
      ['Database', 'ذخیره‌ی داده‌های دائمی', 'SQLite, PostgreSQL'],
      ['HTTP', 'پروتکل ارتباط بین کلاینت و سرور', 'GET, POST'],
      ['API', 'رابط برنامه‌نویسی برای تبادل داده', '/api/users'],
      ['JSON', 'فرمت متنی برای تبادل داده', '{"name":"احمد"}'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۲: HTML
// ============================================================
children.push(h('فصل ۲: HTML — ساختار صفحه', HeadingLevel.HEADING_1));

children.push(
  p('HTML (HyperText Markup Language) زبان نشانه‌گذاری است که ساختار یک صفحه‌ی وب را تعریف می‌کند. HTML از «تگ» استفاده می‌کند؛ هر تگ به مرورگر می‌گوید که محتوای داخلش چیست — یک تیتر، پاراگراف، تصویر یا دکمه.')
);
children.push(
  p('ساختار هر سند HTML از سه بخش اصلی تشکیل می‌شود: اعلان نوع سند (doctype)، بخش head (شامل متادیتا) و بخش body (محتوای قابل‌مشاهده).')
);

children.push(h('مثال: یک صفحه‌ی HTML کامل', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`<!DOCTYPE html>
<!-- اعلان نوع سند: HTML5 -->

<html lang="fa" dir="rtl">
<!-- lang="fa": زبان فارسی — dir="rtl": راست‌به‌چپ -->

<head>
  <meta charset="UTF-8" />
  <!-- انکودینگ UTF-8 برای پشتیبانی از حروف فارسی -->

  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- نمایش درست روی موبایل و تبلت -->

  <title>صفحه‌ی من</title>
  <!-- عنوانی که در زبانه‌ی مرورگر نمایش داده می‌شود -->
</head>

<body>
  <!-- محتوای قابل‌مشاهده توسط کاربر -->

  <header>
    <h1>سلام دنیا!</h1>
    <!-- تیتر اصلی صفحه -->
    <p>این اولین صفحه‌ی HTML من است.</p>
    <!-- یک پاراگراف ساده -->
  </header>

  <main>
    <section>
      <h2>درباره‌ی من</h2>
      <p>من یک توسعه‌دهنده‌ی وب هستم.</p>
      <a href="https://example.com">لینک به سایت من</a>
      <!-- تگ a برای ایجاد لینک -->
    </section>
  </main>

  <footer>
    <small>&copy; 1403 — همه‌ی حقوق محفوظ است.</small>
  </footer>
</body>
</html>`)
);

children.push(h('جدول مرجع: تگ‌های پرکاربرد HTML', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['تگ', 'کاربرد', 'مثال'],
    [
      ['<h1>..<h6>', 'تیترها (شش سطح)', '<h1>تیتر اصلی</h1>'],
      ['<p>', 'پاراگراف متنی', '<p>سلام</p>'],
      ['<a>', 'لینک', '<a href="/">خانه</a>'],
      ['<img>', 'تصویر', '<img src="a.png" alt="alt" />'],
      ['<ul>/<li>', 'لیست بدون شماره', '<ul><li>...</li></ul>'],
      ['<div>', 'بخش (block)', '<div class="box">...</div>'],
      ['<span>', 'بخش (inline)', '<span style="color:red">'],
      ['<form>', 'فرم', '<form>...input...</form>'],
      ['<input>', 'ورودی فرم', '<input type="text" />'],
      ['<button>', 'دکمه', '<button>کلیک</button>'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۳: CSS
// ============================================================
children.push(h('فصل ۳: CSS — ظاهر صفحه', HeadingLevel.HEADING_1));

children.push(
  p('CSS (Cascading Style Sheets) زبانی است که ظاهر عناصر HTML را تعیین می‌کند: رنگ، فونت، اندازه، فاصله، چیدمان و حتی انیمیشن. با CSS می‌توان یک ساختار ساده‌ی HTML را به یک رابط کاربری زیبا تبدیل کرد.')
);
children.push(
  p('CSS با «انتخابگر» (selector) عناصر را پیدا می‌کند و با «ویژگی‌ها» (properties) به آن‌ها استایل می‌دهد. مدل جعبه‌ای (Box Model) پایه‌ی درک CSS است: هر عنصر شامل margin، border، padding و content است.')
);

children.push(h('مثال: استایل‌دهی به یک کارت', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`/* انتخابگر: تمام عناصر .card را انتخاب کن */
.card {
  background-color: #ffffff;       /* پس‌زمینه‌ی سفید */
  border: 1px solid #e5e7eb;       /* حاشیه‌ی خاکستری روشن */
  border-radius: 12px;             /* گوشه‌های گرد */
  padding: 24px;                   /* فاصله‌ی داخل */
  margin: 16px;                    /* فاصله‌ی بیرون */
  box-shadow: 0 4px 6px rgba(0,0,0,0.1); /* سایه */
  font-family: Tahoma, sans-serif; /* فونت فارسی */
}

/* انتخابگر: عنوان داخل کارت */
.card h2 {
  color: #111827;                  /* رنگ متن: تیره */
  font-size: 20px;                 /* اندازه‌ی فونت */
  margin-bottom: 8px;              /* فاصله از پایین */
}

/* شبه‌کلاس: وقتی موس روی کارت می‌رود */
.card:hover {
  transform: translateY(-4px);     /* کمی بالا می‌رود */
  box-shadow: 0 8px 16px rgba(0,0,0,0.15); /* سایه بزرگ‌تر */
  transition: all 0.2s ease;        /* انیمیشن نرم */
}`)
);

children.push(
  note('برای پروژه‌های بزرگ، به‌جای CSS خام از ابزارهایی مثل Tailwind CSS (فصل ۸) یا Sass استفاده می‌کنند تا کد قابل نگهداری‌تر باشد.')
);

children.push(h('جدول مرجع: ویژگی‌های پرکاربرد CSS', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['ویژگی', 'کاربرد', 'مثال'],
    [
      ['color', 'رنگ متن', 'color: #111;'],
      ['background', 'پس‌زمینه', 'background: #fff;'],
      ['font-size', 'اندازه‌ی فونت', 'font-size: 16px;'],
      ['margin', 'فاصله‌ی بیرونی', 'margin: 10px;'],
      ['padding', 'فاصله‌ی داخلی', 'padding: 12px;'],
      ['border', 'حاشیه', 'border: 1px solid #ccc;'],
      ['border-radius', 'گردی گوشه‌ها', 'border-radius: 8px;'],
      ['display', 'نوع نمایش', 'display: flex;'],
      ['flex', 'تنظیم اندازه فلکس', 'flex: 1;'],
      ['position', 'نوع جایگیری', 'position: absolute;'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۴: JavaScript
// ============================================================
children.push(h('فصل ۴: JavaScript — رفتار صفحه', HeadingLevel.HEADING_1));

children.push(
  p('JavaScript زبان برنامه‌نویسی وب است که به صفحه‌ی شما «حیات» می‌بخشد. با JavaScript می‌توانید به کلیک کاربر واکنش نشان دهید، فرم را اعتبارسنجی کنید، داده از سرور بگیرید (fetch) و عناصر صفحه را به‌صورت پویا تغییر دهید (DOM manipulation).')
);
children.push(
  p('متغیرها با let (تغییرپذیر) یا const (ثابت) تعریف می‌شوند. توابع می‌توانند معمولی یا arrow function باشند. ماژول‌ها با import و export بین فایل‌ها به اشتراک گذاشته می‌شوند.')
);

children.push(h('مثال: اعتبارسنجی فرم لاگین', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// یک تابع arrow برای اعتبارسنجی ایمیل و رمز
const validateLogin = (email, password) => {
  // اگر ایمیل خالی بود
  if (!email) {
    return { ok: false, message: 'ایمیل الزامی است' };
  }

  // بررسی فرمت ایمیل با یک عبارت منظم (regex)
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  if (!emailRegex.test(email)) {
    return { ok: false, message: 'ایمیل معتبر نیست' };
  }

  // رمز باید حداقل ۸ کاراکتر باشد
  if (password.length < 8) {
    return { ok: false, message: 'رمز حداقل ۸ کاراکتر باشد' };
  }

  // همه چیز درست بود
  return { ok: true, message: 'اعتبارسنجی موفق' };
};

// استفاده از تابع
const result = validateLogin('ali@test.com', '12345678');
console.log(result); // { ok: true, message: 'اعتبارسنجی موفق' }`)
);

children.push(
  note('برای ساخت رابط کاربری پیچیده، به‌جای دستکاری مستقیم DOM از React (فصل ۶) استفاده می‌کنیم؛ کد تمیزتر و قابل‌نگهداری‌تر می‌شود.')
);

children.push(h('جدول مرجع: متدها و مفاهیم پرکاربرد JS', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['متد / مفهوم', 'کاربرد', 'مثال'],
    [
      ['let / const', 'تعریف متغیر', 'const x = 5;'],
      ['=>', 'arrow function', 'const f = (a) => a + 1;'],
      ['document.querySelector', 'انتخاب عنصر DOM', "querySelector('.btn')"],
      ['addEventListener', 'ثبت رویداد', "addEventListener('click', fn)"],
      ['fetch', 'دریافت داده از سرور', "fetch('/api/users')"],
      ['async / await', 'کد ناهمزمان', 'await fetch(url)'],
      ['Array.map', 'تبدیل آرایه', '[1,2].map(x => x*2)'],
      ['Array.filter', 'فیلتر آرایه', '[1,2,3].filter(x>1)'],
      ['JSON.parse', 'تبدیل متن به شیء', 'JSON.parse(str)'],
      ['localStorage', 'ذخیره‌ی محلی', "localStorage.setItem('k','v')"],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۵: TypeScript
// ============================================================
children.push(h('فصل ۵: TypeScript — JavaScript با نوع', HeadingLevel.HEADING_1));

children.push(
  p('TypeScript (TS) یک ابرمجموعه‌ی (superset) از JavaScript است که به آن «نوع» (type) اضافه می‌کند. با TS خطاهای احتمالی قبل از اجرا کشف می‌شوند، ادیتور قابلیت autocomplete بهتری می‌دهد و کد خواناتر می‌شود. در پروژه‌های مدرن، TypeScript تقریباً استاندارد شده است.')
);
children.push(
  p('برای اجرای TS، فایل‌ها با پسوند .ts ذخیره می‌شوند و در زمان build به JavaScript تبدیل می‌شوند. ابزارهایی مثل Next.js و Vite این کار را به‌صورت خودکار انجام می‌دهند.')
);

children.push(h('مثال: تابع با نوع‌های صریح', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// تعریف یک رابط (interface) برای کاربر
interface User {
  id: number;        // شناسه‌ی عددی
  name: string;      // نام متنی
  email?: string;    // اختیاری (可有可無)
  role: 'admin' | 'user'; // فقط این دو مقدار مجاز است
}

// تابعی که یک کاربر می‌گیرد و خلاصه برمی‌گرداند
function summarize(user: User): string {
  // user.email اختیاری است؛ پس اول چک می‌کنیم
  const emailPart = user.email
    ? \` ایمیل: \${user.email}\`
    : ' ایمیل ندارد';

  // قالب رشته (template literal)
  return \`\${user.name} (\${user.role})\${emailPart}\`;
}

// استفاده از تابع
const u: User = {
  id: 1,
  name: 'سارا',
  email: 'sara@test.com',
  role: 'admin',
};

console.log(summarize(u));
// خروجی: سارا (admin) ایمیل: sara@test.com`)
);

children.push(h('جدول مرجع: نوع‌های پرکاربرد TS', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['نوع', 'توضیح', 'مثال'],
    [
      ['string', 'متن', 'let s: string;'],
      ['number', 'عدد', 'let n: number;'],
      ['boolean', 'درست/نادرست', 'let b: boolean;'],
      ['string[]', 'آرایه‌ی متن', "let a: string[] = ['x'];"],
      ['interface', 'ساختار شیء', 'interface User {...}'],
      ['type', 'نوع سفارشی', "type Role = 'admin'|'user';"],
      ['any', 'هر چیزی (ناامن)', 'let x: any;'],
      ['unknown', 'نوع ناشناخته امن', 'let x: unknown;'],
      ['T (generic)', 'نوع عمومی', 'function f<T>(x:T)'],
      ['Promise<T>', 'نتیجه‌ی ناهمزمان', 'Promise<User>'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۶: React
// ============================================================
children.push(h('فصل ۶: React — ساخت کامپوننت', HeadingLevel.HEADING_1));

children.push(
  p('React کتابخانه‌ای از فیسبوک برای ساخت رابط کاربری است. ایده‌ی اصلی React این است که کل صفحه را به «کامپوننت» (component) های کوچک و قابل‌استفاده‌ی مجدد تقسیم کنیم. هر کامپوننت یک تابع است که props می‌گیرد و JSX برمی‌گرداند.')
);
children.push(
  p('React با مفهوم «حالت» (state) کار می‌کند: وقتی state تغییر کند، React به‌صورت خودکار صفحه را به‌روزرسانی می‌کند. مهم‌ترین hookها عبارت‌اند از: useState (حالت)، useEffect (اثر جانبی)، useContext (اشتراک داده)، و useRef (ارجاع به DOM).')
);

children.push(h('مثال: کامپوننت شمارنده (Counter)', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`'use client'; // در Next.js: این کامپوننت سمت کلاینت اجرا می‌شود

import { useState, useEffect } from 'react';

// تعریف کامپوننت با TypeScript
export default function Counter() {
  // useState: متغیر حالت و تابع تغییر آن
  const [count, setCount] = useState<number>(0);

  // useEffect: هنگام mount شدن، یک لاگ می‌اندازد
  useEffect(() => {
    console.log('کامپوننت mount شد');
  }, []); // [] یعنی فقط یک‌بار اجرا شود

  // تابع افزایش با محدودیت بالا = ۱۰
  const increase = () => {
    if (count < 10) setCount(count + 1);
  };

  return (
    <div className="p-4 rounded bg-gray-100">
      {/* نمایش مقدار فعلی */}
      <p className="text-xl">شمارنده: {count}</p>

      {/* دو دکمه برای افزایش و کاهش */}
      <button onClick={increase} className="bg-blue-500 text-white px-3 py-1 rounded">
        +
      </button>
      <button
        onClick={() => setCount(count - 1)}
        className="bg-red-500 text-white px-3 py-1 rounded mr-2"
      >
        −
      </button>
    </div>
  );
}`)
);

children.push(
  note('JSX شبیه HTML است اما درون JavaScript نوشته می‌شود. attributeName به‌جای attribute-name استفاده می‌شود (مثل className به‌جای class).')
);

children.push(h('جدول مرجع: Hookهای پرکاربرد React', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['Hook', 'کاربرد', 'مثال'],
    [
      ['useState', 'حالت محلی', 'const [n, setN] = useState(0)'],
      ['useEffect', 'اثر جانبی', 'useEffect(() => {}, [])'],
      ['useContext', 'دسترسی به Context', 'const theme = useContext(ThemeCtx)'],
      ['useRef', 'ارجاع به DOM', 'const ref = useRef(null)'],
      ['useMemo', 'محاسبه‌ی حافظه‌دار', 'useMemo(() => calc(a,b), [a,b])'],
      ['useCallback', 'تابع حافظه‌دار', 'useCallback(() => {}, [deps])'],
      ['useReducer', 'حالت پیچیده', 'useReducer(reducer, init)'],
      ['useId', 'تولید id یکتا', 'const id = useId()'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۷: Next.js
// ============================================================
children.push(h('فصل ۷: Next.js — فریم‌ورک کامل', HeadingLevel.HEADING_1));

children.push(
  p('Next.js فریم‌ورکی بر پایه‌ی React است که قابلیت‌های حرفه‌ای برای تولید واقعی (production) فراهم می‌کند: رندر سمت سرور (SSR)، تولید استاتیک (SSG)، مسیریابی مبتنی بر فایل، API routes، و بهینه‌سازی تصاویر. با Next.js یک پروژه‌ی React را به‌سادگی به‌صورت full-stack می‌سازید.')
);
children.push(
  p('در App Router (نسل جدید Next.js)، مسیرها در پوشه‌ی app/ تعریف می‌شوند. هر فایل page.tsx یک صفحه است و هر فایل route.ts یک API.')
);

children.push(h('مثال: یک صفحه + یک API route', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// app/api/users/route.ts
// یک API ساده که لیست کاربران را برمی‌گرداند

import { NextResponse } from 'next/server';

// تابع GET: وقتی کلاینت GET می‌زند
export async function GET() {
  // شبیه‌سازی دریافت داده از دیتابیس
  const users = [
    { id: 1, name: 'احمد' },
    { id: 2, name: 'مریم' },
  ];

  // برگرداندن پاسخ با فرمت JSON
  return NextResponse.json(users);
}

// app/page.tsx
// یک صفحه‌ی سمت سرور که کاربران را نمایش می‌دهد

// این تابع فقط روی سرور اجرا می‌شود
async function getUsers() {
  const res = await fetch('http://localhost:3000/api/users', {
    cache: 'no-store', // بدون کش، همیشه داده‌ی تازه
  });
  return res.json();
}

export default async function HomePage() {
  // در سمت سرور منتظر دریافت داده می‌ماند
  const users = await getUsers();

  return (
    <main>
      <h1>کاربران</h1>
      <ul>
        {/* map برای نمایش لیست کاربران */}
        {users.map((u: { id: number; name: string }) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </main>
  );
}`)
);

children.push(h('جدول مرجع: قابلیت‌های Next.js', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['قابلیت', 'توضیح', 'مثال فایل'],
    [
      ['Page', 'صفحه‌ی قابل مشاهده', 'app/page.tsx'],
      ['Layout', 'چیدمان مشترک', 'app/layout.tsx'],
      ['API Route', 'مسیر API سمت سرور', 'app/api/x/route.ts'],
      ['SSR', 'رندر سمت سرور (پویا)', 'fetch(url, {cache:"no-store"})'],
      ['SSG', 'تولید استاتیک هنگام build', 'fetch(url, {cache:"force-cache"})'],
      ['ISR', 'رندر پویا با کش', 'revalidate: 60'],
      ['Loading', 'حالت بارگذاری', 'app/loading.tsx'],
      ['Error', 'مدیریت خطا', 'app/error.tsx'],
      ['Middleware', 'میان‌افزار درخواست', 'middleware.ts'],
      ['next/image', 'بهینه‌سازی تصویر', '<Image src=... />'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۸: Tailwind CSS
// ============================================================
children.push(h('فصل ۸: Tailwind CSS — استایل سریع', HeadingLevel.HEADING_1));

children.push(
  p('Tailwind CSS یک فریم‌ورک CSS utility-first است. به‌جای نوشتن کلاس‌های دلخواه (مثل .btn)، از کلاس‌های آماده‌ی کوچک (مثل bg-blue-500، px-4، rounded) مستقیماً درون JSX استفاده می‌کنید. مزیت: سریع‌تر، قابل پیش‌بینی‌تر و بدون تداخل نام کلاس‌ها.')
);
children.push(
  p('Tailwind در زمان build، فقط کلاس‌هایی که استفاده شده‌اند را در فایل نهایی نگه می‌دارد؛ پس حجم CSS بسیار کم می‌شود.')
);

children.push(h('مثال: کارت کاربر با Tailwind', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// کامپوننت کارت کاربر با Tailwind
export default function UserCard({ name, role }: { name: string; role: string }) {
  return (
    // div با پس‌زمینه‌ی سفید، گردی گوشه، سایه و padding
    <div className="bg-white rounded-xl shadow-md p-6 max-w-sm">

      {/* تصویر آواتار با شکل دایره‌ای */}
      <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl">
        {name.charAt(0)}
      </div>

      {/* نام کاربر با فونت بزرگ و تیره */}
      <h2 className="mt-4 text-xl font-bold text-gray-900">{name}</h2>

      {/* نقش کاربر با رنگ خاکستری */}
      <p className="text-gray-500">{role}</p>

      {/* دکمه با تغییر رنگ هنگام hover */}
      <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
        مشاهده‌ی پروفایل
      </button>
    </div>
  );
}`)
);

children.push(h('جدول مرجع: کلاس‌های پرکاربرد Tailwind', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['گروه', 'کلاس‌ها', 'مثال'],
    [
      ['رنگ متن', 'text-{color}-{shade}', 'text-blue-500'],
      ['پس‌زمینه', 'bg-{color}-{shade}', 'bg-gray-100'],
      ['حاشیه', 'border, border-{color}', 'border-gray-200'],
      ['فاصله', 'p-, m-, px-, py-, mx-, my-', 'px-4 py-2'],
      ['گردی', 'rounded, rounded-lg, rounded-full', 'rounded-xl'],
      ['سایه', 'shadow, shadow-md, shadow-lg', 'shadow-md'],
      ['فلکس', 'flex, items-center, justify-between', 'flex gap-2'],
      ['گرید', 'grid, grid-cols-{n}', 'grid-cols-3'],
      ['واکنش‌گرا', 'sm:, md:, lg:, xl:', 'md:text-lg'],
      ['hover', 'hover:bg-, hover:text-', 'hover:bg-blue-600'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۹: Prisma + SQLite
// ============================================================
children.push(h('فصل ۹: Prisma + SQLite — دیتابیس', HeadingLevel.HEADING_1));

children.push(
  p('Prisma یک ORM (Object-Relational Mapping) مدرن برای Node.js و TypeScript است. به‌جای نوشتن SQL خام، با یک فایل schema.simpl تعریف می‌کنید چه جدول‌هایی دارید، و Prisma یک کلاینت تایپ‌دار تولید می‌کند که کوئری‌ها را امن و ساده می‌کند.')
);
children.push(
  p('SQLite یک دیتابیس سبک، فایل‌محور و بدون نیاز به سرور است؛ ایده‌آل برای توسعه، نمونه‌سازی اولیه و پروژه‌های کوچک. در پروژه‌ی نمونه، فایل دیتابیس مثلاً در prisma/dev.db قرار می‌گیرد.')
);

children.push(h('مثال: Schema و کوئری‌های رایج', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// prisma/schema.prisma
// تعریف مدل‌های دیتابیس

generator client {
  provider = "prisma-client-js" // تولید کلاینت JS
}

datasource db {
  provider = "sqlite"   // نوع دیتابیس: SQLite
  url      = env("DATABASE_URL") // آدرس از فایل .env
}

// مدل کاربر
model User {
  id        Int      @id @default(autoincrement()) // کلید اصلی
  name      String                              // نام (الزامی)
  email     String   @unique                     // ایمیل یکتا
  createdAt DateTime @default(now())             // تاریخ ساخت
  posts     Post[]                               // رابطه یک‌به‌چند
}

// مدل پست (هر پست متعلق به یک کاربر)
model Post {
  id       Int    @id @default(autoincrement())
  title    String
  content  String?
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}

// src/db.ts
// ساخت یک نمونه‌ی کلاینت Prisma (singleton)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default prisma;

// app/api/users/route.ts
// API برای گرفتن و ساخت کاربر

import prisma from '@/db';
import { NextResponse } from 'next/server';

export async function GET() {
  // findMany: همه‌ی کاربران را با پست‌هایشان بگیر
  const users = await prisma.user.findMany({
    include: { posts: true }, // شامل پست‌های مرتبط
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  // گرفتن داده از بدنه‌ی درخواست
  const body = await req.json();

  // create: ساخت یک کاربر جدید
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email },
  });

  return NextResponse.json(user, { status: 201 });
}`)
);

children.push(
  note('بعد از تغییر schema، دستور npx prisma db push را بزنید تا دیتابیس همگام شود و سپس npx prisma generate تا کلاینت تایپ‌دار تولید شود.')
);

children.push(h('جدول مرجع: متدهای پرکاربرد Prisma', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['متد', 'کاربرد', 'مثال'],
    [
      ['findMany', 'گرفتن چند رکورد', 'prisma.user.findMany()'],
      ['findUnique', 'گرفتن یک رکورد', 'findUnique({where:{id:1}})'],
      ['findFirst', 'اولین رکورد منطبق', 'findFirst({where:{...}})'],
      ['create', 'ساخت رکورد', 'create({data:{...}})'],
      ['update', 'به‌روزرسانی', 'update({where, data})'],
      ['upsert', 'ساخت یا به‌روزرسانی', 'upsert({where, create, update})'],
      ['delete', 'حذف رکورد', 'delete({where:{id:1}})'],
      ['count', 'تعداد رکورد', 'count({where:{...}})'],
      ['include', 'بارگذاری رابطه', 'include:{posts:true}'],
      ['transaction', 'تراکنش چندعملیله', 'prisma.$transaction([...])'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۱۰: Docker
// ============================================================
children.push(h('فصل ۱۰: Docker — استقرار', HeadingLevel.HEADING_1));

children.push(
  p('Docker ابزاری است که برنامه‌ی شما را درون «کانتینر» (container) قرار می‌دهد؛ یک محیط ایزوله و قابل‌انتقال که شامل کد، وابستگی‌ها و تنظیمات سیستم‌عامل است. با Docker دیگر نمی‌گویند «روی سیستم من کار می‌کند»، چون کانتینر روی هر سیستمی یکسان اجرا می‌شود.')
);
children.push(
  p('سه مفهوم اصلی Docker عبارت‌اند از: Dockerfile (دستور ساخت ایمیج)، Image (قالب اجرایی)، و Container (نمونه‌ی در حال اجرا). برای چند سرویسی (مثل اپ + دیتابیس) از docker-compose استفاده می‌شود.')
);

children.push(h('مثال: Dockerfile و docker-compose', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`# Dockerfile
# مراحل ساخت ایمیج برای یک اپ Next.js

# 1) ایمیج پایه: Node.js نسخه‌ی 20
FROM node:20-alpine

# 2) تنظیم پوشه‌ی کاری داخل کانتینر
WORKDIR /app

# 3) کپی فایل‌های وابستگی
COPY package.json package-lock.json ./

# 4) نصب وابستگی‌ها (فایل‌های پروژه)
RUN npm ci --omit=dev

# 5) کپی بقیه‌ی کد پروژه
COPY . .

# 6) ساخت نسخه‌ی production
RUN npm run build

# 7) اعلام پورتی که اپ روی آن گوش می‌دهد
EXPOSE 3000

# 8) دستوری که با اجرای کانتینر شروع می‌شود
CMD ["npm", "start"]

# docker-compose.yml
# اجرای همزمان اپ + دیتابیس
version: "3.9"

services:
  app:
    build: .                      # ساخت از Dockerfile موجود
    ports:
      - "3000:3000"               # مپ کردن پورت 3000
    environment:
      - DATABASE_URL=file:/app/db/data.db
    volumes:
      - ./db:/app/db              # ماندگاری دیتابیس
    depends_on:
      - db                        # اول دیتابیس بالا بیاید

  db:
    image: postgres:16-alpine     # ایمیج آماده‌ی Postgres
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: appdb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:                          # volume دائمی برای دیتابیس`)
);

children.push(h('جدول مرجع: دستورات پرکاربرد Docker', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['دستور', 'کاربرد', 'مثال'],
    [
      ['docker build', 'ساخت ایمیج', 'docker build -t app .'],
      ['docker run', 'اجرای کانتینر', 'docker run -p 3000:3000 app'],
      ['docker ps', 'لیست کانتینرها', 'docker ps'],
      ['docker images', 'لیست ایمیج‌ها', 'docker images'],
      ['docker logs', 'مشاهده‌ی لاگ', 'docker logs <id>'],
      ['docker stop', 'توقف کانتینر', 'docker stop <id>'],
      ['docker rm', 'حذف کانتینر', 'docker rm <id>'],
      ['docker-compose up', 'اجرای چند سرویس', 'docker-compose up -d'],
      ['docker-compose down', 'توقف چند سرویس', 'docker-compose down'],
      ['docker exec', 'اجرای دستور داخل کانتینر', 'docker exec -it <id> sh'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۱۱: SEO
// ============================================================
children.push(h('فصل ۱۱: SEO — بهینه‌سازی برای موتورهای جستجو', HeadingLevel.HEADING_1));

children.push(
  p('SEO (Search Engine Optimization) مجموعه‌ای از تکنیک‌هاست تا سایت شما در نتایج گوگل و سایر موتورهای جستجو رتبه‌ی بهتری بگیرد. سه ستون اصلی SEO عبارت‌اند: محتوای باکیفیت، ساختار فنی سالم (HTML معنایی، سرعت، موبایل‌فرندلی) و نشانه‌گذاری داده‌ی ساختاریافته (Schema.org).')
);
children.push(
  p('در Next.js می‌توان با Metadata API تگ‌های meta و Open Graph را به‌صورت déclarative تنظیم کرد. Sitemap و robots.txt هم نقش مهمی در ایندکس شدن دارند.')
);

children.push(h('مثال: تنظیم متادیتا در Next.js', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// app/layout.tsx
// تنظیم متادیتای کلی سایت

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'آموزش توسعه‌ی وب | سایت من',
  // عنوانی که در زبانه‌ی مرورگر و گوگل نمایش داده می‌شود
  description: 'آموزش گام‌به‌گام HTML، CSS، React و Next.js به زبان فارسی',
  // توضیحی که زیر عنوان در نتایج جستجو می‌آید
  keywords: ['آموزش وب', 'React', 'Next.js', 'برنامه‌نویسی'],
  // کلمات کلیدی برای SEO
  openGraph: {
    title: 'آموزش توسعه‌ی وب',
    description: 'دوره‌ی کامل توسعه‌ی وب مدرن',
    type: 'website',
    locale: 'fa_IR',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  robots: {
    index: true,    // اجازه‌ی ایندکس
    follow: true,   // دنبال کردن لینک‌ها
  },
};

// app/sitemap.ts
// تولید خودکار sitemap.xml

export default function sitemap() {
  // لیست URLهای سایت
  const routes = ['', '/about', '/blog', '/contact'];

  return routes.map((route) => ({
    url: \`https://mysite.com\${route}\`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));
}

// app/robots.ts
// تولید خودکار robots.txt

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://mysite.com/sitemap.xml',
  };
}`)
);

children.push(h('جدول مرجع: چک‌لیست SEO', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['بخش', 'اقدام', 'ابزار/تگ'],
    [
      ['عنوان', 'تیتر یکتا و جذاب (<60 کاراکتر)', '<title>'],
      ['توضیحات', 'خلاصه‌ی صفحه (<160 کاراکتر)', '<meta name="description">'],
      ['HTML معنایی', 'استفاده از <header>, <main>, <article>', 'semantic tags'],
      ['سرعت', 'فشرده‌سازی تصاویر و کد', 'next/image'],
      ['موبایل', 'طراحی واکنش‌گرا', 'viewport meta'],
      ['لینک‌ها', 'ساختار URL تمیز', '/blog/post-1'],
      ['Sitemap', 'ارسال فهرست صفحات', 'sitemap.xml'],
      ['Robots', 'کنترل دسترسی خزنده‌ها', 'robots.txt'],
      ['Schema', 'داده‌ی ساختاریافته', 'JSON-LD'],
      ['HTTPS', 'گواهی SSL معتبر', 'Let\'s Encrypt'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۱۲: امنیت
// ============================================================
children.push(h('فصل ۱۲: امنیت — نکات امنیتی', HeadingLevel.HEADING_1));

children.push(
  p('امنیت یکی از مهم‌ترین، اما اغلب نادیده‌گرفته‌شده‌ترین بخش‌های توسعه‌ی وب است. در این فصل سه موضوع کلیدی را مرور می‌کنیم: هش‌کردن رمز عبور با bcrypt، مدیریت session و جلوگیری از حملات XSS (Cross-Site Scripting).')
);
children.push(
  p('قانون طلایی: هرگز رمز عبور را به‌صورت متن ساده ذخیره نکنید. همیشه از bcrypt یا argon2 استفاده کنید و رمزهای تصادفی و طولانی تولید کنید.')
);

children.push(h('مثال ۱: هش رمز با bcrypt', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// src/lib/auth.ts
// توابع هش و بررسی رمز

import bcrypt from 'bcryptjs';

// هش‌کردن رمز هنگام ثبت‌نام
export async function hashPassword(password: string): Promise<string> {
  // saltRounds = 10: تعداد دورهای هش (بالاتر = امن‌تر و کندتر)
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
  // خروجی مثل: $2a$10$N9qo8uLOickgx2ZMRZoMy...
}

// بررسی رمز هنگام ورود
export async function verifyPassword(
  password: string,    // رمزی که کاربر وارد کرد
  hashed: string       // هشی که در دیتابیس ذخیره شده
): Promise<boolean> {
  // compare: رمز را هش می‌کند و با هش موجود مقایسه می‌کند
  return bcrypt.compare(password, hashed);
}

// استفاده در API ثبت‌نام
export async function register(email: string, password: string) {
  const hashed = await hashPassword(password);
  // ذخیره‌ی email و hashed در دیتابیس (نه رمز ساده!)
  await prisma.user.create({
    data: { email, password: hashed },
  });
}`)
);

children.push(h('مثال ۲: مدیریت session با JWT', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// src/lib/session.ts
// ساخت و بررسی نشست (session) با JWT

import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!; // کلید محرمانه از .env

// ساخت توکن JWT هنگام ورود موفق
export function createSession(userId: number): string {
  // sign: ایجاد توکن امضاشده با مدت اعتبار 7 روز
  return jwt.sign({ userId }, SECRET, {
    expiresIn: '7d',
  });
}

// بررسی توکن در هر درخواست
export function verifySession(token: string): { userId: number } | null {
  try {
    // verify: بررسی امضا و اعتبار
    const payload = jwt.verify(token, SECRET) as { userId: number };
    return payload;
  } catch {
    // توکن نامعتبر یا منقضی
    return null;
  }
}

// در یک middleware یا API route:
// const token = req.cookies.get('session')?.value;
// const session = verifySession(token || '');
// if (!session) return new Response('Unauthorized', { status: 401 });`)
);

children.push(h('مثال ۳: جلوگیری از XSS', HeadingLevel.HEADING_2));
children.push(
  ...codeBlock(`// React به‌طور پیش‌فرض از XSS جلوگیری می‌کند چون
// متن را قبل از نمایش escape می‌کند.
// اما اگر از dangerouslySetInnerHTML استفاده کنید، باید احتیاط کنید.

import DOMPurify from 'isomorphic-dompurify';

// پاک‌سازی HTML نامعتبر قبل از نمایش
export default function SafeHtml({ html }: { html: string }) {
  // sanitize: حذف تگ‌های خطرناک مثل <script>
  const clean = DOMPurify.sanitize(html);

  // فقط بعد از sanitize از dangerouslySetInnerHTML استفاده کنید
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// تابع کمکی برای escape کردن متن
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}`)
);

children.push(h('جدول مرجع: چک‌لیست امنیتی', HeadingLevel.HEADING_2));
children.push(
  refTable(
    ['تهدید', 'راه‌حل', 'ابزار'],
    [
      ['رمز عبور ساده', 'هش با bcrypt یا argon2', 'bcryptjs'],
      ['Session hijacking', 'توکن JWT با انقضا', 'jsonwebtoken'],
      ['XSS', 'escape + sanitize HTML', 'DOMPurify'],
      ['SQL Injection', 'استفاده از ORM/پارامتر', 'Prisma'],
      ['CSRF', 'توکن CSRF + SameSite cookie', 'csurf'],
      ['اطلاعات حساس در کد', 'استفاده از env vars', '.env'],
      ['HTTPS الزامی', 'گواهی SSL + redirect', 'Caddy/Nginx'],
      ['Rate limit', 'محدودکردن درخواست API', 'express-rate-limit'],
      ['CORS باز', 'محدودکردن دامنه‌های مجاز', 'cors middleware'],
      ['ورودی نامعتبر', 'اعتبارسنجی با zod', 'zod'],
    ]
  )
);
children.push(pageBreak());

// ============================================================
// فصل ۱۳: جمع‌بندی
// ============================================================
children.push(h('فصل ۱۳: جمع‌بندی', HeadingLevel.HEADING_1));

children.push(
  p('در این ۱۳ فصل، مسیر کامل توسعه‌ی وب مدرن را از HTML خام تا Docker و امنیت طی کردیم. هر فصل یک لایه از پشته‌ی (stack) یک برنامه‌ی واقعی بود و حالا شما ایده‌ی روشنی از نحوه‌ی کارکرد اجزای مختلف در کنار هم دارید.')
);

children.push(h('مسیر پیشنهادی برای ادامه', HeadingLevel.HEADING_2));
children.push(bullet('هفته ۱ تا ۲: تمرین HTML و CSS — چند صفحه‌ی استاتیک بسازید.'));
children.push(bullet('هفته ۳ تا ۴: یادگیری عمیق JavaScript — DOM، fetch، async/await.'));
children.push(bullet('هفته ۵ تا ۶: TypeScript و React — چند پروژه‌ی کوچک.'));
children.push(bullet('هفته ۷ تا ۸: Next.js و Prisma — یک اپ full-stack کامل.'));
children.push(bullet('هفته ۹ تا ۱۰: Tailwind، Docker، امنیت — استقرار واقعی.'));

children.push(h('منابع پیشنهادی', HeadingLevel.HEADING_2));
children.push(bullet('MDN Web Docs — مرجع کامل HTML/CSS/JS.'));
children.push(bullet('React Official Docs — react.dev'));
children.push(bullet('Next.js Docs — nextjs.org/docs'));
children.push(bullet('Prisma Docs — prisma.io/docs'));
children.push(bullet('OWASP Top 10 — برای امنیت وب.'));

children.push(h('نکته‌ی پایانی', HeadingLevel.HEADING_2));
children.push(
  p('یادگیری توسعه‌ی وب یک ماراتن است، نه یک دوی سرعت. مهم‌ترین نصیحت: پروژه‌ی واقعی بسازید، با خطا مواجه شوید، خطا را حل کنید و دوباره تلاش کنید. هیچ منبعی جایِ کدنوشتنِ واقعی را نمی‌گیرد.')
);
children.push(
  p('موفق باشید! 🚀')
);

// ---------- ساخت سند ----------
const doc = new Document({
  creator: 'Tutorial Generator',
  title: 'آموزش جامع توسعه‌ی وب مدرن',
  description: 'یک فایل آموزشی کامل فارسی برای توسعه‌ی وب',
  styles: {
    default: {
      document: {
        run: { font: FA_FONT, size: 22 },
        paragraph: { spacing: { line: 360 } },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: 'default-bullet',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.RIGHT,
            style: {
              paragraph: { indent: { right: convertInchesToTwip(0.3), hanging: 0 } },
            },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
        // bidi: true برای اینکه سند RTL باشد
        bidi: true,
      },
      children,
    },
  ],
});

// ---------- ذخیره ----------
const OUTPUT_PATH = '/home/z/my-project/download/TUTORIAL_FA.docx';
const outputDir = path.dirname(OUTPUT_PATH);

// مطمئن شو پوشه وجود دارد
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(OUTPUT_PATH, buffer);
    const stats = fs.statSync(OUTPUT_PATH);
    console.log('✅ فایل با موفقیت ساخته شد:');
    console.log('   مسیر: ' + OUTPUT_PATH);
    console.log('   حجم: ' + (stats.size / 1024).toFixed(2) + ' KB');
    console.log('   تعداد عناصر: ' + children.length);
  })
  .catch((err) => {
    console.error('❌ خطا در ساخت فایل docx:', err);
    process.exit(1);
  });
