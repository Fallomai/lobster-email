import { Hono } from 'hono';
import { Env } from '../lib/types';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  // Simple auth via query param - you can change this secret
  const secret = c.req.query('secret');
  if (secret !== c.env.ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get stats
  const [inboxes, messages, emailsSentToday, activeToday] = await Promise.all([
    // Total inboxes
    c.env.DB.prepare('SELECT COUNT(*) as count FROM inboxes').first<{ count: number }>(),

    // Total messages (and breakdown)
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
        SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
      FROM messages
    `).first<{ total: number; inbound: number; outbound: number }>(),

    // Emails sent today across all users
    c.env.DB.prepare('SELECT SUM(emails_sent_today) as count FROM api_keys').first<{ count: number }>(),

    // Active inboxes today (sent at least 1 email)
    c.env.DB.prepare('SELECT COUNT(*) as count FROM api_keys WHERE emails_sent_today > 0').first<{ count: number }>(),
  ]);

  // Recent signups (last 7 days)
  const recentSignups = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM inboxes
    WHERE created_at > ?
  `).bind(Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60).first<{ count: number }>();

  // Messages last 24h
  const messagesLast24h = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
    FROM messages
    WHERE created_at > ?
  `).bind(Math.floor(Date.now() / 1000) - 24 * 60 * 60).first<{ total: number; inbound: number; outbound: number }>();

  return c.json({
    inboxes: {
      total: inboxes?.count || 0,
      created_last_7_days: recentSignups?.count || 0,
      active_today: activeToday?.count || 0,
    },
    messages: {
      total: messages?.total || 0,
      inbound: messages?.inbound || 0,
      outbound: messages?.outbound || 0,
    },
    messages_last_24h: {
      total: messagesLast24h?.total || 0,
      inbound: messagesLast24h?.inbound || 0,
      outbound: messagesLast24h?.outbound || 0,
    },
    emails_sent_today: emailsSentToday?.count || 0,
    timestamp: new Date().toISOString(),
  });
});

export default app;
