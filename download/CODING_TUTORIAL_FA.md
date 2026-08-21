# آموزش کامل کدنویسی سایت شخصی — صفر تا صد

> این آموزش به زبان فارسی و با مثال‌های فراوان نوشته شده. 
> از نصب تا اجرا، از تغییر متن تا اضافه‌کردن بخش جدید — همه چیز.

---

## فصل ۱: نصب و راه‌اندازی

### ۱-۱. نصب Docker (راحت‌ترین راه)

اگر Docker روی کامپیوتر/VPS شما نصب نیست:

**ویندوز/مک:** از https://docker.com دانلود و نصب کن.

**لینوکس (Ubuntu):**
```bash
# نصب Docker
curl -fsSL https://get.docker.com | sh

# روشن‌کردن خودکار با بوت
sudo systemctl enable docker
sudo systemctl start docker
```

### ۱-۲. اجرای سایت

```bash
# فایل zip رو از حالت فشرده خارج کن
unzip personal-site-v7.zip
cd personal-site-v6

# اجرا — همین! هیچ چیز دیگه‌ای لازم نیست
docker-compose up -d
```

سایت روی `http://localhost:3000` در دسترسه.

---

## فصل ۲: ساختار فایل‌ها

### ۲-۱. فایل‌های اصلی

```
personal-site-v6/
├── Dockerfile           ← تنظیمات Docker
├── docker-compose.yml   ← اجرای خودکار
├── docker-entrypoint.sh ← اسکریپت راه‌انداز
├── prisma/
│   └── schema.prisma     ← ساختار دیتابیس
├── src/
│   ├── app/
│   │   ├── page.tsx      ← صفحه اصلی سایت
│   │   ├── personal.css  ← تمام استایل‌ها
│   │   └── api/          ← APIها (بک‌اند)
│   ├── components/       ← کامپوننت‌ها
│   └── lib/
│       └── content.ts    ← محتوای اصلی (نام، شعار،...)
└── scripts/
    └── seed_content.py   ← داده‌های اولیه
```

### ۲-۲. کجا چی رو تغییر بدم؟

| می‌خوام تغییر بدم | فایل | توضیح |
|---|---|---|
| نام من | `src/lib/content.ts` | فیلد `handle` و `fullName` |
| رنگ‌ها | `src/app/personal.css` | متغیرهای `:root` |
| متن بخش‌ها | پنل ادمین → content | نیازی به کد نیست! |
| شخصیت بات AI | پنل ادمین → content → AI Rules | نیازی به کد نیست! |
| بخش جدید | `src/app/page.tsx` | کپی‌کردن یک بخش موجود |

---

## فصل ۳: تغییر محتوا از پنل ادمین

### ۳-۱. ورود به پنل

1. آدرس: `http://localhost:3000/#admin`
2. یا: `Ctrl+Shift+A`
3. رمز: `admin123` (حتماً عوضش کن!)

### ۳-۲. تب‌های پنل

| تب | کار |
|---|---|
| contact messages | پیام‌های فرم تماس + پاسخ + حذف |
| AI chat logs | چت‌های بازدیدکنندگان با AI + پاسخ + حذف |
| content | مدیریت کتاب/مقاله/آموزش/مهارت/تجهیزات/قواعد AI |
| settings | رمز، API Key، ایمیل، Bale، پاک‌کردن |

### ۳-۳. اضافه‌کردن آموزش جدید

1. پنل ادمین → تب content → زیرتب Tutorials
2. دکمه `+ add`
3. فیلدها رو پر کن:
   - **Title (EN)**: "Python Tutorial 5"
   - **Embed URL**: `https://www.aparat.com/video/video/embed/videohash/XXXX/vframe`
   - **Duration**: "15:00"
   - **Level (EN)**: "Beginner"
4. دکمه `save`

### ۳-۴. وارد کردن انبوه ۱۰۰ آموزش آپارات

1. پنل ادمین → content → Tutorials → `bulk import`
2. JSON رو با این فرمت بذار:

```json
[
  {
    "titleEn": "آموزش پایتون ۱",
    "titleFa": "آموزش پایتون ۱",
    "embedUrl": "https://www.aparat.com/video/video/embed/videohash/ABC123/vframe",
    "duration": "10:00",
    "levelEn": "Beginner",
    "descEn": "مبانی پایتون"
  },
  {
    "titleEn": "آموزش پایتون ۲",
    "titleFa": "آموزش پایتون ۲",
    "embedUrl": "https://www.aparat.com/video/video/embed/videohash/DEF456/vframe",
    "duration": "15:00",
    "levelEn": "Intermediate",
    "descEn": "ساختار داده"
  }
]
```

