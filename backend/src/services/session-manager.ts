// backend/src/services/session-manager.ts
import { db } from '@/config/database';

// Define interfaces locally since they're not exported from database.ts
interface ChatSession {
  id: string;
  student_id: string;
  tutor_id: string;
  subject_id: string;
  status: 'pending' | 'active' | 'ended' | 'declined';
  requested_at: Date;
  accepted_at?: Date;
  started_at?: Date;
  ended_at?: Date;
  student_notes?: string;
  decline_reason?: string;
  expiry_time?: Date;
  ended_by?: string;
}

interface ChatSessionWithDetails extends ChatSession {
  student_username: string;
  tutor_username: string;
  subject_name: string;
}

export class SessionManager {
  // Create chat session
  async createChatSession(data: {
    student_id: string;
    tutor_id: string;
    subject_id: string;
    student_notes?: string;
  }): Promise<string> {
    const result = await db.query<{ id: string }>(
      `INSERT INTO chat_sessions 
        (student_id, tutor_id, subject_id, status, requested_at, expiry_time, student_notes)
       OUTPUT INSERTED.id
       VALUES (@student_id, @tutor_id, @subject_id, 'pending', GETDATE(), 
              DATEADD(MINUTE, 30, GETDATE()), @student_notes)`,
      {
        student_id: data.student_id,
        tutor_id: data.tutor_id,
        subject_id: data.subject_id,
        student_notes: data.student_notes || ''
      }
    );

    return result[0]?.id || '';
  }

  // Accept chat session
  async acceptChatSession(sessionId: string, tutorId: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE chat_sessions 
         SET status = 'accepted', accepted_at = GETDATE()
         WHERE id = @session_id AND tutor_id = @tutor_id AND status = 'pending'`,
        { 
          session_id: sessionId,
          tutor_id: tutorId
        }
      );
      
      // Verify update worked
      const check = await db.queryOne<{ id: string }>(
        `SELECT id FROM chat_sessions 
         WHERE id = @session_id AND status = 'accepted'`,
        { session_id: sessionId }
      );
      
      return !!check;
    } catch (error) {
      console.error('Accept chat session error:', error);
      return false;
    }
  }

  // Start chat session
  async startChatSession(sessionId: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE chat_sessions 
         SET status = 'active', started_at = GETDATE()
         WHERE id = @session_id AND status = 'accepted'`,
        { session_id: sessionId }
      );
      
      // Verify update
      const check = await db.queryOne<{ id: string }>(
        `SELECT id FROM chat_sessions 
         WHERE id = @session_id AND status = 'active'`,
        { session_id: sessionId }
      );
      
      return !!check;
    } catch (error) {
      console.error('Start chat session error:', error);
      return false;
    }
  }

  // End chat session
  async endChatSession(sessionId: string, endedBy: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE chat_sessions 
         SET status = 'ended', ended_at = GETDATE(), ended_by = @ended_by
         WHERE id = @session_id AND status IN ('active', 'accepted')`,
        { 
          session_id: sessionId,
          ended_by: endedBy
        }
      );
      
      // Verify update
      const check = await db.queryOne<{ id: string }>(
        `SELECT id FROM chat_sessions 
         WHERE id = @session_id AND status = 'ended'`,
        { session_id: sessionId }
      );
      
      return !!check;
    } catch (error) {
      console.error('End chat session error:', error);
      return false;
    }
  }

  // Decline chat session
  async declineChatSession(sessionId: string, tutorId: string, reason?: string): Promise<boolean> {
    try {
      await db.query(
        `UPDATE chat_sessions 
         SET status = 'declined', decline_reason = @reason
         WHERE id = @session_id AND tutor_id = @tutor_id AND status = 'pending'`,
        { 
          session_id: sessionId,
          tutor_id: tutorId,
          reason: reason || ''
        }
      );
      
      // Verify update
      const check = await db.queryOne<{ id: string }>(
        `SELECT id FROM chat_sessions 
         WHERE id = @session_id AND status = 'declined'`,
        { session_id: sessionId }
      );
      
      return !!check;
    } catch (error) {
      console.error('Decline chat session error:', error);
      return false;
    }
  }

  // Check if user can access session
  async canAccessSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await db.queryOne<{ id: string }>(
      `SELECT id FROM chat_sessions 
       WHERE id = @session_id AND (student_id = @user_id OR tutor_id = @user_id)`,
      { 
        session_id: sessionId,
        user_id: userId
      }
    );
    
    return !!result;
  }

  // Get session details
  async getSession(sessionId: string): Promise<ChatSessionWithDetails | null> {
    const session = await db.queryOne<ChatSessionWithDetails>(
      `SELECT 
        cs.*,
        s.username as student_username,
        t.username as tutor_username,
        sub.name as subject_name
       FROM chat_sessions cs
       JOIN Users s ON cs.student_id = s.id
       JOIN Users t ON cs.tutor_id = t.id
       JOIN Subjects sub ON cs.subject_id = sub.subject_id
       WHERE cs.id = @session_id`,
      { session_id: sessionId }
    );
    
    return session;
  }

  // Get tutor's pending requests
  async getTutorPendingRequests(tutorId: string): Promise<Array<{
    id: string;
    student_id: string;
    subject_id: string;
    student_notes?: string;
    requested_at: Date;
    student_username: string;
    subject_name: string;
  }>> {
    return await db.query(
      `SELECT 
        cs.id, cs.student_id, cs.subject_id, cs.student_notes, cs.requested_at,
        u.username as student_username, s.name as subject_name
       FROM chat_sessions cs
       JOIN Users u ON cs.student_id = u.id
       JOIN Subjects s ON cs.subject_id = s.subject_id
       WHERE cs.tutor_id = @tutor_id AND cs.status = 'pending'
       ORDER BY cs.requested_at ASC`,
      { tutor_id: tutorId }
    );
  }

  // Get active session for user
  async getActiveSessionForUser(userId: string): Promise<ChatSession | null> {
    return await db.queryOne<ChatSession>(
      `SELECT * FROM chat_sessions 
       WHERE (student_id = @user_id OR tutor_id = @user_id) 
         AND status = 'active'
       ORDER BY started_at DESC`,
      { user_id: userId }
    );
  }

  // Get session participants
  async getSessionParticipants(sessionId: string): Promise<{ studentId: string; tutorId: string } | null> {
    const result = await db.queryOne<{ student_id: string; tutor_id: string }>(
      `SELECT student_id, tutor_id FROM chat_sessions WHERE id = @session_id`,
      { session_id: sessionId }
    );
    
    return result ? { studentId: result.student_id, tutorId: result.tutor_id } : null;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();