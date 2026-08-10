# API Setup & Bale Messenger Integration Guide

This guide explains where the AI chat API code lives, how to give it an API key, and how to set up Bale messenger so you can see and reply to messages from your phone.

---

## 📍 Where the API Code Lives

### AI Chat API
**File:** `src/app/api/chat/route.ts`

This is the main AI chat endpoint. When a visitor sends a message in the chat section, it:
1. Receives POST request with `{ sessionId, message, lang, visitorId }`
2. Checks the **API kill switch** (see below)
3. Rate-limits the IP (8 messages/minute)
4. Creates or resumes a `ChatSession` in the database
5. Saves the user's message to `ChatMessage` table
6. Sends a Bale notification (if configured)
7. Calls the **z-ai-web-dev-sdk** LLM with a system prompt
8. Saves the AI's reply to `ChatMessage`
9. Returns `{ ok, sessionId, reply }`

### The LLM SDK (z-ai-web-dev-sdk)
**Import location:** Inside `src/app/api/chat/route.ts` line ~149:
```typescript
const ZAI = (await import("z-ai-web-dev-sdk")).default;
const zai = await ZAI.create();
const completion = await zai.chat.completions.create({
  messages: [...],
  thinking: { type: "disabled" },
});
```

**API Key:** The SDK is pre-configured in this environment. You don't need to manually set an API key — `ZAI.create()` handles authentication automatically. The SDK reads credentials from the environment.

**To use your own API key (optional):**
If you want to use a different Z.ai account, set these in `/home/z/my-project/.env`:
```
ZAI_API_KEY=your_api_key_here
```

### The System Prompt (Bot Personality)
**File:** `src/app/api/chat/route.ts`, function `buildSystemPrompt(lang)` (line ~25)

This defines the bot's personality. Currently set to:
- Friendly, curious, slightly nerdy
- Asks visitors for their opinions
- Recommends relevant content
- Responds in the visitor's language
- Never claims to BE you (it's the site's AI assistant)

**To change the bot's role/personality:** Edit the `buildSystemPrompt` function.

---

## 🔌 API Routes Overview

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/contact` | POST | Contact form submission → saves to DB |
| `/api/chat` | POST | AI chat message → LLM → saves to DB |
| `/api/chat` | GET | Admin: fetch all chat sessions |
| `/api/messages` | GET | Admin: fetch contact messages + stats |
| `/api/admin/reply` | POST | Admin: reply to a contact message |
| `/api/admin/chat-reply` | POST | Admin: inject reply into AI chat |
| `/api/admin/settings` | GET/POST | Admin: read/write site settings |
| `/api/bale/webhook` | POST | Bale → site: admin replies from Bale |

---

## 🔴 API Kill Switch (Disable AI Chat)

The AI chat API can be disabled in 3 ways:

### Method 1: Admin Panel (web UI)
1. Go to `#admin` or press `Ctrl+Shift+A`
2. Enter password (`admin123` by default)
3. Go to **settings** tab
4. Toggle "AI Chat API" switch

### Method 2: Bale Bot Command
Send this to your Bale bot:
```
/disable
```
To re-enable:
```
/enable
```

### Method 3: Direct database
The setting is stored in the `SiteSetting` table with key `apiEnabled` (value `"true"` or `"false"`).

When disabled, `/api/chat` returns HTTP 503 with message "Chat is temporarily disabled."

---

## 📱 Bale Messenger Integration

Bale is an Iranian messenger with a Bot API similar to Telegram. This integration lets you:
- **Receive notifications** when someone sends a contact message or starts a chat
- **Reply to messages** directly from Bale
- **Disable/enable the API** from Bale
- **View stats** from Bale

### Step 1: Create a Bale Bot

1. Open Bale and search for `@botfather`
2. Send `/newbot`
3. Choose a name (e.g., "My Portfolio Admin")
4. Choose a username (e.g., `my_portfolio_admin_bot`)
5. BotFather gives you a **bot token** like: `123456789:ABCdefGhIJKlmNoPQRsTUVwxyz`
6. Save this token

### Step 2: Get Your Chat ID

1. Send any message to your new bot in Bale
2. Open this URL in a browser (replace TOKEN):
   ```
   https://api.bale.ai/v1/botsTOKEN/getUpdates
   ```
3. Look for `"chat":{"id":123456789}` in the response
4. That number is your **chat ID**

