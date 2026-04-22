import { handleTelegramUpdate } from "./telegram";
import { sendDailyAlerts } from "./alerts";

export interface Env {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ANTHROPIC_API_KEY: string;
  NTFY_TOPIC: string;
  TIMEZONE: string;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/telegram") {
      const secret = req.headers.get("x-telegram-bot-api-secret-token");
      if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response("unauthorized", { status: 401 });
      }
      const update = await req.json();
      return handleTelegramUpdate(update, env);
    }

    if (url.pathname === "/health") return new Response("ok");

    return new Response("assignments-tracker", { status: 200 });
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(sendDailyAlerts(env));
  },
} satisfies ExportedHandler<Env>;
