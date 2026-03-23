'use client';

import { usePresence } from '@/hooks/usePresence';
import type { PresenceStatus } from '@/contexts/PresenceProvider';

export type PresenceDisplayOutput = {
  status: PresenceStatus;
  label: string;
  subtitle: string;
  pulse: boolean;
  variant: 'available' | 'busy' | 'unavailable' | 'offline' | 'reconnecting';
};

/**
 * Returns display-ready presence info
 * Tutors: use manual availability
 * Students: automated discoverable
 */
export function usePresenceDisplay(): PresenceDisplayOutput {
  const { hydrated, status, discoverable, isOnline, socketConnected, tutorAvailable, tutorBusy } = usePresence();

  if (!hydrated) {
    return { status: 'offline', label: 'Checking...', subtitle: 'Loading presence', pulse: false, variant: 'offline' };
  }
  if (!isOnline) {
    return { status, label: 'Offline', subtitle: 'Go online to receive requests', pulse: false, variant: 'offline' };
  }
  if (!socketConnected) {
    return { status, label: 'Reconnecting', subtitle: 'Restoring live state', pulse: false, variant: 'reconnecting' };
  }

  if (tutorBusy) {
    return { status, label: 'In Session', subtitle: 'Currently helping a student', pulse: false, variant: 'busy' };
  }

  if (tutorAvailable) {
    return { status, label: 'Available', subtitle: 'Students can request your help', pulse: true, variant: 'available' };
  }

  if (discoverable) {
    return { status, label: 'Available', subtitle: 'You’re live! students can request help', pulse: true, variant: 'available' };
  }

  return { status, label: 'Unavailable', subtitle: 'You’re online, but not accepting requests', pulse: false, variant: 'unavailable' };
}