### Step 3: Configure in Admin Panel

1. Open your site → `#admin` → settings tab
2. In "Bale Messenger Integration" section:
   - **Enable Bale notifications:** toggle ON
   - **Bale Bot Token:** paste your token
   - **Bale Chat ID:** paste your chat ID
3. Click "save Bale config"

### Step 4: Set Up Webhook (for replying from Bale)

The webhook lets Bale forward your messages to the site. Set it up by opening this URL in a browser:

```
https://api.bale.ai/v1/botsYOUR_TOKEN/setWebhook?url=https://your-domain.com/api/bale/webhook
```

Replace:
- `YOUR_TOKEN` with your bot token
- `your-domain.com` with your actual domain

**For local development:** The webhook won't work without a public URL. Use a tunnel like `ngrok` to expose localhost:
```bash
ngrok http 3000
# Then use the ngrok URL as your webhook URL
```

### Step 5: Test It

1. Send a contact message on your site → you should get a Bale notification
2. Start an AI chat → you should get a Bale notification
3. In Bale, send `/help` to see all commands

### Bale Bot Commands

| Command | Purpose |
|---------|---------|
| `/help` | Show all commands |
| `/list` | Show 5 recent contact messages |
| `/reply {id} {text}` | Reply to a contact message |
| `/chat {sessionId} {text}` | Inject reply into AI chat |
| `/disable` | Disable AI chat API |
| `/enable` | Enable AI chat API |
| `/stats` | Show site statistics |

---

## 🗄️ Database Models

The site uses Prisma + SQLite. The database file is at `db/custom.db`.

### Models:

1. **ContactMessage** — messages from contact form
2. **ChatSession** — a conversation between visitor and AI
3. **ChatMessage** — individual messages in a chat session
4. **MessageReply** — admin replies to contact messages
5. **SiteSetting** — key-value store for settings (kill switch, Bale config, etc.)

### To view the database directly:
```bash
cd /home/z/my-project
sqlite3 db/custom.db
> .tables
> SELECT * FROM ContactMessage;
> SELECT * FROM ChatSession;
> SELECT * FROM SiteSetting;
```

### To reset the database:
```bash
cd /home/z/my-project
rm db/custom.db
bun run db:push
```

---

## 🔒 Security Notes

1. **Admin password:** Change `adminPassword` in `src/lib/content.ts` from `"admin123"` to something strong.
2. **Bale webhook secret:** Optionally set `BALE_WEBHOOK_SECRET` in `.env` and append `?secret=xxx` to your webhook URL to prevent spoofed requests.
3. **Rate limiting:** Contact form: 3/10min/IP. Chat: 8/min/IP. Bot detection via User-Agent.
4. **Spam filtering:** Contact form checks for common spam patterns (viagra, casino, multiple URLs, repeated characters).
5. **No email exposure:** Your email is never shown on the site. Visitors' emails are stored in DB for you to see in admin panel.

---

## ❓ FAQ

**Q: Where do I put my own AI API key?**
A: The z-ai-web-dev-sdk is pre-configured. If you want to use your own, set `ZAI_API_KEY` in `.env`. The code in `src/app/api/chat/route.ts` reads it automatically.

**Q: Can I use a different LLM (OpenAI, Anthropic, etc.)?**
A: Yes. Replace the LLM call in `src/app/api/chat/route.ts` (around line 149) with your provider's SDK. The rest of the logic stays the same.

**Q: How do I change what the bot says?**
A: Edit the `buildSystemPrompt()` function in `src/app/api/chat/route.ts`. This controls the bot's personality and instructions.

**Q: Can I reply to visitors in real-time?**
A: When you inject a reply from the admin panel or Bale, it's saved as an assistant message. The visitor will see it when they next send a message (the chat history is loaded). For true real-time, you'd need to add WebSocket support.

**Q: The Bale webhook isn't working — why?**
A: The webhook needs a public HTTPS URL. In development, use `ngrok`. In production, make sure your domain has HTTPS and the webhook URL is correctly set via `setWebhook`.

**Q: How do I see how many visitors I've had?**
A: The admin panel shows a visitor count (tracked via the `SiteSetting` table). For more detailed analytics, consider adding Google Analytics or Plausible.

---

End of API setup guide. For code-level documentation, see `CODE_EXPLANATION.md`.
