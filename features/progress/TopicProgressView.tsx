'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Loader2, BookOpen } from 'lucide-react';
import { listItemVariants, listTransition } from '@/lib/motion';
import { progressApi } from './progressApi';
import type { UnitWithTopics, TopicWithMastery, MasteryLevel } from './progressApi';

const MASTERY_CONFIG: Record<MasteryLevel, { label: string; color: string; bg: string; border: string }> = {
  MASTERED:   { label: 'Mastered',   color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
  PROFICIENT: { label: 'Proficient', color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/25'    },
  DEVELOPING: { label: 'Developing', color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/25'  },
  EMERGING:   { label: 'Emerging',   color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/25'  },
};

function MasteryBadge({ mastery }: { mastery: MasteryLevel | null }) {
  if (!mastery) {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/25">
        Not started
      </span>
    );
  }
  const cfg = MASTERY_CONFIG[mastery];
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function TopicRow({ topic, index }: { topic: TopicWithMastery; index: number }) {
  return (
    <motion.div
      variants={listItemVariants}
      transition={listTransition(index)}
      className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-white/3 transition"
    >
      <span className="text-sm text-white/65">{topic.name}</span>
      <MasteryBadge mastery={topic.mastery} />
    </motion.div>
  );
}

function UnitAccordion({ unit, defaultOpen }: { unit: UnitWithTopics; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const masteredCount = unit.topics.filter(t => t.mastery === 'MASTERED').length;
  const totalCount    = unit.topics.length;

  return (
    <div className="panel rounded-2xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/3 transition"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="w-7 h-7 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center flex-shrink-0">
            <BookOpen size={13} className="text-white/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/80">{unit.name}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{masteredCount}/{totalCount} mastered</p>
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`text-white/30 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/6 px-2 py-2 space-y-0.5">
              {unit.topics.length === 0 ? (
                <p className="text-center text-white/22 text-xs py-4">No topics in this unit</p>
              ) : (
                <motion.div initial="initial" animate="animate">
                  {unit.topics.map((topic, i) => (
                    <TopicRow key={topic.id} topic={topic} index={i} />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TopicProgressView({ subjectId }: { subjectId: string }) {
  const [units,   setUnits]   = useState<UnitWithTopics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    progressApi.getSubjectProgress(subjectId)
      .then(data => {
        if (data.success) {
          setUnits(data.units ?? []);
        } else {
          setError('Failed to load progress');
        }
      })
      .catch(() => setError('Failed to load progress'))
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-white/28 text-sm">
        <Loader2 size={15} className="animate-spin" />
        Loading progress…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-red-400/60 text-sm">{error}</div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="py-16 text-center text-white/22 text-sm">No curriculum data available for this subject</div>
    );
  }

  return (
    <div className="space-y-3">
      {units.map((unit, i) => (
        <UnitAccordion key={unit.id} unit={unit} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
