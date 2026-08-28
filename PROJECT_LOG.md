# PROJECT LOG — Personal Site (سایت شخصی)

> این فایل تاریخچه‌ی کامل پروژه است. 
> هر بار که تغییری دادیم، اینجا ثبت می‌شه.
> اگر چت جدیدی باز شد یا خواستی پروژه رو ادامه بدی، این فایل رو بخون.

---

## 📌 نسخه فعلی: V18.4
## 📅 تاریخ: 2026-08-28
## 🔗 پیش‌نمایش زنده: https://preview-chat-f7fdfef6-aa0f-4780-ac8e-5fa3dafbfbf0.space-z.ai/

---

## 📦 فایل‌های مهم

| فایل | مسیر | توضیح |
|---|---|---|
| **VERSION.txt** | `/home/z/my-project/VERSION.txt` | تاریخچه نسخه‌ها + راهنمای Docker |
| **CODING_TUTORIAL_FA.docx** | `/home/z/my-project/download/CODING_TUTORIAL_FA.docx` | آموزش کدنویسی صفر تا صد (۲۰ فصل فارسی) |
| **SITE_TUTORIAL_FA.docx** | `/home/z/my-project/download/SITE_TUTORIAL_FA.docx` | آموزش کامل سایت (۲۲ بخش فارسی) |
| **personal-site-final.zip** | `/home/z/my-project/download/personal-site-final.zip` | فایل اجرایی Docker (۲۳۱KB) |
| **API_SETUP.md** | `/home/z/my-project/download/API_SETUP.md` | راهنمای API و Bale |

---

## 🗂 ساختار فایل‌های پروژه

