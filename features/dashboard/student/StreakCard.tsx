'use client';

// components/student/dashboard/StreakCard.tsx
// Full streak card — pause mechanic, credits, milestone progress, benefits modal trigger.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Star, Zap, Pause, Play, ChevronRight, Info } from 'lucide-react';
import type { UserStreak } from '@/lib/api/user';
import StreakBenefitsModal from './StreakBenefitsModal';

const REMEMBER_ME_KEY = 'assi:remember_me';

// How long a pause lasts before streak resets (ms)
const PAUSE_DURATION_DAYS = 7;
const PAUSE_KEY = 'assi:streak_pause';

interface PauseState {
  pausedAt:  string; // ISO
  resumeBy:  string; // ISO — after this, streak resets
}

function getPauseState(): PauseState | null {
  try {
    const raw = localStorage.getItem(PAUSE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePauseState(state: PauseState | null) {
  if (state) localStorage.setItem(PAUSE_KEY, JSON.stringify(state));
  else localStorage.removeItem(PAUSE_KEY);
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

// 7 pip indicators
function WeekPips({ streak }: { streak: number }) {
  const filled = Math.min(streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0), 7);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.04 }}
          className={`h-1.5 rounded-full transition-all ${
            i < filled ? 'w-5 bg-orange-400' : 'w-2 bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

interface Props {
  streak:   UserStreak;
  loading?: boolean;
}

export function StreakCardSkeleton() {
  return (
    <div className="surface rounded-2xl px-4 py-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/8" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded-lg bg-white/8" />
            <div className="h-3 w-32 rounded-lg bg-white/8" />
          </div>
        </div>
        <div className="h-3 w-16 rounded-lg bg-white/8" />
      </div>
    </div>
  );
}

export default function StreakCard({ streak, loading }: Props) {
  const [paused,       setPaused]       = useState<PauseState | null>(() => getPauseState());
  const [showBenefits, setShowBenefits] = useState(false);
  const [pauseConfirm, setPauseConfirm] = useState(false);

  if (loading) return <StreakCardSkeleton />;

  const { currentStreak, longestStreak } = streak;
  const rememberMeOn = typeof window !== 'undefined'
    ? localStorage.getItem(REMEMBER_ME_KEY) === 'true'
    : false;

  const is365    = currentStreak >= 365;
  const isActive = currentStreak > 0 && !paused;

  // Next milestone
  const MILESTONES = [7, 14, 21, 30, 60, 100, 180, 365];
  const nextMs     = MILESTONES.find(m => m > currentStreak) ?? 365;
  const daysToNext = nextMs - currentStreak;

  function handlePause() {
    if (paused) {
      // Resume
      savePauseState(null);
      setPaused(null);
      setPauseConfirm(false);
    } else {
      // Pause for up to 7 days
      const now      = new Date();
      const resumeBy = new Date(now.getTime() + PAUSE_DURATION_DAYS * 86_400_000);
      const state: PauseState = {
        pausedAt: now.toISOString(),
        resumeBy: resumeBy.toISOString(),
      };
      savePauseState(state);
      setPaused(state);
      setPauseConfirm(false);
    }
  }

  const pauseDaysLeft = paused ? daysUntil(paused.resumeBy) : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`panel rounded-2xl overflow-hidden border transition-all ${
          is365    ? 'border-yellow-400/25' :
          paused   ? 'border-white/8' :
          isActive ? 'border-orange-400/20' :
                     'border-white/8'
        }`}
      >
        {/* Top accent bar */}
        <div className={`h-0.5 w-full ${
          is365    ? 'bg-gradient-to-r from-yellow-400/60 via-yellow-300 to-yellow-400/60' :
          paused   ? 'bg-white/10' :
          isActive ? 'bg-gradient-to-r from-orange-500/40 via-orange-400 to-orange-500/40' :
                     'bg-white/6'
        }`} />

        <div className="px-4 py-4">
          {/* ── Main row ── */}
          <div className="flex items-center gap-3">

            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              is365    ? 'bg-yellow-400/15' :
              paused   ? 'bg-white/6' :
              isActive ? 'bg-orange-400/15' :
                         'bg-white/6'
            }`}>
              {is365 ? (
                <Star size={17} className="text-yellow-400" />
              ) : paused ? (
                <Pause size={15} className="text-white/30" />
              ) : (
                <Flame size={17} className={isActive ? 'text-orange-400' : 'text-white/20'} />
              )}
            </div>

            {/* Count + label */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className={`text-2xl font-bold leading-none ${
                  is365    ? 'text-yellow-400' :
                  paused   ? 'text-white/30' :
                  isActive ? 'text-orange-400' :
                             'text-white/30'
                }`}>
                  {currentStreak}
                </span>
                <span className="text-white/30 text-xs">day{currentStreak !== 1 ? 's' : ''}</span>

                {paused && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-white/35">
                    Paused · {pauseDaysLeft}d left
                  </span>
                )}

                {!rememberMeOn && !paused && (
                  <span className="text-[10px] text-white/25 ml-1">
                    (Remember Me off — streak inactive)
                  </span>
                )}
              </div>

              {/* Week pips */}
              <div className="flex items-center gap-2 mt-2">
                <WeekPips streak={currentStreak} />
                {longestStreak > currentStreak && longestStreak > 0 && (
                  <span className="text-white/15 text-[10px]">best {longestStreak}</span>
                )}
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Benefits button */}
              <button
                onClick={() => setShowBenefits(true)}
                className="bg-white/8 border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-1 text-white/35 hover:text-white/65 transition"
              >
                <Info size={11} />
                <span className="text-[10px] font-medium">Rewards</span>
                <ChevronRight size={10} />
              </button>
            </div>
          </div>

          {/* ── Next milestone ── */}
          {!paused && currentStreak < 365 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/20 text-[10px]">
                  {daysToNext}d to {nextMs === 365 ? 'grand prize' : `day ${nextMs}`}
                </span>
                {streak && (
                  <div className="flex items-center gap-1">
                    <Zap size={9} className="text-orange-400/60" />
                    <span className="text-orange-400/60 text-[10px]">+credits on milestone</span>
                  </div>
                )}
              </div>
              <div className="h-1 rounded-full bg-white/6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStreak % (nextMs === 7 ? 7 : (nextMs - (MILESTONES[MILESTONES.indexOf(nextMs) - 1] ?? 0)))) / (nextMs === 7 ? 7 : (nextMs - (MILESTONES[MILESTONES.indexOf(nextMs) - 1] ?? 0)))) * 100}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full bg-orange-400"
                />
              </div>
            </div>
          )}

          {/* ── Pause confirm / button ── */}
          <AnimatePresence>
            {pauseConfirm && !paused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-white/6"
              >
                <p className="text-white/40 text-xs mb-2 leading-relaxed">
                  Pausing protects your streak for up to <span className="text-white/65 font-medium">7 days</span>. After that it resets. You can only pause once per month.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePause}
                    className="flex-1 py-2 rounded-xl bg-white/8 border border-white/12 text-white/60 hover:text-white/80 text-xs font-medium transition"
                  >
                    Yes, pause it
                  </button>
                  <button
                    onClick={() => setPauseConfirm(false)}
                    className="flex-1 py-2 rounded-xl text-white/25 hover:text-white/50 text-xs transition"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pause / resume button */}
          <div className="mt-3 pt-3 border-t border-white/6 flex items-center justify-between">
            <p className="text-white/35 text-[10px]">
              {paused
                ? `Streak safe until ${new Date(paused.resumeBy).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Streak counts daily with Remember Me on'}
            </p>
            <button
              onClick={paused ? handlePause : () => setPauseConfirm(p => !p)}
              className={`flex items-center gap-1.5 text-[11px] font-medium transition ${
                paused
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-white/25 hover:text-white/50'
              }`}
            >
              {paused ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
            </button>
          </div>
        </div>
      </motion.div>

      {showBenefits && (
        <StreakBenefitsModal
          currentStreak={currentStreak}
          onClose={() => setShowBenefits(false)}
        />
      )}
    </>
  );
}