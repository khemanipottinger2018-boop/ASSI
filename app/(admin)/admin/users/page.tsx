'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Search, RefreshCw, Loader2,
  ShieldCheck, ShieldOff, ChevronDown, Check,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type UserRow = {
  id: string;
  username: string;
  email: string;
  role: string;
  is_suspended: boolean | number;
  is_demo: boolean | number;
  created_at: string;
};

const ROLES = ['student', 'tutor', 'tutor-applicant', 'admin'];

const roleStyle: Record<string, string> = {
  admin:            'text-orange-400 bg-orange-500/15 border-orange-500/20',
  tutor:            'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
  student:          'text-blue-400 bg-blue-500/15 border-blue-500/20',
  'tutor-applicant':'text-purple-400 bg-purple-500/15 border-purple-500/20',
};

export default function AdminUsersPage() {
  const [users,     setUsers]     = useState<UserRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [roleMenu,  setRoleMenu]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/admin/users`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setUsers(data.users ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close role menu on outside click
  useEffect(() => {
    if (!roleMenu) return;
    const close = () => setRoleMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [roleMenu]);

  async function toggleSuspend(user: UserRow) {
    setActioning(user.id);
    const suspended = !user.is_suspended;
    try {
      await fetch(`${API_URL}/api/admin/users/${user.id}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suspended }),
      });
      setUsers(prev => prev.map(u =>
        u.id === user.id ? { ...u, is_suspended: suspended } : u
      ));
    } finally { setActioning(null); }
  }

  async function changeRole(userId: string, role: string) {
    setRoleMenu(null);
    setActioning(userId);
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role }),
      });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role } : u
      ));
    } finally { setActioning(null); }
  }

  const filtered = users.filter(u =>
    !query ||
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <Users size={16} className="text-white/60" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">Users</h1>
            <p className="text-white/30 text-xs">
              {loading ? 'Loading…' : `${users.length} total`}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="glass-soft p-2 rounded-lg text-white/30 hover:text-white/60 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="relative"
      >
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by username or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25 transition"
        />
      </motion.div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-12 text-center">
          <p className="text-white/25 text-sm">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user, i) => {
            const suspended = Boolean(user.is_suspended);
            const isActioning = actioning === user.id;

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
                className={`glass rounded-2xl p-4 flex items-center gap-4 ${suspended ? 'opacity-60' : ''}`}
              >
                {/* Avatar initial */}
                <div className="w-9 h-9 rounded-xl glass-soft flex items-center justify-center flex-shrink-0">
                  <span className="text-white/50 text-sm font-semibold">
                    {user.username[0]?.toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/80 text-sm font-medium truncate">
                      {user.username}
                    </span>
                    {Boolean(user.is_demo) && (
                      <span className="text-yellow-400/70 text-[9px] border border-yellow-500/20 px-1.5 py-0.5 rounded-full">
                        demo
                      </span>
                    )}
                    {suspended && (
                      <span className="text-red-400/70 text-[9px] border border-red-500/20 px-1.5 py-0.5 rounded-full">
                        suspended
                      </span>
                    )}
                  </div>
                  <p className="text-white/30 text-xs truncate mt-0.5">{user.email}</p>
                </div>

                {/* Role badge + dropdown */}
                <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setRoleMenu(roleMenu === user.id ? null : user.id)}
                    disabled={isActioning}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px]
                      font-semibold uppercase tracking-wide border transition
                      hover:opacity-80 disabled:opacity-40
                      ${roleStyle[user.role] ?? 'text-white/40 bg-white/5 border-white/10'}
                    `}
                  >
                    {user.role}
                    <ChevronDown size={9} />
                  </button>

                  {roleMenu === user.id && (
                    <div className="absolute right-0 top-full mt-1 z-50 glass rounded-xl py-1 min-w-[140px] shadow-xl">
                      {ROLES.map(r => (
                        <button
                          key={r}
                          onClick={() => changeRole(user.id, r)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition capitalize"
                        >
                          {r === user.role && <Check size={10} className="text-emerald-400 flex-shrink-0" />}
                          <span className={r !== user.role ? 'ml-[18px]' : ''}>{r}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Suspend toggle */}
                <button
                  onClick={() => toggleSuspend(user)}
                  disabled={isActioning}
                  title={suspended ? 'Unsuspend user' : 'Suspend user'}
                  className={`
                    w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition
                    disabled:opacity-40
                    ${suspended
                      ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'
                      : 'glass-soft text-white/30 hover:text-red-400 hover:bg-red-500/10'
                    }
                  `}
                >
                  {isActioning
                    ? <Loader2 size={13} className="animate-spin" />
                    : suspended
                      ? <ShieldCheck size={13} />
                      : <ShieldOff size={13} />
                  }
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
