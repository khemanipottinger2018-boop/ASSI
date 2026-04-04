'use client';

// app/live-chat/page.tsx
//
// The live-chat lobby — single entry point for ALL session types.
//
// Entry flows:
//   A) From service selector / booking flow:
//      ?mode=instant&subjectId=x&tutorId=y  → skip directly to instant tutor request
//      ?mode=group_study&subjectId=x        → skip to group study creation
//      ?mode=conference&subjectId=x         → skip to conference creation (tutors only)
//
//   B) Direct nav (no params):
//      Shows the full lobby — mode picker → subject → action
//
// All session creation hits the backend (Redis + socket).
// No hardcoded presence — online status is live from /api/tutors/available.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams }                from 'next/navigation';
import { motion, AnimatePresence }                   from 'framer-motion';
import {
  Loader2, ArrowLeft, X, WifiOff,
  Zap, Users, Radio, ChevronRight,
} from 'lucide-react';
import { useAuth }  from '@/features/auth';
import { useTheme } from '@/features/themes/core/ThemeProvider';
import SubjectDropdown, { Subject } from '@/features/browse/SubjectDropdown';
import type { SessionType } from '@/features/live-chat/types/SocketEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* ── Types ── */
interface AvailableTutor {
  tutorId:         string;
  userId:          string;
  username:        string;
  bio:             string;
  hourlyRate:      number;
  avatarUrl:       string | null;
  chatMode:        string | null;
  isStudentTutor?: boolean;
  totalSessions?:  number;
  subjects:        { id: string; name: string; category: string | null }[];
}

type Step = 'mode' | 'subject' | 'tutors' | 'creating' | 'error';

/* ── Session mode definitions ── */
interface SessionMode {
  type:        SessionType;
  label:       string;
  description: string;
  icon:        React.ElementType;
  color:       string;
  border:      string;
  textColor:   string;
  forRoles:    ('student' | 'tutor')[];
  requiresPlus: boolean;
  capacity:    string;
}

const SESSION_MODES: SessionMode[] = [
  {
    type:         'instant',
    label:        'Instant Chat',
    description:  'Connect 1:1 with an available tutor right now. Free for up to 60 minutes.',
    icon:         Zap,
    color:        'bg-emerald-500/12',
    border:       'border-emerald-500/25',
    textColor:    'text-emerald-300',
    forRoles:     ['student'],
    requiresPlus: false,
    capacity:     '1:1 · Free · 60 min max',
  },
  {
    type:         'group_study',
    label:        'Group Study',
    description:  'Study together with peers. Invite friends or classmates to join your room.',
    icon:         Users,
    color:        'bg-blue-500/12',
    border:       'border-blue-500/25',
    textColor:    'text-blue-300',
    forRoles:     ['student', 'tutor'],
    requiresPlus: false,
    capacity:     '3 members free · 6 with ASSI+',
  },
  {
    type:         'conference',
    label:        'Conference',
    description:  'Host a live teaching session. You control who speaks, mute, and grant the floor.',
    icon:         Radio,
    color:        'bg-orange-500/12',
    border:       'border-orange-500/25',
    textColor:    'text-orange-300',
    forRoles:     ['tutor'],
    requiresPlus: false,
    capacity:     'Tutors only · Unlimited attendees',
  },
];

