import express from 'express';
import { getPool } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ✅ Helper function to get user ID safely
const getUserId = (req: Request): string => {
  if (!(req as any).user?.id) throw new Error('User not authenticated');
  return (req as any).user.id;
};

// ✅ Check if user can setup tutor profile - FIXED
router.get('/setup/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const pool = await getPool();
    
    const userResult = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT username, email, role FROM Users WHERE id = @user_id');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = userResult.recordset[0];
    if (user.role !== 'tutor') {
      return res.json({ success: true, data: { canSetup: false, hasProfile: false } });
    }

    const tutorResult = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');

    const hasProfile = tutorResult.recordset.length > 0;

    res.json({
      success: true,
      data: {
        user: { username: user.username, email: user.email, role: user.role },
        canSetup: !hasProfile,
        hasProfile
      }
    });

  } catch (error: any) {
    console.error('Error checking tutor setup status:', error.message);
    res.status(500).json({ success: false, error: 'Failed to check setup status' });
  }
});

// ✅ Create tutor profile - FIXED
router.post('/setup', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { 
      hourly_rate, 
      bio, 
      teaching_philosophy, 
      preferred_teaching_times, 
      timezone, 
      is_student_tutor = false,
      service_tier = 'standard',
      is_available = true 
    } = req.body;

    const pool = await getPool();
    
    // Verify user has tutor role
    const userCheck = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT role FROM Users WHERE id = @user_id');

    if (userCheck.recordset[0]?.role !== 'tutor') {
      return res.status(403).json({ success: false, error: 'Access denied. Tutor role required.' });
    }

    // Check for existing tutor profile
    const existingTutor = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');

    if (existingTutor.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Tutor profile already exists' });
    }

    // Create tutor profile - ONLY USING EXISTING COLUMNS
    const result = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .input('hourly_rate', sql.Decimal(10, 2), hourly_rate)
      .input('is_available', sql.Bit, is_available)
      .input('bio', sql.VarChar, bio || '')
      .input('teaching_philosophy', sql.VarChar, teaching_philosophy || '')
      .input('preferred_teaching_times', sql.VarChar, preferred_teaching_times || '')
      .input('timezone', sql.VarChar, timezone || '')
      .input('is_student_tutor', sql.Bit, is_student_tutor)
      .input('service_tier', sql.VarChar, service_tier)
      .query(`
        INSERT INTO Tutors (
          user_id, hourly_rate, is_available, bio, 
          teaching_philosophy, preferred_teaching_times, timezone,
          is_student_tutor, service_tier, profile_completed_at
        )
        OUTPUT INSERTED.tutor_id
        VALUES (
          @user_id, @hourly_rate, @is_available, @bio,
          @teaching_philosophy, @preferred_teaching_times, @timezone,
          @is_student_tutor, @service_tier, GETDATE()
        )
      `);

    const tutorId = result.recordset[0].tutor_id;

    res.json({ 
      success: true, 
      message: 'Tutor profile created', 
      data: { tutor_id: tutorId } 
    });

  } catch (error: any) {
    console.error('Error creating tutor profile:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create tutor profile' });
  }
});

// ✅ Add subjects to tutor profile - FIXED
router.post('/subjects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { subjects } = req.body;

    if (!subjects?.length) {
      return res.status(400).json({ success: false, error: 'Subjects array required' });
    }

    const pool = await getPool();
    
    const tutorResult = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');

    if (tutorResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Tutor profile not found' });
    }

    const tutorId = tutorResult.recordset[0].tutor_id;

    // Add subjects
    for (const subjectId of subjects) {
      await pool.request()
        .input('tutor_id', sql.VarChar, tutorId)
        .input('subject_id', sql.VarChar, subjectId)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM TutorSubjects WHERE tutor_id = @tutor_id AND subject_id = @subject_id)
          INSERT INTO TutorSubjects (tutor_id, subject_id) VALUES (@tutor_id, @subject_id)
        `);
    }

    res.json({ success: true, message: `Added ${subjects.length} subjects` });

  } catch (error: any) {
    console.error('Error adding tutor subjects:', error.message);
    res.status(500).json({ success: false, error: 'Failed to add subjects' });
  }
});

// ✅ Get current tutor's full profile - FIXED
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const pool = await getPool();
    
    const tutorResult = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT 
          t.tutor_id, t.user_id, t.hourly_rate, t.is_available, 
          t.bio, t.teaching_philosophy, t.preferred_teaching_times,
          t.timezone, t.profile_completed_at, t.last_profile_update,
          t.is_student_tutor, t.service_tier,
          u.username, u.email
        FROM Tutors t 
        INNER JOIN Users u ON t.user_id = u.id
        WHERE t.user_id = @userId
      `);

    if (tutorResult.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Tutor profile not found' });
    }

    const tutor = tutorResult.recordset[0];
    const tutorId = tutor.tutor_id;

    // Get subjects only (remove education/qualifications that don't exist)
    const subjectsResult = await pool.request()
      .input('tutor_id', tutorId)
      .query(`
        SELECT s.subject_id, s.name, s.level 
        FROM TutorSubjects ts
        INNER JOIN Subjects s ON ts.subject_id = s.subject_id 
        WHERE ts.tutor_id = @tutor_id
      `);

    res.json({
      success: true,
      data: {
        ...tutor,
        subjects: subjectsResult.recordset
      }
    });
  } catch (error: any) {
    console.error('Error fetching tutor profile:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tutor profile' });
  }
});

// ✅ Update tutor profile - FIXED
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { 
      bio, 
      hourly_rate, 
      is_available, 
      teaching_philosophy, 
      preferred_teaching_times, 
      timezone 
    } = req.body;

    const pool = await getPool();
    
    // Update tutor profile - ONLY USING EXISTING COLUMNS
    await pool.request()
      .input('userId', userId)
      .input('hourly_rate', sql.Decimal(10, 2), hourly_rate)
      .input('is_available', sql.Bit, is_available)
      .input('bio', sql.VarChar, bio || '')
      .input('teaching_philosophy', sql.VarChar, teaching_philosophy || '')
      .input('preferred_teaching_times', sql.VarChar, preferred_teaching_times || '')
      .input('timezone', sql.VarChar, timezone || '')
      .query(`
        UPDATE Tutors SET 
          hourly_rate = @hourly_rate, 
          is_available = @is_available,
          bio = @bio,
          teaching_philosophy = @teaching_philosophy,
          preferred_teaching_times = @preferred_teaching_times,
          timezone = @timezone,
          last_profile_update = GETDATE()
        WHERE user_id = @userId
      `);

    res.json({ success: true, message: 'Tutor profile updated' });
  } catch (error: any) {
    console.error('Error updating tutor profile:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update tutor profile' });
  }
});

export default router;