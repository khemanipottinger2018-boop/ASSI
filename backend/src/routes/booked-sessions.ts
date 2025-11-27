// backend/routes/booked-sessions.ts
import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ✅ SHARED: Get user's tutor_id (students don't have one)
const getTutorId = async (userId: string): Promise<string | null> => {
  const pool = await getPool();
  const result = await pool.request()
    .input('user_id', sql.VarChar, userId)
    .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');
  return result.recordset[0]?.tutor_id || null;
};

// ✅ SHARED: Validate session access
const validateSessionAccess = async (sessionId: string, userId: string) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('session_id', sql.VarChar, sessionId)
    .input('user_id', sql.VarChar, userId)
    .query(`
      SELECT bs.*, t.tutor_id 
      FROM BookedSessions bs
      LEFT JOIN Tutors t ON bs.tutor_id = t.tutor_id AND t.user_id = @user_id
      WHERE bs.session_id = @session_id
      AND (bs.student_id = @user_id OR t.tutor_id IS NOT NULL)
    `);
  return result.recordset[0];
};

// ✅ SHARED: Get sessions with pagination
const getSessions = async (query: string, params: any) => {
  const pool = await getPool();
  const request = pool.request();
  
  Object.keys(params).forEach(key => {
    request.input(key, params[key]);
  });
  
  const result = await request.query(query);
  return result.recordset;
};

// ✅ BOOK A SESSION (Student books with tutor)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ success: false, error: 'Only students can book sessions' });
    }

    const { tutor_id, subject_id, scheduled_time, duration_minutes = 60, notes, price } = req.body;
    const studentId = req.user.id;

    // Validation
    if (!tutor_id || !subject_id || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: 'Tutor ID, subject ID, and scheduled time are required'
      });
    }

    const scheduledTime = new Date(scheduled_time);
    if (scheduledTime <= new Date()) {
      return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
    }

    const pool = await getPool();

    // Verify tutor exists and is available
    const tutorCheck = await pool.request()
      .input('tutor_id', sql.VarChar, tutor_id)
      .query('SELECT hourly_rate FROM Tutors WHERE tutor_id = @tutor_id AND is_available = 1');

    if (tutorCheck.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Tutor not available' });
    }

    // Check scheduling conflicts
    const conflictCheck = await pool.request()
      .input('tutor_id', sql.VarChar, tutor_id)
      .input('scheduled_time', sql.DateTime, scheduledTime)
      .input('duration_minutes', sql.Int, duration_minutes)
      .query(`
        SELECT session_id FROM BookedSessions 
        WHERE tutor_id = @tutor_id AND status IN ('scheduled', 'confirmed')
        AND (
          @scheduled_time BETWEEN scheduled_time AND DATEADD(MINUTE, duration_minutes, scheduled_time)
          OR DATEADD(MINUTE, @duration_minutes, @scheduled_time) BETWEEN scheduled_time AND DATEADD(MINUTE, duration_minutes, scheduled_time)
        )
      `);

    if (conflictCheck.recordset.length > 0) {
      return res.status(409).json({ success: false, error: 'Time slot unavailable' });
    }

    // Calculate price
    const finalPrice = price || tutorCheck.recordset[0].hourly_rate * (duration_minutes / 60);

    // Create session
    const result = await pool.request()
      .input('student_id', sql.VarChar, studentId)
      .input('tutor_id', sql.VarChar, tutor_id)
      .input('subject_id', sql.VarChar, subject_id)
      .input('scheduled_time', sql.DateTime, scheduledTime)
      .input('duration_minutes', sql.Int, duration_minutes)
      .input('price', sql.Decimal(10, 2), finalPrice)
      .input('notes', sql.NVarChar, notes || null)
      .input('status', sql.VarChar, 'scheduled')
      .query(`
        INSERT INTO BookedSessions (student_id, tutor_id, subject_id, scheduled_time, duration_minutes, price, notes, status, created_at)
        OUTPUT INSERTED.session_id
        VALUES (@student_id, @tutor_id, @subject_id, @scheduled_time, @duration_minutes, @price, @notes, @status, GETDATE())
      `);

    const sessionId = result.recordset[0].session_id;

    // TODO: Add notification service call here
    // await NotificationService.notifySessionBooked(tutor_id, req.user.username, sessionId);

    res.status(201).json({
      success: true,
      message: 'Session booked successfully!',
      data: { session_id: sessionId, scheduled_time: scheduledTime, price: finalPrice, status: 'scheduled' }
    });

  } catch (error: any) {
    console.error('Error booking session:', error);
    res.status(500).json({ success: false, error: 'Failed to book session' });
  }
});

