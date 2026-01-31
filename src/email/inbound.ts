import PostalMime from 'postal-mime';
import { Env, Inbox } from '../lib/types';
import { generateMessageId } from '../lib/id';

export async function handleInboundEmail(
  message: ForwardableEmailMessage,
  env: Env
): Promise<void> {
  const rawEmail = await streamToArrayBuffer(message.raw);
  const parser = new PostalMime();
  const parsed = await parser.parse(rawEmail);

  // Extract recipient - the to address should be our @lobster.email address
  const toAddress = message.to.toLowerCase();

  // Look up the inbox
  const inbox = await env.DB.prepare(`
    SELECT * FROM inboxes WHERE email = ?
  `).bind(toAddress).first<Inbox>();

  if (!inbox) {
    // Inbox doesn't exist - reject the email
    message.setReject('Mailbox does not exist');
    return;
  }

  // Store the message
  const messageId = generateMessageId();
  const now = Math.floor(Date.now() / 1000);

  // Extract relevant headers
  const headers: Record<string, string> = {};
  if (parsed.messageId) headers['Message-ID'] = parsed.messageId;
  if (parsed.date) headers['Date'] = parsed.date;
  if (parsed.replyTo) headers['Reply-To'] = parsed.replyTo.map(r => r.address).join(', ');

  // Use the From header address (not envelope sender) for proper reply functionality
  // The envelope sender (message.from) may be a bounce address or UUID from email providers
  const fromAddress = parsed.from?.address || message.from;

  await env.DB.prepare(`
    INSERT INTO messages (id, inbox_id, direction, from_address, to_address, subject, text_body, html_body, headers, created_at)
    VALUES (?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    messageId,
    inbox.id,
    fromAddress,
    toAddress,
    parsed.subject || '(no subject)',
    parsed.text || null,
    parsed.html || null,
    JSON.stringify(headers),
    now
  ).run();
}

async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result.buffer;
}
