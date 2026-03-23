'use client';

// components/shared/booking/BookingModal.tsx
// Multi-stage booking modal — works from tutor card + profile page
// Stage 1: Session type (Instant Chat / Book Session) + subject
// Stage 2: Schedule (date, time, duration) + notes
// Stage 3: Confirm — price summary with live currency conversion

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Zap, CalendarPlus, ChevronRight, ChevronLeft,
  Clock, FileText, CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { browseApi }    from '@/lib/api/browse';
import { useCurrency }  from '@/hooks/useCurrency';
import type { SubjectSummary } from '@/lib/api/tutors';

/* ── Types ── */
export type BookingMode = 'instant' | 'scheduled';

export interface BookingModalProps {
  open:        boolean;
  onClose:     () => void;
  tutorId:     string;
  username:    string;
  avatarUrl?:  string | null;
  hourlyRate?: number;        // in JMD
  subjects:    SubjectSummary[];
  isOnline?:   boolean;
  /** Called with the new sessionId after successful booking */
  onSuccess?:  (sessionId: string, mode: BookingMode) => void;
}

type Stage = 1 | 2 | 3;

const DURATIONS = [30, 45, 60, 90, 120] as const;
type Duration = typeof DURATIONS[number];

/* ── Helpers ── */
function minDatetime() {
  const d = new Date(Date.now() + 10 * 60 * 1000); // at least 10 min from now
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/* ── Stage indicator ── */
function StageBar({ stage }: { stage: Stage }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {([1, 2, 3] as Stage[]).map(s => (
        <div
          key={s}
          className={`h-0.5 flex-1 rounded-full transition-all duration-400 ${
            s <= stage ? 'bg-white/50' : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

/* ── Main component ── */
export default function BookingModal({
  open, onClose,
  tutorId, username, avatarUrl, hourlyRate = 0, subjects, isOnline = false,
  onSuccess,
}: BookingModalProps) {
  const { format, loading: currencyLoading } = useCurrency();

  /* Stage state */
  const [stage,     setStage]     = useState<Stage>(1);
  const [mode,      setMode]      = useState<BookingMode>('scheduled');
  const [subjectId, setSubjectId] = useState('');
  const [datetime,  setDatetime]  = useState('');
  const [duration,  setDuration]  = useState<Duration>(60);
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [done,      setDone]      = useState(false);

  /* Reset when modal opens */
  useEffect(() => {
    if (open) {
      setStage(1);
      setMode('scheduled');
      setSubjectId(subjects[0]?.id ?? '');
      setDatetime('');
      setDuration(60);
      setNotes('');
      setError('');
      setDone(false);
    }
  }, [open, subjects]);

  /* Price estimate */
  const estimatedJMD = mode === 'instant' ? 0 : (hourlyRate / 60) * duration;

  /* Stage 1 → 2 validation */
  function nextFromStage1() {
    if (!subjectId) { setError('Please select a subject.'); return; }
    setError('');
    if (mode === 'instant') {
      setStage(3); // skip schedule for instant
    } else {
      setStage(2);
    }
  }

  /* Stage 2 → 3 validation */
  function nextFromStage2() {
    if (!datetime) { setError('Please pick a date and time.'); return; }
    if (new Date(datetime).getTime() - Date.now() < 5 * 60 * 1000) {
      setError('Must be at least 5 minutes from now.');
      return;
    }
    setError('');
    setStage(3);
  }

  /* Submit */
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'instant') {
        const res = await browseApi.instantChat({ tutor_id: tutorId, subject_id: subjectId });
        if (!res.success) throw new Error('Failed to start instant chat');
        setDone(true);
        onSuccess?.(res.sessionId, 'instant');
      } else {
        const res = await browseApi.book({
          tutor_id:         tutorId,
          subject_id:       subjectId,
          scheduled_time:   new Date(datetime).toISOString(),
          duration_minutes: duration,
          notes:            notes.trim(),
        });
        if (!res.success) throw new Error('Failed to book session');
        setDone(true);
        onSuccess?.(res.sessionId, 'scheduled');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }, [mode, tutorId, subjectId, datetime, duration, notes, onSuccess]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="
              fixed z-[10011] inset-x-4 bottom-4 md:inset-auto
              md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:w-full md:max-w-md
              glass rounded-3xl p-6 shadow-2xl
            "
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/25 hover:text-white/60 transition"
            >
              <X size={16} />
            </button>

            {/* Tutor header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl glass-soft flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  : <span className="text-white/50 text-sm font-semibold">{username[0]?.toUpperCase()}</span>
                }
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">{username}</p>
                <p className="text-white/30 text-[11px]">
                  {hourlyRate > 0 ? `${format(hourlyRate)}/hr` : 'Free sessions'}
                </p>
              </div>
            </div>

            <StageBar stage={done ? 3 : stage} />

            {/* ── DONE STATE ── */}
            {done ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4 space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle size={22} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/80 font-medium text-sm">
                    {mode === 'instant' ? 'Chat request sent!' : 'Session booked!'}
                  </p>
                  <p className="text-white/35 text-xs mt-1">
                    {mode === 'instant'
                      ? `Waiting for ${username} to accept…`
                      : `${username} will confirm your session shortly.`
                    }
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="glass-soft px-6 py-2 rounded-xl text-white/60 text-sm hover:text-white/80 transition"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">

                {/* ── STAGE 1 — Type + Subject ── */}
                {stage === 1 && (
                  <motion.div
                    key="s1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0  }}
                    exit={{    opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Session type</p>
                      <div className="grid grid-cols-2 gap-2">

                        {/* Instant Chat */}
                        <button
                          onClick={() => setMode('instant')}
                          disabled={!isOnline}
                          className={`
                            relative flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border transition-all text-left
                            ${!isOnline
                              ? 'opacity-40 cursor-not-allowed glass-soft border-transparent'
                              : mode === 'instant'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'glass-soft border-transparent text-white/50 hover:border-white/15 hover:text-white/70'
                            }
                          `}
                        >
                          <Zap size={14} className={mode === 'instant' && isOnline ? 'text-emerald-400' : ''} />
                          <div>
                            <p className="text-xs font-medium">Instant Chat</p>
                            <p className="text-[10px] opacity-60 mt-0.5">
                              {isOnline ? 'Free · 30–60 min' : 'Tutor offline'}
                            </p>
                          </div>
                        </button>

                        {/* Book Session */}
                        <button
                          onClick={() => setMode('scheduled')}
                          className={`
                            flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border transition-all text-left
                            ${mode === 'scheduled'
                              ? 'bg-white/12 border-white/25 text-white'
                              : 'glass-soft border-transparent text-white/50 hover:border-white/15 hover:text-white/70'
                            }
                          `}
                        >
                          <CalendarPlus size={14} />
                          <div>
                            <p className="text-xs font-medium">Book Session</p>
                            <p className="text-[10px] opacity-60 mt-0.5">Schedule in advance</p>
                          </div>
                        </button>

                      </div>
                    </div>

                    {/* Subject picker */}
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Subject</p>
                      <div className="flex flex-wrap gap-1.5">
                        {subjects.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setSubjectId(s.id)}
                            className={`
                              px-3 py-1.5 rounded-xl text-xs font-medium border transition
                              ${subjectId === s.id
                                ? s.category === 'CAPE'
                                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-200'
                                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200'
                                : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                              }
                            `}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <p className="text-red-400/80 text-xs flex items-center gap-1.5">
                        <AlertCircle size={11} /> {error}
                      </p>
                    )}

                    <button
                      onClick={nextFromStage1}
                      className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/10 border border-white/15 text-white/80 text-sm font-medium hover:bg-white/15 transition"
                    >
                      Continue <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}

                {/* ── STAGE 2 — Schedule ── */}
                {stage === 2 && (
                  <motion.div
                    key="s2"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0  }}
                    exit={{    opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Date + time */}
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Date & time</p>
                      <input
                        type="datetime-local"
                        value={datetime}
                        min={minDatetime()}
                        onChange={e => setDatetime(e.target.value)}
                        className="w-full glass rounded-xl px-4 py-2.5 text-sm text-white/80 outline-none focus:ring-1 focus:ring-white/15 transition [color-scheme:dark]"
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">Duration</p>
                      <div className="flex gap-2 flex-wrap">
                        {DURATIONS.map(d => (
                          <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={`
                              flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition
                              ${duration === d
                                ? 'bg-white/12 border-white/25 text-white'
                                : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                              }
                            `}
                          >
                            <Clock size={10} />
                            {formatDuration(d)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest mb-2">
                        Notes <span className="text-white/15 normal-case">(optional)</span>
                      </p>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="What do you need help with? Topics, exam prep, specific questions…"
                        rows={3}
                        maxLength={500}
                        className="w-full glass rounded-xl px-4 py-3 text-sm text-white/70 placeholder-white/20 outline-none focus:ring-1 focus:ring-white/15 transition resize-none"
                      />
                      <p className="text-white/15 text-[10px] text-right mt-1">{notes.length}/500</p>
                    </div>

                    {error && (
                      <p className="text-red-400/80 text-xs flex items-center gap-1.5">
                        <AlertCircle size={11} /> {error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setStage(1); setError(''); }}
                        className="flex items-center gap-1 px-4 py-3 rounded-2xl glass-soft text-white/40 text-sm hover:text-white/60 transition"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={nextFromStage2}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/10 border border-white/15 text-white/80 text-sm font-medium hover:bg-white/15 transition"
                      >
                        Review <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STAGE 3 — Confirm ── */}
                {stage === 3 && (
                  <motion.div
                    key="s3"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0  }}
                    exit={{    opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Summary card */}
                    <div className="glass-soft rounded-2xl p-4 space-y-3">

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/35">Type</span>
                        <span className="text-white/70 font-medium flex items-center gap-1.5">
                          {mode === 'instant'
                            ? <><Zap size={10} className="text-emerald-400" /> Instant Chat</>
                            : <><CalendarPlus size={10} /> Scheduled Session</>
                          }
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/35">Subject</span>
                        <span className="text-white/70 font-medium">
                          {subjects.find(s => s.id === subjectId)?.name ?? '—'}
                        </span>
                      </div>

                      {mode === 'scheduled' && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/35">Date & time</span>
                            <span className="text-white/70 font-medium">
                              {datetime
                                ? new Date(datetime).toLocaleString(undefined, {
                                    dateStyle: 'medium', timeStyle: 'short',
                                  })
                                : '—'
                              }
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/35">Duration</span>
                            <span className="text-white/70 font-medium">{formatDuration(duration)}</span>
                          </div>
                        </>
                      )}

                      {mode === 'instant' && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/35">Duration</span>
                          <span className="text-white/70 font-medium">30–60 min (free)</span>
                        </div>
                      )}

                      {notes.trim() && (
                        <div className="flex items-start justify-between text-xs gap-4">
                          <span className="text-white/35 flex-shrink-0">Notes</span>
                          <span className="text-white/50 text-right line-clamp-2">{notes}</span>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-white/8 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white/35 text-xs">Estimated total</span>
                          {currencyLoading ? (
                            <Loader2 size={12} className="text-white/30 animate-spin" />
                          ) : mode === 'instant' ? (
                            <span className="text-emerald-400 text-sm font-semibold">Free</span>
                          ) : (
                            <span className="text-white/80 text-sm font-semibold">
                              {format(estimatedJMD)}
                            </span>
                          )}
                        </div>
                        {mode === 'scheduled' && (
                          <p className="text-white/20 text-[10px] mt-1">
                            Payment only charged after session completes
                          </p>
                        )}
                      </div>
                    </div>

                    {error && (
                      <p className="text-red-400/80 text-xs flex items-center gap-1.5">
                        <AlertCircle size={11} /> {error}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setStage(mode === 'instant' ? 1 : 2); setError(''); }}
                        disabled={loading}
                        className="flex items-center gap-1 px-4 py-3 rounded-2xl glass-soft text-white/40 text-sm hover:text-white/60 transition"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`
                          flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all
                          ${mode === 'instant'
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'
                            : 'bg-white/12 border border-white/20 text-white/85 hover:bg-white/18'
                          }
                          ${loading ? 'opacity-60 cursor-not-allowed' : ''}
                        `}
                      >
                        {loading
                          ? <Loader2 size={14} className="animate-spin" />
                          : mode === 'instant'
                            ? <><Zap size={13} /> Start Chat</>
                            : <><CalendarPlus size={13} /> Confirm Booking</>
                        }
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}