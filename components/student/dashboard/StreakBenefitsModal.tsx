'use client';

// components/student/dashboard/StreakBenefitsModal.tsx
// Shows the first 3 weeks of streak benefits as a preview,
// then the 365-day grand prize reveal.

import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Star, Lock, Crown, Flame, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  currentStreak: number;
  onClose: () => void;
}

const WEEKLY_BENEFITS = [
  {
    week: 1, days: 7, icon: '🔥', label: 'Week 1',
    credits: 10,
    perks: ['10 bonus credits', 'Streak badge on profile', 'Priority in tutor matching'],
  },
  {
    week: 2, days: 14, icon: '⚡', label: 'Week 2',
    credits: 25,
    perks: ['25 bonus credits', 'Exclusive Week 2 theme', 'Reduced booking fee (-2%)'],
  },
  {
    week: 3, days: 21, icon: '💎', label: 'Week 3',
    credits: 50,
    perks: ['50 bonus credits', 'Free AI session summary', 'Diamond badge unlocked'],
  },
];

const MILESTONE_REWARDS: { days: number; icon: string; reward: string; credits: number }[] = [
  { days: 30,  icon: '🌟', reward: '1 Month',  credits: 100 },
  { days: 60,  icon: '🚀', reward: '2 Months', credits: 200 },
  { days: 100, icon: '💫', reward: '100 Days',  credits: 400 },
  { days: 180, icon: '🏅', reward: '6 Months', credits: 800 },
  { days: 365, icon: '👑', reward: '365 Days',  credits: 0   }, // Grand prize
];

