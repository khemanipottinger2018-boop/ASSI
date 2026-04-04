export { api } from './client';

export { userApi } from './user';
export type {
  UserMe,
  UserStreak,
  UserBadge,
  UserFeatures,
  UserFeaturesResponse,
  CreditTransaction,
  UserQuota,
  DailyTask,
} from './user';

export { goalsApi } from './goals';
export type {
  UserGoal,
  GoalType,
  CreateGoalBody,
  UpdateGoalBody,
} from './goals';

export { presenceApi } from './presence';
export type { 
  PresenceMeResponse, 
  PublicPresenceResponse, 
  Eligibility 
} from './presence';

export { sessionsApi } from './sessions';
export type {
  BookedSession,
  ChatSession,
  SessionMessage,
} from './sessions';

export { tutorsApi } from './tutors';
export type {
  TutorSummary,
  SubjectSummary,
  PublicProfile,
  BrowseFilters,
  BrowsePagination,
} from './tutors';

export { notificationsApi } from './notifications';
export type { Notification } from './notifications';

export { adminApi } from './admin';
export type {
  AdminUser,
  AdminApplication,
  AdminApplicationDetail,
  AdminMetrics,
  DashboardStats,
  LiveSession,
  ApplicationStatus,
} from './admin';

export { messagesApi, adminMessagesApi } from './messages';
export type {
  InboxMessage,
  MessageThread,
} from './messages';

export { browseApi } from './browse';
export type {
  BookSessionBody,
  InstantChatBody,
  SessionSummary,
} from './browse';