3. دکمه `import` — همه یکجا اضافه می‌شن.

---

## فصل ۴: تغییر رنگ‌ها و تم

### ۴-۱. تم‌های موجود

7 تم مختلف:
- 🟢 Terminal (سبز روی مشکی)
- 🔵 Midnight (آبی روی سرمه‌ای)
- 🟠 Amber (نارنجی retro)
- 🔷 Cyan (فیروزه‌ای سایبرپانک)
- 🟣 Purple (بنفش نئون)
- 🟢 Solarized (سبز‌تیره آرام)
- ⚪ Clean (روشن حرفه‌ای)

بازدیدکننده با نقاط رنگی توی navbar انتخاب می‌کنه.

### ۴-۲. تغییر رنگ‌ها

فایل `src/app/personal.css` رو باز کن. ابتدای فایل:

```css
:root {
  --bg: #000000;           /* پس‌زمینه */
  --green: #00ff41;        /* رنگ اصلی */
  --green-bright: #39ff14; /* رنگ روشن */
  --text: #c8ffc8;         /* متن */
  --border: #1a3a1a;       /* حاشیه */
}
```

مثلاً اگه می‌خوای رنگ اصلی آبی بشه:
```css
--green: #00aaff;
--green-bright: #00ddff;
```

### ۴-۳. اضافه‌کردن تم جدید

تو `personal.css` اضافه کن:

```css
html[data-theme="mytheme"] {
  --bg: #1a0a0a;
  --green: #ff4444;
  --green-bright: #ff6666;
  --text: #ffaaaa;
  /* و بقیه متغیرها */
}
```

تو `page.tsx` هم تم رو اضافه کن:

```typescript
const [theme, setTheme] = useState<"terminal" | "clean" | "mytheme">("terminal");
```

و یه دکمه توی navbar:
```tsx
<button onClick={() => setTheme("mytheme")} title="My Theme">
  <span className="theme-icon" style={{ background: "#ff4444" }}></span>
</button>
```

---

## فصل ۵: کدنویسی — مفاهیم پایه

### ۵-۱. TypeScript چیست؟

TypeScript = جاوااسکریپت + نوع‌دهی (types)

```typescript
// جاوااسکریپت:
let name = "Salar";

// TypeScript:
let name: string = "Salar";      // نوع: string
let age: number = 30;            // نوع: number
let isActive: boolean = true;   // نوع: boolean
```

### ۵-۲. React — کامپوننت

```tsx
// یک کامپوننت ساده
function Greeting({ name }: { name: string }) {
  return <h1>سلام {name}!</h1>;
}

// استفاده
<Greeting name="سalar" />
// خروجی: <h1>سلام salar!</h1>
```

### ۵-۳. useState — متغیر حالت

```tsx
function Counter() {
  const [count, setCount] = useState(0); // مقدار اولیه: 0

  return (
    <button onClick={() => setCount(count + 1)}>
      کلیک: {count}
    </button>
  );
}
```

هر بار کلیک → count یکی زیاد می‌شه → دکمه به‌روز می‌شه.

### ۵-۴. useEffect — اجرا هنگام تغییر

```tsx
function Timer() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval); // پاک‌سازی
  }, []); // [] = فقط یکبار اجرا می‌شه

  return <p>زمان: {time} ثانیه</p>;
}
```

### ۵-۵. fetch — دریافت داده از API

```tsx
async function loadData() {
  const res = await fetch("/api/content");
  const data = await res.json();
  console.log(data.books);  // لیست کتاب‌ها
}
```

---

## فصل ۶: اضافه‌کردن بخش جدید

### ۶-۱. مثال: اضافه‌کردن بخش "پروژه‌ها"

تو `page.tsx`، یه بخش جدید اضافه کن:

```tsx
{/* PROJECTS */}
<section className="section" id="projects">
  <div className="container">
    <header className="section-head">
      <p className="section-eyebrow">08 — projects</p>
      <h2 className="section-title">Projects</h2>
    </header>
    <div className="books-grid">
      {siteContent.projects?.map((p, i) => (
        <article key={p.id} className="book-card">
          <div className="book-cover" style={{ background: p.cover }}>
            <div className="book-cover-title">{p.titleEn}</div>
          </div>
          <div className="book-body">
            <h3>{p.titleEn}</h3>
            <p>{p.descEn}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
</section>
```

و تو نوار ناوبری:
```tsx
<a href="#projects" onClick={(e) => handleNavClick(e, "#projects")}>projects</a>
```

---

## فصل ۷: API — بک‌اند

