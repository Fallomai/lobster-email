import { nanoid } from 'nanoid';

export function generateApiKey(): string {
  return `lob_${nanoid(24)}`;
}

export function generateInboxId(name?: string): string {
  const suffix = nanoid(8).toLowerCase();
  if (name) {
    // Sanitize name: lowercase, alphanumeric and hyphens only
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    return `${sanitized}-${suffix}`;
  }
  return `inbox-${nanoid(10).toLowerCase()}`;
}

export function generateMessageId(): string {
  return `msg_${nanoid(16)}`;
}

export function generateKeyId(): string {
  return `key_${nanoid(16)}`;
}

export function generateThreadId(): string {
  return `thd_${nanoid(16)}`;
}
