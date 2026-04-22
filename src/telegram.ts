import type { Env } from "./index";
import { parseAssignmentFromImage, parseAssignmentFromText, type ParsedAssignment } from "./claude";
import {
  deleteAssignment,
  insertAssignments,
  listUpcoming,
  markCompleted,
} from "./db";

export async function handleTelegramUpdate(update: any, env: Env): Promise<Response> {
  const msg = update.message ?? update.edited_message;
  if (!msg) return new Response("ok");

  const chatId = String(msg.chat.id);
  if (chatId !== env.TELEGRAM_CHAT_ID) {
    await sendMessage(env, chatId, "this bot is not configured for this chat.");
    return new Response("ok");
  }

  const text = (msg.text ?? msg.caption ?? "").trim();

  if (text === "/start" || text === "/help") {
    await sendMessage(
      env,
      chatId,
      [
        "forward screenshots or text me assignments — i'll parse due dates and save them.",
        "",
        "/list — upcoming assignments",
        "/done <id> — mark complete",
        "/delete <id> — remove",
      ].join("\n"),
    );
    return new Response("ok");
  }

  if (text.startsWith("/list")) {
    const items = await listUpcoming(env.DB);
    const reply = items.length
      ? items.map((a) => `#${a.id} · ${a.due_date} · ${a.class}: ${a.title}`).join("\n")
      : "nothing upcoming.";
    await sendMessage(env, chatId, reply);
    return new Response("ok");
  }

  if (text.startsWith("/done")) {
    const id = Number(text.split(/\s+/)[1]);
    if (!id) {
      await sendMessage(env, chatId, "usage: /done <id>");
    } else {
      await markCompleted(env.DB, id);
      await sendMessage(env, chatId, `marked #${id} done.`);
    }
    return new Response("ok");
  }

  if (text.startsWith("/delete")) {
    const id = Number(text.split(/\s+/)[1]);
    if (!id) {
      await sendMessage(env, chatId, "usage: /delete <id>");
    } else {
      await deleteAssignment(env.DB, id);
      await sendMessage(env, chatId, `deleted #${id}.`);
    }
    return new Response("ok");
  }

  let parsed: ParsedAssignment[] = [];
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo[msg.photo.length - 1];
    const fileUrl = await getFileUrl(env, largest.file_id);
    parsed = await parseAssignmentFromImage(env, fileUrl, text);
  } else if (text) {
    parsed = await parseAssignmentFromText(env, text);
  } else {
    return new Response("ok");
  }

  const ids = await insertAssignments(env.DB, parsed);
  if (ids.length === 0) {
    await sendMessage(env, chatId, "couldn't find any assignments with due dates in that.");
  } else {
    const lines = parsed
      .filter((a) => a.class && a.title && a.due_date)
      .map((a, i) => `added #${ids[i]} · ${a.due_date} · ${a.class}: ${a.title}`);
    await sendMessage(env, chatId, lines.join("\n"));
  }
  return new Response("ok");
}

export async function sendMessage(env: Env, chatId: string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function getFileUrl(env: Env, fileId: string): Promise<string> {
  const r = (await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
  ).then((r) => r.json())) as { result: { file_path: string } };
  return `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${r.result.file_path}`;
}
