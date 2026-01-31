import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './lib/types';
import { handleInboundEmail } from './email/inbound';

// API routes
import signupApi from './api/signup';
import inboxApi from './api/inbox';
import messagesApi from './api/messages';
import sendApi from './api/send';

// Signup instructions (still served from API for agents)
import { signupMd } from './ui/signup-md';

const app = new Hono<{ Bindings: Env }>();

// CORS for all routes - allow frontend to call API
app.use('*', cors({
  origin: ['https://lobster.email', 'http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// API Routes
app.route('/api/signup', signupApi);
app.route('/api/inbox', inboxApi);
app.route('/api/messages', messagesApi);
app.route('/api/send', sendApi);

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Signup instructions for agents (keep this on API so agents can fetch it)
app.get('/signup.md', (c) => {
  return c.text(signupMd, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
  });
});

// Root redirect to frontend
app.get('/', (c) => {
  return c.redirect('https://lobster.email');
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
