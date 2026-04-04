import { api } from '@/lib/api/client';
import type { StatusIntent, FullPresence, EligibilityReason } from './PresenceProvider';

// ── Response shapes (what the frontend expects internally) ────────────────────

export interface Eligibility {
  eligible: boolean;
  reason:   EligibilityReason;
}

export interface PresenceMeResponse {
  success:     boolean;
  presence:    FullPresence;
  eligibility: Eligibility;
}

export interface PublicPresenceResponse {
  success: boolean;
  userId:  string;
  presence: {
    online: boolean;
    intent: StatusIntent;
  };
}

// ── Response normalizers ──────────────────────────────────────────────────────
// The backend may return a nested shape { presence: {…}, eligibility: {…} }
// or a flat shape { online, intent, socketConnected, … } depending on the
// endpoint version. These adapters accept either and return the nested form
// so the rest of the frontend has one consistent contract to rely on.

function normalizeMeResponse(raw: any): PresenceMeResponse {
  // Already nested — backend matches frontend expectations
  if (raw.presence && typeof raw.presence === 'object') {
    return {
      success:     raw.success,
      presence:    raw.presence,
      eligibility: raw.eligibility ?? deriveEligibility(raw.presence),
    };
  }

  // Flat response — lift fields into nested shape
  const presence: FullPresence = {
    online:          raw.online          ?? false,
    socketConnected: raw.socketConnected ?? false,
    intent:          raw.intent          ?? 'do_not_disturb',
    lastActivity:    raw.lastActivity    ?? null,
    socketCount:     raw.socketCount     ?? 0,
  };

  return {
    success:     raw.success,
    presence,
    eligibility: raw.eligibility ?? deriveEligibility(presence, raw.discoverable),
  };
}

function deriveEligibility(
  presence: Pick<FullPresence, 'online' | 'intent' | 'socketConnected'>,
  discoverable?: boolean,
): Eligibility {
  if (!presence.online)          return { eligible: false, reason: 'offline' };
  if (!presence.socketConnected) return { eligible: false, reason: 'reconnecting' };
  if (presence.intent === 'busy_session') return { eligible: false, reason: 'busy_session' };
  if (presence.intent === 'busy_other')   return { eligible: false, reason: 'busy_other' };
  if (presence.intent !== 'available')    return { eligible: false, reason: 'not_available' };

  const eligible = discoverable !== undefined ? discoverable : true;
  return { eligible, reason: 'ok' };
}

function normalizePublicResponse(raw: any, userId: string): PublicPresenceResponse {
  // Already nested — { presence: { online, intent } }
  if (raw.presence && typeof raw.presence === 'object') {
    return raw;
  }

  // Flat/legacy — { status: "available" | "offline" | …, lastActivity }
  // "status" encodes the intent; offline means !online
  const intent  = (raw.intent ?? raw.status ?? 'do_not_disturb') as StatusIntent;
  const online  = raw.online !== undefined ? raw.online : raw.status !== 'offline';

  return {
    success:  raw.success,
    userId:   raw.userId ?? userId,
    presence: { online, intent },
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

export const presenceApi = {
  // GET /api/presence/me — own full presence + eligibility
  getMe: () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<any>('/api/presence/me').then(normalizeMeResponse),

  // PATCH /api/presence/intent — update intent, returns same shape as getMe
  setIntent: (intent: Exclude<StatusIntent, 'busy_session'>) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.patch<any>('/api/presence/intent', { intent }).then(normalizeMeResponse),

  // POST /api/presence/heartbeat — keepalive, fire every 60s.
  // Sends current intent so the backend can update the Redis key accurately.
  heartbeat: (intent?: StatusIntent) =>
    api.post<{ success: boolean }>('/api/presence/heartbeat', intent ? { intent } : undefined),

  // GET /api/presence/:userId — public slimmed presence (no socketCount/lastActivity)
  getUser: (userId: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api.get<any>(`/api/presence/${userId}`)
      .then(raw => normalizePublicResponse(raw, userId)),
};
