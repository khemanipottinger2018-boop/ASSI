# ASSI Backend — Definitive API Contract
> **Source of truth.** Generated directly from `src/` and `prisma/schema.prisma`.
> Frontend must follow this. Never invent routes or fields.

Base URL: `https://assi-backend-production.up.railway.app`

---

## Auth — `/api/auth`
Rate limit: 10 req / 15 min per IP.

### POST `/api/auth/register`
Public. Creates Supabase Auth user + `user_profiles` + `user_settings`.

**Body**
```json
{ "email": "string", "username": "string", "password": "string" }
// Demo account:
{ "isDemo": true }
```

**Response 201 — real user**
```json
{ "success": true }
```

**Response 201 — demo user**
```json
{
  "success": true,
  "demo": true,
  "expiresAt": "ISO date",
  "credentials": { "username": "string", "email": "string", "password": "string" },
  "warning": "string"
}
```

---

### POST `/api/auth/login`
Public.

**Body**
```json
{ "email": "string", "password": "string" }
```

**Response 200**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "role": "student | tutor | tutor_applicant | admin"
  }
}
```
Sets `assi_sid` cookie (HTTP-only, sliding session via Redis).

---

### POST `/api/auth/logout`
🔒 Auth required.

**Response 200**
```json
{ "success": true }
```
Clears cookie + revokes Redis session.

---

### POST `/api/auth/logout-all`
🔒 Auth required. Revokes all sessions.

---

### GET `/api/auth/me`
🔒 Auth required.
> ⚠️ Returns LESS than `/api/user/me`. Only use for auth checks.

**Response 200**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string | null",
    "role": "student | tutor | tutor_applicant | admin",
    "disclaimerAccepted": "boolean",
    "isDemo": "boolean",
    "demoExpiresAt": "ISO date | null"
  }
}
```

---

### POST `/api/auth/convert-demo`
🔒 Auth required. Converts demo account to real account.

---

## User — `/api/user`

### GET `/api/user/me`
🔒 Auth required. **Full profile — use this for profile pages.**

**Response 200**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string | null",
    "role": "student | tutor | tutor_applicant | admin",
    "createdAt": "ISO date",
    "tutor": {
      "id": "uuid",
      "hourlyRate": "Decimal | null",
      "isAvailable": "boolean"
    } // null if not a tutor
  }
}
```
> ⚠️ Does NOT return: `bio`, `phoneNumber`, `timezone`, `subjects`. 
> Those come from `/api/users-public/:username` (bio, hourlyRate, subjects) 
> or profile edit form fields saved via PATCH.

---

### PATCH `/api/user/profile`
🔒 Auth required. Partial update — send only fields to change.

**Body (all optional)**
```json
{
  "username": "string",
  "email": "string",
  "bio": "string | null",
  "phone_number": "string | null",
  "show_phone": "boolean",
  "hourly_rate": "number",        // tutors only
  "timezone": "string | null",    // tutors only
  "teaching_philosophy": "string | null", // tutors only
  "chat_mode": "string",          // tutors only
  "max_concurrent_chats": "number", // tutors only
  "is_student_tutor": "boolean"   // tutors only
}
```

**Response 200**
```json
{ "success": true }
```
> Returns NO user object. Refetch `/api/user/me` after update.

---

### GET `/api/user/settings`
🔒 Auth required.

**Response 200**
```json
{
  "success": true,
  "settings": {
    "emailNotifications": "boolean",
    "pushNotifications": "boolean",
    "theme": "light | dark | system",
    "language": "string",
    "timezone": "string"
  }
}
```

---

### PATCH `/api/user/settings`
🔒 Auth required. Partial update.

**Body (all optional)**
```json
{
  "emailNotifications": "boolean",
  "pushNotifications": "boolean",
  "theme": "light | dark | system",
  "language": "string",
  "timezone": "string"
}
```

**Response 200**
```json
{ "success": true }
```

---

## Public Profiles — `/api/users-public`

### GET `/api/users-public/:username`
Public. No auth.

**Response 200**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "role": "student | tutor",
    "tutorBio": "string | null",
    "hourlyRate": "Decimal | null",
    "subjects": [
      { "id": "uuid", "name": "string", "category": "string | null" }
    ]
  }
}
```
> Admin profiles return 403. Non-tutor profiles return empty subjects array.

---

## Tutors — `/api/tutors`

### GET `/api/tutors/available`
🔒 Auth required. Returns tutors currently online/available (from Redis presence).

**Query params**
```
?subjectId=uuid   // optional filter
```