```
/home/z/my-project/
├── VERSION.txt                    ← تاریخچه نسخه‌ها
├── Dockerfile                     ← تنظیمات Docker
├── docker-compose.yml             ← اجرای خودکار
├── docker-entrypoint.sh            ← اسکریپت راه‌انداز
├── .dockerignore
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
├── prisma/
│   └── schema.prisma              ← ۲۳ مدل دیتابیس
├── src/
│   ├── app/
│   │   ├── page.tsx               ← صفحه اصلی (۱۷۰۰+ خط)
│   │   ├── layout.tsx             ← HTML shell + PWA + RSS + Sitemap
│   │   ├── globals.css            ← Tailwind import
│   │   ├── personal.css           ← تمام استایل‌ها (تم ترمینال/RF)
│   │   └── api/                   ← ۲۵ API route
│   │       ├── content/route.ts          ← محتوای عمومی
│   │       ├── contact/route.ts          ← فرم تماس + کپچا + ضد اسپم
│   │       ├── chat/route.ts             ← چت AI + تشخیص پیام مشکوک
│   │       ├── chat/messages/route.ts    ← تحویل زنده پیام به بازدیدکننده
│   │       ├── track/route.ts            ← ردیابی بازدید
│   │       ├── rss.xml/route.ts          ← RSS Feed
│   │       ├── sitemap.xml/route.ts     ← نقشه سایت SEO
│   │       └── admin/
│   │           ├── content/route.ts     ← CRUD محتوا
│   │           ├── equipment/route.ts    ← CRUD تجهیزات
│   │           ├── themes/route.ts       ← CRUD تم‌های سفارشی
│   │           ├── text/route.ts        ← CRUD متن‌ها
│   │           ├── nav/route.ts          ← CRUD منوی ناوبری
│   │           ├── settings/route.ts     ← تنظیمات سایت
│   │           ├── security/route.ts     ← تغییر رمز/نام کاربری
│   │           ├── security-dashboard/route.ts ← داشبورد امنیت
│   │           ├── stats/route.ts        ← داشبورد آمار
│   │           ├── clear/route.ts        ← پاک‌کردن چت/پیام
│   │           ├── reply/route.ts        ← پاسخ به پیام تماس
│   │           ├── chat-reply/route.ts   ← پاسخ به چت
│   │           ├── email/route.ts        ← تنظیم ایمیل (formsubmit.co)
│   │           ├── providers/route.ts    ← مدیریت ارائه‌دهنده‌های AI
│   │           ├── bale/webhook/route.ts ← وب‌هوک Bale
│   │           └── telegram/webhook/route.ts ← وب‌هوک Telegram
│   ├── components/                 ← ۲۱ کامپوننت
│   │   ├── RealOscilloscope.tsx         ← اسیلوسکوپ واقعی (V18.4: deterministic rendering)
│   │   ├── RealSignalGenerator.tsx       ← ژنراتور سیگنال با AM/FM (V18.1: controlled props)
│   │   ├── SignalLab.tsx                 ← اتصال بی‌سیم ژنراتور به اسیلوسکوپ (V18.1: state lift)
│   │   ├── LabEquipmentRack.tsx          ← رک تجهیزات آزمایشگاه
│   │   ├── LabDeviceVisualizer.tsx       ← نمایشگر زنده دستگاه‌ها (Smith chart, Spectrum, etc.)
│   │   ├── InteractiveTerminal.tsx        ← ترمینال تعاملی
│   │   ├── MatrixRain.tsx                ← پس‌زمینه ماتریکسی
│   │   ├── ChatSection.tsx               ← بخش چت با AI
│   │   ├── ContentManager.tsx            ← مدیریت محتوا از پنل
│   │   ├── TextEditor.tsx               ← ویرایشگر متن‌ها
│   │   ├── NavMenuManager.tsx           ← مدیریت منو
│   │   ├── ThemeBuilder.tsx              ← تم‌ساز رنگی
│   │   ├── StatsDashboard.tsx            ← داشبورد آمار
│   │   ├── SecurityDashboard.tsx         ← داشبورد امنیت
│   │   ├── ArchiveGrid.tsx              ← صفحه‌بندی + جستجو + مرتب‌سازی
│   │   ├── GlobalSearch.tsx             ← جستجوی سراسری
│   │   ├── Oscilloscope.tsx             ← اسیلوسکوپ ساده (هرو)
│   │   ├── SignalBars.tsx               ← میله‌های سیگنال
│   │   ├── SmithChart.tsx               ← نمودار اسمیت (قدیمی)
│   │   ├── SpectrumAnalyzer.tsx          ← آنالیزور طیف (قدیمی)
│   │   └── PgpKey.tsx                   ← نمایش کلید PGP
│   └── lib/                        ← ۸ ماژول
│       ├── content.ts                   ← محتوای پایه (نام، رمز، شعار)
│       ├── db.ts                        ← Prisma client
│       ├── settings.ts                  ← تنظیمات سایت (key-value)
│       ├── providers.ts                 ← ۶ ارائه‌دهنده AI با fallback
│       ├── bale.ts                      ← یکپارچه‌سازی Bale
│       ├── telegram.ts                  ← یکپارچه‌سازی Telegram
│       ├── security.ts                  ← مسدودسازی IP + کپچا + لاگ
│       ├── canvas-protect.ts            ← قفل دامنه + واترمارک
│       └── useContent.ts                ← hook دریافت محتوا + متن‌ها
├── scripts/
│   ├── seed_content.py                  ← داده‌های اولیه محتوا
│   ├── seed_equipment.py                ← داده‌های ۱۰ تجهیزات آزمایشگاه
│   ├── seed_texts.py                    ← ۳۶ متن قابل ویرایش
│   ├── auto-backup.sh                   ← بک‌آپ خودکار هر شب
│   ├── list_messages.py                 ← مشاهده پیام‌ها
│   ├── keep-alive.sh                    ← (V18.3) نگه‌دارنده سرور dev در sandbox
│   ├── generate_coding_tutorial_fa.py    ← تولید فایل Word آموزش
│   ├── generate_tutorial.py              ← تولید فایل Word آموزش (EN)
│   ├── generate_tutorial_fa.py           ← تولید فایل Word آموزش فارسی
│   ├── generate_full_tutorial.py         ← تولید فایل Word کامل با امنیت
│   └── shoot_preview.py                 ← اسکرین‌شات
├── public/
│   ├── manifest.json                    ← PWA manifest
│   ├── icon-192.png                     ← آیکون PWA
│   └── icon-512.png
├── db/
│   └── custom.db                        ← دیتابیس SQLite
└── download/
    ├── personal-site-final.zip          ← فایل اجرایی Docker نهایی
    ├── CODING_TUTORIAL_FA.docx           ← آموزش کدنویسی فارسی
    ├── SITE_TUTORIAL_FA.docx             ← آموزش سایت فارسی
    └── API_SETUP.md                      ← راهنمای API
```

