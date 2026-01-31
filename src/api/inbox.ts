import { Hono } from 'hono';
import { Env } from '../lib/types';
import { authMiddleware } from './auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', authMiddleware);

app.get('/', async (c) => {
  const { apiKey, inbox } = c.get('auth');

  return c.json({
    inbox: {
      id: inbox.id,
      email: inbox.email,
      display_name: inbox.display_name,
      created_at: new Date(inbox.created_at * 1000).toISOString(),
    },
    limits: {
      emails_per_day: apiKey.email_limit,
      emails_sent_today: apiKey.emails_sent_today,
      resets_at: apiKey.limit_reset_at
        ? new Date(apiKey.limit_reset_at * 1000).toISOString()
        : null,
    },
  });
});

export default app;