**Response 200**
```json
{
  "success": true,
  "tutors": [
    {
      "tutorId": "uuid",
      "userId": "uuid",
      "username": "string",
      "bio": "string",
      "hourlyRate": "number",
      "chatMode": "string | null",
      "subjects": [
        { "id": "uuid", "name": "string", "category": "string | null" }
      ]
    }
  ]
}
```

---

### GET `/api/tutors/availability`
🔒 Auth required. Tutor role only. Own availability status.

**Response 200**
```json
{ "success": true, "available": "boolean" }
```

---

### POST `/api/tutors/availability`
🔒 Auth required. Tutor role only. Set own availability.

**Body**
```json
{ "available": "boolean" }
```

**Response 200**
```json
{ "success": true, "available": "boolean" }
```

---

## Browse — `/api/browse`

### GET `/api/browse/tutors`
🔒 Auth required. Paginated tutor directory.

**Query params**
```
?subjectId=uuid&minRate=number&maxRate=number&page=1&limit=20
```

**Response 200**
```json
{
  "success": true,
  "tutors": [
    {
      "tutorId": "uuid",
      "userId": "uuid",
      "username": "string",
      "bio": "string",
      "hourlyRate": "number",
      "timezone": "string | null",
      "chatMode": "string | null",
      "isStudentTutor": "boolean",
      "totalSessions": "number",
      "subjects": [
        { "id": "uuid", "name": "string", "category": "string | null" }
      ]
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "pages": "number"
  }
}
```

---

### POST `/api/browse/book`
🔒 Auth required. Student role only. Book a scheduled session.

**Body**
```json
{
  "tutor_id": "uuid",
  "subject_id": "uuid",
  "scheduled_time": "ISO date string",
  "duration_minutes": 60,
  "notes": "string"
}
```

**Response 201**
```json
{ "success": true, "sessionId": "uuid" }
```

---

### GET `/api/browse/my-sessions`
🔒 Auth required. Works for both student and tutor roles.

**Response 200**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "uuid",
      "status": "pending | confirmed | in_progress | active | completed | cancelled",
      "scheduledAt": "ISO date",
      "durationMinutes": "number",
      "rate": "Decimal | null",
      "notes": "string | null",
      "subjectName": "string",
      "partnerUsername": "string"
    }
  ]
}
```

---

## Subjects — `/api/subjects`
All public — no auth required.

| Route | Description |
|---|---|
| `GET /api/subjects` | All subjects. `?level=CSEC\|CAPE` to filter |
| `GET /api/subjects/public` | Same as above |
| `GET /api/subjects/popular` | Top 10 by tutor count |
| `GET /api/subjects/grouped/by-level` | Grouped object by category |
| `GET /api/subjects/by-level/:level` | `CSEC` or `CAPE` only |
| `GET /api/subjects/search/:query` | Min 2 chars |
| `GET /api/subjects/:id` | Single subject by UUID |

**Subject shape (all routes)**
```json
{ "id": "uuid", "name": "string", "category": "CSEC | CAPE | null", "tutorCount": "number" }
```

---

## Chat Sessions — `/api/chat`

### GET `/api/chat/sessions`
🔒 Auth required. Returns live (Redis) + historical (DB) sessions.

**Response 200**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid",
      "partnerId": "uuid | null",
      "partnerName": "string",
      "subjectName": "string",
      "status": "string",
      "live": "boolean",
      "startedAt": "ISO date"
    }
  ]
}
```

---

### GET `/api/chat/sessions/:sessionId/messages`
🔒 Auth required. Participants only.

**Response 200 — live session**
```json
{ "success": true, "messages": [...], "live": true }
```

**Response 200 — historical**
```json
{
  "success": true,
  "live": false,
  "messages": [
    {
      "messageId": "uuid",
      "sessionId": "uuid",
      "senderId": "uuid",
      "senderName": "string",
      "content": "string",
      "isRead": "boolean",
      "timestamp": "number (ms)",
      "isMine": "boolean"
    }
  ]
}
```

---

## Live Chat — `/api/live-chat`

### GET `/api/live-chat/active`
🔒 Auth required. Student role — check own active session.

**Response 200**
```json
{
  "success": true,
  "session": {
    "sessionId": "uuid",
    "status": "waiting | active",
    "tutorName": "string",
    "subjectName": "string",
    "startedAt": "number (ms)"
  } // null if no active session
}
```

---

### POST `/api/live-chat/create`
🔒 Auth required. Student only. Start a live chat request.

**Body**
```json
{ "tutorId": "uuid", "subjectId": "uuid | null" }
```

**Response 201**
```json
{ "success": true, "chatId": "uuid" }
```

---

### POST `/api/live-chat/:chatId/accept`
🔒 Auth required. Tutor only.

