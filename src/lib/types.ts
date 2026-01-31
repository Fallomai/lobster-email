export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  DOMAIN: string;
  ADMIN_SECRET: string;
}

export interface ApiKey {
  id: string;
  key_hash: string;
  created_at: number;
  last_used_at: number | null;
  email_limit: number;
  emails_sent_today: number;
  limit_reset_at: number | null;
}

export interface Inbox {
  id: string;
  api_key_id: string;
  email: string;
  display_name: string | null;
  created_at: number;
}

export interface Message {
  id: string;
  inbox_id: string;
  thread_id: string | null;
  direction: 'inbound' | 'outbound';
  from_address: string;
  to_address: string;
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  headers: string | null;
  created_at: number;
  read_at: number | null;
}

export interface AuthContext {
  apiKey: ApiKey;
  inbox: Inbox;
}
