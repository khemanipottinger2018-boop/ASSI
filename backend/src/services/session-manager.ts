import { getPool, executeQuery, executeSingle } from '../config/database.js';
import sql from 'mssql';

export type SessionStatus = 'requested' | 'accepted' | 'declined' | 'active' | 'completed' | 'expired';

export interface SessionDetails {
  id: string;
  student_id: string;
  tutor_id: string;
  subject_id: string;
  status: SessionStatus;
  requested_at: Date;
  expiry_time: Date;
  accepted_at?: Date;
  started_at?: Date;
  ended_at?: Date;
  decline_reason?: string;
  student_notes?: string;
  student_name?: string;
  student_avatar?: string;
  tutor_name?: string;
  tutor_avatar?: string;
  subject_name?: string;
}

export interface CreateSessionData {
  student_id: string;
  tutor_id: string;
  subject_id: string;
  student_notes?: string;
}

const DEFAULT_EXPIRY_MINUTES = 30;
const SESSION_ERRORS = {
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED'
} as const;

export class SessionManager {
  constructor(private presenceService?: any, private io?: any) {}

  /**
   * Create chat session with duplicate prevention
   */
  async createChatSession(data: CreateSessionData): Promise<SessionDetails> {
    // Check for duplicate pending requests
    const duplicate = await executeSingle<{ id: string }>(`
      SELECT id FROM chat_sessions 
      WHERE student_id = @studentId 
        AND subject_id = @subjectId 
        AND status = 'requested' 
        AND expiry_time > GETDATE()
    `, {
      studentId: { value: data.student_id },
      subjectId: { value: data.subject_id }
    });

    if (duplicate) {
      throw new Error(SESSION_ERRORS.DUPLICATE_REQUEST);
    }

    const result = await executeQuery<{ id: string }>(`
      INSERT INTO chat_sessions 
        (student_id, tutor_id, subject_id, status, requested_at, expiry_time, student_notes)
      OUTPUT INSERTED.id
      VALUES (@studentId, @tutorId, @subjectId, 'requested', GETDATE(), 
             DATEADD(MINUTE, @expiryMinutes, GETDATE()), @studentNotes)
    `, {
      studentId: { value: data.student_id },
      tutorId: { value: data.tutor_id },
      subjectId: { value: data.subject_id },
      studentNotes: { value: data.student_notes || '' },
      expiryMinutes: { value: DEFAULT_EXPIRY_MINUTES, type: sql.Int }
    });

    const sessionId = result[0].id;
    return await this.getSessionDetails(sessionId);
  }

  /**
   * Accept chat session and update tutor presence to "busy"
   */
  async acceptChatSession(sessionId: string, tutorId: string): Promise<SessionDetails> {
    const session = await executeSingle<SessionDetails>(`
      SELECT * FROM chat_sessions WHERE id = @sessionId AND tutor_id = @tutorId
    `, { sessionId: { value: sessionId }, tutorId: { value: tutorId } });

    if (!session) {
      throw new Error(SESSION_ERRORS.SESSION_NOT_FOUND);
    }

    if (session.status !== 'requested') {
      throw new Error('Session cannot be accepted in current status');
    }

    await executeQuery(`
      UPDATE chat_sessions 
      SET status = 'accepted', accepted_at = GETDATE()
      WHERE id = @sessionId
    `, { sessionId: { value: sessionId } });

    const details = await this.getSessionDetails(sessionId);

    // Update tutor presence to "busy" for the session
    if (this.presenceService) {
      await this.presenceService.userJoinedSession(tutorId, sessionId);
    }

    // Notify student via Socket.IO
    if (this.io) {
      this.io.to(`user:${details.student_id}`).emit('chat_request_accepted', {
        session_id: sessionId,
        tutor_id: tutorId,
        tutor_name: details.tutor_name,
        accepted_at: details.accepted_at
      });
    }

    return details;
  }

  /**
   * Start active chat session
   */
  async startChatSession(sessionId: string, userId: string): Promise<SessionDetails> {
    const canAccess = await this.canUserAccessSession(sessionId, userId);
    if (!canAccess) {
      throw new Error(SESSION_ERRORS.UNAUTHORIZED);
    }

    await executeQuery(`
      UPDATE chat_sessions 
      SET status = 'active', started_at = GETDATE()
      WHERE id = @sessionId AND status = 'accepted'
    `, { sessionId: { value: sessionId } });

    const details = await this.getSessionDetails(sessionId);

    // Notify both users via Socket.IO
    if (this.io) {
      this.io.to(`chat:${sessionId}`).emit('chat_session_started', {
        session_id: sessionId,
        started_at: details.started_at
      });
    }

    return details;
  }

