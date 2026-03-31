// features/booking/index.ts
export { browseApi } from './browseApi';
export type {
  BookSessionBody,
  InstantChatBody,
  SessionSummary,
  SessionStatus,
} from './browseApi';

export { default as BookingModal } from './BookingModal';
export type {
  BookingMode,
  BookingModalProps,
} from './BookingModal';
