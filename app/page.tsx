'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import ServiceSelector from '@/features/browse/ServiceSelector';
import TutorHomeSelector from '@/features/dashboard/tutor/TutorHomeSelector';

const UNDERCOVER_KEY = 'sentinel:undercover';

/* ── Landing ── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } },
  item: {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
  },
};

function LandingView() {
  const router = useRouter();
  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show"
      className="w-full max-w-[520px] mx-auto">
      <div className="panel rounded-2xl px-10 py-12 text-center">
        <motion.p variants={stagger.item} className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-5">
          Welcome to
        </motion.p>
        <motion.h1 variants={stagger.item} className="text-5xl font-bold text-white mb-3 tracking-tight">
          ASSI
        </motion.h1>
        <motion.p variants={stagger.item} className="text-white/70 text-sm leading-relaxed mb-10 max-w-xs mx-auto">
          Your all-in-one study platform. AI Assistants, Live Tutors, and Assignment Support.
          Built for Caribbean students.
        </motion.p>
        <motion.div variants={stagger.item} className="border-t border-white/10 mb-8" />
        <motion.div variants={stagger.item} className="flex gap-3 justify-center mb-6">
          <button onClick={() => router.push('/signup')}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition shadow-lg shadow-black/20">
            Get started <ArrowRight size={14} />
          </button>
          <button onClick={() => router.push('/signin')}
            className="flex items-center gap-2 px-7 py-3 rounded-xl glass-soft text-white font-medium text-sm hover:bg-white/10 transition">
            Sign in
          </button>
        </motion.div>
        <motion.button variants={stagger.item}
          onClick={() => window.dispatchEvent(new CustomEvent('assi:open'))}
          className="flex items-center gap-2 mx-auto text-white/50 text-xs hover:text-white/80 transition group">
          <MessageCircle size={13} className="group-hover:text-white/80 transition" />
          Not sure what ASSI is? Ask the assistant →
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE ROOT
   ══════════════════════════════════════════════════ */

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Admins need localStorage check — doesn't block tutor/student renders at all
  const [undercover,    setUndercover]    = useState<string | null>(null);
  const [adminChecked,  setAdminChecked]  = useState(false);

  useEffect(() => {
    setUndercover(localStorage.getItem(UNDERCOVER_KEY));
    setAdminChecked(true);
  }, []);

  // Admin redirect — only after localStorage has been read
  useEffect(() => {
    if (isLoading || !adminChecked) return;
    if (user?.role === 'admin' && !undercover) {
      router.replace('/admin');
    }
  }, [user, isLoading, router, undercover, adminChecked]);

  /* ── Auth loading ── */
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.p animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}
          className="text-white/50 text-xs tracking-widest uppercase">
          Loading…
        </motion.p>
      </div>
    );
  }

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }} className="w-full flex justify-center">
          <LandingView />
        </motion.div>
      </div>
    );
  }

  /* ── Admin: wait for localStorage check before deciding ── */
  if (user.role === 'admin' && !adminChecked) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <motion.p animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}
          className="text-white/50 text-xs tracking-widest uppercase">Loading…</motion.p>
      </div>
    );
  }

  /* ── Admin not undercover: redirect in flight, render nothing ── */
  if (user.role === 'admin' && !undercover) return null;

  /* ── Determine selector ── */
  const showTutor =
    user.role === 'tutor' ||
    user.role === 'tutor_applicant' ||
    (user.role === 'admin' && undercover === 'tutor');

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10">
      <AnimatePresence mode="wait">
        {showTutor ? (
          <motion.div key="tutor"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center">
            <TutorHomeSelector />
          </motion.div>
        ) : (
          <motion.div key="student"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center">
            <ServiceSelector />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}