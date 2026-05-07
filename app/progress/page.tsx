'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronRight, BookOpen } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { progressApi } from '@/features/progress/progressApi';
import type { MasteryDistribution } from '@/features/progress/progressApi';
import { listItemVariants, listTransition } from '@/lib/motion';

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

export default function ProgressPage() {
  const { user, isStudent, isTutor } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState<MasteryDistribution[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    if (isTutor) { router.push('/dashboard/tutor'); return; }

    progressApi.getProgressMe()
      .then(d => { if (d.success) setSubjects(d.subjects ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isTutor, router]);

  if (!isStudent && !loading) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <motion.div
        variants={listItemVariants} initial="initial" animate="animate"
        transition={listTransition(0)}
      >
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={18} className="text-orange-400" />
          <h1 className="text-white font-semibold text-xl tracking-tight">Your Progress</h1>
        </div>
        <p className="text-white/45 text-sm">
          Track mastery across every subject you&apos;ve studied.
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="glass-soft rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && subjects.length === 0 && (
        <motion.div
          variants={listItemVariants} initial="initial" animate="animate"
          transition={listTransition(1)}
          className="glass-soft rounded-2xl px-6 py-10 text-center"
        >
          <BookOpen size={28} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm font-medium">No mastery data yet</p>
          <p className="text-white/30 text-xs mt-1 mb-4">
            Start studying with ASSI or complete a session to track your progress.
          </p>
          <button
            onClick={() => router.push('/assi')}
            className="text-xs text-orange-400 hover:text-orange-300 transition underline underline-offset-2"
          >
            Open ASSI
          </button>
        </motion.div>
      )}

      {/* Subject cards */}
      {!loading && subjects.map((item, i) => (
        <motion.button
          key={item.subjectId}
          variants={listItemVariants} initial="initial" animate="animate"
          transition={listTransition(i + 1)}
          onClick={() => router.push(`/progress/${item.subjectId}`)}
          className="w-full glass-soft rounded-2xl px-5 py-4 text-left hover:bg-white/5 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/85 font-medium text-sm">{item.subjectName}</p>
            <div className="flex items-center gap-1.5 text-white/25 group-hover:text-white/50 transition">
              <span className="text-[10px]">{item.total} topic{item.total !== 1 ? 's' : ''}</span>
              <ChevronRight size={12} />
            </div>
          </div>

          {/* 4-segment mastery bar */}
          <div className="flex h-2 rounded-full overflow-hidden gap-px">
            {item.mastered   > 0 && <div className="bg-emerald-500/70" style={{ width: `${pct(item.mastered, item.total)}%` }} />}
            {item.proficient > 0 && <div className="bg-blue-500/70"    style={{ width: `${pct(item.proficient, item.total)}%` }} />}
            {item.developing > 0 && <div className="bg-yellow-500/70"  style={{ width: `${pct(item.developing, item.total)}%` }} />}
            {item.emerging   > 0 && <div className="bg-orange-500/70"  style={{ width: `${pct(item.emerging, item.total)}%` }} />}
            {item.total > (item.mastered + item.proficient + item.developing + item.emerging) && (
              <div className="flex-1 bg-white/8" />
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {item.mastered   > 0 && <span className="text-[9px] text-emerald-400/70">{item.mastered} mastered</span>}
            {item.proficient > 0 && <span className="text-[9px] text-blue-400/70">{item.proficient} proficient</span>}
            {item.developing > 0 && <span className="text-[9px] text-yellow-400/70">{item.developing} developing</span>}
            {item.emerging   > 0 && <span className="text-[9px] text-orange-400/70">{item.emerging} emerging</span>}
          </div>
        </motion.button>
      ))}
    </div>
  );
}
