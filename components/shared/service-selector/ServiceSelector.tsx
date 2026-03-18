'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { useAuth }     from '@/contexts/AuthContext';
import { useTheme }    from '@/components/shared/themes/ThemeProvider';

import SubjectDropdown, { Subject } from './SubjectDropdown';
import ServiceButtons               from './ServiceButtons';
import StatusIndicator              from './StatusIndicator';
import { subjectToTheme }           from './utils/subjectToTheme';

interface Props {
  onOpenLogin?:  () => void;
  onOpenSignup?: () => void;
}

export default function ServiceSelector({ onOpenLogin, onOpenSignup }: Props) {
  const router     = useRouter();
  const { user }   = useAuth();
  const { setTheme } = useTheme();

  const [selectedSubject,   setSelectedSubject]   = useState<Subject | null>(null);
  const [dropdownOpen,      setDropdownOpen]       = useState(false);
  // Real loading state lifted from SubjectDropdown via onLoadingChange callback
  const [loadingSubjects,   setLoadingSubjects]    = useState(true);

  const handleSubjectSelect = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setTheme(subjectToTheme(subject.name) as any);
  }, [setTheme]);

  const noTutors = selectedSubject !== null && selectedSubject.tutorCount === 0;

  const requireAuth = useCallback(() => {
    onOpenLogin
      ? onOpenLogin()
      : window.dispatchEvent(new Event('assi:open-login'));
  }, [onOpenLogin]);

  const handleAI = useCallback(() => {
    if (!user) return requireAuth();
    router.push('/ai');
  }, [user, router, requireAuth]);

  const handleLiveTutor = useCallback(() => {
    if (!user) return requireAuth();
    if (!selectedSubject) return;
    router.push(`/live-chat?subject=${selectedSubject.name}&subjectId=${selectedSubject.subject_id}`);
  }, [user, router, selectedSubject, requireAuth]);

  const handleAssignment = useCallback(() => {
    if (!user) return requireAuth();
    router.push('/assignment-help');
  }, [user, router, requireAuth]);

  return (
    <>
      {/* ── Page blur when dropdown is open ── */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            key="blur-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 pointer-events-none"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />
        )}
      </AnimatePresence>

      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-30 w-full max-w-lg mx-auto"
        style={{
          background:           'rgba(255,255,255,0.10)',
          border:               '1px solid rgba(255,255,255,0.20)',
          borderRadius:         28,
          boxShadow:            '0 8px 32px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.25)',
          backdropFilter:       'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          padding:              28,
        }}
      >
        {/* Subtle top-edge shimmer */}
        <div className="absolute inset-x-8 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }}
        />

        {/* ── Header ── */}
        <div className="mb-6">
          <p className="text-white/40 text-xs font-semibold tracking-[0.18em] uppercase mb-1">
            {user ? 'Ready to study?' : 'Get help now'}
          </p>
          <h2 className="text-white font-bold text-[22px] tracking-tight leading-tight">
            {user ? `Hey ${user.username} 👋` : 'What do you need help with?'}
          </h2>
          <p className="text-white/55 text-sm mt-1">
            Choose a subject, then pick how you want help.
          </p>
        </div>

        {/* ── Subject dropdown ── */}
        <SubjectDropdown
          selected={selectedSubject}
          onSelect={handleSubjectSelect}
          onOpenChange={setDropdownOpen}
          onLoadingChange={setLoadingSubjects}
        />

        {/* ── Status indicator — loading is real now ── */}
        <StatusIndicator
          hasSelection={!!selectedSubject}
          loading={loadingSubjects}
          error={null}
          totalTutors={selectedSubject?.tutorCount ?? 0}
        />

        {/* ── Divider ── */}
        <div className="my-4 border-t border-white/10" />

        {/* ── Service buttons ── */}
        <div className={!selectedSubject ? 'opacity-40 pointer-events-none select-none' : ''}>
          <ServiceButtons
            disabled={!selectedSubject}
            liveTutorDisabled={noTutors}
            onAI={handleAI}
            onLiveTutor={handleLiveTutor}
            onAssignment={handleAssignment}
            primary="live"
          />
        </div>

        {!selectedSubject && (
          <p className="mt-3 text-center text-xs text-white/30">
            Select a subject above to get started
          </p>
        )}

        {/* ── Guest nudge ── */}
        {!user && (
          <p className="mt-5 text-center text-xs text-white/35">
            <button onClick={requireAuth}
              className="text-white/70 hover:text-white underline underline-offset-2 transition font-medium">
              Sign in
            </button>
            {' '}or{' '}
            <button
              onClick={() => onOpenSignup?.() ?? window.dispatchEvent(new Event('assi:open-signup'))}
              className="text-white/70 hover:text-white underline underline-offset-2 transition font-medium">
              create a free account
            </button>
          </p>
        )}
      </motion.div>
    </>
  );
}
