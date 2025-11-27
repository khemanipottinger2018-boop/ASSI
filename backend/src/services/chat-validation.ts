import { getPool } from '../config/database.js';

export class ChatValidationService {
  async validateChatRequest(data: {
    student_id: string;
    tutor_id: string;
    subject_id: string;
  }): Promise<{ valid: boolean; message?: string }> {
    const pool = await getPool();

    try {
      const result = await pool.request()
        .input('tutorId', data.tutor_id)
        .input('subjectId', data.subject_id)
        .input('studentId', data.student_id)
        .query(`
          SELECT 
            t.tutor_id,
            t.is_online,
            u.is_online as user_online,
            ts.subject_id,
            (SELECT COUNT(*) FROM chat_sessions 
             WHERE tutor_id = @tutorId AND status IN ('active', 'accepted')
            ) as active_sessions
          FROM Tutors t
          INNER JOIN Users u ON t.user_id = u.id
          LEFT JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id AND ts.subject_id = @subjectId
          WHERE t.tutor_id = @tutorId
        `);

      if (result.recordset.length === 0) {
        return { valid: false, message: 'Tutor not found' };
      }

      const tutor = result.recordset[0];

      if (!tutor.user_online) {
        return { valid: false, message: 'Tutor is offline' };
      }

      if (!tutor.subject_id) {
        return { valid: false, message: 'Tutor does not teach this subject' };
      }

      if (tutor.active_sessions >= 3) {
        return { valid: false, message: 'Tutor is currently at capacity' };
      }

      // Check for recent duplicate requests
      const existingRequest = await pool.request()
        .input('studentId', data.student_id)
        .input('tutorId', data.tutor_id)
        .query(`
          SELECT 1 as exists_request 
          FROM chat_sessions 
          WHERE student_id = @studentId 
          AND tutor_id = @tutorId 
          AND status IN ('requested', 'accepted', 'active')
          AND requested_at > DATEADD(MINUTE, -5, GETDATE())
        `);

      if (existingRequest.recordset.length > 0) {
        return { valid: false, message: 'You already have a pending request with this tutor' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, message: 'Validation failed' };
    }
  }

  async canTutorRespond(tutorId: string, sessionId: string): Promise<boolean> {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('tutorId', tutorId)
      .input('sessionId', sessionId)
      .query(`
        SELECT 1 as can_respond 
        FROM chat_sessions 
        WHERE id = @sessionId 
        AND tutor_id = @tutorId 
        AND status = 'requested'
        AND expiry_time > GETDATE()
      `);

    return result.recordset.length > 0;
  }

  async canAccessSession(userId: string, sessionId: string): Promise<boolean> {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('userId', userId)
      .input('sessionId', sessionId)
      .query(`
        SELECT 1 as can_access 
        FROM chat_sessions 
        WHERE id = @sessionId 
        AND (student_id = @userId OR tutor_id = @userId)
        AND status IN ('accepted', 'active')
      `);

    return result.recordset.length > 0;
  }
}