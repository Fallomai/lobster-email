import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, type Message, type InboxResponse } from '@/lib/api';
import { storage } from '@/lib/storage';
import { timeAgo, copyToClipboard } from '@/lib/utils';
import { Copy, Check, Mail, Send, Inbox as InboxIcon, X } from 'lucide-react';

export function InboxPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const apiKey = searchParams.get('key');

  const [inbox, setInbox] = useState<InboxResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!apiKey) {
      navigate('/');
      return;
    }

    api.setApiKey(apiKey);

    try {
      const [inboxData, messagesData] = await Promise.all([
        api.getInbox(),
        api.getMessages({ direction: direction === 'all' ? undefined : direction }),
      ]);

      setInbox(inboxData);
      setMessages(messagesData.messages);
      storage.setApiKey(apiKey);
      storage.setEmail(inboxData.inbox.email);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [apiKey, direction, navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCopyEmail = async () => {
    if (inbox) {
      await copyToClipboard(inbox.inbox.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenMessage = async (msg: Message) => {
    if (!apiKey) return;
    api.setApiKey(apiKey);
    const fullMessage = await api.getMessage(msg.id);
    setSelectedMessage(fullMessage);
    fetchData(); // Refresh to update read status
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Card className="bg-red-950/30 border-red-800">
          <CardContent className="p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-2xl">🦞</a>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 text-sm">{inbox?.inbox.email}</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleCopyEmail}>
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          <div className="text-sm text-zinc-400">
            <span className="text-red-400">{inbox?.limits.emails_sent_today}</span>
            /{inbox?.limits.emails_per_day} emails today
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-4">
        <Tabs value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
          <TabsList className="bg-zinc-900 mb-4">
            <TabsTrigger value="all" className="gap-2">
              <Mail className="h-4 w-4" /> All
            </TabsTrigger>
            <TabsTrigger value="inbound" className="gap-2">
              <InboxIcon className="h-4 w-4" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="outbound" className="gap-2">
              <Send className="h-4 w-4" /> Sent
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {messages.length === 0 ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500">No messages yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <Card
                key={msg.id}
                className={`bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors ${
                  !msg.read ? 'border-l-2 border-l-red-500' : ''
                }`}
                onClick={() => handleOpenMessage(msg)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {msg.direction === 'inbound' ? msg.from : msg.to}
                    </span>
                    <span className="text-xs text-zinc-500">{timeAgo(msg.created_at)}</span>
                  </div>
                  <div className="text-sm text-zinc-400 truncate">{msg.subject || '(no subject)'}</div>
                  <div className="text-xs text-zinc-600 truncate mt-1">{msg.preview}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Message modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMessage(null)}
        >
          <Card
            className="bg-zinc-900 border-zinc-800 w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="p-0">
              <div className="flex items-start justify-between p-4 border-b border-zinc-800">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">From: {selectedMessage.from}</div>
                  <div className="text-xs text-zinc-500 mb-1">To: {selectedMessage.to}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedMessage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-4 border-b border-zinc-800">
                <h2 className="text-lg font-semibold">{selectedMessage.subject || '(no subject)'}</h2>
              </div>
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300">
                  {selectedMessage.text || '(no content)'}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
