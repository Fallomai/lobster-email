const API_URL = import.meta.env.VITE_API_URL || 'https://api.lobster.email';

export interface Inbox {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id?: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  preview: string;
  text?: string;
  html?: string;
  created_at: string;
  read: boolean;
}

export interface Thread {
  thread_id: string;
  message_count: number;
  unread_count: number;
  last_message_at: string;
  latest_message: {
    id: string;
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    subject: string;
    preview: string;
  } | null;
}

export interface ThreadsResponse {
  threads: Thread[];
  limit: number;
  offset: number;
}

export interface SignupResponse {
  api_key: string;
  inbox: {
    id: string;
    email: string;
  };
  inbox_url: string;
}

export interface InboxResponse {
  inbox: Inbox;
  limits: {
    emails_per_day: number;
    emails_sent_today: number;
    resets_at: string | null;
  };
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}

class ApiClient {
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return res.json();
  }

  async signup(name?: string): Promise<SignupResponse> {
    return this.fetch('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getInbox(): Promise<InboxResponse> {
    return this.fetch('/api/inbox');
  }

  async getMessages(options?: {
    limit?: number;
    offset?: number;
    direction?: 'inbound' | 'outbound' | 'all';
    thread_id?: string;
  }): Promise<MessagesResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.direction) params.set('direction', options.direction);
    if (options?.thread_id) params.set('thread_id', options.thread_id);

    const query = params.toString();
    return this.fetch(`/api/messages${query ? `?${query}` : ''}`);
  }

  async getThreads(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ThreadsResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const query = params.toString();
    return this.fetch(`/api/messages/threads${query ? `?${query}` : ''}`);
  }

  async getMessage(id: string): Promise<Message> {
    return this.fetch(`/api/messages/${id}`);
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    return this.fetch('/api/send', {
      method: 'POST',
      body: JSON.stringify({ to, subject, text, html }),
    });
  }
}

export const api = new ApiClient();
