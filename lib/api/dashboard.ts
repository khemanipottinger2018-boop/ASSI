// lib/api/dashboard.ts
// Removed: was importing from '@/components/types/dashboard.view' (wrong path)
// and calling /api/dashboard which doesn't exist on the backend.
//
// The student dashboard fetches its own data inline via three parallel requests:
//   /api/browse/my-sessions
//   /api/notifications
//   /api/tutors/available
//
// This file is kept only as a reference shim. If a unified dashboard endpoint
// is added to the backend later, wire it up here.

export {};
