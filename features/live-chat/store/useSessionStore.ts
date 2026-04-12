'use client';

/**
 * useSessionStore
 *
 * Single source of truth for session lifecycle state shared across
 * all live-chat view components (InstantChatView, GroupStudyView,
 * ConferenceView). Driven by socket events via useSessionEvents.
 *
 * Scope: session:started → 'active', session:paused → 'paused',
 *        session:ended → 'ended'. Hydration sets initial status.
 *
 * Each view calls reset(sessionId) on mount. The reset is session-aware:
 * it only clears state if the incoming sessionId differs from the one
 * already tracked — preventing state erasure during same-session re-renders.
 *
 * setStatus is idempotent — no-ops when the incoming value equals the
 * current value, preventing duplicate side-effects from redundant events.
 *
 * mergeMeta handles session:updated by merging only the changed fields
 * into sessionMeta, never overwriting the full object.
 */

import { create } from 'zustand';
import type { Participant, SessionMeta } from '../types/SocketEvents';

// null = not yet hydrated (initial state before the first fetch resolves)
export type StoreSessionStatus = 'waiting' | 'active' | 'paused' | 'ended' | 'host_left_grace' | null;

export type SystemMessage = {
  id:        string;
  content:   string;
  timestamp: number;
};

export type PendingInvite = {
  sessionId:    string;
  fromUsername: string;
  subjectName?: string;
};

export type UpcomingSession = {
  sessionId:   string;
  type:        'booked' | 'conference';
  scheduledAt: string | null;
};

interface SessionStoreState {
  status:           StoreSessionStatus;
  endReason:        string;
  currentSessionId: string | null;
  sessionMeta:      Partial<SessionMeta>;
  // Backend-authoritative time fields (ms epoch, from Redis / Prisma)
  startedAt:        number | null;
  endsAt:           number | null;
  graceExpiresAt:   number | null;
  // Whether the session can still be extended (+15 min). False once used.
  canExtend:        boolean;
  // Live participant list (seeded from API, updated via socket)
  participants:     Participant[];
  // System messages injected by chat:system_message events
  systemMessages:   SystemMessage[];
  // Global invite / upcoming-session notifications (read by SessionInviteBanner)
  pendingInvite:    PendingInvite | null;
  upcomingSession:  UpcomingSession | null;

  setStatus:             (s: StoreSessionStatus) => void;
  setEndReason:          (r: string) => void;
  setStartedAt:          (t: number | null) => void;
  setEndsAt:             (t: number | null) => void;
  setGraceExpiresAt:     (t: number | null) => void;
  setCanExtend:          (v: boolean) => void;
  setParticipants:       (ps: Participant[]) => void;
  appendSystemMessage:   (msg: Omit<SystemMessage, 'id'>) => void;
  mergeMeta:             (partial: Partial<SessionMeta> & { sessionId: string }) => void;
  reset:                 (sessionId?: string) => void;
  setPendingInvite:      (invite: PendingInvite | null) => void;
  setUpcomingSession:    (u: UpcomingSession | null) => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  status:           null as StoreSessionStatus,
  endReason:        '',
  currentSessionId: null,
  sessionMeta:      {},
  startedAt:        null,
  endsAt:           null,
  graceExpiresAt:   null,
  canExtend:        false,
  participants:     [],
  systemMessages:   [],
  pendingInvite:    null,
  upcomingSession:  null,

  // Idempotent: skip update if status is already the same value
  setStatus: (status) =>
    set(state => state.status === status ? state : { status }),

  setEndReason: (endReason) => set({ endReason }),

  setStartedAt: (startedAt) => set({ startedAt }),

  setEndsAt: (endsAt) => set({ endsAt }),

  setGraceExpiresAt: (graceExpiresAt) => set({ graceExpiresAt }),

  setCanExtend: (canExtend) => set({ canExtend }),

  setParticipants: (participants) => set({ participants }),

  appendSystemMessage: (msg) =>
    set(state => ({
      systemMessages: [
        ...state.systemMessages,
        { ...msg, id: `sys-${msg.timestamp}-${Math.random().toString(36).slice(2)}` },
      ],
    })),

  // Merge session:updated / session:meta payload — only applies when sessionId
  // matches, and never overwrites fields absent from the partial payload.
  // Also picks up endsAt and graceExpiresAt when present.
  mergeMeta: (partial) =>
    set(state => {
      const { sessionId, endsAt, graceExpiresAt, ...rest } = partial as Partial<SessionMeta> & { sessionId: string; endsAt?: number; graceExpiresAt?: number };
      if (sessionId !== state.currentSessionId) return state;
      return {
        sessionMeta:    { ...state.sessionMeta, ...rest },
        ...(endsAt        != null ? { endsAt }        : {}),
        ...(graceExpiresAt != null ? { graceExpiresAt } : {}),
      };
    }),

  // Session-aware reset: only clears if the incoming sessionId differs
  // from the one already stored. Prevents clearing live state on re-renders
  // of the same session (e.g. Strict Mode double-mount in dev).
  reset: (sessionId) =>
    set(state => {
      if (sessionId !== undefined && state.currentSessionId === sessionId) return state;
      return {
        status:           null as StoreSessionStatus,
        endReason:        '',
        currentSessionId: sessionId ?? null,
        sessionMeta:      {},
        startedAt:        null,
        endsAt:           null,
        graceExpiresAt:   null,
        canExtend:        false,
        participants:     [],
        systemMessages:   [],
      };
    }),

  setPendingInvite:   (pendingInvite)   => set({ pendingInvite }),
  setUpcomingSession: (upcomingSession) => set({ upcomingSession }),
}));
