import { api } from '@/lib/api/client';
import type { StatusIntent, FullPresence, EligibilityReason } from './PresenceProvider';

// ── Response shapes (mirror backend contract exactly) ─────────────────────

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

// ── API ───────────────────────────────────────────────────────────────────

export const presenceApi = {
  // GET /api/presence/me — own full presence + eligibility
  getMe: () =>
    api.get<PresenceMeResponse>('/api/presence/me'),

  // PATCH /api/presence/intent — update intent, returns same shape as getMe
  setIntent: (intent: Exclude<StatusIntent, 'busy_session'>) =>
    api.patch<PresenceMeResponse>('/api/presence/intent', { intent }),

  // POST /api/presence/heartbeat — keepalive, fire every 60s
  heartbeat: () =>
    api.post<{ success: boolean }>('/api/presence/heartbeat'),

  // GET /api/presence/:userId — public slimmed presence (no socketCount/lastActivity)
  getUser: (userId: string) =>
    api.get<PublicPresenceResponse>(`/api/presence/${userId}`),
};
