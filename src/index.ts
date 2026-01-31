import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './lib/types';
import { handleInboundEmail } from './email/inbound';

// API routes
import signupApi from './api/signup';
import inboxApi from './api/inbox';
import messagesApi from './api/messages';
import sendApi from './api/send';

// UI pages
import { landingPage } from './ui/landing';
import { inboxPage } from './ui/inbox';
import { signupMd } from './ui/signup-md';

const app = new Hono<{ Bindings: Env }>();

// CORS for API routes
app.use('/api/*', cors());

// UI Routes
app.get('/', (c) => {
  return c.html(landingPage);
});

app.get('/inbox', (c) => {
  return c.html(inboxPage);
});

app.get('/signup.md', (c) => {
  return c.text(signupMd, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
  });
});

// API Routes
app.route('/api/signup', signupApi);
app.route('/api/inbox', inboxApi);
app.route('/api/messages', messagesApi);
app.route('/api/send', sendApi);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Email handler for Cloudflare Email Routing
  async email(message: ForwardableEmailMessage, env: Env) {
    try {
      await handleInboundEmail(message, env);
    } catch (error) {
      console.error('Email handling error:', error);
      message.setReject('Internal error processing email');
    }
  },
};
