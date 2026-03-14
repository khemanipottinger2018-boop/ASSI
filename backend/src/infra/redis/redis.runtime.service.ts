// backend/src/infra/redis/redis.runtime.service.ts

import { RedisClientType } from 'redis';
import { redisClient } from './redis.client';

/* ===================== TYPES ===================== */

export type LiveSessionType   = 'instant' | 'booked';
export type LiveSessionStatus = 'active' | 'paused' | 'ended' | 'waiting';

export type SessionEndReason =
  | 'completed'
  | 'inactivity'
  | 'ended_by_student'
  | 'ended_by_tutor'
  | 'no_tutor_available'   // waiting session expired with no accept
  | 'system';

export interface LiveSessionState {
  type:         LiveSessionType;
  status:       LiveSessionStatus;
  tutorId?:     string;
  studentId:    string;
  subjectId?:   string;
  startedAt:    number;
  endedAt?:     number;
  endedReason?: SessionEndReason;
}

export interface PendingInvite {
  fromUserId:        string;
  inviteeUsername:   string;
  approvals:         string[];
  requiredApprovals: number;
  createdAt:         number;
}

/* ===================== CONSTANTS ===================== */

const INACTIVITY_PAUSE_MS  = 10 * 60 * 1000; // 10 min idle → pause
const PAUSE_TERMINATION_MS =  5 * 60 * 1000; // 5 min paused → end
const WAITING_TIMEOUT_MS   =  5 * 60 * 1000; // 5 min waiting → expire (no tutor)
const SESSION_TTL_SECONDS  = 60 * 60 * 2;    // 2 hr max session TTL
const INVITE_TTL_SECONDS   = 60;

const WAITING_SESSIONS_KEY = 'session:waiting';
const ACTIVE_SESSIONS_KEY  = 'session:active';

/* ===================== LUA SCRIPTS =====================
   Atomic session claim — prevents TOCTOU race where two tutors
   both read status:'waiting' before either writes the claim.
   Without this, two tutors can double-assign the same session.
   Lua scripts execute atomically in Redis (single-threaded eval).
====================================================== */

/**
 * Atomically claims a waiting session for a tutor.
 * Returns 1 on success, 0 if already claimed or wrong tutor.
 *
 * KEYS[1] = session:state:{sessionId}
 * KEYS[2] = session:waiting  (set to remove from)
 * KEYS[3] = session:active   (set to add to)
 * KEYS[4] = session:participants:{sessionId}
 * ARGV[1] = tutorId
 * ARGV[2] = sessionId
 * ARGV[3] = studentId
 * ARGV[4] = SESSION_TTL_SECONDS
 */
const CLAIM_SESSION_LUA = `
local stateKey        = KEYS[1]
local waitingKey      = KEYS[2]
local activeKey       = KEYS[3]
local participantsKey = KEYS[4]

local tutorId         = ARGV[1]
local sessionId       = ARGV[2]
local studentId       = ARGV[3]
local ttl             = tonumber(ARGV[4])

local status = redis.call('HGET', stateKey, 'status')
if status ~= 'waiting' then
  return 0
end

local existingTutor = redis.call('HGET', stateKey, 'tutorId')
if existingTutor and existingTutor ~= '' and existingTutor ~= tutorId then
  return 0
end

redis.call('HSET', stateKey, 'tutorId', tutorId, 'status', 'active')
redis.call('SREM', waitingKey, sessionId)
redis.call('SADD', activeKey, sessionId)
redis.call('SADD', participantsKey, studentId)
redis.call('SADD', participantsKey, tutorId)
redis.call('EXPIRE', participantsKey, ttl)

return 1
`;

/* ===================== SERVICE ===================== */

export class RedisRuntimeService {
  private client: RedisClientType;

  constructor() {
    this.client = redisClient.client;
  }

  /* ──────────────────────────────────────────────
     KEY HELPERS
  ────────────────────────────────────────────── */

  private stateKey(sessionId: string)        { return `session:state:${sessionId}`; }
  private activityKey(sessionId: string)     { return `session:lastActivity:${sessionId}`; }
  private pausedAtKey(sessionId: string)     { return `session:pausedAt:${sessionId}`; }
  private participantsKey(sessionId: string) { return `session:participants:${sessionId}`; }
  private messagesKey(sessionId: string)     { return `session:messages:${sessionId}`; }
  private inviteKey(sessionId: string)       { return `session:invite:${sessionId}`; }
  private createdAtKey(sessionId: string)    { return `session:createdAt:${sessionId}`; }

