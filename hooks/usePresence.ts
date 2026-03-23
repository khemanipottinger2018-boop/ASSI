'use client';

import { usePresence as usePresenceContext } from '@/contexts/PresenceProvider';
import type { PresenceStatus } from '@/contexts/PresenceProvider';
import type { FullPresence } from '@/contexts/PresenceProvider';

export function usePresence() {
  return usePresenceContext();
}

export type { PresenceStatus, FullPresence };