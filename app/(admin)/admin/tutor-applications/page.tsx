'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, User, Check, X, Loader2, Clock,
  Eye, ChevronDown, ChevronUp, BookOpen, GraduationCap,
  Briefcase, Heart, Calendar, RefreshCw,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminApplication, AdminApplicationDetail, ApplicationStatus } from '@/lib/api';

export default function TutorApplicationsPage() {
  const [applications,  setApplications]  = useState<AdminApplication[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actioning,     setActioning]     = useState<string | null>(null);
  const [expanded,      setExpanded]      = useState<string | null>(null);
  const [details,       setDetails]       = useState<Record<string, AdminApplicationDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  async function loadApplications() {
    setLoading(true);
    try {
      const data = await adminApi.getApplications();
      if (data.success) setApplications(data.applications ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadApplications(); }, []);

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (details[id]) return;
    setLoadingDetail(id);
    try {
      const data = await adminApi.getApplication(id);
      if (data.success) setDetails(prev => ({ ...prev, [id]: data.application }));
    } catch { /* silent */ }
    finally { setLoadingDetail(null); }
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActioning(id);
    try {
      action === 'approve'
        ? await adminApi.approveApplication(id)
        : await adminApi.rejectApplication(id);
      setExpanded(null);
      await loadApplications();
    } finally { setActioning(null); }
  }

  async function handleStatusUpdate(id: string, status: 'seen' | 'under_review') {
    setActioning(id);
    try {
      await adminApi.setApplicationStatus(id, status);
      await loadApplications();
    } finally { setActioning(null); }
  }

  const pending    = applications.filter((a) => a.status === 'pending');
  const inProgress = applications.filter((a) => a.status === 'seen' || a.status === 'under_review');
  const reviewed   = applications.filter((a) => a.status === 'approved' || a.status === 'rejected');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center">
            <ClipboardList size={16} className="text-white/60" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg tracking-tight">Tutor Applications</h1>
            <p className="text-white/30 text-xs mt-0.5">
              {loading ? 'Loading…' : `${pending.length} pending · ${inProgress.length} in review`}
            </p>
          </div>
        </div>
        <button onClick={loadApplications} disabled={loading}
          className="glass-soft p-2 rounded-lg text-white/30 hover:text-white/60 transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-2">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-1">Pending</p>
              {pending.map((app) => (
                <ApplicationCard key={app.id} app={app}
                  actioning={actioning === app.id}
                  expanded={expanded === app.id}
                  detail={details[app.id] ?? null}
                  loadingDetail={loadingDetail === app.id}
                  onToggle={() => toggleExpand(app.id)}
                  onApprove={() => handleAction(app.id, 'approve')}
                  onReject={() => handleAction(app.id, 'reject')}
                  onMarkSeen={() => handleStatusUpdate(app.id, 'seen')}
                  onMarkReview={() => handleStatusUpdate(app.id, 'under_review')} />
              ))}
            </section>
          )}

          {inProgress.length > 0 && (
            <section className="space-y-2">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-1">In Review</p>
              {inProgress.map((app) => (
                <ApplicationCard key={app.id} app={app}
                  actioning={actioning === app.id}
                  expanded={expanded === app.id}
                  detail={details[app.id] ?? null}
                  loadingDetail={loadingDetail === app.id}
                  onToggle={() => toggleExpand(app.id)}
                  onApprove={() => handleAction(app.id, 'approve')}
                  onReject={() => handleAction(app.id, 'reject')} />
              ))}
            </section>
          )}

          {reviewed.length > 0 && (
            <section className="space-y-2">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-widest px-1">Reviewed</p>
              {reviewed.map((app) => (
                <ApplicationCard key={app.id} app={app}
                  actioning={false}
                  expanded={expanded === app.id}
                  detail={details[app.id] ?? null}
                  loadingDetail={loadingDetail === app.id}
                  onToggle={() => toggleExpand(app.id)} />
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

/* ── Status styles ── */

const STATUS_STYLE: Record<ApplicationStatus, string> = {
  pending:      'text-yellow-400 bg-yellow-500/15 border-yellow-500/20',
  seen:         'text-blue-400 bg-blue-500/15 border-blue-500/20',
  under_review: 'text-purple-400 bg-purple-500/15 border-purple-500/20',
  approved:     'text-emerald-400 bg-emerald-500/15 border-emerald-500/20',
  rejected:     'text-red-400/70 bg-red-500/10 border-red-500/15',
};

/* ── Detail field ── */

function DetailField({ label, value, icon: Icon }: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
}) {
  if (!value) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={10} className="text-white/25" />}
        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/* ── Application card ── */

function ApplicationCard({ app, actioning, expanded, detail, loadingDetail, onToggle, onApprove, onReject, onMarkSeen, onMarkReview }: {
  app:           AdminApplication;
  actioning:     boolean;
  expanded:      boolean;
  detail:        AdminApplicationDetail | null;
  loadingDetail: boolean;
  onToggle:      () => void;
  onApprove?:    () => void;
  onReject?:     () => void;
  onMarkSeen?:   () => void;
  onMarkReview?: () => void;
}) {
  const isPending    = app.status === 'pending';
  const isInProgress = app.status === 'seen' || app.status === 'under_review';
  const canAction    = isPending || isInProgress;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl overflow-hidden">

      {/* ── Header row ── */}
      <button onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/4 transition text-left">
        <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center flex-shrink-0">
          <span className="text-white/50 text-sm font-semibold">
            {app.user.username[0]?.toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/80 text-sm font-medium">{app.user.username}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border ${STATUS_STYLE[app.status]}`}>
              {app.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-white/30 text-xs">{app.user.role}</p>
            {app.submittedAt && (
              <p className="text-white/20 text-[10px] flex items-center gap-1">
                <Clock size={9} />{new Date(app.submittedAt).toLocaleDateString()}
              </p>
            )}
            {detail?.subjects && detail.subjects.length > 0 && (
              <p className="text-white/25 text-[10px] truncate max-w-[200px]">
                {detail.subjects.map(s => s.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Quick action buttons */}
        {canAction && onApprove && onReject && (
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {isPending && onMarkSeen && (
              <button onClick={onMarkSeen} disabled={actioning} title="Mark seen"
                className="w-7 h-7 rounded-lg glass-soft text-white/25 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 transition flex items-center justify-center">
                <Eye size={11} />
              </button>
            )}
            {isInProgress && onMarkReview && (
              <button onClick={onMarkReview} disabled={actioning} title="Mark under review"
                className="w-7 h-7 rounded-lg glass-soft text-white/25 hover:text-purple-400 hover:bg-purple-500/10 disabled:opacity-40 transition flex items-center justify-center">
                <Briefcase size={11} />
              </button>
            )}
            <button onClick={onReject} disabled={actioning} title="Reject"
              className="w-7 h-7 rounded-lg glass-soft text-white/30 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition flex items-center justify-center">
              {actioning ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            </button>
            <button onClick={onApprove} disabled={actioning} title="Approve"
              className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 transition flex items-center justify-center">
              {actioning ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            </button>
          </div>
        )}

        <div className="flex-shrink-0 text-white/20 ml-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* ── Expanded detail panel ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-white/8 px-4 pb-5 pt-4">
              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={16} className="text-white/25 animate-spin" />
                </div>
              ) : detail ? (
                <div className="space-y-5">

                  {/* Subjects */}
                  {detail.subjects && detail.subjects.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={10} className="text-white/25" />
                        <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">Subjects</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.subjects.map((s) => (
                          <span key={s.id} className="px-2 py-1 rounded-lg glass-soft text-white/60 text-xs border border-white/8">
                            {s.name}
                            {s.category && <span className="text-white/30 ml-1">· {s.category}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Age verified */}
                  <div className="flex items-center gap-2">
                    <Calendar size={10} className="text-white/25" />
                    <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">Age Verified</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                      detail.ageVerified
                        ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20'
                        : 'text-red-400/70 bg-red-500/10 border-red-500/15'
                    }`}>
                      {detail.ageVerified ? 'Yes' : 'No'}
                    </span>
                  </div>

                  <DetailField icon={GraduationCap} label="Education Background"    value={detail.educationBackground} />
                  <DetailField icon={Briefcase}     label="Teaching Experience"     value={detail.teachingExperience} />
                  <DetailField icon={Heart}         label="Why they want to tutor"  value={detail.whyTutor} />
                  <DetailField icon={BookOpen}      label="Qualifications"          value={detail.qualifications} />

                  {detail.notes && (
                    <div className="glass-soft rounded-xl px-3 py-2.5 border border-white/8">
                      <p className="text-white/25 text-[10px] uppercase tracking-widest mb-1">Review Notes</p>
                      <p className="text-white/55 text-xs italic">{detail.notes}</p>
                    </div>
                  )}

                  {detail.reviewedAt && (
                    <p className="text-white/20 text-[10px]">
                      Reviewed {new Date(detail.reviewedAt).toLocaleString()}
                      {detail.reviewedBy && ` · by ${detail.reviewedBy}`}
                    </p>
                  )}

                  {/* Full-width approve/reject at bottom */}
                  {canAction && onApprove && onReject && (
                    <div className="flex gap-2 pt-2 border-t border-white/8">
                      <button onClick={onReject} disabled={actioning}
                        className="flex-1 py-2.5 rounded-xl glass-soft text-white/40 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition text-sm font-medium flex items-center justify-center gap-2">
                        {actioning ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        Reject
                      </button>
                      <button onClick={onApprove} disabled={actioning}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 transition text-sm font-medium flex items-center justify-center gap-2">
                        {actioning ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-white/25 text-xs text-center py-4">Failed to load details</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}