# راهنمای نصب و اجرا — Personal Site v6

## 🚀 نصب سریع با Docker (پیشنهادی برای VPS)

### پیش‌نیازها:
- فقط Docker و Docker Compose روی VPS نصب باشه

### مراحل:
```bash
# ۱. فایل zip رو روی VPS آپلود کن
# ۲. از حالت فشرده خارج کن
unzip personal-site-v6.zip
cd personal-site-v6

# ۳. اجرا کن — همه‌چیز خودکار نصب می‌شه
docker-compose up -d

# ۴. بعد از ~۳۰ ثانیه، سایت روی پورت ۳۰۰0 در دسترسه
# http://your-vps-ip:3000
```

**همین!** هیچ چیز دیگه‌ای نصب نمی‌کنی. Docker خودش:
- Node.js و Bun رو نصب می‌کنه
- پکیج‌ها رو نصب می‌کنه
- دیتابیس رو می‌سازه
- محتوای پیش‌فرض رو لود می‌کنه
- سرور رو شروع می‌کنه

---

## 🔑 ورود به پنل ادمین

- آدرس: `http://your-vps-ip:3000/#admin`
- یا: `Ctrl+Shift+A`
- یا: توی ترمینال تایپ کن `admin`
- رمز پیش‌فرض: `admin123` (حتماً عوضش کن!)

---

## 📋 مدیریت محتوا از پنل ادمین

تو پنل ادمین، تب **content** رو باز کن:
- **Tutorials**: افزودن/ویرایش/حذف آموزش‌ها
- **Books**: مدیریت کتاب‌ها
- **Articles**: مدیریت مقالات
- **Skills**: مدیریت مهارت‌ها
- **AI Rules**: دستورالعمل‌های هوش مصنوعی

### وارد کردن انبوه آموزش‌های آپارات:
۱. تب content → Tutorials → دکمه "bulk import (JSON)"
۲. JSON رو با این فرمت بذار:
```json
[
  {
    "titleEn": "آموزش پایتون ۱",
    "titleFa": "آموزش پایتون ۱",
    "embedUrl": "https://www.aparat.com/video/video/embed/videohash/XXXX/vframe",
    "duration": "10:00",
    "levelEn": "Beginner",
    "descEn": "توضیح کوتاه"
  },
  ...
]
```
۳. دکمه import رو بزن — همه‌ی ۱۰۰ تا یکجا اضافه می‌شن

---

## 🔧 تنظیمات API Key برای AI

تو پنل ادمین → settings:
- **AI Providers**: Z.ai (پیش‌فرض)، OpenAI، Anthropic، Ollama
- هر کدوم رو فعال کن، API Key بده، model انتخاب کن
- اولویت (priority) تعیین کن — اگه یکی fail شد، بعدی امتحان می‌شه

---

## 📱 اتصال Bale Messenger

راهنمای کامل توی فایل `API_SETUP.md` هست. خلاصه:
۱. تو Bale بات بساز (@botfather)
۲. Token و Chat ID رو تو پنل ادمین → settings وارد کن
۳. Webhook رو تنظیم کن
۴. حالا از Bale پیام‌ها رو می‌بینی و جواب می‌دی

---

## 🛠️ نصب دستی (بدون Docker)

اگه Docker نداری:
```bash
# پیش‌نیاز: Node.js 22+ و Bun
bun install
bunx prisma db push --accept-data-loss
python3 scripts/seed_content.py
bun run dev
```

---

## 📁 ساختار فایل‌ها

```
personal-site-v6/
├── Dockerfile              ← برای Docker
├── docker-compose.yml      ← اجرای خودکار
├── docker-entrypoint.sh    ← اسکریپت راه‌انداز
├── SITE_TUTORIAL_FA.docx   ← آموزش کامل فارسی
├── API_SETUP.md            ← راهنمای API و Bale
├── prisma/
│   └── schema.prisma       ← مدل‌های دیتابیس
├── src/
│   ├── app/
│   │   ├── page.tsx        ← صفحه اصلی
│   │   ├── personal.css    ← تمام استایل
│   │   └── api/            ← API routes
│   ├── components/         ← کامپوننت‌ها
│   └── lib/
│       ├── content.ts      ← محتوای پایه (نام، tagline)
│       ├── providers.ts    ← مدیریت AI providers
│       ├── bale.ts         ← یکپارچه‌سازی Bale
│       └── settings.ts     ← تنظیمات سایت
└── scripts/
    ├── seed_content.py     ← لود محتوای پیش‌فرض
    └── list_messages.py    ← مشاهده پیام‌ها
```

---

## ❓ سؤالات متداول

**س: چطور رمز ادمین رو عوض کنم؟**
ج: تو `src/lib/content.ts` فیلد `adminPassword` رو تغییر بده.

**س: چطور رنگ‌ها رو عوض کنم؟**
ج: تو `src/app/personal.css` متغیرهای `:root` رو تغییر بده.

**س: چطور شخصیت بات AI رو عوض کنم؟**
ج: پنل ادمین → content → AI Rules. می‌تونی قواعد جدید اضافه کنی یا موجود رو ویرایش کنی.

**س: دیتابیس کجاست؟**
ج: تو Docker، volume به اسم `site-db` ذخیره می‌شه. با restart از بین نمی‌ره.

**س: چطور بک‌آپ بگیرم؟**
ج: `docker cp personal-site:/app/db/custom.db ./backup.db`
