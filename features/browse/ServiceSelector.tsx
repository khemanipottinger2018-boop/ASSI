'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { useAuth }  from '@/features/auth';
import { useTheme } from '@/features/themes/core/ThemeProvider';

import SubjectDropdown, { Subject } from './SubjectDropdown';
import ServiceButtons               from './ServiceButtons';
import StatusIndicator              from './StatusIndicator';

interface Props {
  onOpenLogin?:  () => void;
  onOpenSignup?: () => void;
}

export default function ServiceSelector({ onOpenLogin, onOpenSignup }: Props) {
  const router                 = useRouter();
  const { user }               = useAuth();
  const { setSubjectOverride } = useTheme();

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [dropdownOpen,    setDropdownOpen]     = useState(false);
  const [loadingSubjects, setLoadingSubjects]  = useState(true);

  const handleSubjectSelect = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setSubjectOverride(subject.name);
  }, [setSubjectOverride]);

  const handleSubjectClear = useCallback(() => {
    setSelectedSubject(null);
    setSubjectOverride(null);
  }, [setSubjectOverride]);

  const noTutors = selectedSubject !== null && selectedSubject.tutorCount === 0;

  const requireAuth = useCallback(() => {
    onOpenLogin
      ? onOpenLogin()
      : window.dispatchEvent(new Event('assi:open-login'));
  }, [onOpenLogin]);

  // AI > /assi with subject pre-selected
  const handleAI = useCallback(() => {
    if (!user) return requireAuth();
    const params = selectedSubject
      ? `?subject=${encodeURIComponent(selectedSubject.name)}&subjectId=${selectedSubject.id}`
      : '';
    router.push(`/assi${params}`);
  }, [user, router, selectedSubject, requireAuth]);

  // Live tutor, unchanged
  const handleLiveTutor = useCallback(() => {
    if (!user) return requireAuth();
    if (!selectedSubject) return;
    router.push(`/live-chat?subject=${selectedSubject.name}&subjectId=${selectedSubject.id}`);
  }, [user, router, selectedSubject, requireAuth]);

  // Assignment -> /assignments with subject param
  const handleAssignment = useCallback(() => {
    if (!user) return requireAuth();
    const params = selectedSubject
      ? `?subject=${encodeURIComponent(selectedSubject.name)}`
      : '';
    router.push(`/assignments${params}`);
  }, [user, router, selectedSubject, requireAuth]);

  return (
    <>
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            key="blur-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-20 pointer-events-none"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative z-30 w-full max-w-lg mx-auto"
        style={{ borderRadius: 28, padding: 28 }}
      >

        <div className="mb-6">
          <p className="text-white/40 text-xs font-semibold tracking-[0.18em] uppercase mb-1">
            {user ? 'Ready to study?' : 'Get help now'}
          </p>
          <h2 className="text-white font-bold text-[22px] tracking-tight leading-tight">
            {user ? `Hey ${user.username}` : 'What do you need help with?'}
          </h2>
          <p className="text-white/55 text-sm mt-1">
            Choose a subject, then pick how you want help.
          </p>
        </div>

        <SubjectDropdown
          selected={selectedSubject}
          onSelect={handleSubjectSelect}
          onClear={handleSubjectClear}
          onOpenChange={setDropdownOpen}
          onLoadingChange={setLoadingSubjects}
        />

        <StatusIndicator
          hasSelection={!!selectedSubject}
          loading={loadingSubjects}
          error={null}
          totalTutors={selectedSubject?.tutorCount ?? 0}
        />

        <div className="my-4 glass-divider" />

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