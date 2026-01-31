import { Hono } from 'hono';
import { Resend } from 'resend';
import { Env } from '../lib/types';
import { authMiddleware } from './auth';
import { generateMessageId } from '../lib/id';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

interface SendBody {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

app.post('/', async (c) => {
  const { apiKey, inbox } = c.get('auth');

  const body = await c.req.json<SendBody>().catch(() => null);

  if (!body || !body.to || !body.subject || !body.text) {
    return c.json({ error: 'Missing required fields: to, subject, text' }, 400);
  }

  // MVP: Only allow sending to @lobster.email addresses
  if (!body.to.toLowerCase().endsWith(`@${c.env.DOMAIN}`)) {
    return c.json({
      error: `MVP restriction: Can only send to @${c.env.DOMAIN} addresses`,
    }, 400);
  }

  // Check daily limit
  if (apiKey.emails_sent_today >= apiKey.email_limit) {
    return c.json({
      error: 'Daily email limit reached',
      limit: apiKey.email_limit,
      resets_at: apiKey.limit_reset_at
        ? new Date(apiKey.limit_reset_at * 1000).toISOString()
        : null,
    }, 429);
  }

  // Send via Resend
  const resend = new Resend(c.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: `${inbox.display_name || inbox.id} <${inbox.email}>`,
      to: body.to,
      subject: body.subject,
      text: body.text,
      html: body.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return c.json({ error: 'Failed to send email' }, 500);
    }

    // Store outbound message
    const messageId = generateMessageId();
    const now = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(`
      INSERT INTO messages (id, inbox_id, direction, from_address, to_address, subject, text_body, html_body, created_at)
      VALUES (?, ?, 'outbound', ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      inbox.id,
      inbox.email,
      body.to,
      body.subject,
      body.text,
      body.html || null,
      now
    ).run();

    // Increment daily counter
    await c.env.DB.prepare(`
      UPDATE api_keys SET emails_sent_today = emails_sent_today + 1 WHERE id = ?
    `).bind(apiKey.id).run();

    return c.json({
      id: messageId,
      status: 'sent',
      to: body.to,
      created_at: new Date(now * 1000).toISOString(),
    });

  } catch (error) {
    console.error('Send error:', error);
    return c.json({ error: 'Failed to send email' }, 500);
  }
});

export default app;