  /**
   * O(1) index: student → their current sessionId.
   * Written on createSession, deleted on endSession.
   * Used by /api/live-chat/active to avoid O(N) scan.
   */
  private studentSessionKey(studentId: string) { return `student:session:${studentId}`; }

  /* ──────────────────────────────────────────────
     CREATE SESSION
  ────────────────────────────────────────────── */

  async createSession(
    sessionId: string,
    state: {
      type:       LiveSessionType;
      tutorId?:   string;
      studentId:  string;
      subjectId?: string;
      status?:    LiveSessionStatus;
    }
  ): Promise<void> {
    const now    = Date.now();
    const status = state.status ?? 'active';

    const pipeline = this.client
      .multi()
      .hSet(this.stateKey(sessionId), {
        type:      state.type,
        status,
        studentId: state.studentId,
        startedAt: now.toString(),
        ...(state.tutorId   ? { tutorId:   state.tutorId   } : {}),
        ...(state.subjectId ? { subjectId: state.subjectId } : {}),
      })
      .set(this.activityKey(sessionId), now.toString(), { EX: SESSION_TTL_SECONDS })
      .expire(this.stateKey(sessionId), SESSION_TTL_SECONDS)
      .expire(this.participantsKey(sessionId), SESSION_TTL_SECONDS)
      // O(1) student index — always set so /active is instant
      .set(this.studentSessionKey(state.studentId), sessionId, { EX: SESSION_TTL_SECONDS })
      // Track creation time for waiting-session timeout
      .set(this.createdAtKey(sessionId), now.toString(), { EX: SESSION_TTL_SECONDS });

    if (status === 'waiting') {
      pipeline.sAdd(WAITING_SESSIONS_KEY, sessionId);
    } else {
      const ids: string[] = [state.studentId];
      if (state.tutorId) ids.push(state.tutorId);
      pipeline
        .sAdd(this.participantsKey(sessionId), ids)
        .sAdd(ACTIVE_SESSIONS_KEY, sessionId);
    }

    await pipeline.exec();
  }

  /* ──────────────────────────────────────────────
     ATOMIC CLAIM (BUG FIX #1 — replaces old acceptWaitingSession)
     Uses a Lua script to prevent TOCTOU race conditions.
     Two tutors can no longer double-claim the same session.
  ────────────────────────────────────────────── */

  async acceptWaitingSession(
    sessionId: string,
    tutorId:   string
  ): Promise<LiveSessionState | null> {
    // Read state first so we can return it on success
    const state = await this.getSessionState(sessionId);
    if (!state) return null;
    if (state.status !== 'waiting') return null;
    if (state.tutorId && state.tutorId !== tutorId) return null;

    // Atomic claim via Lua — only one tutor wins
    const result = await (this.client as any).eval(CLAIM_SESSION_LUA, {
      keys: [
        this.stateKey(sessionId),
        WAITING_SESSIONS_KEY,
        ACTIVE_SESSIONS_KEY,
        this.participantsKey(sessionId),
      ],
      arguments: [
        tutorId,
        sessionId,
        state.studentId,
        String(SESSION_TTL_SECONDS),
      ],
    });

    if (result === 0) return null; // Lost the race — another tutor claimed it

    // Update last activity timestamp
    await this.client.set(
      this.activityKey(sessionId),
      Date.now().toString(),
      { EX: SESSION_TTL_SECONDS }
    );

    return { ...state, tutorId, status: 'active' };
  }

  /* ──────────────────────────────────────────────
     GET SESSION STATE
  ────────────────────────────────────────────── */

  async getSessionState(sessionId: string): Promise<LiveSessionState | null> {
    const data = await this.client.hGetAll(this.stateKey(sessionId));
    if (!data || !data.status) return null;

    const tutorId = data.tutorId?.trim();
    return {
      type:        data.type as LiveSessionType,
      status:      data.status as LiveSessionStatus,
      tutorId:     tutorId || undefined,
      studentId:   data.studentId,
      subjectId:   data.subjectId ?? undefined,
      startedAt:   Number(data.startedAt),
      endedAt:     data.endedAt ? Number(data.endedAt) : undefined,
      endedReason: data.endedReason as SessionEndReason | undefined,
    };
  }

  /* ──────────────────────────────────────────────
     STUDENT SESSION INDEX (BUG FIX #6 — O(1) lookup)
  ────────────────────────────────────────────── */

