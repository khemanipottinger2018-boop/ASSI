'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ApplyPage() {
  const { user, isLoading, refresh } = useAuth();
  const router = useRouter();

  const [starting,  setStarting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // If already a tutor_applicant or tutor, redirect to the right place
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/signin'); return; }
    if (user.role === 'tutor')           { router.replace('/dashboard/tutor'); return; }
    if (user.role === 'tutor_applicant') { router.replace('/apply/status');    return; }
    if (user.role === 'admin')           { router.replace('/admin');            return; }
  }, [user, isLoading, router]);

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    setError(null);

    try {
      const res  = await fetch(`${API_URL}/api/tutor-applications/start`, {
        method:      'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not start application');
      }

      // Role is now tutor_applicant — refresh auth context
      await refresh();
      router.push('/apply/form');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setStarting(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-8 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="glass-soft w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-xl tracking-tight">Become a Tutor</h1>
            <p className="text-white/50 text-sm mt-0.5">Share your knowledge with students across the Caribbean</p>
          </div>
        </div>

        {/* What to expect */}
        <div className="space-y-3">
          {[
            'Tell us about your education and experience',
            'Select the subjects you can teach',
            'Our team reviews your application within 24–48 hours',
            'Once approved, start earning by helping students',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-orange-400 text-[10px] font-bold">{i + 1}</span>
              </div>
              <p className="text-white/65 text-sm leading-relaxed">{step}</p>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Requirements</p>
          {[
            'Strong command of at least one CSEC or CAPE subject',
            'Ability to communicate clearly and patiently',
            'At least 18 years old',
          ].map((req, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              <p className="text-white/55 text-sm">{req}</p>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition"
        >
          {starting ? (
            <><Loader2 size={16} className="animate-spin" /> Starting application…</>
          ) : (
            <>Start Application <ArrowRight size={16} /></>
          )}
        </button>

        <p className="text-white/25 text-xs text-center">
          Your student account stays active. You can continue using ASSI while your application is reviewed.
        </p>
      </motion.div>
    </div>
  );
}