**Response 200**
```json
{ "success": true, "chatId": "uuid" }
```

---

### GET `/api/live-chat/:chatId`
🔒 Auth required. Participants only. Returns Redis session state.

---

### GET `/api/live-chat/:chatId/messages`
🔒 Auth required. Participants only. Returns Redis messages.

---

## Presence — `/api/presence`

### GET `/api/presence/me`
🔒 Auth required.

**Response 200**
```json
{
  "success": true,
  "online": "boolean",
  "intent": "available | do_not_disturb | busy_session | busy_other",
  "socketConnected": "boolean",
  "discoverable": "boolean",
  "lastActivity": "number | null"
}
```

---

### POST `/api/presence/heartbeat`
🔒 Auth required. Fire-and-forget. Call every 45s.

**Body**
```json
{ "intent": "available | do_not_disturb | busy_session | busy_other" }
```

---

### PATCH `/api/presence/intent`
🔒 Auth required. Set status intent.

**Body**
```json
{ "intent": "available | do_not_disturb | busy_session | busy_other" }
```

**Response 200**
```json
{
  "success": true,
  "intent": "string",
  "online": "boolean",
  "socketConnected": "boolean",
  "discoverable": "boolean"
}
```

---

### GET `/api/presence/:userId`
🔒 Auth required. Another user's presence.

**Response 200**
```json
{ "success": true, "userId": "uuid", "status": "string", "lastActivity": "number | null" }
```

---

## Notifications — `/api/notifications`

### GET `/api/notifications`
🔒 Auth required.

**Response 200**
```json
{ "success": true, "notifications": [...] }
```

### POST `/api/notifications/read-all`
🔒 Auth required.

**Response 200**
```json
{ "success": true }
```

---

## Tutor Applications — `/api/tutor-applications`

### POST `/api/tutor-applications/start`
🔒 Auth required. Student only. Creates application + promotes role to `tutor_applicant`.

**Response 201**
```json
{ "success": true, "applicationId": "uuid" }
// or if already started:
{ "success": true, "applicationId": "uuid", "alreadyStarted": true }
```

---

### PATCH `/api/tutor-applications/my-application`
🔒 Auth required. Save application content (can call multiple times).

**Body (all optional)**
```json
{
  "educationBackground": "string",
  "teachingExperience": "string",
  "whyTutor": "string",
  "qualifications": "string",
  "subjectIds": ["uuid"]
}
```

**Response 200**
```json
{ "success": true }
```

---

### GET `/api/tutor-applications/my-application`
🔒 Auth required.

**Response 200**
```json
{
  "success": true,
  "application": {
    "id": "uuid",
    "status": "pending | seen | under_review | approved | rejected",
    "submittedAt": "ISO date",
    "reviewedAt": "ISO date | null",
    "notes": "string | null",
    "educationBackground": "string | null",
    "teachingExperience": "string | null",
    "whyTutor": "string | null",
    "qualifications": "string | null",
    "subjects": [{ "id": "uuid", "name": "string", "category": "string | null" }]
  } // null if no application
}
```

---

### POST `/api/tutor-applications/submit`
🔒 Auth required. Formally submit completed application.
Requires: `educationBackground`, `teachingExperience`, `whyTutor`, at least 1 subject.

**Response 200**
```json
{ "success": true, "message": "Application submitted successfully" }
```

---

### Admin Application Routes (🔒 Admin only)

| Route | Description |
|---|---|
| `GET /api/tutor-applications/admin/all` | All apps. `?status=pending\|seen\|under_review\|approved\|rejected` |
| `GET /api/tutor-applications/admin/:id` | Single app — auto-advances `pending → seen` |
| `PATCH /api/tutor-applications/admin/:id/status` | Set `seen` or `under_review` only |
| `POST /api/tutor-applications/admin/:id/approve` | Approve — promotes user to `tutor` |
| `POST /api/tutor-applications/admin/:id/reject` | Reject — reverts role to `student` |

**Admin all response**
```json
{
  "success": true,
  "count": "number",
  "applications": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "string",
      "submittedAt": "ISO date | null",
      "reviewedAt": "ISO date | null",
      "user": { "username": "string", "role": "string", "createdAt": "ISO date" },
      "applicationSubjects": [
        { "subject": { "id": "uuid", "name": "string" } }
      ]
    }
  ]
}
```

**Approve/Reject body (optional)**
```json
{ "notes": "string" }
```

---

## Support — `/api/support`

### POST `/api/support/tickets`
🔒 Auth required.

**Body**
```json
{ "title": "string", "description": "string", "priority": "low | normal | high | urgent" }
```

