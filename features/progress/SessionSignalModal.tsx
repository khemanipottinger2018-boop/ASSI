'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { modalVariants, modalTransition, backdropVariants, backdropTransition } from '@/lib/motion';
import { useSubjects } from '@/features/platform';
import { progressApi } from './progressApi';
import type { CurriculumUnit } from './progressApi';

type Props = {
  subjectName: string;
  isOpen:      boolean;
  onClose:     () => void;
};

export default function SessionSignalModal({ subjectName, isOpen, onClose }: Props) {
  const { subjects } = useSubjects();

  const [units,      setUnits]      = useState<CurriculumUnit[]>([]);
  const [loadingCur, setLoadingCur] = useState(false);
  const [curError,   setCurError]   = useState(false);

  const [topicId,     setTopicId]     = useState('');
  const [confidence,  setConfidence]  = useState<number>(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done,        setDone]        = useState(false);

  // Reset state every time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setTopicId('');
    setConfidence(0);
    setSubmitting(false);
    setSubmitError(null);
    setDone(false);
    setUnits([]);
    setCurError(false);
  }, [isOpen]);

  // Resolve subjectId from name and fetch curriculum
  useEffect(() => {
    if (!isOpen || !subjectName) return;

    const match = subjects.find(
      s => s.name.toLowerCase() === subjectName.toLowerCase(),
    );
    if (!match) {
      setCurError(true);
      return;
    }

    setLoadingCur(true);
    progressApi.getSubjectCurriculum(match.id)
      .then(data => {
        if (data.success) {
          setUnits(data.units ?? []);
        } else {
          setCurError(true);
        }
      })
      .catch(() => setCurError(true))
      .finally(() => setLoadingCur(false));
  }, [isOpen, subjectName, subjects]);

  async function handleSubmit() {
    if (!topicId || confidence === 0 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await progressApi.postSessionSignal({ topicId, studentConfidence: confidence });
      if (res.success) {
        setDone(true);
        setTimeout(onClose, 1200);
      } else {
        setSubmitError('Failed to save — try again');
      }
    } catch {
      setSubmitError('Failed to save — try again');
    } finally {
      setSubmitting(false);
    }
  }

  const allTopics = units.flatMap(u =>
    u.topics.map(t => ({ ...t, unitName: u.name })),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={backdropTransition}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={modalTransition}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="panel rounded-3xl border border-white/10 w-full max-w-sm pointer-events-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
                <div>
                  <h2 className="text-white font-semibold text-sm">How did it go?</h2>
                  <p className="text-white/35 text-xs mt-0.5">{subjectName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/6 transition"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {done ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <CheckCircle2 size={28} className="text-emerald-400" />
                    <p className="text-white/60 text-sm">Signal recorded</p>
                  </div>
                ) : curError ? (
                  <div className="text-center py-4">
                    <p className="text-white/35 text-sm">Topic data unavailable for this subject.</p>
                    <button
                      onClick={onClose}
                      className="mt-3 text-white/40 text-xs hover:text-white/70 transition underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : loadingCur ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-white/28 text-sm">
                    <Loader2 size={14} className="animate-spin" />
                    Loading topics…
                  </div>
                ) : (
                  <>
                    {/* Topic selector */}
                    <div>
                      <label className="text-[11px] text-white/40 uppercase tracking-widest block mb-2">
                        Topic covered
                      </label>
                      <select
                        value={topicId}
                        onChange={e => setTopicId(e.target.value)}
                        className="w-full glass-soft rounded-xl px-3 py-2.5 text-sm text-white/80 bg-transparent border border-white/10 focus:border-white/22 outline-none transition appearance-none"
                        style={{ backgroundImage: 'none' }}
                      >
                        <option value="" className="bg-[#0a0a10] text-white/50">
                          Select a topic…
                        </option>
                        {allTopics.map(t => (
                          <option key={t.id} value={t.id} className="bg-[#0a0a10] text-white/80">
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Confidence selector */}
                    <div>
                      <label className="text-[11px] text-white/40 uppercase tracking-widest block mb-3">
                        Your confidence (1 = low, 5 = high)
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button
                            key={n}
                            onClick={() => setConfidence(n)}
                            className={`flex-1 h-10 rounded-xl border text-sm font-semibold transition ${
                              confidence >= n
                                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                                : 'border-white/10 text-white/25 hover:border-white/20 hover:text-white/50'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {submitError && (
                      <p className="text-red-400/70 text-xs">{submitError}</p>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={!topicId || confidence === 0 || submitting}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-30"
                      style={{ background: 'linear-gradient(135deg, #f97316, #c026d3)' }}
                    >
                      {submitting
                        ? <Loader2 size={14} className="animate-spin mx-auto" />
                        : 'Save signal'
                      }
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
