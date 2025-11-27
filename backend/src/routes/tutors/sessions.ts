import express from 'express';
import { getPool } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ✅ SHARED: Get tutor_id and validate session access
const getTutorId = async (userId: string): Promise<string | null> => {
  const pool = await getPool();
  const result = await pool.request()
    .input('user_id', sql.VarChar, userId)
    .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');
  return result.recordset[0]?.tutor_id || null;
};

const validateSessionAccess = async (sessionId: string, tutorId: string) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('session_id', sql.VarChar, sessionId)
    .input('tutor_id', sql.VarChar, tutorId)
    .query('SELECT session_id FROM chat_sessions WHERE session_id = @session_id AND tutor_id = @tutor_id');
  return result.recordset.length > 0;
};

// ✅ Get all sessions for tutor
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { status, date_from, date_to } = req.query;
    
    const tutorId = await getTutorId(userId);
    if (!tutorId) return res.status(404).json({ success: false, error: 'Tutor profile not found' });

    const pool = await getPool();
    let query = `
      SELECT 
        cs.session_id, cs.scheduled_time, cs.duration_minutes, cs.status, cs.price, cs.topic, cs.created_at,
        u_student.id as student_id, u_student.first_name as student_first_name, 
        u_student.last_name as student_last_name, u_student.email as student_email,
        s.name as subject_name
      FROM chat_sessions cs
      JOIN Users u_student ON cs.student_id = u_student.id
      JOIN Subjects s ON cs.subject_id = s.subject_id
      WHERE cs.tutor_id = @tutor_id
    `;

    const request = pool.request().input('tutor_id', sql.VarChar, tutorId);

    if (status) {
      query += ' AND cs.status = @status';
      request.input('status', sql.VarChar, status);
    }
    if (date_from) {
      query += ' AND cs.scheduled_time >= @date_from';
      request.input('date_from', sql.DateTime, new Date(date_from as string));
    }
    if (date_to) {
      query += ' AND cs.scheduled_time <= @date_to';
      request.input('date_to', sql.DateTime, new Date(date_to as string));
    }

    query += ' ORDER BY cs.scheduled_time DESC';
    const sessions = await request.query(query);

    res.json({ success: true, data: sessions.recordset });

  } catch (error: any) {
    console.error('Error fetching sessions:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// ✅ Update session status (start/complete/cancel)
const updateSessionStatus = async (req: Request, res: Response, status: string, additionalFields: any = {}) => {
  try {
    const userId = (req as any).user.id;
    const { sessionId } = req.params;
    
    const tutorId = await getTutorId(userId);
    if (!tutorId) return res.status(404).json({ success: false, error: 'Tutor profile not found' });

    const hasAccess = await validateSessionAccess(sessionId, tutorId);
    if (!hasAccess) return res.status(404).json({ success: false, error: 'Session not found or access denied' });

    const pool = await getPool();
    const request = pool.request().input('session_id', sql.VarChar, sessionId);

    let query = `UPDATE chat_sessions SET status = '${status}'`;
    
    // Add timestamp fields based on status
    if (status === 'in-progress') query += ', started_at = GETDATE()';
    if (status === 'completed') query += ', completed_at = GETDATE()';
    
    // Add additional fields from request body
    Object.keys(additionalFields).forEach(key => {
      if (additionalFields[key] !== undefined) {
        query += `, ${key} = @${key}`;
        request.input(key, sql.VarChar, additionalFields[key]);
      }
    });

    query += ' WHERE session_id = @session_id';
    await request.query(query);

    res.json({ success: true, message: `Session ${status} successfully` });

  } catch (error: any) {
    console.error(`Error ${status} session:`, error.message);
    res.status(500).json({ success: false, error: `Failed to ${status} session` });
  }
};

// ✅ Route handlers using shared function
router.post('/:sessionId/start', authenticateToken, (req, res) => 
  updateSessionStatus(req, res, 'in-progress'));

router.post('/:sessionId/complete', authenticateToken, (req, res) => 
  updateSessionStatus(req, res, 'completed', { tutor_notes: req.body.notes }));

router.post('/:sessionId/cancel', authenticateToken, (req, res) => 
  updateSessionStatus(req, res, 'cancelled', { cancellation_reason: req.body.reason }));

export default router;