// ✅ GET USER'S SESSIONS (Student or Tutor)
router.get('/my-sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const userId = req.user!.id;
    const isTutor = req.user!.role === 'tutor';

    let query, params;

    if (isTutor) {
      const tutorId = await getTutorId(userId);
      if (!tutorId) return res.status(404).json({ success: false, error: 'Tutor profile not found' });

      query = `
        SELECT 
          bs.session_id, bs.scheduled_time, bs.duration_minutes, bs.status, bs.price, bs.notes, bs.created_at,
          u_student.username as student_username, u_student.email as student_email,
          s.name as subject_name, s.subject_id
        FROM BookedSessions bs
        INNER JOIN Users u_student ON bs.student_id = u_student.id
        INNER JOIN Subjects s ON bs.subject_id = s.subject_id
        WHERE bs.tutor_id = @tutor_id
      `;
      params = { tutor_id: tutorId, offset, limit: parseInt(limit as string) };
    } else {
      query = `
        SELECT 
          bs.session_id, bs.scheduled_time, bs.duration_minutes, bs.status, bs.price, bs.notes, bs.created_at,
          u_tutor.username as tutor_username, u_tutor.email as tutor_email,
          t.tutor_id, t.hourly_rate,
          s.name as subject_name, s.subject_id
        FROM BookedSessions bs
        INNER JOIN Tutors t ON bs.tutor_id = t.tutor_id
        INNER JOIN Users u_tutor ON t.user_id = u_tutor.id
        INNER JOIN Subjects s ON bs.subject_id = s.subject_id
        WHERE bs.student_id = @student_id
      `;
      params = { student_id: userId, offset, limit: parseInt(limit as string) };
    }

    if (status && ['scheduled', 'confirmed', 'completed', 'cancelled'].includes(status as string)) {
      query += ' AND bs.status = @status';
      params.status = status;
    }

    query += ' ORDER BY bs.scheduled_time DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

    const sessions = await getSessions(query, params);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        hasMore: sessions.length === parseInt(limit as string)
      }
    });

  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// ✅ GET SESSION DETAILS
router.get('/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await validateSessionAccess(sessionId, req.user!.id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch session details' });
  }
});

// ✅ UPDATE SESSION STATUS
router.patch('/:sessionId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status, notes } = req.body;

    if (!status || !['confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status required' });
    }

    const session = await validateSessionAccess(sessionId, req.user!.id);
    if (!session) return res.status(403).json({ success: false, error: 'Access denied' });

    const pool = await getPool();
    await pool.request()
      .input('session_id', sql.VarChar, sessionId)
      .input('status', sql.VarChar, status)
      .input('notes', sql.NVarChar, notes || null)
      .query('UPDATE BookedSessions SET status = @status, notes = @notes, updated_at = GETDATE() WHERE session_id = @session_id');

    // TODO: Add notification service calls based on status

    res.json({
      success: true,
      message: `Session ${status} successfully`,
      data: { session_id: sessionId, status }
    });

  } catch (error: any) {
    console.error('Error updating session status:', error);
    res.status(500).json({ success: false, error: 'Failed to update session status' });
  }
});

export default router;