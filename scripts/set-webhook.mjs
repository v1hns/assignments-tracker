// Usage:
//   TELEGRAM_BOT_TOKEN=xxx WORKER_URL=https://assignments-tracker.you.workers.dev \
//   WEBHOOK_SECRET=xxx node scripts/set-webhook.mjs

const token = process.env.TELEGRAM_BOT_TOKEN;
const workerUrl = process.env.WORKER_URL;
const secret = process.env.WEBHOOK_SECRET;

if (!token || !workerUrl || !secret) {
  console.error("missing env: TELEGRAM_BOT_TOKEN, WORKER_URL, WEBHOOK_SECRET");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: `${workerUrl.replace(/\/$/, "")}/telegram`,
    secret_token: secret,
    allowed_updates: ["message", "edited_message"],
  }),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