/* ── Mode badge sub-component ── */
function ModeBadge({ mode }: { mode: SessionType }) {
  const m = SESSION_MODES.find(s => s.type === mode);
  if (!m) return null;
  const Icon = m.icon;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${m.color} border ${m.border}`}>
      <Icon size={12} className={m.textColor} />
      <span className={`text-xs font-medium ${m.textColor}`}>{m.label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   LOBBY PAGE
   ════════════════════════════════════════════════════ */
export default function LiveChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router                            = useRouter();
  const searchParams                      = useSearchParams();
  const { setSubjectOverride }            = useTheme();

  const role   = user?.role === 'tutor' ? 'tutor' : 'student';

  /* ── URL params from service selector / booking flow ── */
  const paramMode      = (searchParams.get('mode') as SessionType | null)      || null;
  const paramSubjectId = searchParams.get('subjectId')?.trim()                 || null;
  const paramSubjectNm = searchParams.get('subject')?.trim()                   || null;
  const paramTutorId   = searchParams.get('tutorId')?.trim()                   || null;

  /* ── State ── */
  const [step,          setStep]          = useState<Step>(() => {
    if (paramMode && paramSubjectId) {
      // Has everything needed — go straight to creating or tutor picker
      if (paramMode === 'instant' && !paramTutorId) return 'tutors';
      if (paramMode === 'instant' && paramTutorId)  return 'creating';
      return 'creating'; // group/conference with subjectId → creating
    }
    if (paramSubjectId) return 'tutors'; // legacy deep link
    if (paramMode)      return 'subject';
    return 'mode';
  });

  const [mode,          setMode]          = useState<SessionType>(paramMode ?? 'instant');
  const [subjectId,     setSubjectId]     = useState<string | null>(paramSubjectId);
  const [subjectName,   setSubjectName]   = useState<string | null>(paramSubjectNm);
  const [tutors,        setTutors]        = useState<AvailableTutor[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [requestingId,  setRequestingId]  = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/signin');
  }, [authLoading, user, router]);

  /* ── Subject theme override ── */
  useEffect(() => {
    setSubjectOverride(subjectName);
    return () => setSubjectOverride(null);
  }, [subjectName, setSubjectOverride]);

  /* ── Auto-create group/conference if we already have subjectId from params ── */
  useEffect(() => {
    if (step === 'creating' && subjectId && mode !== 'instant') {
      createSession(mode, subjectId, null);
    }
    if (step === 'creating' && paramTutorId && subjectId && mode === 'instant') {
      createSession('instant', subjectId, paramTutorId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  /* ── Fetch online tutors ── */
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
    if (subjectId && mode === 'instant' && step === 'tutors') {
      fetchTutors(subjectId);
    }
  }, [subjectId, mode, step, fetchTutors]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  /* ── Create any session type ── */
  const createSession = async (
    sessionType: SessionType,
    sid: string,
    tutorId: string | null,
  ) => {
    setRequestingId(tutorId ?? 'creating');
    setError(null);
    setStep('creating');

    try {
      // group_study has its own endpoint — no active-session guard, proper host
      // participant setup. instant/conference go through the unified route.
      const endpoint = sessionType === 'group_study'
        ? `${API_URL}/api/group-study/create`
        : `${API_URL}/api/live-chat/create`;

      const res  = await fetch(endpoint, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          type:      sessionType,
          subjectId: sid,
          tutorId:   tutorId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      // group-study returns { session: { id } }; live-chat returns { chatId }
      const chatId = data?.chatId ?? data?.session?.id;
      if (!res.ok || !chatId) {
        throw new Error(data?.error || 'Could not create session');
      }

      router.replace(`/live-chat/${chatId}`);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
      setStep('error');
    } finally {
      setRequestingId(null);
    }
  };

  /* ── Handlers ── */
  const handleModeSelect = (m: SessionType) => {
    setMode(m);
    setStep('subject');
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSubjectId(subject.id);
    setSubjectName(subject.name);
    if (mode === 'instant') {
      setStep('tutors');
    } else {
      // group/conference — create immediately with subject
      createSession(mode, subject.id, null);
    }
  };

  const handleRequestTutor = (tutorId: string) => {
    if (requestingId || !subjectId) return;
    createSession('instant', subjectId, tutorId);
  };

  /* ── Loading ── */
  if (authLoading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  /* ── Filtered modes for this user's role ── */
  const availableModes = SESSION_MODES.filter(m => m.forRoles.includes(role));

  // If tutor-only mode was accessed by student via params, reset
  const effectiveMode = availableModes.find(m => m.type === mode) ? mode : 'instant';

  return (
    <div className="h-full flex flex-col items-center px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-xl space-y-6">

        {/* ── Back button ── */}
        <button
          onClick={() => {
            if (step === 'subject') setStep('mode');
            else if (step === 'tutors') setStep(mode === 'instant' ? 'subject' : 'mode');
            else router.back();
          }}
          className="flex items-center gap-2 text-white/35 text-sm hover:text-white/65 transition"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════
              STEP: mode picker
              ══════════════════════════════════════════ */}
          {step === 'mode' && (
            <motion.div key="mode"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-white font-semibold text-xl tracking-tight">Live Sessions</h1>
                <p className="text-white/40 text-sm mt-1">Choose how you want to connect.</p>
              </div>

              <div className="space-y-3">
                {availableModes.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <motion.button
                      key={m.type}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.28 }}
                      onClick={() => handleModeSelect(m.type)}
                      className={`
                        w-full text-left glass rounded-2xl p-5 border transition-all duration-200
                        hover:bg-white/[0.06] hover:scale-[1.01] active:scale-[0.99]
                        ${m.border}
                      `}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl ${m.color} border ${m.border} flex items-center justify-center flex-shrink-0`}>
                          <Icon size={18} className={m.textColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white/85 font-medium text-sm">{m.label}</p>
                          </div>
                          <p className="text-white/35 text-xs mt-0.5 leading-relaxed">{m.description}</p>
                          <p className={`text-[10px] mt-2 ${m.textColor} opacity-70`}>{m.capacity}</p>
                        </div>
                        <ChevronRight size={14} className="text-white/20 flex-shrink-0 mt-1" />
                      </div>
                    </motion.button>
                  );
                })}

                {/* Student: show group study hint for conference */}
                {role === 'student' && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-soft rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    <Radio size={13} className="text-white/20 flex-shrink-0" />
                    <p className="text-white/25 text-xs leading-relaxed">
                      Conferences are tutor-hosted. Join one from a tutor's profile or a shared link.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              STEP: subject selection
              ══════════════════════════════════════════ */}
          {step === 'subject' && (
            <motion.div key="subject"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              {/* Mode badge */}
              <ModeBadge mode={mode} />

              <div>
                <h1 className="text-white font-semibold text-xl tracking-tight">Choose a subject</h1>
                <p className="text-white/40 text-sm mt-1">
                  {mode === 'instant'
                    ? "We'll find available tutors for this subject."
                    : mode === 'group_study'
                    ? 'Your study room will be tagged to this subject.'
                    : 'Your conference will be tagged to this subject.'
                  }
                </p>
              </div>

              <SubjectDropdown selected={null} onSelect={handleSubjectSelect} />
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              STEP: tutor list (instant only)
              ══════════════════════════════════════════ */}
          {step === 'tutors' && (
            <motion.div key="tutors"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-white font-semibold text-xl tracking-tight">
                    {subjectName ?? 'Available Tutors'}
                  </h1>
                  <p className="text-white/40 text-sm mt-1">
                    {loadingTutors ? "Finding who's online\u2026" : `${tutors.length} tutor${tutors.length !== 1 ? 's' : ''} available`}
                  </p>
                </div>
                <button
                  onClick={() => { setStep('subject'); setSubjectId(null); setSubjectName(null); }}
                  className="text-xs text-white/30 hover:text-white/60 transition underline underline-offset-2 flex-shrink-0 mt-1"
                >
                  Change subject
                </button>
              </div>

              {/* Skeleton */}
              {loadingTutors && (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="glass rounded-2xl p-4 animate-pulse flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/8 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 bg-white/8 rounded" />
                        <div className="h-2 w-44 bg-white/5 rounded" />
                      </div>
                      <div className="w-20 h-8 bg-white/5 rounded-xl" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty */}
              {!loadingTutors && tutors.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass rounded-2xl px-8 py-12 text-center space-y-3">
                  <WifiOff size={22} className="text-white/20 mx-auto" />
                  <div>
                    <p className="text-white/45 text-sm font-medium">No tutors available right now</p>
                    <p className="text-white/25 text-xs mt-1">Check back soon or try a different subject.</p>
                  </div>
                  <button
                    onClick={() => { setStep('subject'); setSubjectId(null); setSubjectName(null); }}
                    className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2 transition"
                  >
                    Try another subject
                  </button>
                </motion.div>
              )}

              {/* Tutor cards */}
              {!loadingTutors && tutors.length > 0 && (
                <div className="space-y-2.5">
                  {tutors.map((tutor, i) => {
                    const isThisOne = requestingId === tutor.userId;
                    const isDisabled = !!requestingId && !isThisOne;

                    return (
                      <motion.div key={tutor.userId} layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.25 }}
                        className={`glass rounded-2xl p-4 transition-opacity ${isDisabled ? 'opacity-40' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center overflow-hidden">
                              {tutor.avatarUrl
                                ? <img src={tutor.avatarUrl} alt={tutor.username} className="w-full h-full object-cover" />
                                : <span className="text-white/55 text-sm font-semibold">{tutor.username[0]?.toUpperCase()}</span>
                              }
                            </div>
                            {/* Live presence dot — comes from Redis via /api/tutors/available */}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black/30 shadow-sm shadow-emerald-900/50" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white/85 text-sm font-medium">{tutor.username}</p>
                              {tutor.isStudentTutor && (
                                <span className="text-emerald-400/60 text-[10px]">Peer tutor</span>
                              )}
                            </div>
                            {tutor.subjects.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {tutor.subjects.slice(0, 3).map((s, j) => (
                                  <span key={s.id} className="text-[10px] text-white/30">
                                    {s.name}{j < Math.min(tutor.subjects.length, 3) - 1 ? ' ·' : ''}
                                  </span>
                                ))}
                                {tutor.subjects.length > 3 && (
                                  <span className="text-[10px] text-white/20">+{tutor.subjects.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Request button */}
                          <button
                            onClick={() => handleRequestTutor(tutor.userId)}
                            disabled={!!requestingId}
                            className={`
                              flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all duration-200
                              ${isThisOne
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                                : 'bg-emerald-500/12 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/35'
                              }
                              disabled:cursor-not-allowed
                            `}
                          >
                            {isThisOne
                              ? <><Loader2 size={12} className="animate-spin" /> Connecting…</>
                              : <><Zap size={12} /> Request</>
                            }
                          </button>
                        </div>

                        {tutor.bio && (
                          <p className="mt-2.5 text-xs text-white/30 leading-relaxed pl-[52px] line-clamp-2">
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

          {/* ══════════════════════════════════════════
              STEP: creating (group/conference)
              ══════════════════════════════════════════ */}
          {step === 'creating' && (
            <motion.div key="creating"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-6"
            >
              <div className="relative w-16 h-16">
                <motion.div className="absolute inset-0 rounded-full bg-orange-500/15"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }} />
                <div className="relative w-16 h-16 rounded-full bg-orange-500/20 border border-orange-500/25 flex items-center justify-center">
                  {mode === 'group_study' ? <Users size={22} className="text-orange-300" /> : <Radio size={22} className="text-orange-300" />}
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-white/70 font-medium text-sm">
                  {mode === 'group_study' ? 'Creating your study room…' : 'Starting conference…'}
                </p>
                <p className="text-white/30 text-xs">Connecting to the server</p>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════
              STEP: error
              ══════════════════════════════════════════ */}
          {step === 'error' && (
            <motion.div key="error"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.28 }}
              className="glass rounded-2xl px-10 py-12 text-center space-y-5"
            >
              <div className="w-14 h-14 rounded-full glass-soft flex items-center justify-center mx-auto">
                <X size={20} className="text-red-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-white font-semibold text-base">Something went wrong</h2>
                <p className="text-white/40 text-sm">{error}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => router.back()}
                  className="px-5 py-2.5 rounded-xl glass-soft text-white/60 text-sm font-medium hover:bg-white/10 transition">
                  Go back
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    if (subjectId && mode === 'instant') { setStep('tutors'); fetchTutors(subjectId); }
                    else if (subjectId) createSession(mode, subjectId, null);
                    else setStep('mode');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/80 text-sm font-semibold hover:bg-white/15 transition"
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