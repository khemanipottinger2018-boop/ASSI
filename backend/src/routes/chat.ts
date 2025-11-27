// backend/src/routes/chat.ts - COMPLETE LIVE CHAT SYSTEM
import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ==================== LIVE CHAT REQUEST FLOW ====================

// ✅ REQUEST LIVE CHAT (Student initiates chat)
router.post('/request', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const { tutor_id, subject_id, student_notes } = req.body;
    const student_id = req.user.id;

    // Validation
    if (!tutor_id || !subject_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'Tutor ID and Subject ID are required'
      });
    }

    const pool = await getPool();

    // Verify tutor exists and is available
    const tutorCheck = await pool.request()
      .input('tutor_id', sql.VarChar, tutor_id)
      .query(`
        SELECT t.tutor_id, t.is_available, u.is_online, u.name as tutor_name
        FROM Tutors t
        INNER JOIN Users u ON t.user_id = u.id
        WHERE t.tutor_id = @tutor_id
      `);

    if (tutorCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'TUTOR_NOT_FOUND'
      });
    }

    const tutor = tutorCheck.recordset[0];
    
    if (!tutor.is_available) {
      return res.status(400).json({
        success: false,
        error: 'TUTOR_UNAVAILABLE',
        message: 'This tutor is not currently available for live chats'
      });
    }

    // Prevent duplicate requests (5-minute cooldown)
    const duplicateCheck = await pool.request()
      .input('student_id', sql.VarChar, student_id)
      .input('tutor_id', sql.VarChar, tutor_id)
      .input('subject_id', sql.VarChar, subject_id)
      .query(`
        SELECT id 
        FROM chat_sessions 
        WHERE student_id = @student_id 
          AND tutor_id = @tutor_id 
          AND subject_id = @subject_id
          AND status = 'requested'
          AND requested_at > DATEADD(MINUTE, -5, GETDATE())
      `);

    if (duplicateCheck.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_REQUEST',
        message: 'You already have a pending request with this tutor'
      });
    }

    // Create chat session with 30-minute expiry
    const sessionResult = await pool.request()
      .input('student_id', sql.VarChar, student_id)
      .input('tutor_id', sql.VarChar, tutor_id)
      .input('subject_id', sql.VarChar, subject_id)
      .input('student_notes', sql.VarChar, student_notes || '')
      .query(`
        INSERT INTO chat_sessions 
        (student_id, tutor_id, subject_id, status, requested_at, expiry_time, student_notes)
        OUTPUT INSERTED.id, INSERTED.requested_at, INSERTED.expiry_time
        VALUES (@student_id, @tutor_id, @subject_id, 'requested', GETDATE(), 
                DATEADD(MINUTE, 30, GETDATE()), @student_notes)
      `);

    const session = sessionResult.recordset[0];

    // Get enriched session details for real-time notification
    const sessionDetails = await pool.request()
      .input('session_id', sql.VarChar, session.id)
      .query(`
        SELECT 
          cs.id as session_id,
          cs.status,
          cs.requested_at,
          cs.expiry_time,
          cs.student_notes,
          u_student.name as student_name,
          u_tutor.name as tutor_name,
          s.name as subject_name
        FROM chat_sessions cs
        INNER JOIN Users u_student ON cs.student_id = u_student.id
        INNER JOIN Tutors t ON cs.tutor_id = t.tutor_id
        INNER JOIN Users u_tutor ON t.user_id = u_tutor.id
        INNER JOIN Subjects s ON cs.subject_id = s.subject_id
        WHERE cs.id = @session_id
      `);

    res.json({
      success: true,
      session_id: session.id,
      session: sessionDetails.recordset[0],
      message: 'Live chat request sent successfully'
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Chat request error:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR',
      message: 'Failed to send chat request'
    });
  }
});

