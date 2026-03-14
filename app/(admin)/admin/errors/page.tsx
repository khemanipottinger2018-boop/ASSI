'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  RefreshCw,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/* Backend returns these exact field names from dbo.error_logs */
type RawErrorLog = {
  id: string;
  severity: string;
  error_message: string;
  stack_trace: string | null;
  endpoint: string | null;
  created_at: string;
  user_id?: string | null;
  error_type?: string | null;
  http_method?: string | null;
  resolved?: boolean;
};

/* Normalised shape used by the UI */
type ErrorLog = {
  id: string;
  level: string;
  message: string;
  stack: string | null;
  route: string | null;
  createdAt: string;
};

function normalise(raw: RawErrorLog): ErrorLog {
  return {
    id: raw.id,
    level: raw.severity ?? 'error',
    message: raw.error_message,
    stack: raw.stack_trace ?? null,
    route: raw.endpoint ?? null,
    createdAt: raw.created_at,
  };
}

const levelStyle: Record<string, string> = {
  error: 'text-red-400 bg-red-500/15 border-red-500/20',
  warn: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  warning: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  info: 'text-blue-400 bg-blue-500/15 border-blue-500/20',
};

export default function ErrorsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');

  async function load(r = range) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/errors?range=${r}`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success) {
        setLogs((data.errors ?? []).map(normalise));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [range]);

  async function copyStack(log: ErrorLog) {
    const text = [log.message, log.stack].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(log.id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <AlertTriangle size={16} className="text-white/60" />
          </div>

          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">
              Error Logs
            </h1>
            <p className="text-white/30 text-xs">
              {loading ? 'Loading…' : `${logs.length} entries`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 glass-soft rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                  range === r
                    ? 'bg-white/15 text-white'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={() => load()}
            disabled={loading}
            className="glass-soft p-2 rounded-lg text-white/30 hover:text-white/60 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-12 text-center">
          <p className="text-white/25 text-sm">No errors logged 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === log.id ? null : log.id)
                }
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition"
              >
                <span
                  className={`mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border flex-shrink-0 ${
                    levelStyle[log.level] ?? levelStyle.error
                  }`}
                >
                  {log.level}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-white/75 text-sm font-mono truncate">
                    {log.message}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-white/25 text-[10px]">
                    {log.route && <span>{log.route}</span>}
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <span className="text-white/20 text-xs flex-shrink-0">
                  {expanded === log.id ? '▲' : '▼'}
                </span>
              </button>

              {expanded === log.id && log.stack && (
                <div className="border-t border-white/8 px-4 pb-4">
                  <div className="flex items-center justify-between mb-2 pt-3">
                    <span className="text-white/25 text-[10px] uppercase tracking-widest">
                      Stack trace
                    </span>

                    <button
                      onClick={() => copyStack(log)}
                      className="flex items-center gap-1 text-white/25 hover:text-white/60 text-[10px] transition"
                    >
                      {copied === log.id ? (
                        <Check size={11} />
                      ) : (
                        <Copy size={11} />
                      )}
                      {copied === log.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  <pre className="text-white/40 text-[10px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                    {log.stack}
                  </pre>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}