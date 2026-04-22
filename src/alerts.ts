import type { Env } from "./index";
import { dueOn, markNotified } from "./db";
import { sendMessage } from "./telegram";

function tomorrowInTz(tz: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  const d = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function sendDailyAlerts(env: Env): Promise<void> {
  const tomorrow = tomorrowInTz(env.TIMEZONE);
  const items = await dueOn(env.DB, tomorrow);

  if (items.length === 0) return;

  const body = items.map((a) => `• ${a.class}: ${a.title} (#${a.id})`).join("\n");
  const title = `due tomorrow (${tomorrow}) · ${items.length}`;

  await fetch(`https://ntfy.sh/${env.NTFY_TOPIC}`, {
    method: "POST",
    headers: {
      Title: title,
      Priority: "high",
      Tags: "memo,school",
    },
    body,
  });

  await sendMessage(env, env.TELEGRAM_CHAT_ID, `${title}\n${body}`);

  await markNotified(
    env.DB,
    items.map((a) => a.id),
  );
}
