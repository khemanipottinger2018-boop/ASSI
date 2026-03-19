'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams }               from 'next/navigation';
import { motion, AnimatePresence }                  from 'framer-motion';
import {
  Loader2, Users, ArrowLeft, X,
  Wifi, WifiOff, Clock, ChevronRight,
} from 'lucide-react';
import { useAuth }           from '@/contexts/AuthContext';
import SubjectDropdown, { Subject } from '@/components/shared/service-selector/SubjectDropdown';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ── Types ── */

// Matches shape from GET /api/tutors/available — backend source of truth
interface AvailableTutor {
  tutorId:         string;
  userId:          string;
  username:        string;
  bio:             string;
  hourlyRate:      number;
  chatMode:        string | null;
  isStudentTutor?: boolean;
  totalSessions?:  number;
  subjects:        { id: string; name: string; category: string | null }[];
}

type Step = 'subject' | 'tutors' | 'requesting' | 'error';

// All tutors from /api/tutors/available are online by definition
const AVAILABLE_DOT = { bg: '#34d399', glow: '0 0 6px rgba(52,211,153,0.7)', label: 'Available' };

/* ══════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════ */

export default function LiveChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Seed from ServiceSelector query params (subject + subjectId)
  const paramSubjectId   = searchParams.get('subjectId')?.trim()   || null;
  const paramSubjectName = searchParams.get('subject')?.trim()     || null;

  const [step,           setStep]           = useState<Step>(paramSubjectId ? 'tutors' : 'subject');
  const [subjectId,      setSubjectId]      = useState<string | null>(paramSubjectId);
  const [subjectName,    setSubjectName]    = useState<string | null>(paramSubjectName);
  const [tutors,         setTutors]         = useState<AvailableTutor[]>([]);
  const [loadingTutors,  setLoadingTutors]  = useState(false);
  const [requestingId,   setRequestingId]   = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/signin');
  }, [authLoading, user, router]);

  /* ── Fetch tutors whenever subjectId is known ── */
  const fetchTutors = useCallback(async (sid: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoadingTutors(true);
    setTutors([]);
    setError(null);

    try {
      const res  = await fetch(
        `${API_URL}/api/tutors/available?subjectId=${encodeURIComponent(sid)}`,
        { credentials: 'include', signal: ctrl.signal },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not load tutors');
      setTutors(data.tutors ?? []);
      setStep('tutors');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Something went wrong');
      setStep('error');
    } finally {
      setLoadingTutors(false);
    }
  }, []);

  useEffect(() => {
    if (subjectId) fetchTutors(subjectId);
  }, [subjectId, fetchTutors]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  /* ── Subject selected (from inline picker) ── */
  const handleSubjectSelect = (subject: Subject) => {
    setSubjectId(subject.id);
    setSubjectName(subject.name);
    setStep('tutors');
  };

  /* ── Request a specific tutor ── */
  const requestTutor = async (tutorId: string) => {
    if (requestingId) return;
    setRequestingId(tutorId);
    setError(null);

    try {
      const res  = await fetch(`${API_URL}/api/live-chat/create`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ subjectId, tutorId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.chatId) {
        throw new Error(data?.error || 'Could not start session');
      }

      router.replace(`/live-chat/${data.chatId}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setStep('error');
    } finally {
      setRequestingId(null);
    }
  };

  /* ── Loading auth ── */
  if (authLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */

  return (
    <div className="h-full flex flex-col items-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-xl">

        {/* ── Back button ── */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/40 text-sm hover:text-white/70 transition mb-6"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════
              STEP: subject selection
              ════════════════════════════════════════ */}
          {step === 'subject' && (
            <motion.div
              key="subject"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-white font-semibold text-xl mb-1">Find a Tutor</h1>
              <p className="text-white/45 text-sm mb-6">
                Choose a subject to see who's available right now.
              </p>
              <SubjectDropdown
                selected={null}
                onSelect={handleSubjectSelect}
              />
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STEP: tutor list
              ════════════════════════════════════════ */}
          {(step === 'tutors' || (step === 'requesting' && tutors.length > 0)) && (
            <motion.div
              key="tutors"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-white font-semibold text-xl">
                    {subjectName ?? 'Tutors'}
                  </h1>
                  <p className="text-white/45 text-sm mt-0.5">
                    Select a tutor to request a session.
                  </p>
                </div>
                {/* Change subject */}
                <button
                  onClick={() => { setStep('subject'); setSubjectId(null); setSubjectName(null); }}
                  className="text-xs text-white/35 hover:text-white/60 transition underline underline-offset-2"
                >
                  Change subject
                </button>
              </div>

              {/* Loading skeleton */}
              {loadingTutors && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/8 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-32 bg-white/8 rounded" />
                          <div className="h-2 w-48 bg-white/5 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loadingTutors && tutors.length === 0 && (
                <div className="glass rounded-2xl px-8 py-12 text-center">
                  <WifiOff size={24} className="text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm font-medium">No tutors available right now</p>
                  <p className="text-white/30 text-xs mt-1">
                    Check back soon, or try a different subject.
                  </p>
                  <button
                    onClick={() => { setStep('subject'); setSubjectId(null); setSubjectName(null); }}
                    className="mt-5 text-xs text-white/40 hover:text-white/70 underline underline-offset-2 transition"
                  >
                    Try another subject
                  </button>
                </div>
              )}

              {/* Tutor cards */}
              {!loadingTutors && tutors.length > 0 && (
                <div className="space-y-3">
                  {tutors.map(tutor => {
                    const dot       = AVAILABLE_DOT;
                    const isBlocked = false;
                    const isThisOne = requestingId === tutor.userId;

                    return (
                      <motion.div
                        key={tutor.userId}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="glass rounded-2xl p-4"
                        style={{ opacity: isBlocked ? 0.5 : 1 }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                              style={{ background: 'rgba(255,255,255,0.1)' }}
                            >
                              {tutor.username[0]?.toUpperCase()}
                            </div>
                            {/* Availability dot */}
                            <span style={{
                              position: 'absolute', bottom: -1, right: -1,
                              width: 10, height: 10, borderRadius: '50%',
                              background: dot.bg, boxShadow: dot.glow,
                              border: '1.5px solid rgba(0,0,0,0.5)',
                              animation: 'pulse 2.5s infinite',
                            }} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white/90 text-sm font-semibold">
                                {tutor.username}
                              </p>
                              <span style={{
                                fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600,
                                background: 'rgba(52,211,153,0.12)',
                                border: '1px solid rgba(52,211,153,0.25)',
                                color: dot.bg,
                              }}>
                                {dot.label}
                              </span>
                            </div>

                            {/* Subjects taught */}
                            {tutor.subjects.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {tutor.subjects.slice(0, 3).map((s, i) => (
                                  <span key={s.name} className="text-[10px] text-white/35">
                                    {s.name}{i < Math.min(tutor.subjects.length, 3) - 1 ? ' ·' : ''}
                                  </span>
                                ))}
                                {tutor.subjects.length > 3 && (
                                  <span className="text-[10px] text-white/25">+{tutor.subjects.length - 3} more</span>
                                )}
                              </div>
                            )}

                            {/* Rating + session count */}
                            <div className="flex items-center gap-3 mt-1">
                            </div>
                          </div>

                          {/* Request button */}
                          <button
                            onClick={() => !isBlocked && requestTutor(tutor.userId)}
                            disabled={isBlocked || !!requestingId}
                            style={{
                              flexShrink: 0,
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '8px 14px', borderRadius: 10,
                              fontSize: 12, fontWeight: 600, cursor: isBlocked ? 'not-allowed' : 'pointer',
                              background: isBlocked
                                ? 'rgba(255,255,255,0.04)'
                                : isThisOne
                                  ? 'rgba(52,211,153,0.15)'
                                  : 'rgba(52,211,153,0.12)',
                              border: `1px solid ${isBlocked
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(52,211,153,0.3)'}`,
                              color: isBlocked ? 'rgba(255,255,255,0.2)' : '#34d399',
                              opacity: (!!requestingId && !isThisOne) ? 0.4 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            {isThisOne
                              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              : <ChevronRight size={13} />
                            }
                            {isThisOne ? 'Connecting…' : 'Request'}
                          </button>
                        </div>

                        {/* Bio */}
                        {tutor.bio && (
                          <p className="mt-3 text-xs text-white/35 leading-relaxed pl-[52px]">
                            {tutor.bio}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════
              STEP: error
              ════════════════════════════════════════ */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="glass rounded-2xl px-10 py-12 text-center"
            >
              <div className="flex justify-center mb-5">
                <div className="glass-soft w-14 h-14 rounded-full flex items-center justify-center">
                  <X size={22} className="text-red-400" />
                </div>
              </div>
              <h2 className="text-white font-semibold text-lg mb-2">Something went wrong</h2>
              <p className="text-white/50 text-sm mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2.5 rounded-xl glass-soft text-white/70 text-sm font-medium hover:bg-white/10 transition"
                >
                  Go back
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    if (subjectId) {
                      setStep('tutors');
                      fetchTutors(subjectId);
                    } else {
                      setStep('subject');
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white text-orange-600 text-sm font-semibold hover:bg-white/90 transition"
                >
                  Try again
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}