'use client';

// app/live-chat/views/GroupStudyView.tsx
//
// Multi-participant group study — ASSI+ feature.
// Hardened: isReady gates, activity heartbeat, idempotent end.
// Study tools via StudyPanel — role-gated per owner/presenter/member.
// Save prompt on session end — notebook + problem board persist to DB.

import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { motion, AnimatePresence }  from 'framer-motion';
import {
  UserPlus, Users, X, Check, Loader2,
  Sparkles, Crown, Presentation, BookOpen,
  Save, Download, Settings, Globe, Lock, UserCheck,
} from 'lucide-react';
import { useChatSocket }    from '@/features/live-chat/hooks/useChatSocket';
import { useChatMessages }  from '@/features/live-chat/hooks/useChatMessages';
import { useTyping }        from '@/features/live-chat/hooks/useTyping';
import { useSessionEvents } from '@/features/live-chat/hooks/useSessionEvents';
import { useSessionStore }  from '@/features/live-chat/store/useSessionStore';
import { StudyPanel }      from '../components/StudyPanel';
import { api }             from '@/lib/api';
import type { StudyTool, Problem } from '../components/StudyPanel';
import {
  SessionHeader, MessageFeed, ChatInput,
  SessionEndedScreen, PausedBanner, ConfirmEndBanner,
  ParticipantList, ParticipantSidebar,
  ActivityFeed, useActivityEvents,
} from '../components/SessionShared';
import type { SessionMeta, Participant, InviteRequest } from '@/features/live-chat/types/SocketEvents';

export type StudyRole = 'owner' | 'presenter' | 'member';

const ACTIVITY_INTERVAL = 30_000;

// Tool sets per role
const OWNER_TOOLS:     StudyTool[] = ['notebook', 'whiteboard', 'problems', 'timer', 'files', 'broadcast'];
const PRESENTER_TOOLS: StudyTool[] = ['notebook', 'whiteboard', 'problems', 'timer', 'files', 'broadcast'];
const MEMBER_TOOLS:    StudyTool[] = ['notebook', 'problems', 'timer', 'files'];

interface Props {
  sessionId:       string;
  currentUserId:   string;
  currentUsername: string;
  meta:            SessionMeta;
  isPlus:          boolean;
  role:            'student' | 'tutor';
  maxParticipants: number;
}

