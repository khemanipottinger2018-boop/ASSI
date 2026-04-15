'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import { useAuth } from '@/features/auth';
import { useStreak } from '@/features/platform/useStreak';
import StreakBriefing from './StreakBriefing';

/* =====================================================
 * BOOT GATE
 * Loading screen and animated quote disabled pending redesign.
 * StreakBriefing layer preserved — triggers on remember-me + streak.
 * ===================================================== */

const REMEMBER_ME_KEY = 'assi:remember_me';

type BootPhase = 'streak' | 'done';

interface BootGateProps {
  children: React.ReactNode;
}

export default function BootGate({ children }: BootGateProps) {
  const { isAuthenticated } = useAuth();
  const { streak, isLoading: streakLoading } = useStreak();

  const [phase, setPhase] = useState<BootPhase>('done');

  useEffect(() => {
    const rememberMe = typeof window !== 'undefined'
      ? localStorage.getItem(REMEMBER_ME_KEY) === 'true'
      : false;
    if (rememberMe && isAuthenticated) {
      setPhase('streak');
    }
  }, [isAuthenticated]);

  function handleStreakDismiss() {
    setPhase('done');
  }

  return (
    <>
      {children}

      <AnimatePresence>
        {phase === 'streak' && !streakLoading && streak.currentStreak > 0 && (
          <StreakBriefing
            key="streak"
            streak={streak}
            onDismiss={handleStreakDismiss}
          />
        )}
        {phase === 'streak' && !streakLoading && streak.currentStreak === 0 && (
          <HiddenSkip onMount={handleStreakDismiss} />
        )}
      </AnimatePresence>
    </>
  );
}

function HiddenSkip({ onMount }: { onMount: () => void }) {
  useEffect(() => { onMount(); }, [onMount]);
  return null;
}
