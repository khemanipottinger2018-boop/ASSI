'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Loader2, Clock, CheckCircle, XCircle,
  Eye, RefreshCw, BookOpen, Edit3,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ApplicationStatus = 'pending' | 'seen' | 'under_review' | 'approved' | 'rejected';

interface Application {
  id:                  string;
  status:              ApplicationStatus;
  submittedAt:         string | null;
  reviewedAt:          string | null;
  notes:               string | null;
  educationBackground: string | null;
  teachingExperience:  string | null;
  whyTutor:            string | null;
  qualifications:      string | null;
  subjects:            { id: string; name: string; category: string | null }[];
}

const STATUS_CONFIG: Record<ApplicationStatus, {
  icon:    React.ElementType;
  label:   string;
  color:   string;
  bg:      string;
  border:  string;
  message: string;
}> = {
  pending: {
    icon:    Clock,
    label:   'Submitted',
    color:   'text-yellow-400',
    bg:      'bg-yellow-500/10',
    border:  'border-yellow-500/20',
    message: 'Your application has been received. Our team will review it within 24–48 hours.',
  },
  seen: {
    icon:    Eye,
    label:   'Under Review',
    color:   'text-blue-400',
    bg:      'bg-blue-500/10',
    border:  'border-blue-500/20',
    message: 'A reviewer has opened your application. You should hear back soon.',
  },
  under_review: {
    icon:    RefreshCw,
    label:   'Under Review',
    color:   'text-purple-400',
    bg:      'bg-purple-500/10',
    border:  'border-purple-500/20',
    message: 'Your application is actively being reviewed. Hang tight.',
  },
  approved: {
    icon:    CheckCircle,
    label:   'Approved',
    color:   'text-emerald-400',
    bg:      'bg-emerald-500/10',
    border:  'border-emerald-500/20',
    message: "Congratulations! Your application has been approved. You're now a tutor on ASSI.",
  },
  rejected: {
    icon:    XCircle,
    label:   'Not Approved',
    color:   'text-red-400',
    bg:      'bg-red-500/10',
    border:  'border-red-500/20',
    message: "Unfortunately your application wasn't approved at this time.",
  },
};

export default function ApplyStatusPage() {
  const { user, isLoading, refresh } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading,     setLoading]      = useState(true);
  const [error,       setError]        = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (isLoading) return;
    if (!user)                   { router.replace('/signin'); return; }
    if (user.role === 'student') { router.replace('/apply');  return; }
    if (user.role === 'tutor')   { router.replace('/dashboard/tutor'); return; }
    if (user.role === 'admin')   { router.replace('/admin');  return; }
  }, [user, isLoading, router]);

  const loadApplication = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_URL}/api/tutor-applications/my-application`, {
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not load application');
      }

      if (!data.application) {
        // No application yet — send to start
        router.replace('/apply');
        return;
      }

      setApplication(data.application);

      // If approved, refresh auth so role updates to 'tutor'
      if (data.application.status === 'approved') {
        await refresh();
      }

      // If still filling out form (pending but not yet submitted)
      if (data.application.status === 'pending' && !data.application.submittedAt) {
        router.replace('/apply/form');
        return;
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [router, refresh]);

  useEffect(() => {
    if (!isLoading && user) loadApplication();
  }, [isLoading, user, loadApplication]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-8 py-10 text-center max-w-sm">
          <p className="text-white/60 text-sm mb-4">{error || 'Application not found'}</p>
          <button onClick={loadApplication} className="text-xs text-white/40 hover:text-white/70 transition underline underline-offset-2">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const cfg         = STATUS_CONFIG[application.status];
  const StatusIcon  = cfg.icon;
  const isApproved  = application.status === 'approved';
  const isRejected  = application.status === 'rejected';
  const isPending   = ['pending', 'seen', 'under_review'].includes(application.status);

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-5">

      {/* Status card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-6 space-y-4"
      >
        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
          <StatusIcon size={15} className={cfg.color} />
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>

        <p className="text-white/65 text-sm leading-relaxed">{cfg.message}</p>

        {/* Admin review notes */}
        {application.notes && (isApproved || isRejected) && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-white/35 text-xs font-semibold uppercase tracking-widest mb-2">Reviewer Notes</p>
            <p className="text-white/60 text-sm leading-relaxed">{application.notes}</p>
          </div>
        )}

        {/* Submitted date */}
        {application.submittedAt && (
          <p className="text-white/25 text-xs">
            Submitted {new Date(application.submittedAt).toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {isApproved && (
            <button
              onClick={() => router.push('/dashboard/tutor')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 transition"
            >
              <CheckCircle size={15} /> Go to Dashboard
            </button>
          )}

          {isPending && (
            <>
              <button
                onClick={loadApplication}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-soft text-white/60 hover:text-white/90 transition text-sm"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={() => router.push('/apply/form')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-soft text-white/60 hover:text-white/90 transition text-sm"
              >
                <Edit3 size={14} /> Edit Application
              </button>
            </>
          )}

          {isRejected && (
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 rounded-xl glass-soft text-white/60 hover:text-white/90 transition text-sm"
            >
              Back to Home
            </button>
          )}
        </div>
      </motion.div>

      {/* Application summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-6 space-y-4"
      >
        <p className="text-white/30 text-xs font-semibold uppercase tracking-widest">Your Application</p>

        {[
          { label: 'Education',          value: application.educationBackground },
          { label: 'Teaching Experience', value: application.teachingExperience  },
          { label: 'Why I want to tutor', value: application.whyTutor           },
          { label: 'Qualifications',      value: application.qualifications      },
        ].filter(f => f.value).map(({ label, value }) => (
          <div key={label}>
            <p className="text-white/30 text-xs uppercase tracking-widest mb-1">{label}</p>
            <p className="text-white/60 text-sm leading-relaxed">{value}</p>
          </div>
        ))}

        {application.subjects.length > 0 && (
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Subjects</p>
            <div className="flex flex-wrap gap-2">
              {application.subjects.map(s => (
                <span
                  key={s.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs
                    bg-orange-500/15 border border-orange-500/25 text-orange-300"
                >
                  <BookOpen size={9} />
                  {s.name}
                  {s.category && <span className="text-orange-400/50">· {s.category}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}