export function GroupStudyView({
  sessionId, currentUserId, currentUsername, meta, isPlus, maxParticipants, role,
}: Props) {
  const { emit, on, off, isConnected, isReady } = useChatSocket();
  const { messages, sendMessage }               = useChatMessages(sessionId, { id: currentUserId, name: currentUsername });
  const { onKeystroke, stopTyping, typingUsernames } = useTyping(sessionId);
  const { events: activityEvents, push: pushActivity } = useActivityEvents();

  // ── Centralized session lifecycle — single .on() binding per event ──
  useSessionEvents(sessionId);
  const { status, endReason, setStatus, setEndReason, reset } = useSessionStore();
  const sessionEnded  = status === 'ended';
  const sessionPaused = status === 'paused';

  // Session-aware reset: only clears state when sessionId changes (not same-session re-renders)
  useEffect(() => { reset(sessionId); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session state ──
  const [participants,    setParticipants]    = useState<Participant[]>([]);
  const [input,           setInput]           = useState('');
  const [confirmingEnd,   setConfirmingEnd]   = useState(false);
  const [showSidebar,     setShowSidebar]     = useState(true);
  const [showTools,       setShowTools]       = useState(false);
  const [showInvite,      setShowInvite]      = useState(false);
  const [inviteInput,     setInviteInput]     = useState('');
  const [invitePending,   setInvitePending]   = useState(false);
  const [pendingApproval, setPendingApproval] = useState<InviteRequest | null>(null);
  const [inviteLooking,   setInviteLooking]   = useState(false);
  const [inviteFound,     setInviteFound]     = useState<{ id: string; username: string } | null>(null);
  const [inviteLookupErr, setInviteLookupErr] = useState<string | null>(null);
  const [hydrating,       setHydrating]       = useState(true);

  // ── Study role ──
  const [studyRole, setStudyRole] = useState<StudyRole>(
    meta.hostId === currentUserId ? 'owner' : 'member'
  );

  // ── Save prompt state ──
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [saving,         setSaving]         = useState(false);
  // Snapshot notebook + problems at end time for saving
  const notebookSnapshot = useRef('');
  const problemsSnapshot = useRef<Problem[]>([]);

  // ── Settings panel (owner only) ──
  const [showSettings,    setShowSettings]    = useState(false);
  const [settingsMax,     setSettingsMax]     = useState(maxParticipants);
  const [settingsPublic,  setSettingsPublic]  = useState(meta.isPublic ?? false);
  const [settingsRoles,   setSettingsRoles]   = useState<'all' | 'student' | 'tutor'>('all');
  const [savingSettings,  setSavingSettings]  = useState(false);
  const [settingsError,   setSettingsError]   = useState<string | null>(null);
  // Live maxParticipants — updated by settings_updated socket event
  const [liveMax, setLiveMax] = useState(maxParticipants);

  // ── Kick state ──
  const [kickingId, setKickingId] = useState<string | null>(null);

  const joinedRef   = useRef(false);
  const endedRef    = useRef(false);
  const activityRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearActivity = () => {
    if (activityRef.current) { clearInterval(activityRef.current); activityRef.current = null; }
  };
  useEffect(() => () => clearActivity(), []);

  // ── Hydrate ──
  useEffect(() => {
    let cancelled = false;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    Promise.allSettled([
      fetch(`${API_URL}/api/live-chat/${sessionId}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_URL}/api/group-study/${sessionId}/participants`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([sessionRes, participantsRes]) => {
      if (cancelled) return;

      if (sessionRes.status === 'fulfilled') {
        const d = sessionRes.value;
        if (d.success && d.session) {
          const { status: s, endedReason } = d.session;
          if (s === 'ended')  { setEndReason(endedReason ?? ''); setStatus('ended'); }
          else if (s === 'paused')  setStatus('paused');
          else if (s === 'active')  setStatus('active');
          else if (s === 'waiting') setStatus('waiting');
        }
      }

      if (participantsRes.status === 'fulfilled') {
        const d = participantsRes.value;
        if (d.success && Array.isArray(d.participants)) {
          setParticipants(d.participants.map((p: any) => ({
            userId:     p.userId,
            username:   p.user?.username ?? '',
            role:       p.role ?? 'student',
            isMuted:    false,
            handRaised: false,
            isHost:     p.userId === meta.hostId,
          })));
        }
      }
    }).finally(() => { if (!cancelled) setHydrating(false); });

    return () => { cancelled = true; };
  }, [sessionId, meta.hostId]);

  // ── Join — wait for hydration so we know the session is valid ──
  useEffect(() => {
    if (!isReady || !sessionId || hydrating || joinedRef.current) return;
    // Do not join if session has already ended or hasn't been hydrated yet
    if (status === null || status === 'ended') return;
    joinedRef.current = true;
    emit('session:join', { sessionId });
    return () => { joinedRef.current = false; };
  }, [isReady, sessionId, hydrating, status, emit]);

  // ── Cleanup when session ends (local side-effects only) ──
  useEffect(() => {
    if (status === 'ended') { clearActivity(); setShowSavePrompt(true); }
  }, [status]);

  // ── Activity heartbeat ──
  useEffect(() => {
    if (!isReady || sessionEnded || sessionPaused) { clearActivity(); return; }
    activityRef.current = setInterval(() => emit('session:activity', { sessionId }), ACTIVITY_INTERVAL);
    return clearActivity;
  }, [isReady, sessionEnded, sessionPaused, sessionId, emit]);

  // ── Socket events ──
  useEffect(() => {
    const onParticipants = ({ sessionId: sid, participants: list }: { sessionId: string; participants: Participant[] }) => {
      if (sid !== sessionId) return;
      setParticipants(list);
    };
    const onInviteReq = (p: InviteRequest) => { if (p.sessionId === sessionId) setPendingApproval(p); };
    const onInviteAcc = () => { setPendingApproval(null); setInvitePending(false); };
    const onInviteDec = () => { setPendingApproval(null); setInvitePending(false); };
    const onInviteErr = () => setInvitePending(false);
    const onRoleAssign = ({ userId, role }: { userId: string; role: StudyRole }) => {
      if (userId === currentUserId) setStudyRole(role);
    };

    const onDrawStart  = ({ username }: { username: string }) => pushActivity({ label: `${username} is drawing`, kind: 'drawing' });
    const onDrawStop   = () => {};
    const onProbPosted = ({ username }: { username: string }) => pushActivity({ label: `${username} sent a problem`, kind: 'problem' });
    const onJoined     = ({ username }: { username: string }) => pushActivity({ label: `${username} joined`, kind: 'joined' });
    const onSettingsUpdated = (p: { sessionId: string; maxParticipants: number; isPublic: boolean; allowedRoles: string }) => {
      if (p.sessionId !== sessionId) return;
      setLiveMax(p.maxParticipants);
      setSettingsMax(p.maxParticipants);
      setSettingsPublic(p.isPublic);
      setSettingsRoles((p.allowedRoles as 'all' | 'student' | 'tutor') ?? 'all');
    };

    on('session:participants',        onParticipants);
    on('chat:invite_request',         onInviteReq);
    on('chat:invite_accepted',        onInviteAcc);
    on('chat:invite_declined',        onInviteDec);
    on('chat:invite_error',           onInviteErr);
    on('study:role_assign',           onRoleAssign);
    on('study:drawing:start',         onDrawStart);
    on('study:drawing:stop',          onDrawStop);
    on('study:problem:posted',        onProbPosted);
    on('session:participant_joined',  onJoined);
    on('session:settings_updated',    onSettingsUpdated);

    return () => {
      off('session:participants',       onParticipants);
      off('chat:invite_request',        onInviteReq);
      off('chat:invite_accepted',       onInviteAcc);
      off('chat:invite_declined',       onInviteDec);
      off('chat:invite_error',          onInviteErr);
      off('study:role_assign',          onRoleAssign);
      off('study:drawing:start',        onDrawStart);
      off('study:drawing:stop',         onDrawStop);
      off('study:problem:posted',       onProbPosted);
      off('session:participant_joined', onJoined);
      off('session:settings_updated',   onSettingsUpdated);
    };
  }, [sessionId, currentUserId, on, off, pushActivity]);

  // ── Handlers ──
  const handleEndRequest = useCallback(() => {
    if (endedRef.current || status === 'ended') return;
    setConfirmingEnd(true);
  }, [status]);

  const handleEndConfirm = useCallback(() => {
    if (endedRef.current || status === 'ended') return;
    endedRef.current = true;
    setConfirmingEnd(false);
    emit('session:end', { sessionId, reason: 'ended_by_host' });
    clearActivity();
    setEndReason('ended_by_host');
    setStatus('ended');
    setShowSavePrompt(true);
  }, [status, emit, sessionId, setEndReason, setStatus]);

  const handleLookupUser = useCallback(async () => {
    const username = inviteInput.trim();
    if (!username) return;
    setInviteLooking(true);
    setInviteFound(null);
    setInviteLookupErr(null);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      const res  = await fetch(`${API_URL}/api/users-public/${encodeURIComponent(username)}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        if (data.user.id === currentUserId) {
          setInviteLookupErr("That's you.");
        } else if (participants.some(p => p.userId === data.user.id)) {
          setInviteLookupErr('Already in this session.');
        } else {
          setInviteFound({ id: data.user.id, username: data.user.username });
        }
      } else {
        setInviteLookupErr('User not found.');
      }
    } catch {
      setInviteLookupErr('Could not look up user.');
    } finally {
      setInviteLooking(false);
    }
  }, [inviteInput, currentUserId, participants]);

  const handleSendInvite = useCallback(() => {
    if (!inviteFound || invitePending || !isReady) return;
    setInvitePending(true);
    emit('chat:invite_request', { sessionId, fromUsername: currentUsername, inviteeUsername: inviteFound.username });
    setInviteInput(''); setInviteFound(null); setInviteLookupErr(null); setShowInvite(false);
  }, [inviteFound, invitePending, isReady, emit, sessionId, currentUsername]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > 4000 || sessionPaused || !isReady) return;
    sendMessage(trimmed); stopTyping(); setInput('');
  }, [input, sessionPaused, isReady, sendMessage, stopTyping]);

  const handleAssignPresenter = useCallback((userId: string) => {
    if (studyRole !== 'owner' || !isReady) return;
    emit('study:role_assign', { sessionId, userId, role: 'presenter' });
  }, [studyRole, isReady, emit, sessionId]);

  const handleSaveSettings = useCallback(async () => {
    setSavingSettings(true);
    setSettingsError(null);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/group-study/${sessionId}/settings`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({
          maxParticipants: settingsMax,
          isPublic:        settingsPublic,
          allowedRoles:    settingsRoles,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to save settings');
      setShowSettings(false);
    } catch (err: any) {
      setSettingsError(err?.message || 'Could not save settings');
    } finally {
      setSavingSettings(false);
    }
  }, [sessionId, settingsMax, settingsPublic, settingsRoles]);

  const handleKick = useCallback(async (targetUserId: string) => {
    if (kickingId) return;
    setKickingId(targetUserId);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${API_URL}/api/group-study/${sessionId}/kick/${targetUserId}`, {
        method:      'POST',
        credentials: 'include',
      });
      setParticipants(prev => prev.filter(p => p.userId !== targetUserId));
    } catch { /* silent — socket event will sync */ }
    finally { setKickingId(null); }
  }, [kickingId, sessionId]);

  // ── Save prompt handlers ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await api.post(`/api/live-chat/${sessionId}/save-notes`, {
        notebook: notebookSnapshot.current,
        problems: problemsSnapshot.current,
      });
    } catch { /* silent */ }
    finally {
      setSaving(false);
      setShowSavePrompt(false);
      setStatus('ended');
    }
  }, [sessionId, setStatus]);

  const handleDiscard = useCallback(() => {
    setShowSavePrompt(false);
    setStatus('ended');
  }, [setStatus]);

  // ── Derived ──
  const canDrive     = studyRole === 'owner' || studyRole === 'presenter';
  const isAtCapacity = participants.length >= liveMax;
  const spotsLeft    = liveMax - participants.length;
  const tools        = studyRole === 'owner' ? OWNER_TOOLS
                     : studyRole === 'presenter' ? PRESENTER_TOOLS
                     : MEMBER_TOOLS;

  // ── Loading ──
  if (hydrating) return (
    <div className="h-full flex items-center justify-center">
      <Loader2 size={18} className="text-white/30 animate-spin" />
    </div>
  );

  // ── Save prompt ──
  if (showSavePrompt) return (
    <div className="h-full flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="surface rounded-3xl px-10 py-12 text-center max-w-sm w-full space-y-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mx-auto">
          <Save size={22} className="text-blue-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-white/80 font-semibold text-base tracking-tight">Save your work?</p>
          <p className="text-white/35 text-sm leading-relaxed">
            Your notebook and problem board can be saved to your account.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDiscard}
            className="flex-1 py-2.5 rounded-xl glass-soft text-white/50 text-sm hover:text-white/70 transition">
            Discard
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/25 text-blue-300 text-sm font-medium hover:bg-blue-500/30 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (sessionEnded) return (
    <SessionEndedScreen reason={endReason} role={role} />
  );

  // ── Render ──
  return (
    <div className="flex h-full">

      {/* ── Main chat column ── */}
      <div className="flex-1 flex flex-col min-w-0">

        <SessionHeader
          title={`Group Study${meta.subjectName ? ` · ${meta.subjectName}` : ''}`}
          subtitle={`${participants.length}/${maxParticipants} members${isPlus ? '' : ' · upgrade for 6'}`}
          connected={isConnected}
          participantCount={participants.length}
          startedAt={meta.startedAt}
          onEnd={studyRole === 'owner' ? handleEndRequest : undefined}
          badge={
            studyRole === 'owner' ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20">
                <Crown size={9} className="text-orange-400" />
                <span className="text-orange-400 text-[9px] font-bold uppercase tracking-wider">Owner</span>
              </span>
            ) : studyRole === 'presenter' ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20">
                <Presentation size={9} className="text-blue-400" />
                <span className="text-blue-400 text-[9px] font-bold uppercase tracking-wider">Presenter</span>
              </span>
            ) : null
          }
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTools(s => !s)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                  showTools
                    ? 'bg-blue-500/20 border-blue-500/25 text-blue-300'
                    : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                }`}
              >
                <BookOpen size={11} /> Tools
              </button>
              {studyRole === 'owner' && !isAtCapacity && !invitePending && (
                <button onClick={() => setShowInvite(s => !s)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                    showInvite ? 'bg-white/10 border-white/20 text-white/70' : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                  }`}>
                  <UserPlus size={11} /> Invite
                </button>
              )}
              {studyRole === 'owner' && invitePending && (
                <span className="flex items-center gap-1 text-white/30 text-[11px]">
                  <Loader2 size={10} className="animate-spin" /> Pending…
                </span>
              )}
              {studyRole === 'owner' && (
                <button onClick={() => { setShowSettings(s => !s); setSettingsError(null); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                    showSettings ? 'bg-white/10 border-white/20 text-white/70' : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                  }`}>
                  <Settings size={11} /> Settings
                </button>
              )}
              <button onClick={() => setShowSidebar(s => !s)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition ${
                  showSidebar ? 'bg-white/10 border-white/20 text-white/70' : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                }`}>
                <Users size={11} /> {participants.length}
              </button>
            </div>
          }
        />

        {/* Invite bar — owner only */}
        <AnimatePresence>
          {studyRole === 'owner' && showInvite && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
              className="shrink-0 overflow-hidden border-b border-white/[0.07]">
              <div className="flex flex-col gap-1.5 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={inviteInput}
                    onChange={e => { setInviteInput(e.target.value); setInviteFound(null); setInviteLookupErr(null); }}
                    onKeyDown={e => e.key === 'Enter' && handleLookupUser()}
                    placeholder="Enter exact username…"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-white/20 transition"
                  />
                  <button
                    onClick={handleLookupUser}
                    disabled={!inviteInput.trim() || inviteLooking}
                    className="px-3 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/15 hover:text-white disabled:opacity-30 transition text-[11px]"
                  >
                    {inviteLooking ? <Loader2 size={12} className="animate-spin" /> : 'Find'}
                  </button>
                  <button
                    onClick={() => { setShowInvite(false); setInviteInput(''); setInviteFound(null); setInviteLookupErr(null); }}
                    className="p-2 rounded-lg glass-soft text-white/30 hover:text-white/60 transition"
                  >
                    <X size={13} />
                  </button>
                </div>
                {inviteLookupErr && (
                  <p className="text-red-400/70 text-[10px] px-1">{inviteLookupErr}</p>
                )}
                {inviteFound && (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-white/70 text-[11px]">@{inviteFound.username}</span>
                    <button
                      onClick={handleSendInvite}
                      disabled={invitePending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 text-[11px] hover:bg-emerald-500/30 disabled:opacity-40 transition"
                    >
                      <Check size={11} /> Invite
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Settings panel (owner only) ── */}
        <AnimatePresence>
          {studyRole === 'owner' && showSettings && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
              className="shrink-0 overflow-hidden border-b border-white/[0.07]">
              <div className="px-4 py-3 space-y-4">

                {/* Max participants */}
                <div className="space-y-1.5">
                  <p className="text-white/40 text-[11px] font-medium uppercase tracking-wide">Max members</p>
                  <div className="flex items-center gap-2">
                    {[2, 3, ...(isPlus ? [4, 5, 6] : [])].map(n => (
                      <button
                        key={n}
                        onClick={() => setSettingsMax(n)}
                        disabled={n < participants.length}
                        className={`w-9 h-9 rounded-xl text-xs font-semibold border transition ${
                          settingsMax === n
                            ? 'bg-blue-500/25 border-blue-500/35 text-blue-300'
                            : 'glass-soft border-white/10 text-white/40 hover:border-white/20 hover:text-white/70 disabled:opacity-25 disabled:cursor-not-allowed'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    {!isPlus && (
                      <span className="text-orange-400/50 text-[10px] ml-1">ASSI+ for 4–6</span>
                    )}
                  </div>
                </div>

                {/* Discoverability */}
                <div className="space-y-1.5">
                  <p className="text-white/40 text-[11px] font-medium uppercase tracking-wide">Discoverability</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSettingsPublic(true)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition ${
                        settingsPublic
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                          : 'glass-soft border-white/10 text-white/35 hover:border-white/20'
                      }`}
                    >
                      <Globe size={11} /> Public
                    </button>
                    <button
                      onClick={() => setSettingsPublic(false)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition ${
                        !settingsPublic
                          ? 'bg-white/15 border-white/25 text-white/70'
                          : 'glass-soft border-white/10 text-white/35 hover:border-white/20'
                      }`}
                    >
                      <Lock size={11} /> Private
                    </button>
                  </div>
                  <p className="text-white/20 text-[10px]">
                    {settingsPublic ? 'Listed in discovery for eligible users' : 'Join by direct invite only'}
                  </p>
                </div>

                {/* Allowed roles */}
                <div className="space-y-1.5">
                  <p className="text-white/40 text-[11px] font-medium uppercase tracking-wide">Who can join</p>
                  <div className="flex gap-2">
                    {([
                      { value: 'all',     label: 'Everyone',      icon: Users      },
                      { value: 'student', label: 'Students only', icon: BookOpen   },
                      { value: 'tutor',   label: 'Tutors only',   icon: UserCheck  },
                    ] as const).map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button key={opt.value}
                          onClick={() => setSettingsRoles(opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border transition ${
                            settingsRoles === opt.value
                              ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                              : 'glass-soft border-white/10 text-white/35 hover:border-white/20'
                          }`}
                        >
                          <Icon size={11} /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {settingsError && (
                  <p className="text-red-400/70 text-[10px]">{settingsError}</p>
                )}

                <div className="flex gap-2">
                  <button onClick={() => setShowSettings(false)}
                    className="flex-1 py-2 rounded-xl glass-soft text-white/40 text-xs hover:text-white/60 transition">
                    Cancel
                  </button>
                  <button onClick={handleSaveSettings} disabled={savingSettings}
                    className="flex-1 py-2 rounded-xl bg-blue-500/20 border border-blue-500/25 text-blue-300 text-xs font-medium hover:bg-blue-500/30 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
                    {savingSettings ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending approval */}
        <AnimatePresence>
          {pendingApproval && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="shrink-0 flex items-center gap-3 px-4 py-3 bg-blue-500/8 border-b border-blue-500/15">
              <p className="flex-1 text-blue-300/80 text-xs">
                <span className="font-medium text-white/70">{pendingApproval.fromUsername}</span>
                {' '}wants to invite{' '}
                <span className="font-medium text-white/70">{pendingApproval.inviteeUsername}</span>
              </p>
              <button onClick={() => { emit('chat:invite_accept', { sessionId, responderUsername: currentUsername }); setPendingApproval(null); }}
                className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[11px] border border-blue-500/25 hover:bg-blue-500/30 transition">
                Approve
              </button>
              <button onClick={() => { emit('chat:invite_decline', { sessionId, responderUsername: currentUsername }); setPendingApproval(null); }}
                className="px-2.5 py-1 rounded-lg glass-soft text-white/30 text-[11px] hover:text-white/60 transition">
                Decline
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Capacity warning */}
        {isAtCapacity && !isPlus && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-orange-500/6 border-b border-orange-500/12">
            <Sparkles size={11} className="text-orange-400/70" />
            <span className="text-orange-400/60 text-[11px]">Room is full. Upgrade to ASSI+ for 6 members.</span>
          </div>
        )}

        <AnimatePresence>
          {confirmingEnd && (
            <ConfirmEndBanner
              onConfirm={handleEndConfirm}
              onCancel={() => setConfirmingEnd(false)}
            />
          )}
        </AnimatePresence>

        {sessionPaused && <PausedBanner />}

        <MessageFeed
          messages={messages} currentUserId={currentUserId}
          showSenders
          emptySlot={
            <div className="flex flex-col items-center gap-2 pt-12">
              <div className="glass-soft rounded-2xl px-6 py-4 text-center">
                <p className="text-white/25 text-sm">Group session started</p>
                <p className="text-white/15 text-xs mt-1">
                  {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} remaining` : 'Room is full'}
                </p>
                <p className="text-white/15 text-xs mt-1">Open Tools to collaborate</p>
              </div>
            </div>
          }
        />

        <ActivityFeed typingUsernames={typingUsernames} events={activityEvents} />

        <ChatInput
          value={input} onChange={setInput} onSubmit={handleSubmit} onKeystroke={onKeystroke}
          disabled={sessionPaused || !isReady}
          placeholder={!isReady ? 'Reconnecting…' : sessionPaused ? 'Session paused…' : 'Message the group…'}
        />
      </div>

      {/* ── Study tools panel ── */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 300 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex-shrink-0 overflow-hidden"
          >
            <StudyPanel
              sessionId={sessionId}
              currentUsername={currentUsername}
              tools={tools}
              permissions={{
                canDrive:       canDrive,
                notebookShared: true, // group study notebook is shared
              }}
              emit={emit}
              on={on}
              off={off}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Participant sidebar ── */}
      <ParticipantSidebar
        title={`Members · ${participants.length}/${maxParticipants}`}
        visible={showSidebar}
      >
        <ParticipantList
          participants={participants}
          currentUserId={currentUserId}
          isHost={studyRole === 'owner'}
          onGrantFloor={studyRole === 'owner' ? handleAssignPresenter : undefined}
          onKick={studyRole === 'owner' ? handleKick : undefined}
          kickingId={kickingId}
        />
        {!isPlus && (
          <div className="mt-3 px-2">
            <p className="text-orange-400/40 text-[10px] text-center">ASSI+ unlocks 6 members</p>
          </div>
        )}
        {studyRole === 'owner' && (
          <div className="mt-3 px-2 pt-3 border-t border-white/5">
            <p className="text-white/20 text-[10px] text-center">
              Tap a member to assign as presenter
            </p>
          </div>
        )}
      </ParticipantSidebar>
    </div>
  );
}