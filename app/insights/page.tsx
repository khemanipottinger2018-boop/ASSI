'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { TrendingUp, ChevronRight, Sparkles, AlertTriangle, BookOpen } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { progressApi } from '@/features/progress/progressApi';
import type { MasteryDistribution } from '@/features/progress/progressApi';
import { listItemVariants, listTransition } from '@/lib/motion';

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

type Section = {
  title:    string;
  subtitle: string;
  icon:     React.ElementType;
  accent:   string;
  items:    MasteryDistribution[];
};

export default function InsightsPage() {
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

  const strengths = subjects.filter(s =>
    s.total > 0 && (s.mastered + s.proficient) > s.total * 0.5
  );
  const needsAttention = subjects.filter(s => s.emerging > 0);
  const inProgress = subjects.filter(s =>
    s.developing > 0 && !((s.mastered + s.proficient) > s.total * 0.5)
  );

  const sections: Section[] = [
    {
      title:    'Strength Areas',
      subtitle: 'More than half of topics are proficient or mastered.',
      icon:     Sparkles,
      accent:   'text-emerald-400',
      items:    strengths,
    },
    {
      title:    'Needs Attention',
      subtitle: 'Topics still emerging — focus your next study sessions here.',
      icon:     AlertTriangle,
      accent:   'text-orange-400',
      items:    needsAttention,
    },
    {
      title:    'In Progress',
      subtitle: 'Topics you\'re developing — keep the momentum going.',
      icon:     TrendingUp,
      accent:   'text-blue-400',
      items:    inProgress,
    },
  ];

  const hasAnyData = subjects.length > 0;
  let stagger = 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <motion.div
        variants={listItemVariants} initial="initial" animate="animate"
        transition={listTransition(0)}
      >
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={18} className="text-orange-400" />
          <h1 className="text-white font-semibold text-xl tracking-tight">Learning Insights</h1>
        </div>
        <p className="text-white/45 text-sm">
          A snapshot of where you stand across your subjects.
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="glass-soft rounded-xl h-5 w-32 animate-pulse" />
              <div className="glass-soft rounded-2xl h-16 animate-pulse" />
              <div className="glass-soft rounded-2xl h-16 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* No data */}
      {!loading && !hasAnyData && (
        <motion.div
          variants={listItemVariants} initial="initial" animate="animate"
          transition={listTransition(1)}
          className="glass-soft rounded-2xl px-6 py-10 text-center"
        >
          <BookOpen size={28} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm font-medium">No insights yet</p>
          <p className="text-white/30 text-xs mt-1 mb-4">
            Complete a session or ask ASSI a topic question to generate your first learning signals.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push('/assi')}
              className="text-xs text-orange-400 hover:text-orange-300 transition underline underline-offset-2"
            >
              Open ASSI
            </button>
            <span className="text-white/15">·</span>
            <button
              onClick={() => router.push('/sessions')}
              className="text-xs text-white/40 hover:text-white/60 transition underline underline-offset-2"
            >
              View sessions
            </button>
          </div>
        </motion.div>
      )}

      {/* Sections */}
      {!loading && hasAnyData && sections.map(section => {
        if (section.items.length === 0) return null;
        const SectionIcon = section.icon;
        return (
          <motion.div
            key={section.title}
            variants={listItemVariants} initial="initial" animate="animate"
            transition={listTransition(stagger++)}
          >
            {/* Section header */}
            <div className="flex items-center gap-2 mb-3">
              <SectionIcon size={14} className={section.accent} />
              <h2 className="text-white/80 font-semibold text-sm">{section.title}</h2>
            </div>
            <p className="text-white/35 text-xs mb-3">{section.subtitle}</p>

            <div className="space-y-2.5">
              {section.items.map((item, i) => (
                <motion.button
                  key={item.subjectId}
                  variants={listItemVariants} initial="initial" animate="animate"
                  transition={{ duration: 0.22, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => router.push(`/progress/${item.subjectId}`)}
                  className="w-full glass-soft rounded-2xl px-4 py-3 text-left hover:bg-white/5 transition group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/75 font-medium">{item.subjectName}</p>
                    <div className="flex items-center gap-1 text-white/22 group-hover:text-white/45 transition">
                      <span className="text-[10px]">
                        {pct(item.mastered + item.proficient, item.total)}% strong
                      </span>
                      <ChevronRight size={11} />
                    </div>
                  </div>

                  <div className="flex h-1.5 rounded-full overflow-hidden gap-px mt-2.5">
                    {item.mastered   > 0 && <div className="bg-emerald-500/65" style={{ width: `${pct(item.mastered, item.total)}%` }} />}
                    {item.proficient > 0 && <div className="bg-blue-500/65"    style={{ width: `${pct(item.proficient, item.total)}%` }} />}
                    {item.developing > 0 && <div className="bg-yellow-500/65"  style={{ width: `${pct(item.developing, item.total)}%` }} />}
                    {item.emerging   > 0 && <div className="bg-orange-500/65"  style={{ width: `${pct(item.emerging, item.total)}%` }} />}
                    {item.total > (item.mastered + item.proficient + item.developing + item.emerging) && (
                      <div className="flex-1 bg-white/6" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