  /**
   * End chat session and update tutor presence back to "online"
   */
  async endChatSession(sessionId: string, userId: string): Promise<SessionDetails> {
    const canAccess = await this.canUserAccessSession(sessionId, userId);
    if (!canAccess) {
      throw new Error(SESSION_ERRORS.UNAUTHORIZED);
    }

    const session = await this.getSessionDetails(sessionId);
    
    await executeQuery(`
      UPDATE chat_sessions 
      SET status = 'completed', ended_at = GETDATE()
      WHERE id = @sessionId
    `, { sessionId: { value: sessionId } });

    const details = await this.getSessionDetails(sessionId);

    // Update tutor presence back to "online"
    if (this.presenceService && session.tutor_id) {
      await this.presenceService.userLeftSession(session.tutor_id);
    }

    // Notify both users via Socket.IO
    if (this.io) {
      this.io.to(`chat:${sessionId}`).emit('chat_session_ended', {
        session_id: sessionId,
        ended_at: details.ended_at
      });
    }

    return details;
  }

  /**
   * Decline chat session
   */
  async declineChatSession(sessionId: string, declineReason: string, tutorId: string): Promise<SessionDetails> {
    const session = await executeSingle<SessionDetails>(`
      SELECT * FROM chat_sessions WHERE id = @sessionId AND tutor_id = @tutorId
    `, { sessionId: { value: sessionId }, tutorId: { value: tutorId } });

    if (!session) {
      throw new Error(SESSION_ERRORS.SESSION_NOT_FOUND);
    }

    await executeQuery(`
      UPDATE chat_sessions 
      SET status = 'declined', decline_reason = @declineReason
      WHERE id = @sessionId
    `, { 
      sessionId: { value: sessionId },
      declineReason: { value: declineReason }
    });

    const details = await this.getSessionDetails(sessionId);

    // Notify student via Socket.IO
    if (this.io) {
      this.io.to(`user:${details.student_id}`).emit('chat_request_declined', {
        session_id: sessionId,
        tutor_id: tutorId,
        decline_reason: declineReason
      });
    }

    return details;
  }

  /**
   * Get session details with user information
   */
  private async getSessionDetails(sessionId: string): Promise<SessionDetails> {
    const result = await executeQuery<SessionDetails>(`
      SELECT 
        cs.*,
        stu.username as student_name,
        stu.profile_pic as student_avatar,
        tut.username as tutor_name,
        tut.profile_pic as tutor_avatar,
        s.name as subject_name
      FROM chat_sessions cs
      INNER JOIN Users stu ON cs.student_id = stu.id
      INNER JOIN Users tut ON cs.tutor_id = tut.id
      INNER JOIN Subjects s ON cs.subject_id = s.subject_id
      WHERE cs.id = @sessionId
    `, { sessionId: { value: sessionId } });

    if (result.length === 0) {
      throw new Error(SESSION_ERRORS.SESSION_NOT_FOUND);
    }

    return result[0];
  }

  /**
   * Check if user can access session
   */
  private async canUserAccessSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await executeSingle<{ id: string }>(`
      SELECT id FROM chat_sessions 
      WHERE id = @sessionId AND (student_id = @userId OR tutor_id = @userId)
    `, { 
      sessionId: { value: sessionId },
      userId: { value: userId }
    });

    return !!result;
  }

  /**
   * Get pending requests for tutor
   */
  async getTutorPendingRequests(tutorId: string): Promise<SessionDetails[]> {
    return await executeQuery<SessionDetails>(`
      SELECT 
        cs.id,
        cs.student_id,
        cs.subject_id,
        cs.student_notes,
        cs.requested_at,
        cs.expiry_time,
        u.username as student_name,
        u.profile_pic as student_avatar,
        s.name as subject_name
      FROM chat_sessions cs
      INNER JOIN Users u ON cs.student_id = u.id
      INNER JOIN Subjects s ON cs.subject_id = s.subject_id
      WHERE cs.tutor_id = @tutorId 
        AND cs.status = 'requested'
        AND cs.expiry_time > GETDATE()
      ORDER BY cs.requested_at ASC
    `, { tutorId: { value: tutorId } });
  }

  /**
   * Get active sessions for user
   */
  async getUserActiveSessions(userId: string): Promise<SessionDetails[]> {
    return await executeQuery<SessionDetails>(`
      SELECT 
        cs.*,
        u.username as student_name,
        u.profile_pic as student_avatar,
        tut.username as tutor_name,
        tut.profile_pic as tutor_avatar,
        s.name as subject_name
      FROM chat_sessions cs
      INNER JOIN Users u ON cs.student_id = u.id
      INNER JOIN Users tut ON cs.tutor_id = tut.id
      INNER JOIN Subjects s ON cs.subject_id = s.subject_id
      WHERE (cs.student_id = @userId OR cs.tutor_id = @userId)
        AND cs.status IN ('accepted', 'active')
      ORDER BY cs.requested_at DESC
    `, { userId: { value: userId } });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await executeQuery<{ expired_count: number }>(`
      UPDATE chat_sessions 
      SET status = 'expired' 
      WHERE status = 'requested' 
        AND expiry_time <= GETDATE()
      SELECT @@ROWCOUNT as expired_count
    `);

    return result[0]?.expired_count || 0;
  }
}

export default SessionManager;