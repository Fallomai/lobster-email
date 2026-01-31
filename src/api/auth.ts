import { Context, Next } from 'hono';
import { Env, ApiKey, Inbox, AuthContext } from '../lib/types';
import { hashApiKey } from '../lib/crypto';

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const apiKey = authHeader.slice(7); // Remove 'Bearer '

  if (!apiKey.startsWith('lob_')) {
    return c.json({ error: 'Invalid API key format' }, 401);
  }

  const keyHash = await hashApiKey(apiKey);

  // Look up API key and inbox
  const result = await c.env.DB.prepare(`
    SELECT
      ak.id as key_id,
      ak.key_hash,
      ak.created_at as key_created_at,
      ak.last_used_at,
      ak.email_limit,
      ak.emails_sent_today,
      ak.limit_reset_at,
      i.id as inbox_id,
      i.email,
      i.display_name,
      i.created_at as inbox_created_at
    FROM api_keys ak
    JOIN inboxes i ON i.api_key_id = ak.id
    WHERE ak.key_hash = ?
  `).bind(keyHash).first<{
    key_id: string;
    key_hash: string;
    key_created_at: number;
    last_used_at: number | null;
    email_limit: number;
    emails_sent_today: number;
    limit_reset_at: number | null;
    inbox_id: string;
    email: string;
    display_name: string | null;
    inbox_created_at: number;
  }>();

  if (!result) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Check if we need to reset daily limit
  const now = Math.floor(Date.now() / 1000);
  let emailsSentToday = result.emails_sent_today;
  let limitResetAt = result.limit_reset_at;

  if (limitResetAt && now >= limitResetAt) {
    // Reset the counter
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    limitResetAt = Math.floor(tomorrow.getTime() / 1000);
    emailsSentToday = 0;

    await c.env.DB.prepare(`
      UPDATE api_keys SET emails_sent_today = 0, limit_reset_at = ? WHERE id = ?
    `).bind(limitResetAt, result.key_id).run();
  }

  // Update last_used_at
  await c.env.DB.prepare(`
    UPDATE api_keys SET last_used_at = ? WHERE id = ?
  `).bind(now, result.key_id).run();

  const auth: AuthContext = {
    apiKey: {
      id: result.key_id,
      key_hash: result.key_hash,
      created_at: result.key_created_at,
      last_used_at: now,
      email_limit: result.email_limit,
      emails_sent_today: emailsSentToday,
      limit_reset_at: limitResetAt,
    },
    inbox: {
      id: result.inbox_id,
      api_key_id: result.key_id,
      email: result.email,
      display_name: result.display_name,
      created_at: result.inbox_created_at,
    },
  };

  c.set('auth', auth);
  await next();
}
