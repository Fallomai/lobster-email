import { Hono } from 'hono';
import { Resend } from 'resend';
import { Env, Message } from '../lib/types';
import { authMiddleware } from './auth';
import { generateMessageId, generateThreadId } from '../lib/id';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

interface SendBody {
  to: string;
  subject: string;
  text: string;
  html?: string;
  reply_to_message_id?: string;
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

  // If replying, fetch original message to get headers and thread_id
  let replyHeaders: Record<string, string> = {};
  let threadId: string | null = null;

  if (body.reply_to_message_id) {
    const originalMessage = await c.env.DB.prepare(`
      SELECT * FROM messages WHERE id = ? AND inbox_id = ?
    `).bind(body.reply_to_message_id, inbox.id).first<Message>();

    if (originalMessage) {
      threadId = originalMessage.thread_id;

      if (originalMessage.headers) {
        const headers = JSON.parse(originalMessage.headers);
        if (headers['Message-ID']) {
          replyHeaders['In-Reply-To'] = headers['Message-ID'];
          replyHeaders['References'] = headers['Message-ID'];
        }
      }
    }
  }

  // If no thread from reply, create a new thread
  if (!threadId) {
    threadId = generateThreadId();
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
      headers: Object.keys(replyHeaders).length > 0 ? replyHeaders : undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return c.json({ error: 'Failed to send email' }, 500);
    }

    // Store outbound message
    const messageId = generateMessageId();
    const now = Math.floor(Date.now() / 1000);

    await c.env.DB.prepare(`
      INSERT INTO messages (id, inbox_id, thread_id, direction, from_address, to_address, subject, text_body, html_body, created_at)
      VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?)
    `).bind(
      messageId,
      inbox.id,
      threadId,
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
