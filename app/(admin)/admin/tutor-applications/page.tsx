'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, User, Check, X, Loader2, Clock } from 'lucide-react';
import { adminApi } from '@/lib/api';

type Application = {
  id: string; userId: string; username: string; email: string;
  avatarUrl: string | null; appliedAt: string;
  status: 'pending' | 'approved' | 'rejected'; subjects?: string[];
};

export default function TutorApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [actioning,    setActioning]    = useState<string | null>(null);

  async function loadApplications() {
    try {
      const data = await adminApi.getApplications();
      if (data.success) setApplications(data.applications ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadApplications(); }, []);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActioning(id);
    try {
      await adminApi.reviewApplication(id, action);
      await loadApplications();
    } finally { setActioning(null); }
  }

  const pending  = applications.filter((a) => a.status === 'pending');
  const reviewed = applications.filter((a) => a.status !== 'pending');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="flex items-center gap-3">
        <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
          <ClipboardList size={16} className="text-white/60" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-lg tracking-tight">Tutor Applications</h1>
          <p className="text-white/30 text-xs mt-0.5">
            {loading ? 'Loading…' : `${pending.length} pending review`}
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="text-white/30 animate-spin" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-2">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-1">Pending</p>
              {pending.map((app) => (
                <ApplicationCard key={app.id} app={app} actioning={actioning === app.id}
                  onApprove={() => handleAction(app.id, 'approve')}
                  onReject={() => handleAction(app.id, 'reject')} />
              ))}
            </section>
          )}
          {reviewed.length > 0 && (
            <section className="space-y-2">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-1">Reviewed</p>
              {reviewed.map((app) => (
                <ApplicationCard key={app.id} app={app} actioning={false} />
              ))}
            </section>
          )}
          {applications.length === 0 && (
            <div className="glass rounded-2xl px-4 py-12 text-center">
              <p className="text-white/25 text-sm">No applications yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ApplicationCard({ app, actioning, onApprove, onReject }: {
  app: Application; actioning: boolean; onApprove?: () => void; onReject?: () => void;
}) {
  const statusStyle = {
    pending:  'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
    approved: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
    rejected: 'text-red-400/70 bg-red-500/10 border-red-500/15',
  }[app.status];

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center flex-shrink-0 overflow-hidden">
        {app.avatarUrl
          ? <img src={app.avatarUrl} alt={app.username} className="w-full h-full object-cover" />
          : <User size={15} className="text-white/35" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm font-medium">{app.username}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${statusStyle}`}>
            {app.status}
          </span>
        </div>
        <p className="text-white/30 text-xs mt-0.5">{app.email}</p>
        <p className="text-white/20 text-[10px] flex items-center gap-1 mt-0.5">
          <Clock size={9} />{new Date(app.appliedAt).toLocaleDateString()}
        </p>
      </div>
      {app.status === 'pending' && onApprove && onReject && (
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onReject} disabled={actioning}
            className="w-8 h-8 rounded-xl glass-soft text-white/30 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition flex items-center justify-center">
            {actioning ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
          </button>
          <button onClick={onApprove} disabled={actioning}
            className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 transition flex items-center justify-center">
            {actioning ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
        </div>
      )}
    </motion.div>
  );
}
