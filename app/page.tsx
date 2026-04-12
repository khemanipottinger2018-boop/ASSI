'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, LogIn, MessageCircle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { useViewContext } from '@/features/admin';
import ServiceSelector from '@/features/browse/ServiceSelector';
import TutorHomeSelector from '@/features/dashboard/tutor/TutorHomeSelector';
import AssiLoadingScreen from '@/features/loading/AssiLoadingScreen';
import AssiOnboardChat from '@/features/assi/AssiOnboardChat';

/* ── Stagger helpers ─────────────────────────────────────────────────────── */
const stagger = {
  container: {
    hidden: {},
    show:   { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
  },
  item: {
    hidden: { opacity: 0, y: 14 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
  },
};

/* ══════════════════════════════════════════════════
   LANDING VIEW  (unauthenticated)
   ══════════════════════════════════════════════════ */

function LandingView() {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);

  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="w-full max-w-[520px] mx-auto"
    >
      {/* Card */}
      <div className="panel rounded-2xl px-10 py-12 text-center">
        <motion.p variants={stagger.item}
          className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-5">
          Welcome to
        </motion.p>

        <motion.h1 variants={stagger.item}
          className="text-5xl font-bold text-white mb-3 tracking-tight">
          ASSI
        </motion.h1>

        <motion.p variants={stagger.item}
          className="text-white/70 text-sm leading-relaxed mb-10 max-w-xs mx-auto">
          Your all-in-one study platform. AI Assistants, Live Tutors, and Assignment Support.
          Built for Caribbean students.
        </motion.p>

        <motion.div variants={stagger.item}
          className="border-t border-white/10 mb-8" />

        {/* Primary actions */}
        <motion.div variants={stagger.item}
          className="flex gap-3 justify-center mb-4">
          <button
            onClick={() => router.push('/signup')}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition shadow-lg shadow-black/20"
          >
            Get started <ArrowRight size={14} />
          </button>
          <button
            onClick={() => router.push('/signin')}
            className="flex items-center gap-2 px-7 py-3 rounded-xl glass-soft text-white font-medium text-sm hover:bg-white/10 transition"
          >
            <LogIn size={14} /> Sign in
          </button>
        </motion.div>

        {/* Ask ASSI CTA */}
        <motion.div variants={stagger.item}>
          <button
            onClick={() => setShowChat(v => !v)}
            className="flex items-center gap-2 mx-auto text-white/50 text-xs hover:text-white/80 transition group"
          >
            <MessageCircle size={13} className="group-hover:text-orange-400 transition" />
            {showChat ? 'Hide chat' : 'Not sure? Ask ASSI →'}
          </button>
        </motion.div>

        {/* Inline onboarding chat */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              key="onboard-chat"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
              exit={{    opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <AssiOnboardChat onClose={() => setShowChat(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE ROOT
   ══════════════════════════════════════════════════ */

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const { viewContext } = useViewContext();

  /* ── ASSI branded loading screen ── */
  if (isLoading) {
    return <AssiLoadingScreen visible />;
  }

  /* ── Not logged in ── */
  if (!user) {
    return (
      <>
        {/* Splash fades out, landing fades in */}
        <AssiLoadingScreen visible={false} />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex justify-center"
          >
            <LandingView />
          </motion.div>
        </div>
      </>
    );
  }

  /* ── Determine which home view to show ── */
  const showTutor =
    user.role === 'tutor' ||
    user.role === 'tutor_applicant' ||
    (user.role === 'admin' && viewContext === 'tutor');

  return (
    <>
      <AssiLoadingScreen visible={false} />
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
    </>
  );
}