export default function StreakBenefitsModal({ currentStreak, onClose }: Props) {
  const router = useRouter();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 32, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md glass rounded-3xl overflow-hidden"
          style={{ maxHeight: '90vh', overflowY: 'auto', scrollbarWidth: 'none' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/6"
            style={{ background: 'rgba(14,14,20,0.9)', backdropFilter: 'blur(16px)' }}>
            <div className="flex items-center gap-2.5">
              <Flame size={16} className="text-orange-400" />
              <span className="text-white font-semibold text-sm">Streak rewards</span>
            </div>
            <button onClick={onClose} className="glass-soft w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 transition">
              <X size={14} />
            </button>
          </div>

          <div className="p-5 space-y-5">

            {/* Current streak callout */}
            <div className={`rounded-2xl px-4 py-3 border flex items-center gap-3 ${
              currentStreak > 0
                ? 'bg-orange-400/8 border-orange-400/20'
                : 'bg-white/4 border-white/8'
            }`}>
              <span className="text-2xl">🔥</span>
              <div>
                <p className={`font-semibold text-sm ${currentStreak > 0 ? 'text-orange-400' : 'text-white/40'}`}>
                  {currentStreak > 0 ? `${currentStreak} day streak` : 'No streak yet'}
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  {currentStreak > 0
                    ? `${365 - currentStreak} days to the grand prize`
                    : 'Turn on Remember Me and log in daily to start'}
                </p>
              </div>
            </div>

            {/* ── Week 1–3 preview ── */}
            <div>
              <p className="text-white/25 text-[10px] uppercase tracking-widest px-1 mb-3">
                First 3 weeks — preview
              </p>
              <div className="space-y-2">
                {WEEKLY_BENEFITS.map((w) => {
                  const reached = currentStreak >= w.days;
                  const active  = currentStreak >= w.days - 7 && !reached;
                  const progress = Math.min(Math.max(currentStreak - (w.days - 7), 0) / 7, 1);

                  return (
                    <div key={w.week} className={`rounded-2xl border p-4 transition ${
                      reached
                        ? 'bg-orange-400/8 border-orange-400/20'
                        : active
                        ? 'bg-white/4 border-white/10'
                        : 'bg-white/2 border-white/6'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{w.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold ${reached ? 'text-white' : 'text-white/50'}`}>
                                {w.label}
                              </p>
                              {reached && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-400/15 text-orange-400 border border-orange-400/20">
                                  Reached
                                </span>
                              )}
                            </div>
                            <p className="text-white/25 text-xs">{w.days} days</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Zap size={12} className="text-orange-400" />
                          <span className="text-orange-400 text-sm font-semibold">+{w.credits}</span>
                          <span className="text-white/25 text-xs">credits</span>
                        </div>
                      </div>

                      {/* Progress bar — only when working toward this week */}
                      {active && (
                        <div className="mt-3">
                          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress * 100}%` }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="h-full rounded-full bg-orange-400"
                            />
                          </div>
                          <p className="text-white/25 text-[10px] mt-1">
                            {Math.ceil(w.days - currentStreak)} days to unlock
                          </p>
                        </div>
                      )}

                      {/* Perks list */}
                      <div className="mt-3 space-y-1">
                        {w.perks.map((perk, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={`w-1 h-1 rounded-full flex-shrink-0 ${reached ? 'bg-orange-400' : 'bg-white/20'}`} />
                            <p className={`text-xs ${reached ? 'text-white/60' : 'text-white/25'}`}>{perk}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Further milestones ── */}
            <div>
              <p className="text-white/25 text-[10px] uppercase tracking-widest px-1 mb-3">
                Beyond week 3
              </p>
              <div className="space-y-2">
                {MILESTONE_REWARDS.filter(m => m.days !== 365).map((m) => {
                  const reached = currentStreak >= m.days;
                  return (
                    <div key={m.days} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition ${
                      reached ? 'bg-orange-400/6 border-orange-400/15' : 'bg-white/2 border-white/6'
                    }`}>
                      <span className="text-lg">{m.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${reached ? 'text-white/70' : 'text-white/35'}`}>
                          {m.reward}
                        </p>
                        <p className="text-white/20 text-xs">{m.days} days</p>
                      </div>
                      {reached ? (
                        <span className="text-orange-400 text-xs font-medium">✓ Reached</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock size={10} className="text-white/20" />
                          <div className="flex items-center gap-0.5">
                            <Zap size={10} className="text-orange-400/50" />
                            <span className="text-white/25 text-xs">+{m.credits}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Grand prize ── */}
            <div className="relative rounded-3xl overflow-hidden border border-yellow-400/25 p-5"
              style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(249,115,22,0.08))' }}>
              {/* Glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.12), transparent 70%)' }} />

              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center">
                    <Crown size={18} className="text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-yellow-400 font-bold text-base">Grand Prize</p>
                    <p className="text-white/35 text-xs">365 consecutive days</p>
                  </div>
                  {currentStreak >= 365 && (
                    <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/25">
                      Unlocked 🎉
                    </span>
                  )}
                </div>

                <p className="text-white/60 text-sm leading-relaxed mb-4">
                  Log in every day for a full year and earn <span className="text-yellow-400 font-semibold">ASSI+ free for 12 months</span> — access to all premium features, more AI messages, reduced tutor fees, and exclusive rewards.
                </p>

                {currentStreak < 365 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white/25 text-xs">{currentStreak} / 365 days</span>
                      <span className="text-yellow-400/60 text-xs">{Math.round(currentStreak / 365 * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentStreak / 365) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-yellow-400"
                      />
                    </div>
                  </div>
                )}

                <div className="border-t border-white/6 pt-4 flex items-center justify-between gap-3">
                  <p className="text-white/30 text-xs">Can't wait? Get ASSI+ now.</p>
                  <button
                    onClick={() => { onClose(); router.push('/settings?tab=upgrade'); }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-600 font-semibold text-xs hover:bg-white/90 transition shadow-lg shadow-black/20"
                  >
                    <Star size={12} /> Get ASSI+
                  </button>
                </div>
              </div>
            </div>

            {/* Credits explainer */}
            <div className="glass-soft rounded-2xl px-4 py-3.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <ShoppingBag size={13} className="text-orange-400" />
                <p className="text-white/50 text-xs font-medium uppercase tracking-widest">How credits work</p>
              </div>
              <div className="space-y-2">
                {[
                  'Earn credits by logging in daily with Remember Me on',
                  'Spend credits toward tutor session fees like a coupon',
                  'Redeem credits for ASSI+ at any time',
                  'Credits never expire while your account is active',
                ].map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-orange-400/50 mt-1.5 flex-shrink-0" />
                    <p className="text-white/35 text-xs leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}