---

## 🛠 تکنولوژی‌ها

| تکنولوژی | نسخه | کاربرد |
|---|---|---|
| Next.js | 16.1.3 | فریم‌ورک اصلی |
| TypeScript | 5.x | زبان برنامه‌نویسی |
| React | 19 | UI |
| Prisma | 6.19 | ORM دیتابیس |
| SQLite | - | دیتابیس |
| Tailwind CSS | 4 | استایل پایه |
| z-ai-web-dev-sdk | - | AI پیش‌فرض |
| nodemailer | 9.x | ارسال ایمیل (غیرفعال — از formsubmit.co استفاده می‌شه) |
| Bun | - | package manager و runner |
| Docker | - | container |

---

## 🤖 ارائه‌دهنده‌های AI (۶ تا با fallback)

| Provider | Model | سرعت | نیاز |
|---|---|---|---|
| Z.ai | glm-4.6 | متوسط | بدون API Key |
| OpenAI | gpt-4o-mini | متوسط | API Key |
| Anthropic | claude-3.5-sonnet | متوسط | API Key |
| Groq | llama-3.3-70b-versatile | **خیلی سریع** | API Key از console.groq.com |
| OpenRouter | qwen-2.5-72b-instruct | متوسط | API Key از openrouter.ai |
| Ollama | llama3.2 | محلی | بدون API Key |

---

## 📊 آمار پروژه

- ۲۵ API route
- ۲۱ کامپوننت
- ۲۳ جدول دیتابیس
- ۹ تب پنل ادمین
- ۷ تم رنگی آماده + تم‌ساز
- ۳۶ متن قابل ویرایش از پنل
- ۳ زبان (EN, DE, FA)
- ۲۰ فصل آموزش فارسی

---

## 🔄 تاریخچه تغییرات

### V18.4 (2026-08-28) — اصلاحات Signal Lab
- **رفع مشکل مدولاسیون FM/AM**: state مدولاسیون از `RealSignalGenerator` به `SignalLab` منتقل شد (lift up) و به اسیلوسکوپ پاس داده شد. قبلاً تغییر AM/FM روی ژنراتور فقط روی پیش‌نمایش کوچک خودش اثر داشت و اسیلوسکوپ carrier خام رو نشون می‌داد.
- **حذف لرزش پیش‌نمایش ژنراتور**: phase accumulation (`phaseRef`, `modPhaseRef`) حذف شد. پیش‌نمایش حالا به‌صورت قطعی از `t=0` تا `t=timeWindow` render می‌شه — بدون لرزش و scroll.
- **حذف لرزش اسیلوسکوپ**: منطق پیچیده trigger-chasing با phase compensation حذف شد. اسیلوسکوپ حالا موج رو از `t=0` تا `t=timeWindow` با فرمول مستقیم render می‌کنه — کاملاً سابت، مثل trigger واقعی.
- **اصلاح فرمول FM**: `beta = modDepth × 5` به‌جای `modDepth × 2` — وابستگی فرکانس حالا واضح‌تر و هماهنگ با اسیلوسکوپ.
- **رفع «یک‌سوم راست scope خالی»**: حلقه‌ی rendering به‌جای `i` (که حداکثر ۸۰۰ بود)، `x = frac × w` رو استفاده می‌کنه که کل عرض canvas رو پوشش می‌ده.
- **رفع خطای hydration صفحه اصلی**: `suppressHydrationWarning` به `<body>` در `layout.tsx` اضافه شد (در کنار `<html>` که قبلاً داشت). این خطای ناشی از set شدن `lang`/`dir`/`data-theme` روی `<html>` و `<body>` در `useEffect` بود.
- **تغییر `voltDiv` پیش‌فرض**: از `1V` به `2V` — قبلاً ۵V peak با 1V/div از صفحه بیرون می‌زد.
- **اسکریپت `keep-alive.sh`**: نگه‌دارنده سرور dev در sandbox که هر ۱۰ ثانیه چک می‌کنه و اگر `next-server` از کار افتاده بود دوباره راه‌اندازی می‌کنه.

