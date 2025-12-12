import express from 'express';
import { db } from '@/config/database';

const router = express.Router();

// ==================== PUBLIC ROUTE (NO AUTH) ====================
router.get('/public', async (req, res) => {
  try {
    const subjects = await db.query<{
      subject_id: string;
      name: string;
      level: string;
      tutorCount: number;
    }>(
      `SELECT 
          s.subject_id, 
          s.name, 
          s.level, 
          COUNT(ts.tutor_id) AS tutorCount
       FROM Subjects s
       LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
       GROUP BY s.subject_id, s.name, s.level
       ORDER BY s.level, s.name`,
      {}
    );

    res.json({
      success: true,
      subjects,
      count: subjects.length
    });

  } catch (error: any) {
    console.error('Get public subjects error:', error);
    res.json({ success: true, subjects: [], count: 0 });
  }
});

// ==================== PROTECTED ROUTES ====================

// GET /api/subjects - All subjects (optional level filter)
router.get('/', async (req, res) => {
  try {
    const { level } = req.query;

    let query = `
      SELECT 
          s.subject_id, s.name, s.level, COUNT(ts.tutor_id) AS tutorCount
      FROM Subjects s
      LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
      WHERE 1=1
    `;
    const params: Record<string, any> = {};

    if (level && (level === 'CSEC' || level === 'CAPE')) {
      query += ' AND s.level = @level';
      params.level = level;
    }

    query += ' GROUP BY s.subject_id, s.name, s.level ORDER BY s.level, s.name';

    const subjects = await db.query(query, params);

    res.json({ success: true, subjects, count: subjects.length });

  } catch (error: any) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

// GET /api/subjects/by-level/:level
router.get('/by-level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    if (level !== 'CSEC' && level !== 'CAPE') {
      return res.status(400).json({ success: false, error: 'Invalid level' });
    }

    const subjects = await db.query(
      `SELECT 
          s.subject_id, s.name, s.level, COUNT(ts.tutor_id) AS tutorCount
       FROM Subjects s
       LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
       WHERE s.level = @level
       GROUP BY s.subject_id, s.name, s.level
       ORDER BY s.name`,
      { level }
    );

    res.json({ success: true, subjects, level, count: subjects.length });

  } catch (error: any) {
    console.error('Get subjects by level error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

// GET /api/subjects/:subjectId
router.get('/:subjectId', async (req, res) => {
  try {
    const { subjectId } = req.params;

    const subject = await db.queryOne(
      `SELECT 
          s.subject_id, s.name, s.level, COUNT(ts.tutor_id) AS tutorCount
       FROM Subjects s
       LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
       WHERE s.subject_id = @subjectId
       GROUP BY s.subject_id, s.name, s.level`,
      { subjectId }
    );

    if (!subject) return res.status(404).json({ success: false, error: 'Subject not found' });

    res.json({ success: true, subject });

  } catch (error: any) {
    console.error('Get subject by ID error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subject' });
  }
});

// GET /api/subjects/grouped/by-level
router.get('/grouped/by-level', async (req, res) => {
  try {
    const subjects = await db.query(
      `SELECT 
          s.subject_id, s.name, s.level, COUNT(ts.tutor_id) AS tutorCount
       FROM Subjects s
       LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
       GROUP BY s.subject_id, s.name, s.level
       ORDER BY s.level, s.name`,
      {}
    );

    const grouped = subjects.reduce((acc: Record<string, any[]>, subject) => {
      if (!acc[subject.level]) acc[subject.level] = [];
      acc[subject.level].push(subject);
      return acc;
    }, {});

    res.json({ success: true, subjects: grouped, total: subjects.length });

  } catch (error: any) {
    console.error('Get grouped subjects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

// GET /api/subjects/search/:query
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Query too short' });
    }

    const subjects = await db.query(
      `SELECT 
          s.subject_id, s.name, s.level, COUNT(ts.tutor_id) AS tutorCount
       FROM Subjects s
       LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
       WHERE s.name LIKE @query
       GROUP BY s.subject_id, s.name, s.level
       ORDER BY s.level, s.name`,
      { query: `%${query}%` }
    );

    res.json({ success: true, subjects, query, count: subjects.length });

  } catch (error: any) {
    console.error('Search subjects error:', error);
    res.status(500).json({ success: false, error: 'Failed to search subjects' });
  }
});

// GET /api/subjects/popular
router.get('/popular', async (req, res) => {
  try {
    const popularSubjects = await db.query(
      `SELECT 
          s.subject_id, s.name, s.level, COUNT(ts.tutor_id) AS tutorCount
       FROM Subjects s
       LEFT JOIN TutorSubjects ts ON s.subject_id = ts.subject_id
       GROUP BY s.subject_id, s.name, s.level
       ORDER BY tutorCount DESC
       LIMIT 10`,
      {}
    );

    res.json({ success: true, subjects: popularSubjects });

  } catch (error: any) {
    console.error('Get popular subjects error:', error);
    res.json({ success: true, subjects: [] });
  }
});

export default router;
