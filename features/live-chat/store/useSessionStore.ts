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
import type { SessionMeta } from '../types/SocketEvents';

// null = not yet hydrated (initial state before the first fetch resolves)
export type StoreSessionStatus = 'waiting' | 'active' | 'paused' | 'ended' | null;

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
  // Global invite / upcoming-session notifications (read by SessionInviteBanner)
  pendingInvite:    PendingInvite | null;
  upcomingSession:  UpcomingSession | null;

  setStatus:          (s: StoreSessionStatus) => void;
  setEndReason:       (r: string) => void;
  mergeMeta:          (partial: Partial<SessionMeta> & { sessionId: string }) => void;
  reset:              (sessionId?: string) => void;
  setPendingInvite:   (invite: PendingInvite | null) => void;
  setUpcomingSession: (u: UpcomingSession | null) => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  status:           null as StoreSessionStatus,
  endReason:        '',
  currentSessionId: null,
  sessionMeta:      {},
  pendingInvite:    null,
  upcomingSession:  null,

  // Idempotent: skip update if status is already the same value
  setStatus: (status) =>
    set(state => state.status === status ? state : { status }),

  setEndReason: (endReason) => set({ endReason }),

  // Merge session:updated / session:meta payload — only applies when sessionId
  // matches, and never overwrites fields absent from the partial payload
  mergeMeta: (partial) =>
    set(state => {
      const { sessionId, ...rest } = partial;
      if (sessionId !== state.currentSessionId) return state;
      return { sessionMeta: { ...state.sessionMeta, ...rest } };
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
      };
    }),

  setPendingInvite:   (pendingInvite)   => set({ pendingInvite }),
  setUpcomingSession: (upcomingSession) => set({ upcomingSession }),
}));