**Response 201**
```json
{ "success": true, "ticketId": "uuid" }
```

---

### GET `/api/support/tickets/my`
🔒 Auth required. `?page=1&limit=20`

**Response 200**
```json
{
  "success": true,
  "tickets": [
    {
      "id": "uuid",
      "subject": "string",
      "status": "open | in_progress | resolved | closed",
      "priority": "low | normal | high | urgent",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```

---

### GET `/api/support/admin/tickets`
🔒 Admin only.

### PATCH `/api/support/admin/tickets/:id`
🔒 Admin only. Body: `{ "status": "string", "priority": "string" }`

---

## Admin — `/api/admin`
All routes: 🔒 Admin role required.

### GET `/api/admin/dashboard/stats`

**Response 200**
```json
{
  "success": true,
  "stats": {
    "totalUsers": "number",
    "tutors": "number",
    "students": "number",
    "onlineUsers": "number"
  }
}
```

---

### GET `/api/admin/users`
`?page=1&limit=50`

**Response 200**
```json
{
  "success": true,
  "users": [
    {
      "userId": "uuid",
      "username": "string",
      "role": "string",
      "isSuspended": "boolean",
      "isDemo": "boolean",
      "createdAt": "ISO date"
    }
  ]
}
```
> ⚠️ Field is `userId` not `id`.

---

### PATCH `/api/admin/users/:userId/role`
Body: `{ "role": "student | tutor | tutor-applicant | admin" }`

### PATCH `/api/admin/users/:userId/suspend`
Body: `{ "suspended": boolean }`

---

### GET `/api/admin/sessions/live`

**Response 200**
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "uuid",
      "status": "waiting | active",
      "type": "instant | scheduled",
      "studentId": "uuid",
      "tutorId": "uuid | null",
      "subjectId": "uuid | null",
      "startedAt": "number (ms)",
      "participants": ["uuid"],
      "participantCount": "number"
    }
  ]
}
```
> ⚠️ Does NOT return: `subjectName`, `messageCount`.

---

### GET `/api/admin/sessions/:sessionId/messages`
### POST `/api/admin/sessions/:sessionId/end`

---

### GET `/api/admin/metrics`

**Response 200**
```json
{
  "success": true,
  "metrics": {
    "totalUsers": "number",
    "totalTutors": "number",
    "totalStudents": "number",
    "onlineUsers": "number",
    "activeSessions": "number",
    "totalSessions": "number"
  }
}
```
> ⚠️ Does NOT return: `avgSessionDuration`.

---

### GET `/api/admin/metrics/runtime`

**Response 200**
```json
{ "success": true, "runtime": { ...RuntimeMetricsService.snapshot() } }
```

---

### GET `/api/admin/errors`
Stubbed — returns empty array.
```json
{ "success": true, "range": "24h", "count": 0, "errors": [] }
```

---

### Admin Tutor Applications (duplicate mount — prefer `/api/tutor-applications/admin/*`)
> These routes also exist at `/api/admin/tutor-applications/*` but the canonical 
> endpoint is `/api/tutor-applications/admin/*`.

---

## AI — `/api/ai`

### POST `/api/ai/assist`
ASSI chatbot. Auth required. Do not migrate to API client — use raw fetch.

### POST `/api/ai/sentinel`
Sentinel monitoring. Auth required. Do not migrate to API client.

### GET|PATCH `/api/ai/sentinel/*`
Sentinel REST API. Admin. Do not migrate to API client.

---

## Health

### GET `/`
Public. Returns `"ASSI backend is running."`

### GET `/health`
```json
{ "status": "ok", "database": "ok", "redis": "ok", "timestamp": 1234567890 }
```

---

## Key Rules for Frontend

1. **`/api/user/me`** — use for auth state. Does NOT have bio/phone/subjects.
2. **`/api/users-public/:username`** — use for public profile display.
3. **`PATCH /api/user/profile`** returns `{ success: true }` only — always refetch after.
4. **Admin users list** — field is `userId` (not `id`), `isSuspended` (not `is_suspended`).
5. **Admin sessions** — NO `subjectName`, NO `messageCount` in live sessions response.
6. **Subjects** — always `{ id, name, category }`. No `subject_id`, no `level`.
7. **Booked sessions** — `scheduledAt` (not `scheduledTime`), `rate` (not `price`).
8. **Tutor objects** — always have `tutorId` (tutor table PK) AND `userId` (auth user FK). These are different.
9. **Raw fetch (keep as-is)**: signup, live-chat actions, ASSI chatbot, Sentinel.
10. **Settings route** mounts at `/api/user/settings` (under `/api/user`, not separate).
