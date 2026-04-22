# assignments-tracker

24/7 homework tracker on Cloudflare Workers. Text/forward screenshots to a Telegram bot → Claude parses into structured assignments → daily cron pushes "due tomorrow" alerts to ntfy + Telegram.

## Stack

- **Cloudflare Workers** — webhook + cron, always on, free
- **D1** — SQLite for assignments
- **Telegram Bot** — the ingestion UX (text or forward screenshots)
- **Claude API (Sonnet 4.6)** — parses text + vision on screenshots
- **ntfy.sh** — free push notifications to iPhone

## Setup

```bash
npm install

# 1. create Telegram bot via @BotFather, get token
# 2. get your chat id (message the bot, then visit https://api.telegram.org/bot<TOKEN>/getUpdates)
# 3. pick a random ntfy topic and subscribe to it in the ntfy iOS app
# 4. grab an Anthropic API key
# 5. pick a long random webhook secret (any string)

# create D1 and paste database_id into wrangler.toml
npm run db:create
npm run db:init

# set secrets
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put NTFY_TOPIC

# deploy
npm run deploy

# point Telegram at the deployed worker
TELEGRAM_BOT_TOKEN=... WORKER_URL=https://assignments-tracker.<you>.workers.dev \
  WEBHOOK_SECRET=... npm run webhook:set
```

## Usage

Text or forward to the bot:

- `math hw chapter 7 due friday` → parsed + saved
- forward a Canvas/Teams/Pearson screenshot → vision extracts every dated item
- `/list` — upcoming
- `/done 4` — mark #4 complete
- `/delete 4` — remove #4

## Schedule

Cron runs daily at 15:00 UTC (8am PDT / 7am PST). Change in `wrangler.toml` under `[triggers]`.
