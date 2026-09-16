# راهنمای نصب نهایی — Personal Site

## 🚀 نصب سریع (Docker)

```bash
# ۱. فایل zip رو روی VPS آپلود کن
# ۲. از حالت فشرده خارج کن
unzip personal-site-final.zip
cd personal-site-final

# ۳. اجرا کن — همه‌چیز خودکار نصب می‌شه
docker-compose up -d

# ۴. سایت روی پورت 3000
# http://your-vps-ip:3000
```

**همین!** هیچ چیز دیگه‌ای لازم نیست.

---

## 🔑 ورود به پنل ادمین

- آدرس: `http://your-vps-ip:3000/#admin`
- یا: `Ctrl+Shift+A`
- رمز: `admin123` (حتماً عوضش کن!)

---

## 📋 ۸ تب پنل ادمین

| تب | کار |
|---|---|
| contact messages | پیام‌های تماس + پاسخ + حذف + جستجو + CSV |
| AI chat logs | چت‌ها + پاسخ + حذف |
| content | کتاب/مقاله/آموزش/مهارت/تجهیزات/قواعد AI |
| texts | ۳۶ متن قابل ویرایش (۳ زبانه) |
| menu | منوی ناوبری (افزودن/حذف/ترتیب) |
| themes | تم‌ساز رنگی (۱۵ رنگ + نمونه زنده) |
| stats | داشبورد آمار بازدید |
| settings | رمز/API/ایمیل/Bale/Telegram/ساعات کاری/Danger Zone |

---

## 🤖 ارائه‌دهنده‌های AI

5 ارائه‌دهنده با fallback:

| Provider | Model | نیاز |
|---|---|---|
| Z.ai | glm-4.6 | پیش‌فرض (بدون API Key) |
| OpenAI | gpt-4o-mini | API Key |
| Anthropic | claude-3-5-sonnet | API Key |
| Ollama | llama3.2 | محلی (بدون API Key) |
| OpenRouter | qwen-2.5-72b | API Key از openrouter.ai |

---

## 📱 پیام‌رسان

- **Bale**: اعلان + پاسخ از Bale
- **Telegram**: بک‌آپ (مشابه Bale)
- **Email**: فرمسابمیت (رایگان، بدون SMTP)

---

## 🛡️ امنیت و ضدسرقت

- قفل دامنه
- واترمارک نامرئی روی Canvas
- راست‌کلیک و DevTools غیرفعال
- تشخیص پیام مشکوک → هشدار خودکار به Bale/Telegram
- ربات هرگز رمز/کد/داده‌ی حساس نمی‌ده

---

## 📁 فایل‌های آموزش

- `CODING_TUTORIAL_FA.docx` — آموزش کدنویسی صفر تا صد (فارسی)
- `SITE_TUTORIAL_FA.docx` — آموزش کامل سایت (فارسی)
- `API_SETUP.md` — راهنمای API و Bale
