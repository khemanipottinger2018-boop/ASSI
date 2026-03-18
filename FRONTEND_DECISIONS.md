# ASSI Frontend — Decisions & Future Enhancements

## Notification Expiry
**Decision**: Type-based expiry baked into backend (not a user setting)
**Proposed logic**:
- `message`     → expire after 7 days
- `session`     → expire after 30 days  
- `application` → never expire
- `account`     → never expire
- `system`      → expire after 14 days

**What's needed**:
- Add `expires_at` column to `notifications` table in Supabase
- Backend sets `expires_at` on insert based on type
- Add pg_cron job to delete expired rows nightly
- Add `expires_at?: string` to frontend `Notification` type
- Frontend filters out expired notifications client-side as fallback

**Also consider**: "Clear all read notifications" button as a manual user action
**Status**: Pending backend schema change

---

## API Client
**Decision**: Centralized `lib/api/` with typed domain modules
**Status**: Done ✅

## Component Structure  
**Decision**: Role-based separation — shared/, student/, tutor/, admin/
**Status**: Done ✅

