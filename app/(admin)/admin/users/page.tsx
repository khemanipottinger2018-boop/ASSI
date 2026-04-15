'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, RefreshCw, Loader2, ShieldCheck, ShieldOff, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminUser } from '@/lib/api';

// Backend returns: userId, username, role, isSuspended, isDemo, createdAt
// No email field on this endpoint

type UserRole = AdminUser['role'];

const ROLES: UserRole[] = ['student', 'tutor', 'tutor_applicant', 'moderator', 'admin'];

const ROLE_LABELS: Record<UserRole, string> = {
  student:         'Student',
  tutor:           'Tutor',
  tutor_applicant: 'Applicant',
  moderator:       'Moderator',
  admin:           'Admin',
};

const roleStyle: Record<UserRole, string> = {
  admin:           'text-orange-400 bg-orange-500/15 border-orange-500/20',
  tutor:           'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
  student:         'text-blue-400 bg-blue-500/15 border-blue-500/20',
  tutor_applicant: 'text-purple-400 bg-purple-500/15 border-purple-500/20',
  moderator:       'text-cyan-400 bg-cyan-500/15 border-cyan-500/20',
};

export default function AdminUsersPage() {
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [query,     setQuery]     = useState('');
  const [actioning, setActioning] = useState<string | null>(null);
  const [roleMenu,  setRoleMenu]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsers();
      if (data.success) setUsers(data.users ?? []);
      else setError('Failed to load users');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load users');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!roleMenu) return;
    const close = () => setRoleMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [roleMenu]);

  async function toggleSuspend(user: AdminUser) {
    setActioning(user.userId);
    try {
      const res = await adminApi.suspendUser(user.userId, !user.isSuspended);
      if (!res.success) { setError('Failed to update suspension status'); return; }
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update suspension status');
    } finally { setActioning(null); }
  }

  async function changeRole(userId: string, role: UserRole) {
    setRoleMenu(null);
    setActioning(userId);
    try {
      const res = await adminApi.updateUserRole(userId, role);
      if (!res.success) { setError('Failed to update role'); return; }
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update role');
    } finally { setActioning(null); }
  }

  const filtered = users.filter(u =>
    !query ||
    u.username.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/8 w-9 h-9 rounded-xl flex items-center justify-center">
            <Users size={16} className="text-white/60" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">Users</h1>
            <p className="text-white/30 text-xs">{loading ? 'Loading…' : `${users.length} total`}</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="bg-white/6 p-2 rounded-lg text-white/30 hover:text-white/60 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {error && (
        <div className="panel rounded-xl px-4 py-3 border border-red-500/20 flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }} className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input type="text" placeholder="Search by username…" value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-white/6 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25 transition" />
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface rounded-2xl px-4 py-12 text-center">
          <p className="text-white/25 text-sm">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user, i) => {
            const suspended   = Boolean(user.isSuspended);
            const isActioning = actioning === user.userId;
            const roleMeta    = roleStyle[user.role] ?? 'text-white/40 bg-white/5 border-white/10';
            return (
              <motion.div key={user.userId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.25 }}
                className={`panel rounded-2xl p-4 flex items-center gap-4 ${suspended ? 'opacity-60' : ''}`}>

                <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                  <span className="text-white/50 text-sm font-semibold">{user.username[0]?.toUpperCase()}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/80 text-sm font-medium truncate">{user.username}</span>
                    {user.isDemo && (
                      <span className="text-yellow-400/70 text-[9px] border border-yellow-500/20 px-1.5 py-0.5 rounded-full">demo</span>
                    )}
                    {suspended && (
                      <span className="text-red-400/70 text-[9px] border border-red-500/20 px-1.5 py-0.5 rounded-full">suspended</span>
                    )}
                  </div>
                  <p className="text-white/30 text-xs mt-0.5">
                    Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setRoleMenu(roleMenu === user.userId ? null : user.userId)}
                    disabled={isActioning}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition hover:opacity-80 disabled:opacity-40 ${roleMeta}`}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                    <ChevronDown size={9} />
                  </button>

                  {roleMenu === user.userId && (
                    <div className="absolute right-0 top-full mt-1 z-50 dropdown rounded-xl py-1 min-w-[150px] shadow-xl">
                      {ROLES.map(r => (
                        <button key={r} onClick={() => changeRole(user.userId, r)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/8 transition">
                          {r === user.role && <Check size={10} className="text-emerald-400 flex-shrink-0" />}
                          <span className={r !== user.role ? 'ml-[18px]' : ''}>{ROLE_LABELS[r]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleSuspend(user)}
                  disabled={isActioning}
                  title={suspended ? 'Unsuspend user' : 'Suspend user'}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition disabled:opacity-40 ${
                    suspended
                      ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-white/6 text-white/30 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  {isActioning
                    ? <Loader2 size={13} className="animate-spin" />
                    : suspended ? <ShieldCheck size={13} /> : <ShieldOff size={13} />
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