// ✅ GET PENDING CHAT REQUESTS (Tutor dashboard)
router.get('/pending-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const tutor_user_id = req.user.id;
    const pool = await getPool();

    // Get tutor_id from user_id
    const tutorResult = await pool.request()
      .input('user_id', sql.VarChar, tutor_user_id)
      .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');

    if (tutorResult.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'NOT_A_TUTOR'
      });
    }

    const tutor_id = tutorResult.recordset[0].tutor_id;

    // Get pending requests with student details
    const requests = await pool.request()
      .input('tutor_id', sql.VarChar, tutor_id)
      .query(`
        SELECT 
          cs.id as session_id,
          cs.student_id,
          cs.subject_id,
          cs.student_notes,
          cs.requested_at,
          cs.expiry_time,
          u.name as student_name,
          s.name as subject_name,
          DATEDIFF(SECOND, GETDATE(), cs.expiry_time) as expires_in_seconds
        FROM chat_sessions cs
        INNER JOIN Users u ON cs.student_id = u.id
        INNER JOIN Subjects s ON cs.subject_id = s.subject_id
        WHERE cs.tutor_id = @tutor_id 
          AND cs.status = 'requested'
          AND cs.expiry_time > GETDATE()
        ORDER BY cs.requested_at ASC
      `);

    res.json({
      success: true,
      requests: requests.recordset
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching pending requests:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR'
    });
  }
});

// ✅ ACCEPT/REJECT CHAT REQUEST (Tutor response)
router.post('/:sessionId/respond', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const { sessionId } = req.params;
    const { accept, decline_reason } = req.body;
    const tutor_user_id = req.user.id;

    const pool = await getPool();

    // Verify tutor owns this session and it's still pending
    const sessionCheck = await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .input('tutor_user_id', sql.VarChar, tutor_user_id)
      .query(`
        SELECT cs.id, cs.status, cs.expiry_time, cs.student_id
        FROM chat_sessions cs
        INNER JOIN Tutors t ON cs.tutor_id = t.tutor_id
        WHERE cs.id = @session_id AND t.user_id = @tutor_user_id
      `);

    if (sessionCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'SESSION_NOT_FOUND'
      });
    }

    const session = sessionCheck.recordset[0];

    if (session.status !== 'requested') {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SESSION_STATE',
        message: 'This chat request has already been processed'
      });
    }

    if (new Date(session.expiry_time) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'REQUEST_EXPIRED',
        message: 'This chat request has expired'
      });
    }

    if (accept) {
      // Accept the chat request
      await pool.request()
        .input('session_id', sql.VarChar, sessionId)
        .query(`
          UPDATE chat_sessions 
          SET status = 'accepted', accepted_at = GETDATE()
          WHERE id = @session_id
        `);
    } else {
      // Decline the chat request
      await pool.request()
        .input('session_id', sql.VarChar, sessionId)
        .input('decline_reason', sql.VarChar, decline_reason || '')
        .query(`
          UPDATE chat_sessions 
          SET status = 'declined', decline_reason = @decline_reason
          WHERE id = @session_id
        `);
    }

    // Get updated session details for real-time notification
    const updatedSession = await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .query(`
        SELECT 
          cs.*,
          u_student.name as student_name,
          u_tutor.name as tutor_name,
          s.name as subject_name
        FROM chat_sessions cs
        INNER JOIN Users u_student ON cs.student_id = u_student.id
        INNER JOIN Tutors t ON cs.tutor_id = t.tutor_id
        INNER JOIN Users u_tutor ON t.user_id = u_tutor.id
        INNER JOIN Subjects s ON cs.subject_id = s.subject_id
        WHERE cs.id = @session_id
      `);

    res.json({
      success: true,
      message: accept ? 'Chat request accepted' : 'Chat request declined',
      session: updatedSession.recordset[0]
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error responding to chat request:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR'
    });
  }
});

// ==================== ACTIVE CHAT MANAGEMENT ====================