  /**
   * Returns the active or waiting session for a student in O(1).
   * Replaces the O(N) scan in /api/live-chat/active.
   */
  async getActiveSessionByStudentId(studentId: string): Promise<{
    sessionId: string;
    state:     LiveSessionState;
  } | null> {
    const sessionId = await this.client.get(this.studentSessionKey(studentId));
    if (!sessionId) return null;

    const state = await this.getSessionState(sessionId);
    if (!state) {
      // Index is stale — clean it up
      await this.client.del(this.studentSessionKey(studentId));
      return null;
    }

    // Ended sessions don't count
    if (state.status === 'ended') {
      await this.client.del(this.studentSessionKey(studentId));
      return null;
    }

    return { sessionId, state };
  }

  /* ──────────────────────────────────────────────
     MARK ACTIVITY
  ────────────────────────────────────────────── */

  async markActivity(sessionId: string): Promise<void> {
    const now   = Date.now();
    const state = await this.getSessionState(sessionId);
    if (!state) return;
    if (state.status === 'ended') return;

    await this.client
      .multi()
      .set(this.activityKey(sessionId), now.toString(), { EX: SESSION_TTL_SECONDS })
      .del(this.pausedAtKey(sessionId))
      // Activity on a paused session resumes it; waiting stays waiting
      .hSet(this.stateKey(sessionId), {
        status: state.status === 'waiting' ? 'waiting' : 'active',
      })
      .exec();
  }

  /* ──────────────────────────────────────────────
     UPDATE SESSION
  ────────────────────────────────────────────── */

  async updateSession(
    sessionId: string,
    patch: Partial<Pick<LiveSessionState, 'tutorId' | 'status' | 'subjectId'>>
  ): Promise<void> {
    const updates: Record<string, string> = {};

    if (patch.tutorId   !== undefined) updates.tutorId   = patch.tutorId ?? '';
    if (patch.status    !== undefined) updates.status    = patch.status;
    if (patch.subjectId !== undefined) updates.subjectId = patch.subjectId;

    if (Object.keys(updates).length === 0) return;

    const pipeline = this.client.multi().hSet(this.stateKey(sessionId), updates);

    if (patch.status === 'active') {
      const state = await this.getSessionState(sessionId);
      if (state) {
        const ids = new Set<string>([state.studentId]);
        if (patch.tutorId)  ids.add(patch.tutorId);
        else if (state.tutorId) ids.add(state.tutorId);

        pipeline
          .sRem(WAITING_SESSIONS_KEY, sessionId)
          .sAdd(ACTIVE_SESSIONS_KEY, sessionId)
          .sAdd(this.participantsKey(sessionId), [...ids]);
      }
    }

    await pipeline.exec();
  }

  /* ──────────────────────────────────────────────
     PAUSE SESSION
  ────────────────────────────────────────────── */

  async pauseSession(sessionId: string): Promise<void> {
    const now = Date.now();
    await this.client
      .multi()
      .hSet(this.stateKey(sessionId), { status: 'paused' })
      .set(this.pausedAtKey(sessionId), now.toString(), { EX: SESSION_TTL_SECONDS })
      .exec();
  }

  /* ──────────────────────────────────────────────
     END SESSION
  ────────────────────────────────────────────── */

  async endSession(sessionId: string, reason: SessionEndReason): Promise<void> {
    const now   = Date.now();
    const state = await this.getSessionState(sessionId);

    const pipeline = this.client
      .multi()
      .hSet(this.stateKey(sessionId), {
        status:      'ended',
        endedAt:     now.toString(),
        endedReason: reason,
      })
      .sRem(ACTIVE_SESSIONS_KEY,  sessionId)
      .sRem(WAITING_SESSIONS_KEY, sessionId)
      .del(this.activityKey(sessionId))
      .del(this.pausedAtKey(sessionId))
      .del(this.participantsKey(sessionId))
      .del(this.inviteKey(sessionId))
      .del(this.createdAtKey(sessionId));

    // Remove student index so /active stops returning this session
    if (state?.studentId) {
      pipeline.del(this.studentSessionKey(state.studentId));
    }

    await pipeline.exec();
  }

  /* ──────────────────────────────────────────────
     FORCE CLEANUP (admin / emergency)
  ────────────────────────────────────────────── */

  async forceCleanup(sessionId: string): Promise<void> {
    const state = await this.getSessionState(sessionId);

    const pipeline = this.client
      .multi()
      .sRem(ACTIVE_SESSIONS_KEY,  sessionId)
      .sRem(WAITING_SESSIONS_KEY, sessionId)
      .del(this.stateKey(sessionId))
      .del(this.activityKey(sessionId))
      .del(this.pausedAtKey(sessionId))
      .del(this.participantsKey(sessionId))
      .del(this.inviteKey(sessionId))
      .del(this.messagesKey(sessionId))
      .del(this.createdAtKey(sessionId));

    if (state?.studentId) {
      pipeline.del(this.studentSessionKey(state.studentId));
    }

    await pipeline.exec();
  }

