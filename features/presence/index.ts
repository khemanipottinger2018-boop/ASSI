// features/presence/index.ts — public API for the presence feature

export { PresenceProvider, usePresence } from './PresenceProvider';
export type {
  FullPresence,
  Eligibility,
  StatusIntent,
  EligibilityReason,
  PresenceContextValue,
} from './PresenceProvider';

export { usePresenceDisplay } from './usePresenceDisplay';
export type {
  PresenceDisplayOutput,
  PresenceVariant,
} from './usePresenceDisplay';

export { presenceApi } from './presenceApi';
export type {
  PresenceMeResponse,
  PublicPresenceResponse,
} from './presenceApi';

export { default as PresenceBadge }           from './PresenceBadge';
export { default as TutorAvailabilityToggle } from './TutorAvailabilityToggle';
export { default as AvailabilityModal }        from './AvailabilityModal';
