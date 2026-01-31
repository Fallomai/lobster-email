import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Users, Mail, Send, Inbox, TrendingUp, Clock } from 'lucide-react';

interface Stats {
  inboxes: {
    total: number;
    created_last_7_days: number;
    active_today: number;
  };
  messages: {
    total: number;
    inbound: number;
    outbound: number;
  };
  messages_last_24h: {
    total: number;
    inbound: number;
    outbound: number;
  };
  emails_sent_today: number;
  timestamp: string;
}

export function AdminPage() {
  const [searchParams] = useSearchParams();
  const secret = searchParams.get('secret');

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!secret) {
      setError('Missing secret');
      setLoading(false);
      return;
    }

    fetch(`https://api.lobster.email/api/stats?secret=${encodeURIComponent(secret)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [secret]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🦞</div>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-4xl">🦞</span>
          <div>
            <h1 className="text-2xl font-bold">Lobster Admin</h1>
            <p className="text-zinc-500 text-sm">
              Last updated: {new Date(stats.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Main stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Total Inboxes"
            value={stats.inboxes.total}
            color="text-emerald-400"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="New (7 days)"
            value={stats.inboxes.created_last_7_days}
            color="text-blue-400"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Active Today"
            value={stats.inboxes.active_today}
            color="text-yellow-400"
          />
          <StatCard
            icon={<Send className="w-5 h-5" />}
            label="Sent Today"
            value={stats.emails_sent_today}
            color="text-red-400"
          />
        </div>

        {/* Messages section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* All time */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-zinc-500" />
              All Time Messages
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total</span>
                <span className="text-2xl font-bold">{stats.messages.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-emerald-500" /> Inbound
                </span>
                <span className="text-xl font-medium text-emerald-400">
                  {stats.messages.inbound.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" /> Outbound
                </span>
                <span className="text-xl font-medium text-blue-400">
                  {stats.messages.outbound.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Last 24h */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-500" />
              Last 24 Hours
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total</span>
                <span className="text-2xl font-bold">{stats.messages_last_24h.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-emerald-500" /> Inbound
                </span>
                <span className="text-xl font-medium text-emerald-400">
                  {stats.messages_last_24h.inbound.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" /> Outbound
                </span>
                <span className="text-xl font-medium text-blue-400">
                  {stats.messages_last_24h.outbound.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-zinc-500 text-sm">{label}</div>
    </div>
  );
}
