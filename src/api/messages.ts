import { Hono } from 'hono';
import { Env, Message } from '../lib/types';
import { authMiddleware } from './auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

// List messages
app.get('/', async (c) => {
  const { inbox } = c.get('auth');

  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');
  const direction = c.req.query('direction') || 'all';

  let query = `
    SELECT id, direction, from_address, to_address, subject, text_body, created_at, read_at
    FROM messages
    WHERE inbox_id = ?
  `;
  const params: (string | number)[] = [inbox.id];

  if (direction === 'inbound' || direction === 'outbound') {
    query += ` AND direction = ?`;
    params.push(direction);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const messages = await c.env.DB.prepare(query).bind(...params).all<Message>();

  // Get total count
  let countQuery = `SELECT COUNT(*) as count FROM messages WHERE inbox_id = ?`;
  const countParams: (string | number)[] = [inbox.id];

  if (direction === 'inbound' || direction === 'outbound') {
    countQuery += ` AND direction = ?`;
    countParams.push(direction);
  }

  const countResult = await c.env.DB.prepare(countQuery)
    .bind(...countParams)
    .first<{ count: number }>();

  return c.json({
    messages: messages.results.map((m) => ({
      id: m.id,
      direction: m.direction,
      from: m.from_address,
      to: m.to_address,
      subject: m.subject,
      preview: m.text_body?.slice(0, 100) || '',
      created_at: new Date(m.created_at * 1000).toISOString(),
      read: m.read_at !== null,
    })),
    total: countResult?.count || 0,
    limit,
    offset,
  });
});

// Get single message
app.get('/:id', async (c) => {
  const { inbox } = c.get('auth');
  const messageId = c.req.param('id');

  const message = await c.env.DB.prepare(`
    SELECT * FROM messages WHERE id = ? AND inbox_id = ?
  `).bind(messageId, inbox.id).first<Message>();

  if (!message) {
    return c.json({ error: 'Message not found' }, 404);
  }

  // Mark as read if not already
  if (!message.read_at) {
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB.prepare(`
      UPDATE messages SET read_at = ? WHERE id = ?
    `).bind(now, messageId).run();
    message.read_at = now;
  }

  return c.json({
    id: message.id,
    direction: message.direction,
    from: message.from_address,
    to: message.to_address,
    subject: message.subject,
    text: message.text_body,
    html: message.html_body,
    headers: message.headers ? JSON.parse(message.headers) : null,
    created_at: new Date(message.created_at * 1000).toISOString(),
    read_at: message.read_at
      ? new Date(message.read_at * 1000).toISOString()
      : null,
  });
});

export default app;
