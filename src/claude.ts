import type { Env } from "./index";

export interface ParsedAssignment {
  class: string;
  title: string;
  due_date: string;
  notes?: string;
  source?: string;
}

const SYSTEM = `You extract homework/assignment info from text or screenshots (Canvas, Teams, Pearson MyLab, SharePoint, syllabi, handwritten notes, whatever).

Return ONLY a JSON array of objects with these keys:
  - class: short class name (e.g. "AP Chem", "English", "Calc BC"). Guess from context if not explicit.
  - title: assignment title
  - due_date: YYYY-MM-DD. If only a weekday is given, resolve to the next occurrence. If year is missing, pick the nearest upcoming date.
  - notes: optional extra detail
  - source: optional ("canvas", "teams", "pearson", "sharepoint", "manual", etc.)

If no clear due date exists for an item, omit that item. If nothing parseable, return [].
No prose, no code fences — output must be valid JSON parseable by JSON.parse.`;

function todayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export async function parseAssignmentFromText(env: Env, text: string): Promise<ParsedAssignment[]> {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Today is ${todayInTz(env.TIMEZONE)}. Extract assignments from this message:\n\n${text}`,
      },
    ],
  };
  return callClaude(env, body);
}

export async function parseAssignmentFromImage(
  env: Env,
  imageUrl: string,
  caption: string,
): Promise<ParsedAssignment[]> {
  const buf = await fetch(imageUrl).then((r) => r.arrayBuffer());
  const b64 = arrayBufferToBase64(buf);
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: b64 },
          },
          {
            type: "text",
            text: `Today is ${todayInTz(env.TIMEZONE)}. Caption from user: ${caption || "(none)"}. Extract assignments from this screenshot.`,
          },
        ],
      },
    ],
  };
  return callClaude(env, body);
}

async function callClaude(env: Env, body: unknown): Promise<ParsedAssignment[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("claude error", res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const textBlock = data.content.find((c) => c.type === "text");
  if (!textBlock?.text) return [];
  const raw = textBlock.text.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error("json parse failed", raw);
    return [];
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
