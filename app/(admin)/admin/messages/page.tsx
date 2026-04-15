'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, Send, Megaphone, MessageCircle,
  Search, Loader2, RefreshCw, X, Check,
  Users, User, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { adminMessagesApi } from '@/lib/api';
import type { InboxMessage } from '@/lib/api';

/* ── Helpers ── */

function formatTime(d: string | Date) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

type Recipient = { userId: string; username: string; role: string };

/* ══════════════════════════════════════════════════
   ADMIN MESSAGES PAGE
   ══════════════════════════════════════════════════ */

export default function AdminMessagesPage() {
  const [tab, setTab] = useState<'compose' | 'history'>('compose');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="flex items-center gap-3">
        <div className="bg-white/8 w-9 h-9 rounded-xl flex items-center justify-center">
          <Inbox size={16} className="text-white/60" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-lg tracking-tight">Messages</h1>
          <p className="text-white/30 text-xs">Send announcements or direct messages to users</p>
        </div>
      </motion.div>

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-white/6 border border-white/8 rounded-xl p-1">
        {(['compose', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition capitalize ${
              tab === t ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
            }`}>
            {t === 'compose' ? 'Compose' : 'Send History'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'compose' ? (
          <motion.div key="compose"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <ComposePanel />
          </motion.div>
        ) : (
          <motion.div key="history"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <HistoryPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   COMPOSE PANEL
   ══════════════════════════════════════════════════ */

function ComposePanel() {
  const [mode,      setMode]      = useState<'broadcast' | 'direct'>('broadcast');
  const [subject,   setSubject]   = useState('');
  const [content,   setContent]   = useState('');
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [search,    setSearch]    = useState('');
  const [results,   setResults]   = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── User search with debounce ── */
  useEffect(() => {
    if (mode !== 'direct' || search.length < 2) { setResults([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await adminMessagesApi.searchUsers(search);
        if (data.success) setResults(data.users ?? []);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 300);
  }, [search, mode]);

  async function handleSend() {
    if (!content.trim() || sending) return;
    if (mode === 'direct' && !recipient) return;

    setSending(true);
    setError(null);

    try {
      await adminMessagesApi.send({
        receiverId: mode === 'direct' ? recipient!.userId : undefined,
        subject:    subject.trim() || undefined,
        content:    content.trim(),
      });

      setSent(true);
      setSubject('');
      setContent('');
      setRecipient(null);
      setSearch('');
      setTimeout(() => setSent(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* Mode toggle */}
      <div className="panel rounded-2xl p-4 border border-white/10 space-y-3">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Send to</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setMode('broadcast'); setRecipient(null); setSearch(''); }}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition ${
              mode === 'broadcast'
                ? 'bg-orange-500/15 border-orange-500/30 text-white'
                : 'bg-white/6 border-white/10 text-white/50 hover:text-white/80'
            }`}>
            <Megaphone size={14} className={mode === 'broadcast' ? 'text-orange-400' : 'text-white/30'} />
            <div className="text-left">
              <p className="text-sm font-medium">Everyone</p>
              <p className="text-[10px] text-white/35">Broadcast to all users</p>
            </div>
            {mode === 'broadcast' && <Check size={12} className="ml-auto text-orange-400 flex-shrink-0" />}
          </button>

          <button onClick={() => setMode('direct')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition ${
              mode === 'direct'
                ? 'bg-blue-500/15 border-blue-500/30 text-white'
                : 'bg-white/6 border-white/10 text-white/50 hover:text-white/80'
            }`}>
            <User size={14} className={mode === 'direct' ? 'text-blue-400' : 'text-white/30'} />
            <div className="text-left">
              <p className="text-sm font-medium">Specific User</p>
              <p className="text-[10px] text-white/35">Direct message</p>
            </div>
            {mode === 'direct' && <Check size={12} className="ml-auto text-blue-400 flex-shrink-0" />}
          </button>
        </div>
      </div>

      {/* Recipient picker — direct only */}
      <AnimatePresence>
        {mode === 'direct' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="panel rounded-2xl p-4 border border-white/10 space-y-3">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Recipient</p>

              {recipient ? (
                <div className="flex items-center gap-3 bg-white/6 border border-white/8 rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                    <span className="text-white/60 text-xs font-semibold">
                      {recipient.username[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium">{recipient.username}</p>
                    <p className="text-white/30 text-xs capitalize">{recipient.role.replace('_', ' ')}</p>
                  </div>
                  <button onClick={() => { setRecipient(null); setSearch(''); }}
                    className="text-white/30 hover:text-white/70 transition p-1">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by username…"
                    className="w-full bg-white/6 border border-white/8 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none border border-white/8 focus:border-white/20 transition" />
                  {searching && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 animate-spin" />}
                </div>
              )}

              {/* Search results */}
              <AnimatePresence>
                {results.length > 0 && !recipient && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} className="space-y-1">
                    {results.map((u) => (
                      <button key={u.userId} onClick={() => { setRecipient(u); setResults([]); setSearch(''); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/8 transition text-left">
                        <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0">
                          <span className="text-white/50 text-xs font-semibold">{u.username[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-white/80 text-sm">{u.username}</p>
                          <p className="text-white/30 text-xs capitalize">{u.role.replace('_', ' ')}</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose */}
      <div className="panel rounded-2xl p-4 border border-white/10 space-y-3">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Message</p>

        <input value={subject} onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="w-full bg-white/6 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none border border-white/8 focus:border-white/20 transition" />

        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={mode === 'broadcast'
            ? 'Write your announcement… All users will see this.'
            : 'Write your message…'}
          rows={5}
          className="w-full bg-white/6 border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none border border-white/8 focus:border-white/20 transition resize-none leading-relaxed" />

        <div className="flex items-center justify-between pt-1">
          <p className="text-white/20 text-xs">
            {content.length}/10,000
          </p>
          <div className="flex items-center gap-2">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <AnimatePresence>
              {sent && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-emerald-400 text-xs flex items-center gap-1">
                  <Check size={12} /> Sent!
                </motion.p>
              )}
            </AnimatePresence>
            <button onClick={handleSend}
              disabled={!content.trim() || sending || (mode === 'direct' && !recipient)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-40 transition">
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {mode === 'broadcast' ? 'Broadcast' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HISTORY PANEL
   ══════════════════════════════════════════════════ */

function HistoryPanel() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminMessagesApi.getSent();
      if (data.success) setMessages(data.messages ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await adminMessagesApi.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (expanded === id) setExpanded(null);
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 size={18} className="text-white/30 animate-spin" />
    </div>
  );

  if (messages.length === 0) return (
    <div className="surface rounded-2xl px-4 py-12 text-center">
      <p className="text-white/25 text-sm">No messages sent yet</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <p className="text-white/25 text-xs uppercase tracking-widest">{messages.length} sent</p>
        <button onClick={load} disabled={loading}
          className="text-white/25 hover:text-white/50 transition">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {messages.map((msg, i) => {
        const isBroadcast = msg.context === 'broadcast' || !msg.receiverId;
        const isOpen = expanded === msg.id;

        return (
          <motion.div key={msg.id}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="panel rounded-2xl overflow-hidden"
          >
            <button onClick={() => setExpanded(isOpen ? null : msg.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/4 transition text-left">
              <div className={`w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center flex-shrink-0 ${
                isBroadcast ? 'text-orange-400' : 'text-blue-400'
              }`}>
                {isBroadcast ? <Megaphone size={14} /> : <User size={14} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white/75 text-sm font-medium truncate">
                    {msg.subject ?? (isBroadcast ? 'Broadcast' : 'Direct Message')}
                  </p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isBroadcast
                      ? 'bg-orange-500/15 text-orange-400'
                      : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {isBroadcast ? 'BROADCAST' : 'DIRECT'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/30">
                  <span>{formatTime(msg.createdAt)}</span>
                  {!isBroadcast && (msg as any).receiverName && (
                    <span>To {(msg as any).receiverName}</span>
                  )}
                  {(msg as any).replyCount > 0 && (
                    <span>{(msg as any).replyCount} {(msg as any).replyCount === 1 ? 'reply' : 'replies'}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                  disabled={deleting === msg.id}
                  className="text-white/20 hover:text-red-400 transition p-1 rounded">
                  {deleting === msg.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
                {isOpen ? <ChevronUp size={13} className="text-white/25" /> : <ChevronDown size={13} className="text-white/20" />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="border-t border-white/8 px-4 py-4">
                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}