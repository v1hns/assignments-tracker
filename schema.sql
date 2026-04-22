CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT NOT NULL,
  source TEXT,
  notes TEXT,
  notified INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_completed ON assignments(completed);
CREATE INDEX IF NOT EXISTS idx_notified ON assignments(notified);
