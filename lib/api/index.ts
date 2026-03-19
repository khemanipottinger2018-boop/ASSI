export { api }              from './client';
export { userApi }          from './user';
export type { UserMe }      from './user';

export { sessionsApi }      from './sessions';
export type {
  BookedSession,
  ChatSession,
  SessionMessage,
  BookSessionBody,
}                           from './sessions';

export { tutorsApi }        from './tutors';
export type {
  TutorSummary,
  SubjectSummary,
  PublicProfile,
  BrowseFilters,
  BrowsePagination,
}                           from './tutors';

export { notificationsApi } from './notifications';
// Notification type is the canonical one from components/types/notification
// re-exported through notifications.ts — single source of truth
export type { Notification } from './notifications';

export { adminApi }         from './admin';
export type {
  AdminUser,
  AdminApplication,
  AdminApplicationDetail,
  AdminMetrics,
  DashboardStats,
  LiveSession,
  ApplicationStatus,
}                           from './admin';