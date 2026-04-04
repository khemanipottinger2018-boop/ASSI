'use client';

import { usePresence } from '@/features/presence';
import type { EligibilityReason, StatusIntent } from '@/features/presence';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type PresenceVariant =
  | 'available'
  | 'busy'
  | 'unavailable'
  | 'offline'
  | 'reconnecting';

export type PresenceDisplayOutput = {
  intent: StatusIntent | null;
  label: string;
  subtitle: string;
  pulse: boolean;
  variant: PresenceVariant;
  // Expose raw eligibility reason so UI can branch on specific states if needed
  eligibilityReason: EligibilityReason | null;
  // Whether the intent picker should be shown (false when busy_session)
  canChangeIntent: boolean;
};

/* ─────────────────────────────────────────────
   HOOK
───────────────────────────────────────────── */

/**
 * Returns display-ready presence info derived from the server-authoritative state.
 *
 * Rules from handover doc:
 * - busy_session → show "In session", hide intent picker
 * - all other intents → show picker (available / do_not_disturb / busy_other)
 * - students: only need online + socketConnected, no intent picker
 *
 * Source of truth is always GET /presence/me — never infer state client-side.
 */
export function usePresenceDisplay(): PresenceDisplayOutput {
  const { presence, eligibility, isLoading } = usePresence();

  // Initial load — data not yet fetched
  if (isLoading) {
    return {
      intent: null,
      label: 'Checking...',
      subtitle: 'Loading presence',
      pulse: false,
      variant: 'offline',
      eligibilityReason: null,
      canChangeIntent: false,
    };
  }

  // API failed or no presence record — degrade gracefully, do not stay on "Checking..."
  if (!presence) {
    return {
      intent: null,
      label: 'Offline',
      subtitle: 'Could not load status',
      pulse: false,
      variant: 'offline',
      eligibilityReason: null,
      canChangeIntent: false,
    };
  }

  const reason = eligibility?.reason ?? null;
  const { intent, online, socketConnected } = presence;

  // Offline — no presence key in Redis
  if (!online) {
    return {
      intent,
      label: 'Offline',
      subtitle: 'Go online to receive requests',
      pulse: false,
      variant: 'offline',
      eligibilityReason: reason,
      canChangeIntent: false,
    };
  }

  // Socket reconnecting — online but socketCount = 0
  if (!socketConnected) {
    return {
      intent,
      label: 'Reconnecting',
      subtitle: 'Restoring live connection…',
      pulse: false,
      variant: 'reconnecting',
      eligibilityReason: reason,
      canChangeIntent: false,
    };
  }

  // Busy in a session — server-set, read-only from frontend
  if (intent === 'busy_session') {
    return {
      intent,
      label: 'In session',
      subtitle: 'Currently helping a student',
      pulse: false,
      variant: 'busy',
      eligibilityReason: reason,
      canChangeIntent: false, // hide picker per handover doc
    };
  }

  // Busy — manually set by user
  if (intent === 'busy_other') {
    return {
      intent,
      label: 'Busy',
      subtitle: 'Not accepting new requests',
      pulse: false,
      variant: 'busy',
      eligibilityReason: reason,
      canChangeIntent: true,
    };
  }

  // Do not disturb
  if (intent === 'do_not_disturb') {
    return {
      intent,
      label: 'Do not disturb',
      subtitle: 'You won\'t receive session requests',
      pulse: false,
      variant: 'unavailable',
      eligibilityReason: reason,
      canChangeIntent: true,
    };
  }

  // Available — eligible or not depends on eligibility.reason
  if (intent === 'available') {
    const isEligible = eligibility?.eligible ?? false;

    return {
      intent,
      label: 'Available',
      subtitle: isEligible
        ? 'Students can request your help'
        : 'Available, but not yet discoverable',
      pulse: isEligible,
      variant: 'available',
      eligibilityReason: reason,
      canChangeIntent: true,
    };
  }

  // Fallback — should never reach here with a valid intent
  return {
    intent,
    label: 'Unknown',
    subtitle: '',
    pulse: false,
    variant: 'offline',
    eligibilityReason: reason,
    canChangeIntent: false,
  };
}
