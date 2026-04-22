import type { ParsedAssignment } from "./claude";

export interface Assignment {
  id: number;
  class: string;
  title: string;
  due_date: string;
  source: string | null;
  notes: string | null;
  completed: number;
  notified: number;
  created_at: string;
}

export async function insertAssignments(
  db: D1Database,
  items: ParsedAssignment[],
): Promise<number[]> {
  const ids: number[] = [];
  for (const a of items) {
    if (!a.class || !a.title || !a.due_date) continue;
    const r = await db
      .prepare(
        "INSERT INTO assignments (class, title, due_date, source, notes) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(a.class, a.title, a.due_date, a.source ?? null, a.notes ?? null)
      .run();
    ids.push(r.meta.last_row_id as number);
  }
  return ids;
}

export async function listUpcoming(db: D1Database): Promise<Assignment[]> {
  const r = await db
    .prepare(
      "SELECT * FROM assignments WHERE completed = 0 AND due_date >= date('now') ORDER BY due_date ASC LIMIT 50",
    )
    .all<Assignment>();
  return r.results;
}

export async function dueOn(db: D1Database, date: string): Promise<Assignment[]> {
  const r = await db
    .prepare(
      "SELECT * FROM assignments WHERE completed = 0 AND due_date = ? AND notified = 0",
    )
    .bind(date)
    .all<Assignment>();
  return r.results;
}

export async function markNotified(db: D1Database, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  await db
    .prepare(`UPDATE assignments SET notified = 1 WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run();
}

export async function markCompleted(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE assignments SET completed = 1 WHERE id = ?").bind(id).run();
}

export async function deleteAssignment(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM assignments WHERE id = ?").bind(id).run();
}
