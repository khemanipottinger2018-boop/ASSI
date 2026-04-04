// features/live-chat/index.ts
export { StudyPanel } from './StudyPanel';
export type { StudyTool, StudyPermissions, Problem, FileEntry, TimerState } from './StudyPanel';

export { useMessages } from './useMessages';

// Hooks
export { useChatSocket }   from './hooks/useChatSocket';
export { useChatRoom }     from './hooks/useChatRoom';
export { useChatMessages } from './hooks/useChatMessages';
export type { ChatMessage } from './hooks/useChatMessages';
export { useTyping }       from './hooks/useTyping';

// Types
export type {
  SessionType,
  SpeakMode,
  SessionStatus,
  Participant,
  PresencePayload,
  InviteRequest,
  SessionMeta,
  ServerToClientEvents,
  ClientToServerEvents,
} from './types/SocketEvents';
