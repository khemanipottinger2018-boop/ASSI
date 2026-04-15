'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingUp } from 'lucide-react';

interface TutorEarningsCardProps {
  totalEarned: number;
  sessionCount: number;
  loading?: boolean;
}

export default function TutorEarningsCard({ totalEarned, sessionCount, loading }: TutorEarningsCardProps) {
  const avgPerSession = sessionCount > 0 ? totalEarned / sessionCount : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
      className="panel rounded-2xl p-5 relative overflow-hidden"
    >
      {/* Subtle green glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 90% 50%, rgba(52,211,153,0.06), transparent)' }} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest">Total Earned</p>
          {loading ? (
            <div className="h-8 w-24 rounded-lg bg-white/8 animate-pulse mt-2" />
          ) : (
            <p className="text-white font-bold text-3xl mt-1 tracking-tight">
              ${totalEarned.toFixed(2)}
            </p>
          )}
        </div>
        <div className="glass-soft w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0">
          <DollarSign size={16} className="text-emerald-400" />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/8">
        <div>
          <p className="text-white/25 text-[10px] uppercase tracking-wide">Sessions</p>
          <p className="text-white/60 text-sm font-medium mt-0.5">{loading ? '—' : sessionCount}</p>
        </div>
        <div className="w-px h-6 bg-white/8" />
        <div>
          <p className="text-white/25 text-[10px] uppercase tracking-wide">Avg / session</p>
          <p className="text-white/60 text-sm font-medium mt-0.5">
            {loading ? '—' : `$${avgPerSession.toFixed(0)}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-emerald-400/50">
          <TrendingUp size={12} />
          <span className="text-[10px]">Lifetime</span>
        </div>
      </div>
    </motion.div>
  );
}