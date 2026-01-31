-- API Keys (one key can have multiple inboxes later, but 1:1 for MVP)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER,
  email_limit INTEGER DEFAULT 10,
  emails_sent_today INTEGER DEFAULT 0,
  limit_reset_at INTEGER
);

-- Inboxes
CREATE TABLE IF NOT EXISTS inboxes (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  inbox_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  text_body TEXT,
  html_body TEXT,
  headers TEXT,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  FOREIGN KEY (inbox_id) REFERENCES inboxes(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_inbox_created ON messages(inbox_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inboxes_email ON inboxes(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