// ✅ GET ACTIVE CHAT SESSIONS (For both student and tutor)
router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const pool = await getPool();

    let query = '';
    
    if (userRole === 'student') {
      query = `
        SELECT 
          cs.id as session_id,
          cs.status,
          cs.requested_at,
          cs.started_at,
          cs.ended_at,
          u_tutor.name as tutor_name,
          t.tutor_id,
          t.hourly_rate,
          s.name as subject_name,
          (SELECT COUNT(*) FROM chat_messages cm 
           WHERE cm.chat_session_id = cs.id 
           AND cm.sender_id != @user_id 
           AND cm.read_at IS NULL) as unread_count
        FROM chat_sessions cs
        INNER JOIN Tutors t ON cs.tutor_id = t.tutor_id
        INNER JOIN Users u_tutor ON t.user_id = u_tutor.id
        INNER JOIN Subjects s ON cs.subject_id = s.subject_id
        WHERE cs.student_id = @user_id
        AND cs.status IN ('accepted', 'active')
        ORDER BY cs.requested_at DESC
      `;
    } else if (userRole === 'tutor') {
      query = `
        SELECT 
          cs.id as session_id,
          cs.status,
          cs.requested_at,
          cs.started_at,
          cs.ended_at,
          u_student.name as student_name,
          s.name as subject_name,
          (SELECT COUNT(*) FROM chat_messages cm 
           WHERE cm.chat_session_id = cs.id 
           AND cm.sender_id != @user_id 
           AND cm.read_at IS NULL) as unread_count
        FROM chat_sessions cs
        INNER JOIN Users u_student ON cs.student_id = u_student.id
        INNER JOIN Subjects s ON cs.subject_id = s.subject_id
        WHERE cs.tutor_id IN (SELECT tutor_id FROM Tutors WHERE user_id = @user_id)
        AND cs.status IN ('accepted', 'active')
        ORDER BY cs.requested_at DESC
      `;
    } else {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED'
      });
    }

    const sessions = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query(query);

    res.json({
      success: true,
      sessions: sessions.recordset
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching chat sessions:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR'
    });
  }
});

// ✅ GET MESSAGES FOR CHAT SESSION
router.get('/sessions/:sessionId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const { sessionId } = req.params;
    const userId = req.user.id;
    const pool = await getPool();

    // Verify user has access to this chat session
    const accessCheck = await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .input('user_id', sql.VarChar, userId)
      .query(`
        SELECT 1 as has_access 
        FROM chat_sessions 
        WHERE id = @session_id 
        AND (student_id = @user_id OR tutor_id IN (SELECT tutor_id FROM Tutors WHERE user_id = @user_id))
      `);

    if (accessCheck.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED'
      });
    }

    // Get messages
    const messages = await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .query(`
        SELECT 
          cm.message_id,
          cm.message,
          cm.sent_at,
          cm.read_at,
          cm.sender_id,
          u.name as sender_name,
          CASE 
            WHEN u.id = cs.student_id THEN 'student'
            ELSE 'tutor'
          END as sender_role
        FROM chat_messages cm
        INNER JOIN chat_sessions cs ON cm.chat_session_id = cs.id
        INNER JOIN Users u ON cm.sender_id = u.id
        WHERE cm.chat_session_id = @session_id
        ORDER BY cm.sent_at ASC
      `);

    res.json({
      success: true,
      messages: messages.recordset
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching messages:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR'
    });
  }
});

// ✅ START ACTIVE CHAT SESSION (When both parties join)
router.post('/sessions/:sessionId/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const { sessionId } = req.params;
    const userId = req.user.id;
    const pool = await getPool();

    // Verify access and session is accepted
    const sessionCheck = await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .input('user_id', sql.VarChar, userId)
      .query(`
        SELECT status 
        FROM chat_sessions 
        WHERE id = @session_id 
        AND (student_id = @user_id OR tutor_id IN (SELECT tutor_id FROM Tutors WHERE user_id = @user_id))
        AND status = 'accepted'
      `);

    if (sessionCheck.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'INVALID_SESSION'
      });
    }

    // Start the chat session
    await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .query(`
        UPDATE chat_sessions 
        SET status = 'active', started_at = GETDATE()
        WHERE id = @session_id
      `);

    res.json({
      success: true,
      message: 'Chat session started'
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error starting chat session:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR'
    });
  }
});

// ✅ MARK MESSAGES AS READ
router.post('/sessions/:sessionId/mark-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED'
      });
    }

    const { sessionId } = req.params;
    const userId = req.user.id;
    const pool = await getPool();

    await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .input('user_id', sql.VarChar, userId)
      .query(`
        UPDATE chat_messages 
        SET read_at = GETDATE()
        WHERE chat_session_id = @session_id 
        AND sender_id != @user_id
        AND read_at IS NULL
      `);

    res.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error marking messages as read:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'SERVER_ERROR'
    });
  }
});

export default router;