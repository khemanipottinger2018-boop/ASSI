'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox, RefreshCw, Megaphone, MessageCircle,
  Cpu, ChevronRight, Check, Loader2, Send,
  ArrowLeft, Clock, CheckCircle2, Trash2,
} from 'lucide-react';
import { useMessages } from '@/hooks/useMessages';
import { messagesApi } from '@/lib/api';
import type { InboxMessage, MessageThread } from '@/lib/api';

/* ── Helpers ── */

function formatTime(d: string | Date) {
  const date = new Date(d);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days < 7)   return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CONTEXT_STYLE: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  direct:    { icon: MessageCircle, color: 'text-blue-400',   label: 'Direct'    },
  broadcast: { icon: Megaphone,     color: 'text-orange-400', label: 'Broadcast' },
  system:    { icon: Cpu,           color: 'text-purple-400', label: 'System'    },
  session:   { icon: MessageCircle, color: 'text-emerald-400',label: 'Session'   },
};

/* ══════════════════════════════════════════════════
   INBOX PAGE
   ══════════════════════════════════════════════════ */

export default function InboxPage() {
  const { messages, unreadCount, loading, error, refresh, markRead, markAllRead } = useMessages();
  const [selected,      setSelected]      = useState<string | null>(null);
  const [thread,        setThread]        = useState<MessageThread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyContent,  setReplyContent]  = useState('');
  const [replying,      setReplying]      = useState(false);
  const [deleting,      setDeleting]      = useState<string | null>(null);

  /* ── Open a thread ── */
  async function openThread(msg: InboxMessage) {
    setSelected(msg.id);
    setThread(null);
    setReplyContent('');
    setThreadLoading(true);

    if (!msg.isRead) markRead(msg.id);

    try {
      const data = await messagesApi.getThread(msg.id);
      if (data.success) setThread(data.message);
    } catch { /* silent */ }
    finally { setThreadLoading(false); }
  }

  /* ── Send reply ── */
  async function sendReply() {
    if (!selected || !replyContent.trim() || replying) return;
    setReplying(true);
    try {
      await messagesApi.reply(selected, replyContent.trim());
      setReplyContent('');
      // Refresh thread
      const data = await messagesApi.getThread(selected);
      if (data.success) setThread(data.message);
    } catch { /* silent */ }
    finally { setReplying(false); }
  }

  /* ── Delete message ── */
  async function deleteMessage(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(id);
    try {
      await messagesApi.delete(id);
      if (selected === id) { setSelected(null); setThread(null); }
      await refresh();
    } catch { /* silent */ }
    finally { setDeleting(null); }
  }

  const isThread = selected !== null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isThread && (
            <button onClick={() => { setSelected(null); setThread(null); }}
              className="glass-soft w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white transition mr-1">
              <ArrowLeft size={14} />
            </button>
          )}
          <div className="glass-soft w-10 h-10 rounded-xl flex items-center justify-center">
            <Inbox size={18} className="text-white/80" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              {isThread ? thread?.subject ?? 'Message' : 'Inbox'}
            </h1>
            <p className="text-xs text-white/40">
              {isThread
                ? thread ? `From ${thread.senderName}` : 'Loading…'
                : loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>

        {!isThread && (
          <div className="flex items-center gap-2">
            <button onClick={refresh} disabled={loading}
              className="glass-soft px-3 py-2 rounded-lg text-white/50 hover:text-white/80 transition disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition">
                Mark all read
              </button>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── Thread view ── */}
        {isThread && (
          <motion.div key="thread"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {threadLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={20} className="text-white/30 animate-spin" />
              </div>
            ) : thread ? (
              <>
                {/* Original message */}
                <MessageBubble msg={thread} isOriginal />

                {/* Replies */}
                {thread.replies.map((reply) => (
                  <MessageBubble key={reply.id} msg={reply} />
                ))}

                {/* Reply input — only for direct/system messages, not broadcasts */}
                {thread.context !== 'broadcast' && (
                  <div className="panel rounded-2xl border border-white/10 flex items-end gap-3 px-4 py-3 mt-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
                      }}
                      placeholder="Write a reply… (Enter to send)"
                      rows={1}
                      className="flex-1 bg-transparent text-white text-sm placeholder-white/25 outline-none resize-none leading-relaxed max-h-32 overflow-y-auto"
                      onInput={(e) => {
                        const t = e.currentTarget;
                        t.style.height = 'auto';
                        t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                      }}
                    />
                    <button onClick={sendReply} disabled={!replyContent.trim() || replying}
                      className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-white/8 disabled:text-white/20 text-white transition flex items-center justify-center">
                      {replying ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="glass rounded-2xl px-4 py-12 text-center">
                <p className="text-white/25 text-sm">Failed to load message</p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Inbox list ── */}
        {!isThread && (
          <motion.div key="inbox"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          >
            {error ? (
              <div className="glass rounded-2xl px-4 py-10 text-center">
                <p className="text-sm text-red-300/90">Could not load messages.</p>
                <button onClick={refresh} className="mt-3 text-xs text-white/60 hover:text-white/90 transition">
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-4 border border-white/10 bg-white/5 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-white/10 rounded" />
                        <div className="h-4 w-48 bg-white/8 rounded" />
                        <div className="h-3 w-64 bg-white/5 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="glass rounded-2xl text-center py-16 px-6">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-4 flex items-center justify-center">
                  <Inbox size={22} className="text-white/40" />
                </div>
                <p className="text-sm font-medium text-white/75">No messages yet</p>
                <p className="text-xs text-white/40 mt-1">Messages from tutors and ASSI will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((msg, i) => {
                  const ctx     = CONTEXT_STYLE[msg.context] ?? CONTEXT_STYLE.direct;
                  const Icon    = ctx.icon;
                  const isDeleting = deleting === msg.id;

                  return (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                    >
                      <button onClick={() => openThread(msg)}
                        className={`w-full text-left rounded-xl p-4 border transition hover:bg-white/8 group ${
                          msg.isRead ? 'bg-white/5 border-white/8' : 'bg-white/10 border-white/15'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-9 h-9 rounded-xl glass-soft flex items-center justify-center flex-shrink-0 ${msg.isRead ? '' : 'ring-1 ring-white/20'}`}>
                            <Icon size={16} className={ctx.color} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] uppercase tracking-widest ${ctx.color} opacity-70`}>
                                {ctx.label}
                              </span>
                              {!msg.isRead && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-[10px] text-blue-400 font-medium">
                                  New
                                </span>
                              )}
                              {msg.replyCount > 0 && (
                                <span className="text-[10px] text-white/30">
                                  {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>
                            <p className={`text-sm font-medium truncate ${msg.isRead ? 'text-white/70' : 'text-white'}`}>
                              {msg.subject ?? msg.senderName}
                            </p>
                            <p className="text-xs text-white/45 truncate mt-0.5">{msg.content}</p>
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-white/30">
                              <span className="flex items-center gap-1">
                                <Clock size={10} />{formatTime(msg.createdAt)}
                              </span>
                              <span>From {msg.senderName}</span>
                              {msg.isRead && (
                                <span className="flex items-center gap-1 text-emerald-400/60">
                                  <CheckCircle2 size={10} />Read
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-2 flex-shrink-0 ml-1">
                            {!msg.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1" />}
                            <button
                              onClick={(e) => deleteMessage(msg.id, e)}
                              disabled={isDeleting}
                              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition p-1 rounded"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                            <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition" />
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg, isOriginal }: { msg: InboxMessage; isOriginal?: boolean }) {
  const ctx  = CONTEXT_STYLE[msg.context] ?? CONTEXT_STYLE.direct;
  const Icon = ctx.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-4 ${isOriginal ? 'border border-white/15' : 'border border-white/8 ml-6'}`}
    >
      <div className="flex items-start gap-3">
        <div className="glass-soft w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon size={14} className={ctx.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-sm font-medium">{msg.senderName}</span>
              {isOriginal && msg.subject && (
                <span className="text-white/40 text-xs">· {msg.subject}</span>
              )}
            </div>
            <span className="text-white/25 text-[11px] flex-shrink-0">{formatTime(msg.createdAt)}</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    </motion.div>
  );
}