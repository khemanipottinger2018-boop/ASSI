'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

import { useAuth } from '@/features/auth';
import { useStreak } from '@/features/platform/useStreak';
import AnimatedQuote from '@/features/ui/AnimatedQuote';
import LoadingScreen from './LoadingScreen';
import StreakBriefing from './StreakBriefing';

/* =====================================================
 * BOOT GATE
 * 3-layer boot sequence:
 *   1. LoadingScreen  — always (while app hydrates)
 *   2. AnimatedQuote  — once per browser session
 *   3. StreakBriefing — if remember-me + authenticated + streak > 0
 *
 * Children (AppShell) mount immediately underneath the overlays
 * so providers never stall on boot state.
 * ===================================================== */

const BOOT_DONE_KEY   = 'assi:boot_done';
const QUOTE_SEEN_KEY  = 'assi:quote_seen';
const REMEMBER_ME_KEY = 'assi:remember_me';
const MIN_LOADING_MS  = 900;   // minimum feel of intentional boot

type BootPhase = 'loading' | 'quote' | 'streak' | 'done';

interface BootGateProps {
  children: React.ReactNode;
}

export default function BootGate({ children }: BootGateProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { streak, isLoading: streakLoading } = useStreak();

  const [phase, setPhase] = useState<BootPhase>('loading');

  // Track readiness — both must fire before we advance
  const minDoneRef  = useRef(false);
  const authDoneRef = useRef(false);
  // Prevent double-fire of advance()
  const advancedRef = useRef(false);

  const skipToStreak = useCallback(() => {
    const rememberMe = typeof window !== 'undefined'
      ? localStorage.getItem(REMEMBER_ME_KEY) === 'true'
      : false;

    if (rememberMe && isAuthenticated) {
      setPhase('streak');
    } else {
      setPhase('done');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(BOOT_DONE_KEY, '1');
      }
    }
  }, [isAuthenticated]);

  const advance = useCallback(() => {
    if (!minDoneRef.current || !authDoneRef.current) return;
    if (advancedRef.current) return;
    advancedRef.current = true;

    // Already completed boot this session — skip straight to app
    if (typeof window !== 'undefined' && sessionStorage.getItem(BOOT_DONE_KEY) === '1') {
      setPhase('done');
      return;
    }

    // Show quote if not yet seen this session
    const quoteSeen = typeof window !== 'undefined'
      ? sessionStorage.getItem(QUOTE_SEEN_KEY) === '1'
      : false;

    if (!quoteSeen) {
      if (typeof window !== 'undefined') sessionStorage.setItem(QUOTE_SEEN_KEY, '1');
      setPhase('quote');
      return;
    }

    skipToStreak();
  }, [skipToStreak]);

  // Minimum loading time guard
  useEffect(() => {
    const t = setTimeout(() => {
      minDoneRef.current = true;
      advance();
    }, MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, [advance]);

  // Auth resolution guard
  useEffect(() => {
    if (!authLoading) {
      authDoneRef.current = true;
      advance();
    }
  }, [authLoading, advance]);

  function handleQuoteComplete() {
    skipToStreak();
  }

  function handleStreakDismiss() {
    setPhase('done');
    if (typeof window !== 'undefined') sessionStorage.setItem(BOOT_DONE_KEY, '1');
  }

  return (
    <>
      {/* App always mounts beneath overlays */}
      {children}

      {/* Layer 1: ASSI loading screen */}
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <LoadingScreen key="loading" />
        )}
      </AnimatePresence>

      {/* Layer 2: Animated quote */}
      <AnimatePresence>
        {phase === 'quote' && (
          <div
            key="quote"
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
          >
            <AnimatedQuote onComplete={handleQuoteComplete} />
          </div>
        )}
      </AnimatePresence>

      {/* Layer 3: Streak briefing */}
      <AnimatePresence>
        {phase === 'streak' && !streakLoading && streak.currentStreak > 0 && (
          <StreakBriefing
            key="streak"
            streak={streak}
            onDismiss={handleStreakDismiss}
          />
        )}
        {/* If streak is 0 or loading timed out, skip past it */}
        {phase === 'streak' && !streakLoading && streak.currentStreak === 0 && (
          <HiddenSkip onMount={handleStreakDismiss} />
        )}
      </AnimatePresence>
    </>
  );
}

/** Zero-render helper — calls onMount once so we can skip the streak phase */
function HiddenSkip({ onMount }: { onMount: () => void }) {
  useEffect(() => { onMount(); }, [onMount]);
  return null;
}