  /* ──────────────────────────────────────────────
     SESSION ID INDEXES
  ────────────────────────────────────────────── */

  async getActiveSessionIds():  Promise<string[]> { return this.client.sMembers(ACTIVE_SESSIONS_KEY); }
  async getWaitingSessionIds(): Promise<string[]> { return this.client.sMembers(WAITING_SESSIONS_KEY); }
  async getLiveSessions():      Promise<string[]> { return this.getActiveSessionIds(); }

  async listWaitingSessions(): Promise<Array<{ sessionId: string; state: LiveSessionState; createdAt: number }>> {
    const ids = await this.client.sMembers(WAITING_SESSIONS_KEY);
    if (!ids.length) return [];

    const results = await Promise.all(
      ids.map(async (sessionId) => {
        const [state, createdAtRaw] = await Promise.all([
          this.getSessionState(sessionId),
          this.client.get(this.createdAtKey(sessionId)),
        ]);
        if (!state) return null;
        return { sessionId, state, createdAt: Number(createdAtRaw ?? 0) };
      })
    );

    return results.filter((s): s is NonNullable<typeof s> => s !== null);
  }

  async getParticipantIds(sessionId: string): Promise<string[]> {
    return this.client.sMembers(this.participantsKey(sessionId));
  }

  /* ──────────────────────────────────────────────
     INACTIVITY EVALUATION
  ────────────────────────────────────────────── */

  async evaluateInactivity(sessionId: string): Promise<{ action: 'none' | 'pause' | 'end' }> {
    const lastActivityRaw = await this.client.get(this.activityKey(sessionId));
    if (!lastActivityRaw) return { action: 'none' };

    const now    = Date.now();
    const idleMs = now - Number(lastActivityRaw);

    if (idleMs < INACTIVITY_PAUSE_MS) return { action: 'none' };

    const pausedAtRaw = await this.client.get(this.pausedAtKey(sessionId));
    if (!pausedAtRaw) return { action: 'pause' };

    if (now - Number(pausedAtRaw) >= PAUSE_TERMINATION_MS) return { action: 'end' };

    return { action: 'none' };
  }

  /**
   * Check whether a waiting session has exceeded the no-tutor timeout.
   * Called by the watchdog to expire abandoned waiting sessions.
   */
  async isWaitingSessionExpired(sessionId: string): Promise<boolean> {
    const createdAtRaw = await this.client.get(this.createdAtKey(sessionId));
    if (!createdAtRaw) return true; // Key gone — treat as expired
    return Date.now() - Number(createdAtRaw) >= WAITING_TIMEOUT_MS;
  }

  /* ──────────────────────────────────────────────
     PENDING INVITE
  ────────────────────────────────────────────── */

  async setPendingInvite(sessionId: string, invite: PendingInvite): Promise<void> {
    await this.client.set(this.inviteKey(sessionId), JSON.stringify(invite), { EX: INVITE_TTL_SECONDS });
  }

  async getPendingInvite(sessionId: string): Promise<PendingInvite | null> {
    const raw = await this.client.get(this.inviteKey(sessionId));
    if (!raw) return null;
    try { return JSON.parse(raw) as PendingInvite; } catch { return null; }
  }

  async clearPendingInvite(sessionId: string): Promise<void> {
    await this.client.del(this.inviteKey(sessionId));
  }

  /* ──────────────────────────────────────────────
     MESSAGE PERSISTENCE
  ────────────────────────────────────────────── */

  async saveMessage(
    sessionId: string,
    message: { messageId: string; senderId: string; content: string; timestamp: number }
  ): Promise<void> {
    await this.client
      .multi()
      .rPush(this.messagesKey(sessionId), JSON.stringify(message))
      .expire(this.messagesKey(sessionId), SESSION_TTL_SECONDS)
      .exec();
  }

  async getMessages(
    sessionId: string,
    limit = 200
  ): Promise<Array<{ messageId: string; sessionId: string; senderId: string; content: string; timestamp: number }>> {
    const raw = await this.client.lRange(this.messagesKey(sessionId), -limit, -1);
    return raw
      .map((r) => {
        try   { return { ...JSON.parse(r), sessionId }; }
        catch { return null; }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }
}

export const redisRuntimeService = new RedisRuntimeService();