### V18.0 (2026-08-26) — نسخه نهایی
- ربات = شما (نه دستیار): "من [نام شما] هستم"
- محدودسازی ربات: رمز/کد/داده حساس نمی‌ده
- Telegram کامل
- Groq provider (ultra-fast)
- OpenRouter (Qwen Cloud)
- ایمیل ساده (formsubmit.co)
- PWA, RSS, Sitemap, PGP
- بک‌آپ خودکار (cron)
- ورود با نام کاربری + رمز
- کپچا روی فرم تماس
- متن‌ها از دیتابیس
- ضدسرقت کامل

### V10-V17 (2026-08-10)
- اسیلوسکوپ + ژنراتور واقعی
- CRM کامل
- چت AI با تحویل زنده
- Bale + Telegram
- تم‌ساز، جستجوی سراسری
- داشبورد امنیت + آمار
- مسدودسازی IP خودکار
- ساعات کاری + خود-پاسخ‌گو

### V1-V9 (2026-08-10)
- ساخت سایت اولیه
- تم ماتریکسی
- پنل ادمین
- فرم تماس ضد اسپم
- چندزبانه (EN/DE/FA)

---

## 🔧 جزئیات فنی تغییرات V18.4

### مشکل ۱: دکمه‌های AM/FM کار نمی‌کردن
**علت**: state مدولاسیون (`modulation`, `modFreq`, `modDepth`, `outputOn`) به‌صورت `useState` محلی داخل `RealSignalGenerator` بود. هیچ راهی برای انتقال به `RealOscilloscope` وجود نداشت.
**حل**:
- در `SignalLab.tsx`: state ها به parent منتقل شدن
- در `RealSignalGenerator.tsx`: از `useState` به controlled props تبدیل شدن (`onModulationChange`, `onModFreqChange`, `onModDepthChange`, `onOutputOnChange`)
- در `RealOscilloscope.tsx`: props جدید (`modulation`, `modFreq`, `modDepth`, `outputOn`) قبول می‌شن و در فرمول sampling اعمال می‌شن

### مشکل ۲: لرزش پیش‌نمایش ژنراتور
**علت**: `phaseRef.current += 2π × visualFreq × dt` باعث می‌شد phase در هر فریم جلو بره و موج بچرخه.
**حل**: phase accumulation حذف شد. پیش‌نمایش حالا از `t=0` تا `t=timeWindow` (۲ دوره carrier) به‌صورت قطعی render می‌شه.

### مشکل ۳: لرزش اسیلوسکوپ
**علت**: منطق trigger-chasing با floating-point jitter باعث می‌شد trigger point در هر فریم کمی جابجا بشه و موج بلرزه.
**حل**: rendering به‌صورت قطعی از `t=0` تا `t=timeWindow` با فرمول مستقیم `signalAt(t)`. این مثل trigger کامل در اسیلوسکوپ واقعیه — موج کاملاً سابت می‌مونه.

### مشکل ۴: یک‌سوم راست اسیلوسکوپ خالی
**علت**: حلقه از `i = 0` تا `i = samples = min(w, 800)` می‌رفت و `i` رو به‌عنوان x coordinate استفاده می‌کرد. اگه canvas عرضش بیشتر از ۸۰۰px باشه، فقط ۸۰۰px سمت چپ پر می‌شد.
**حل**: `x = frac × w` محاسبه می‌شه که همیشه کل عرض canvas رو پوشش می‌ده.

### مشکل ۵: خطای hydration صفحه اصلی
**علت**: `useEffect` در `page.tsx` attribute های `lang`, `dir`, `data-theme` رو روی `<html>` و `<body>` set می‌کنه که باعث mismatch بین SSR و client می‌شه.
**حل**: `suppressHydrationWarning` به `<body>` در `layout.tsx` اضافه شد.

