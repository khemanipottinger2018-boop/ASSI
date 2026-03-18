import { PresenceStatus } from '@/contexts/PresenceProvider';

type PresenceDisplayInput = {
  hydrated: boolean;
  status: PresenceStatus;
  discoverable: boolean;
  isOnline: boolean;
  socketConnected: boolean;
};

type PresenceDisplayOutput = {
  status: PresenceStatus;
  label: string;
  subtitle: string;
  pulse: boolean;
};

export function getPresenceDisplay({
  hydrated,
  status,
  discoverable,
  isOnline,
  socketConnected,
}: PresenceDisplayInput): PresenceDisplayOutput {
  if (!hydrated) {
    return {
      status: 'offline',
      label: 'Checking...',
      subtitle: 'Loading your live presence',
      pulse: false,
    };
  }

  if (status === 'busy') {
    return {
      status: 'busy',
      label: 'In Session',
      subtitle: 'You are currently helping a student',
      pulse: false,
    };
  }

  if (discoverable) {
    return {
      status: 'online',
      label: 'Available',
      subtitle: 'You’re live — students can request your help',
      pulse: true,
    };
  }

  if (isOnline && socketConnected) {
    return {
      status: 'offline',
      label: 'Unavailable',
      subtitle: 'You’re connected, but not accepting requests',
      pulse: false,
    };
  }

  if (isOnline && !socketConnected) {
    return {
      status: 'offline',
      label: 'Reconnecting',
      subtitle: 'You’re logged in, but live socket is not ready',
      pulse: false,
    };
  }

  return {
    status: 'offline',
    label: 'Offline',
    subtitle: 'Go online to receive student requests',
    pulse: false,
  };
}