### ۷-۱. ساختار API

هر فایل `route.ts` توی `src/app/api/` یه API است:

```
src/app/api/
├── content/route.ts      ← GET: محتوای سایت
├── chat/route.ts         ← POST: چت AI
├── contact/route.ts      ← POST: فرم تماس
└── admin/
    ├── content/route.ts  ← CRUD محتوا
    ├── clear/route.ts    ← پاک‌کردن چت/پیام
    └── email/route.ts    ← تنظیم ایمیل
```

### ۷-۲. نوشتن API ساده

```typescript
// src/app/api/hello/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "سلام دنیا!" });
}

// استفاده: fetch("/api/hello") → { message: "سلام دنیا!" }
```

### ۷-۳. API با پارامتر

```typescript
export async function POST(req: Request) {
  const body = await req.json();
  const name = body.name;
  return NextResponse.json({ greeting: `سلام ${name}!` });
}

// استفاده:
// fetch("/api/hello", { method: "POST", body: JSON.stringify({ name: "سعید" }) })
// → { greeting: "سلام سعید!" }
```

---

## فصل ۸: دیتابیس (Prisma)

### ۸-۱. مدل دیتابیس

فایل `prisma/schema.prisma`:

```prisma
model Book {
  id          String   @id @default(cuid())
  titleEn     String
  year        String
  descEn      String
  visible     Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

### ۸-۲. تغییر مدل

اگه می‌خوای فیلد جدید اضافه کنی:

```prisma
model Book {
  id          String   @id @default(cuid())
  titleEn     String
  year        String
  descEn      String
  isbn        String?  // فیلد جدید (اختیاری با ?)
  visible     Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

بعد:
```bash
bunx prisma db push --accept-data-loss
```

### ۸-۳. استفاده از دیتابیس تو کد

```typescript
import { db } from "@/lib/db";

// خواندن
const books = await db.book.findMany({
  where: { visible: true },
  orderBy: { createdAt: "desc" },
});

// ایجاد
const newBook = await db.book.create({
  data: {
    titleEn: "کتاب جدید",
    year: "2025",
    descEn: "توضیح کتاب",
  },
});

// حذف
await db.book.delete({ where: { id: "some-id" } });
```

---

## فصل ۹: ایمیل و پیام‌رسان

### ۹-۱. تنظیم ایمیل (ساده)

1. پنل ادمین → settings → Email Forwarding
2. ایمیلت رو وارد کن (مثلاً `myname@gmail.com`)
3. دکمه `save email`

وقتی بازدیدکننده فرم تماس رو پر می‌کنه:
- پیام توی دیتابیس ذخیره می‌شه
- یه کپی به ایمیلت فرستاده می‌شه (از طریق formsubmit.co)
- بار اول: formsubmit.co یه ایمیل تأیید می‌فرسته — فعالش کن

### ۹-۲. تنظیم Bale

1. توی Bale به `@botfather` پیام بده
2. `/newbot` بفرست → بات بساز
3. Bot Token رو کپی کن
4. یه پیام به باتت بفرست
5. `https://api.bale.ai/v1/botsYOUR_TOKEN/getUpdates` رو باز کن → chat_id رو بگیر
6. پنل ادمین → settings → Bale → Token و Chat ID رو وارد کن
7. Webhook رو تنظیم کن:
```
https://api.bale.ai/v1/botsYOUR_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/bale/webhook
```

دستورات Bale:
- `/list` — پیام‌های اخیر
- `/reply {id} {text}` — پاسخ به پیام
- `/disable` / `/enable` — خاموش/روشن چت AI
- `/stats` — آمار

### ۹-۳. تنظیم Telegram (بک‌آپ)

مشابه Bale، فقط URL رو به `api.telegram.org` تغییر بده.

---

## فصل ۱۰: ضدکپی و محافظت

### ۱۰-۱. محافظت موجود

1. **راست‌کلیک غیرفعال** — منوی راست‌کلیک بسته‌ست
2. **DevTools detection** — اگه ابزار توسعه باز بشه، هشدار نشون می‌ده
3. **F12/Ctrl+Shift+I مسدود** — کلیدهای میان‌دست بسته‌ست
4. **واترمارک نامرئی** — شناسه deployment توی کد مخفی
5. **محتوا در دیتابیس** — متن‌ها توی DB، نه توی HTML — کپی‌کردن HTML متن‌ها رو نمی‌ده

### ۱۰-۲. استراتژی ضدکپی

محتوای مهم (محتوا، چت، تنظیمات) همگی **سمت سرور** هستن:
- بازدیدکننده فقط HTML خالی می‌بینه
- داده‌ها از API لود می‌شن
- یه کپی استاتیک فقط اسکلت سایت رو داره، نه محتوا رو

---

## فصل ۱۱: Docker

### ۱۱-۱. Dockerfile

```dockerfile
FROM node:22-slim              # ایمیج پایه
RUN npm install -g bun         # نصب Bun
RUN apt-get update && apt-get install -y openssl sqlite3 python3
WORKDIR /app                   # پوشه کاری
COPY package.json bun.lock* ./ # کپی پکیج‌ها
COPY prisma ./prisma/
RUN bun install                # نصب وابستگی‌ها
RUN bunx prisma generate       # تولید Prisma Client
COPY . .                       # کپی کل کد
EXPOSE 3000                    # پورت
ENTRYPOINT ["./docker-entrypoint.sh"]  # اسکریپت شروع
```

### ۱۱-۲. docker-compose.yml

```yaml
version: "3.8"
services:
  website:
    build: .                   # از Dockerfile بساز
    ports:
      - "3000:3000"            # پورت 3000
    volumes:
      - site-db:/app/db        # دیتابیس ماندگار
    restart: unless-stopped    # خودکار ری‌استارت
volumes:
  site-db:                     # volume نام‌گذاری شده
```

### ۱۱-۳. دستورات Docker

```bash
# اجرا
docker-compose up -d

# توقف
docker-compose down

# مشاهده لاگ‌ها
docker-compose logs -f

# بازسازی بعد از تغییر کد
docker-compose up -d --build

# بک‌آپ دیتابیس
docker cp personal-site:/app/db/custom.db ./backup.db

# بازیابی
docker cp ./backup.db personal-site:/app/db/custom.db
```

---

## فصل ۱۲: رفع اشکال

### ۱۲-۱. سایت باز نمی‌شه

```bash
# بررسی وضعیت container
docker-compose ps

# مشاهده لاگ‌ها
docker-compose logs -f
```

### ۱۲-۲. پنل ادمین باز نمی‌شه

- آدرس: `http://localhost:3000/#admin`
- یا: `Ctrl+Shift+A`
- رمز پیش‌فرض: `admin123`
- اگه رمز رو عوض کردی و یادت رفته: فایل `src/lib/content.ts` رو باز کن و `adminPassword` رو پیدا کن

### ۱۲-۳. چت AI جواب نمی‌ده

1. پنل ادمین → settings → بررسی که API kill switch روشن نباشه
2. پنل ادمین → settings → AI Providers → بررسی که حداقل یه provider فعال باشه
3. لاگ‌ها رو ببین: `docker-compose logs -f`

### ۱۲-۴. آموزش‌ها لود نمی‌شن

URL امبد رو چک کن:
- آپارات: `https://www.aparat.com/video/video/embed/videohash/XXXX/vframe`
- یوتیوب: `https://www.youtube.com/embed/XXXX`

نباید URL تماشا (watch) باشه — باید URL امبد (embed) باشه.

---

## فصل ۱۳: ایده‌های خودم برای بهتر شدن

### ۱۳-۱. جستجوی سراسری

یه کادر جستجو که توی همه بخش‌ها (کتاب، مقاله، آموزش) همزمان جستجو می‌کنه.

### ۱۳-۲. میانبر کیبورد

- `/` → باز کردن جستجو
- `j` / `k` → حرکت بین بخش‌ها
- `g` + `a` → رفتن به About
- `g` + `c` → رفتن به Chat

### ۱۳-۳. صدای اعلان

وقتی پیام جدید از بازدیدکننده میاد، یه بوق آرام پخش می‌شه.

### ۱۳-۴. پشتیبان‌گیری خودکار

هر شب، دیتابیس به صورت خودکار بک‌آپ گرفته می‌شه.

### ۱۳-۵. حالت آفلاین (PWA)

سایت به‌عنوان اپ نصب می‌شه و آفلاین هم کار می‌کنه.

---

## خلاصه

| کار | روش |
|---|---|
| اجرای سایت | `docker-compose up -d` |
| ورود به پنل | `#admin` یا `Ctrl+Shift+A` |
| تغییر متن | پنل → content |
| تغییر رنگ | `personal.css` → `:root` |
| تغییر رمز | پنل → settings → Security |
| اضافه‌کردن آموزش | پنل → content → Tutorials → add |
| تنظیم ایمیل | پنل → settings → Email Forwarding |
| تنظیم Bale | پنل → settings → Bale |
| پاک‌کردن چت | پنل → settings → Danger Zone |
| بک‌آپ | `docker cp personal-site:/app/db/custom.db ./backup.db` |

تمام!
