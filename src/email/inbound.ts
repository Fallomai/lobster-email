import PostalMime from 'postal-mime';
import { Env, Inbox } from '../lib/types';
import { generateMessageId, generateThreadId } from '../lib/id';

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

  // Check for In-Reply-To or References headers to find existing thread
  const inReplyTo = parsed.headers?.find(h => h.key.toLowerCase() === 'in-reply-to')?.value;
  const references = parsed.headers?.find(h => h.key.toLowerCase() === 'references')?.value;

  if (inReplyTo) headers['In-Reply-To'] = inReplyTo;
  if (references) headers['References'] = references;

  // Use the From header address (not envelope sender) for proper reply functionality
  // The envelope sender (message.from) may be a bounce address or UUID from email providers
  const fromAddress = parsed.from?.address || message.from;

  // Try to find existing thread by looking up messages with matching Message-ID in their headers
  let threadId: string | null = null;

  if (inReplyTo || references) {
    // Look for a message whose Message-ID matches the In-Reply-To or is in References
    const refMessageIds = [inReplyTo, ...(references?.split(/\s+/) || [])].filter(Boolean);

    for (const refId of refMessageIds) {
      const existingMessage = await env.DB.prepare(`
        SELECT thread_id FROM messages
        WHERE inbox_id = ? AND headers LIKE ?
        LIMIT 1
      `).bind(inbox.id, `%"Message-ID":"${refId}"%`).first<{ thread_id: string | null }>();

      if (existingMessage?.thread_id) {
        threadId = existingMessage.thread_id;
        break;
      }
    }
  }

  // If no existing thread found, create a new one
  if (!threadId) {
    threadId = generateThreadId();
  }

  await env.DB.prepare(`
    INSERT INTO messages (id, inbox_id, thread_id, direction, from_address, to_address, subject, text_body, html_body, headers, created_at)
    VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    messageId,
    inbox.id,
    threadId,
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
