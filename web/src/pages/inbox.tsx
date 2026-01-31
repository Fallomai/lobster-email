import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, type Message, type InboxResponse } from '@/lib/api';
import { storage } from '@/lib/storage';
import { timeAgo, copyToClipboard } from '@/lib/utils';
import {
  Copy,
  Check,
  Mail,
  Send,
  Inbox as InboxIcon,
  X,
  LogOut,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export function InboxPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const apiKey = searchParams.get('key');

  const [inbox, setInbox] = useState<InboxResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (!apiKey) {
      navigate('/');
      return;
    }

    if (showRefresh) setRefreshing(true);
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
      setRefreshing(false);
    }
  }, [apiKey, direction, navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
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
    fetchData();
  };

  const handleLogout = () => {
    storage.clear();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🦞</div>
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading inbox...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🦞</div>
          <p className="text-red-400 mb-6">{error}</p>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-zinc-800 hover:bg-zinc-900"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900/80 border-b border-zinc-800/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-2xl hover:scale-110 transition-transform">
              🦞
            </a>
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 text-sm">{inbox?.inbox.email}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-zinc-800"
                onClick={handleCopyEmail}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-500">
              <span className="text-red-400 font-medium">{inbox?.limits.emails_sent_today}</span>
              <span className="text-zinc-600">/</span>
              <span>{inbox?.limits.emails_per_day}</span>
              <span className="text-zinc-600 ml-1">today</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-4">
        {/* Tabs and refresh */}
        <div className="flex items-center justify-between mb-4">
          <Tabs value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
            <TabsList className="bg-zinc-900/80">
              <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-zinc-800">
                <Mail className="h-4 w-4" /> All
              </TabsTrigger>
              <TabsTrigger value="inbound" className="gap-2 data-[state=active]:bg-zinc-800">
                <InboxIcon className="h-4 w-4" /> Inbox
              </TabsTrigger>
              <TabsTrigger value="outbound" className="gap-2 data-[state=active]:bg-zinc-800">
                <Send className="h-4 w-4" /> Sent
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-16 text-center">
            <Mail className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500">No messages yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Messages will appear here when you receive them
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`
                  bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 cursor-pointer
                  hover:bg-zinc-900/80 hover:border-zinc-700/80 transition-all duration-200
                  ${!msg.read ? 'border-l-[3px] border-l-red-500' : ''}
                `}
                onClick={() => handleOpenMessage(msg)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm ${!msg.read ? 'font-semibold text-zinc-100' : 'font-medium text-zinc-300'}`}>
                    {msg.direction === 'inbound' ? msg.from : msg.to}
                  </span>
                  <span className="text-xs text-zinc-600">{timeAgo(msg.created_at)}</span>
                </div>
                <div className={`text-sm truncate ${!msg.read ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  {msg.subject || '(no subject)'}
                </div>
                <div className="text-xs text-zinc-600 truncate mt-1">{msg.preview}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Message modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b border-zinc-800">
              <div className="space-y-1 min-w-0 flex-1 mr-4">
                <div className="text-xs text-zinc-500">
                  <span className="text-zinc-600">From:</span> {selectedMessage.from}
                </div>
                <div className="text-xs text-zinc-500">
                  <span className="text-zinc-600">To:</span> {selectedMessage.to}
                </div>
                <div className="text-xs text-zinc-600">
                  {new Date(selectedMessage.created_at).toLocaleString()}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-zinc-800 text-zinc-500 shrink-0"
                onClick={() => setSelectedMessage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Subject */}
            <div className="px-5 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold">
                {selectedMessage.subject || '(no subject)'}
              </h2>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[55vh]">
              <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                {selectedMessage.text || '(no content)'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