---

## 🚀 راهنمای اجرای سریع

```bash
unzip personal-site-final.zip
cd personal-site-final
docker-compose up -d
# سایت روی پورت 3000
```

## 🔄 انتقال به VPS جدید

```bash
# روی VPS قدیمی:
docker cp personal-site:/app/db/custom.db ./backup.db
zip -r site-backup.zip personal-site-final/ backup.db

# روی VPS جدید:
unzip site-backup.zip
cd personal-site-final
docker-compose up -d
docker cp ../backup.db personal-site:/app/db/custom.db
docker-compose restart
# دامنه جدید رو به AUTHORIZED_DOMAINS در canvas-protect.ts و page.tsx اضافه کن
docker-compose up -d --build
```

---

## 🖥 راهنمای اجرای dev در sandbox فعلی

سرور dev روی پورت 3000 با supervisor نگه‌داری می‌شه:

```bash
# شروع supervisor (هر ۱۰ ثانیه چک می‌کنه سرور زنده‌ست)
setsid sh -c '/home/z/my-project/scripts/keep-alive.sh > /home/z/my-project/scripts/keepalive.log 2>&1' < /dev/null & disown

# لاگ سرور
tail -f /home/z/my-project/dev.log

# URL پیش‌نمایش
https://preview-chat-f7fdfef6-aa0f-4780-ac8e-5fa3dafbfbf0.space-z.ai/
```

اگه ۴۰۴ دیدی، احتمالاً سرور idle از کار افتاده — supervisor خودش restart می‌کنه ولی ممکنه ۱۰ ثانیه طول بکشه. صبر کن و refresh کن.

---

## ⚠ نکات مهم

۱. **رمز ادمین**: پیش‌فرض `admin` / `admin123` — حتماً از پنل settings عوض کن
۲. **دامنه مجاز**: دامنه‌ی خودت رو به `AUTHORIZED_DOMAINS` در `src/lib/canvas-protect.ts` و `src/app/page.tsx` اضافه کن
۳. **API Key**: از پنل settings → AI Providers وارد کن
۴. **Bale/Telegram**: از پنل settings تنظیم کن
۵. **ایمیل**: از پنل settings → Email Forwarding فقط ایمیلت رو وارد کن
۶. **محتوا**: همه از پنل content قابل مدیریت
۷. **متن‌ها**: ۳۶ متن از پنل texts قابل ویرایش
۸. **منو**: از پنل menu قابل افزودن/حذف/ترتیب

---

## 📝 یادداشت برای ادامه پروژه

اگر خواستی پروژه رو ادامه بدی:

۱. این فایل (`PROJECT_LOG.md`) رو بخون
۲. فایل `VERSION.txt` رو چک کن
۳. کد روی سرور در `/home/z/my-project/` هست
۴. فایل zip در `/home/z/my-project/download/personal-site-final.zip` هست
۵. دیتابیس در `/home/z/my-project/db/custom.db` هست
۶. Git commits موجود هستن — `git log` بزن

**برای بک‌آپ کامل:**
```bash
cd /home/z/my-project
zip -r full-backup.zip src/ prisma/ scripts/ public/ db/ download/ VERSION.txt package.json Dockerfile docker-compose.yml
```

---

## 📋 فایل‌های تغییر یافته در V18.4 (2026-08-28)

| فایل | مسیر | تغییر |
|---|---|---|
| `SignalLab.tsx` | `src/components/SignalLab.tsx` | lift up state مدولاسیون |
| `RealSignalGenerator.tsx` | `src/components/RealSignalGenerator.tsx` | controlled props + حذف phase accumulation |
| `RealOscilloscope.tsx` | `src/components/RealOscilloscope.tsx` | modulation props + deterministic rendering + x scaling |
| `layout.tsx` | `src/app/layout.tsx` | `suppressHydrationWarning` روی `<body>` |
| `keep-alive.sh` | `scripts/keep-alive.sh` | جدید — supervisor سرور dev |
| `PROJECT_LOG.md` | `PROJECT_LOG.md` | این آپدیت |

