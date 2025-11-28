import express from 'express';
import { getPool } from '../../config/database.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ✅ Search tutors by subject ID - FIXED
router.get('/search', async (req: Request, res: Response) => {
  const { subjectId } = req.query;
  
  if (!subjectId) {
    return res.status(400).json({
      success: false,
      error: 'subjectId query parameter is required'
    });
  }

  console.log(`🔍 Searching tutors for subject ID: ${subjectId}`);
  
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('subject_id', sql.VarChar, subjectId)
      .query(`
        SELECT 
          t.tutor_id, t.user_id, t.hourly_rate,
          t.is_available, t.bio,
          u.username, u.email,
          s.subject_id, s.name as subject_name, s.level as subject_level
        FROM Tutors t
        INNER JOIN Users u ON t.user_id = u.id
        INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
        INNER JOIN Subjects s ON ts.subject_id = s.subject_id
        WHERE t.is_available = 1 AND ts.subject_id = @subject_id
        ORDER BY u.username
      `);

    // Group subjects by tutor
    const tutorMap = new Map();
    
    result.recordset.forEach((tutor: any) => {
      if (!tutorMap.has(tutor.tutor_id)) {
        tutorMap.set(tutor.tutor_id, {
          tutor_id: tutor.tutor_id,
          user_id: tutor.user_id,
          username: tutor.username,
          hourly_rate: tutor.hourly_rate,
          is_available: tutor.is_available,
          bio: tutor.bio,
          email: tutor.email,
          subjects: [{
            subject_id: tutor.subject_id,
            name: tutor.subject_name,
            level: tutor.subject_level
          }]
        });
      } else {
        // Add subject to existing tutor
        const existingTutor = tutorMap.get(tutor.tutor_id);
        existingTutor.subjects.push({
          subject_id: tutor.subject_id,
          name: tutor.subject_name,
          level: tutor.subject_level
        });
      }
    });

    const tutors = Array.from(tutorMap.values());
    console.log(`✅ Found ${tutors.length} tutors for subject ID ${subjectId}`);

    res.json({
      success: true,
      data: tutors,
      count: tutors.length
    });
  } catch (error: any) {
    console.error('❌ Error searching tutors:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to search tutors'
    });
  }
});

// ✅ Get all available tutors (for browse page) - FIXED
router.get('/', async (req: Request, res: Response) => {
  try {
    const { subject, min_rate, max_rate, level } = req.query;
    const pool = await getPool();
    
    let query = `
      SELECT 
        t.tutor_id, t.user_id, t.hourly_rate,
        t.is_available, t.bio,
        u.username, u.email,
        s.subject_id, s.name as subject_name, s.level as subject_level
      FROM Tutors t
      INNER JOIN Users u ON t.user_id = u.id
      INNER JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
      INNER JOIN Subjects s ON ts.subject_id = s.subject_id
      WHERE t.is_available = 1
    `;

    const request = pool.request();

    if (subject) {
      query += ' AND s.name LIKE @subject';
      request.input('subject', sql.VarChar, `%${subject}%`);
    }
    if (min_rate) {
      query += ' AND t.hourly_rate >= @min_rate';
      request.input('min_rate', sql.Decimal(10, 2), parseFloat(min_rate as string));
    }
    if (max_rate) {
      query += ' AND t.hourly_rate <= @max_rate';
      request.input('max_rate', sql.Decimal(10, 2), parseFloat(max_rate as string));
    }
    if (level) {
      query += ' AND s.level = @level';
      request.input('level', sql.VarChar, level);
    }

    query += ' ORDER BY u.username, s.name';
    const result = await request.query(query);

    // Group subjects by tutor
    const tutorsMap = new Map();
    
    result.recordset.forEach((tutor: any) => {
      if (!tutorsMap.has(tutor.tutor_id)) {
        tutorsMap.set(tutor.tutor_id, {
          tutor_id: tutor.tutor_id,
          user_id: tutor.user_id,
          username: tutor.username,
          hourly_rate: tutor.hourly_rate,
          is_available: tutor.is_available,
          bio: tutor.bio,
          email: tutor.email,
          subjects: []
        });
      }
      
      const tutorData = tutorsMap.get(tutor.tutor_id);
      tutorData.subjects.push({
        subject_id: tutor.subject_id,
        name: tutor.subject_name,
        level: tutor.subject_level
      });
    });

    const tutors = Array.from(tutorsMap.values());

    res.json({ success: true, data: tutors, count: tutors.length });

  } catch (error: any) {
    console.error('Error fetching tutors:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tutors' });
  }
});

// ✅ Get available subjects - FIXED
router.get('/subjects/available', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request().query(`
      SELECT DISTINCT 
        s.subject_id, s.name, s.level,
        COUNT(ts.tutor_id) as tutor_count
      FROM Subjects s
      INNER JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
      INNER JOIN Tutors t ON ts.tutor_id = t.tutor_id
      WHERE t.is_available = 1
      GROUP BY s.subject_id, s.name, s.level
      ORDER BY s.name, s.level
    `);

    res.json({ success: true, data: result.recordset });

  } catch (error: any) {
    console.error('Error fetching available subjects:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch available subjects' });
  }
});

// ✅ Get tutor profile by user ID (public view) - FIXED
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('user_id', req.params.userId)
      .query(`
        SELECT 
          t.tutor_id, t.user_id, t.hourly_rate,
          t.is_available, u.username, u.email, u.bio,
          s.subject_id, s.name as subject_name, s.level as subject_level
        FROM Tutors t
        INNER JOIN Users u ON t.user_id = u.id
        LEFT JOIN TutorSubjects ts ON t.tutor_id = ts.tutor_id
        LEFT JOIN Subjects s ON ts.subject_id = s.subject_id
        WHERE t.user_id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Tutor profile not found' });
    }

    // Group subjects
    const tutorData = {
      tutor_id: result.recordset[0].tutor_id,
      user_id: result.recordset[0].user_id,
      hourly_rate: result.recordset[0].hourly_rate,
      is_available: result.recordset[0].is_available,
      username: result.recordset[0].username,
      email: result.recordset[0].email,
      bio: result.recordset[0].bio,
      subjects: result.recordset
        .filter(row => row.subject_id) // Only include rows with subjects
        .map(row => ({
          subject_id: row.subject_id,
          name: row.subject_name,
          level: row.subject_level
        }))
    };

    res.json({ success: true, data: tutorData });

  } catch (error: any) {
    console.error('Error fetching tutor profile:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch tutor profile' });
  }
});

export default router;
// ✅ GET /api/tutors/public/count - Get real tutor counts from database
router.get('/count', async (req: Request, res: Response) => {
  try {
    console.log('📊 Counting tutors from database...');
    const pool = await getPool();
    
    // Count total tutors and online tutors (is_available = true)
    const result = await pool.request().query(`
      SELECT 
        COUNT(*) as totalCount,
        SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as onlineCount
      FROM Tutors
      WHERE profile_completed_at IS NOT NULL
    `);

    const counts = result.recordset[0];
    
    console.log('🎯 Database tutor counts:', {
      totalCount: counts.totalCount,
      onlineCount: counts.onlineCount
    });
    
    res.json({
      success: true,
      data: {
        totalCount: parseInt(counts.totalCount) || 0,
        onlineCount: parseInt(counts.onlineCount) || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Count tutors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tutor counts from database'
    });
  }
});
