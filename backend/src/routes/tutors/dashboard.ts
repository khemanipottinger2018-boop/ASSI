import express from 'express';
import { getPool } from '../../config/database.js';
import { authenticateToken } from '../../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ===== HELPER FUNCTIONS =====
const getWeekRange = () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return { startOfWeek, endOfWeek };
};

const getTutorId = async (userId: string): Promise<string> => {
  const pool = await getPool();
  const tutorResult = await pool.request()
    .input('user_id', sql.VarChar, userId)
    .query('SELECT tutor_id FROM Tutors WHERE user_id = @user_id');

  if (tutorResult.recordset.length === 0) {
    throw new Error('Tutor profile not found');
  }
  return tutorResult.recordset[0].tutor_id;
};

const getTutorRank = (rating: number, reviews: number): string => {
  if (rating >= 4.8 && reviews >= 10) return 'Elite Tutor';
  if (rating >= 4.5 && reviews >= 5) return 'Star Tutor';
  if (rating >= 4.0 && reviews >= 3) return 'Pro Tutor';
  if (rating >= 3.5) return 'Rising Tutor';
  if (rating >= 3.0 || reviews > 0) return 'Developing Tutor';
  return 'New Tutor';
};

const calculateWeeklyTrend = (current: number, previous: number): number => {
  if (previous > 0) return Math.round(((current - previous) / previous) * 100);
  return current > 0 ? 100 : 0;
};

const safeParseInt = (value: any, fallback: number = 0): number => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? fallback : parsed;
};

const safeParseFloat = (value: any, fallback: number = 0): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

// ===== REAL-TIME DASHBOARD - USING YOUR ACTUAL TABLES =====
router.get('/overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pool = await getPool();
    const { startOfWeek, endOfWeek } = getWeekRange();
    
    const lastWeekStart = new Date(startOfWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(endOfWeek);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const tutorId = await getTutorId(userId);

    // PARALLEL DATABASE QUERIES USING YOUR ACTUAL TABLES
    const [
      profileResult,
      onlineStudentsResult,
      newStudentsResult,
      lastWeekStudentsResult,
      sessionMetricsResult,
      upcomingSessionsResult,
      statsResult,
      notificationsResult,
      ratingResult,
      subjectResult,
      responseTimeResult,
      tutorPresenceResult
    ] = await Promise.all([
      // Profile - Using your actual Users table columns
      pool.request().input('user_id', sql.VarChar, userId)
        .query('SELECT id, username, email, role FROM Users WHERE id = @user_id'),
      
      // Online students - Using your user_presence table
      pool.request().input('current_time', sql.DateTime, new Date(Date.now() - 5 * 60 * 1000))
        .query(`SELECT COUNT(DISTINCT user_id) as online_count FROM user_presence WHERE status = 'online' AND last_seen > @current_time`),
      
      // New students this week - Using your Users table
      pool.request().input('start_of_week', sql.DateTime, startOfWeek).input('end_of_week', sql.DateTime, endOfWeek)
        .query(`SELECT COUNT(*) as new_students FROM Users WHERE role = 'student' AND created_at >= @start_of_week AND created_at <= @end_of_week`),
      
      // Last week students
      pool.request().input('last_week_start', sql.DateTime, lastWeekStart).input('last_week_end', sql.DateTime, lastWeekEnd)
        .query(`SELECT COUNT(*) as last_week_students FROM Users WHERE role = 'student' AND created_at >= @last_week_start AND created_at <= @last_week_end`),
      
      // Session metrics - Using your BookedSessions table
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions, COUNT(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 END) as upcoming_sessions, AVG(CASE WHEN status = 'completed' THEN price ELSE NULL END) as avg_earnings, SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_earnings FROM BookedSessions WHERE tutor_id = @tutor_id`),
      
      // Upcoming sessions - Using BookedSessions
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT bs.session_id, bs.scheduled_time, bs.duration_minutes, bs.status, bs.price, bs.notes as topic, u.username as student_username, s.name as subject_name FROM BookedSessions bs INNER JOIN Users u ON bs.student_id = u.id INNER JOIN Subjects s ON bs.subject_id = s.subject_id WHERE bs.tutor_id = @tutor_id AND bs.status IN ('scheduled', 'confirmed') AND bs.scheduled_time >= GETDATE() ORDER BY bs.scheduled_time ASC`),
      
      // Stats - Using BookedSessions
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT COUNT(*) as total_sessions, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count, COUNT(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 END) as scheduled_count, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count FROM BookedSessions WHERE tutor_id = @tutor_id`),
      
      // Notifications - Using your notifications table
      pool.request().input('user_id', sql.VarChar, userId)
        .query(`SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = @user_id AND is_read = 0`),
      
      // Ratings - Using SessionReviews table
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT AVG(r.rating) as avg_rating, COUNT(r.review_id) as total_reviews FROM SessionReviews r WHERE r.tutor_id = @tutor_id`),
      
      // Subjects - Using TutorSubjects
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT TOP 1 s.name as primary_subject FROM TutorSubjects ts INNER JOIN Subjects s ON ts.subject_id = s.subject_id WHERE ts.tutor_id = @tutor_id`),
      
      // Response time - Using chat_messages for live chat response times
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT AVG(DATEDIFF(MINUTE, cm1.sent_at, cm2.sent_at)) as avg_response_time FROM chat_messages cm1 INNER JOIN chat_messages cm2 ON cm1.chat_session_id = cm2.chat_session_id WHERE cm1.sender_id != @tutor_id AND cm2.sender_id = @tutor_id AND cm2.sent_at > cm1.sent_at`),
      
      // Tutor presence - Using user_presence table
      pool.request().input('user_id', sql.VarChar, userId)
        .query(`SELECT status, last_seen FROM user_presence WHERE user_id = @user_id`)
    ]);

    // PROCESS RESULTS
    const profile = profileResult.recordset[0];
    const onlineStudents = safeParseInt(onlineStudentsResult.recordset[0]?.online_count);
    const newStudentsThisWeek = safeParseInt(newStudentsResult.recordset[0]?.new_students);
    const lastWeekStudents = safeParseInt(lastWeekStudentsResult.recordset[0]?.last_week_students);
    const sessionMetrics = sessionMetricsResult.recordset[0];
    const upcomingSessions = upcomingSessionsResult.recordset;
    const stats = statsResult.recordset[0];
    const notifications = safeParseInt(notificationsResult.recordset[0]?.unread_count);
    const rating = safeParseFloat(ratingResult.recordset[0]?.avg_rating, 4.8);
    const totalReviews = safeParseInt(ratingResult.recordset[0]?.total_reviews);
    const primarySubject = subjectResult.recordset[0]?.primary_subject || 'General';
    const avgResponseTime = safeParseInt(responseTimeResult.recordset[0]?.avg_response_time, 30);
    const tutorPresence = tutorPresenceResult.recordset[0];

    // CALCULATE DERIVED DATA
    const studentAnalytics = {
      onlineStudents,
      newStudentsThisWeek,
      weeklyTrend: calculateWeeklyTrend(newStudentsThisWeek, lastWeekStudents)
    };

    const performanceMetrics = {
      completed_sessions: safeParseInt(sessionMetrics.completed_sessions),
      upcoming_sessions: safeParseInt(sessionMetrics.upcoming_sessions),
      avg_earnings: safeParseFloat(sessionMetrics.avg_earnings),
      total_earnings: safeParseFloat(sessionMetrics.total_earnings),
      student_satisfaction: rating,
      response_rate: avgResponseTime <= 10 ? 95 : avgResponseTime <= 30 ? 85 : 75
    };

    const quickStats = {
      total_sessions: safeParseInt(stats.total_sessions),
      completed_count: safeParseInt(stats.completed_count),
      scheduled_count: safeParseInt(stats.scheduled_count),
      pending_count: safeParseInt(stats.pending_count),
      cancelled_count: safeParseInt(stats.cancelled_count)
    };

    const tutorRanking = {
      rating,
      totalReviews,
      rank: getTutorRank(rating, totalReviews),
      subjectRank: rating >= 4.8 && totalReviews >= 5 ? 1 : rating >= 4.5 && totalReviews >= 3 ? 2 : rating >= 4.0 && totalReviews >= 2 ? 3 : null,
      primarySubject,
      avgResponseTime
    };

    res.json({
      success: true,
      data: {
        profile,
        studentAnalytics,
        performanceMetrics,
        upcomingSessions,
        quickStats,
        notifications,
        tutorRanking,
        realTime: {
          lastUpdated: new Date().toISOString(),
          tutorStatus: tutorPresence?.status || 'offline',
          lastSeen: tutorPresence?.last_seen || new Date()
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching dashboard overview:', error.message);
    if (error.message.includes('Tutor profile not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
});

// INDIVIDUAL ENDPOINTS - UPDATED WITH CORRECT TABLES
router.get('/student-analytics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const { startOfWeek, endOfWeek } = getWeekRange();
    
    const lastWeekStart = new Date(startOfWeek);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(endOfWeek);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    const [onlineResult, newStudentsResult, lastWeekResult] = await Promise.all([
      pool.request().input('current_time', sql.DateTime, new Date(Date.now() - 5 * 60 * 1000))
        .query(`SELECT COUNT(DISTINCT user_id) as online_count FROM user_presence WHERE status = 'online' AND last_seen > @current_time`),
      pool.request().input('start_of_week', sql.DateTime, startOfWeek).input('end_of_week', sql.DateTime, endOfWeek)
        .query(`SELECT COUNT(*) as new_students FROM Users WHERE role = 'student' AND created_at >= @start_of_week AND created_at <= @end_of_week`),
      pool.request().input('last_week_start', sql.DateTime, lastWeekStart).input('last_week_end', sql.DateTime, lastWeekEnd)
        .query(`SELECT COUNT(*) as last_week_students FROM Users WHERE role = 'student' AND created_at >= @last_week_start AND created_at <= @last_week_end`)
    ]);

    const onlineStudents = safeParseInt(onlineResult.recordset[0]?.online_count);
    const newStudentsThisWeek = safeParseInt(newStudentsResult.recordset[0]?.new_students);
    const lastWeekStudents = safeParseInt(lastWeekResult.recordset[0]?.last_week_students);

    res.json({
      success: true,
      data: { 
        onlineStudents, 
        newStudentsThisWeek, 
        weeklyTrend: calculateWeeklyTrend(newStudentsThisWeek, lastWeekStudents) 
      }
    });

  } catch (error: any) {
    console.error('Error fetching student analytics:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch student analytics' });
  }
});

router.get('/performance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tutorId = await getTutorId(userId);
    const pool = await getPool();

    const [sessionMetrics, ratingResult, responseTimeResult] = await Promise.all([
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions, COUNT(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 END) as upcoming_sessions, AVG(CASE WHEN status = 'completed' THEN price ELSE NULL END) as avg_earnings, SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_earnings FROM BookedSessions WHERE tutor_id = @tutor_id`),
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT AVG(r.rating) as avg_rating FROM SessionReviews r WHERE r.tutor_id = @tutor_id`),
      pool.request().input('tutor_id', sql.VarChar, tutorId)
        .query(`SELECT AVG(DATEDIFF(MINUTE, cm1.sent_at, cm2.sent_at)) as avg_response_time FROM chat_messages cm1 INNER JOIN chat_messages cm2 ON cm1.chat_session_id = cm2.chat_session_id WHERE cm1.sender_id != @tutor_id AND cm2.sender_id = @tutor_id AND cm2.sent_at > cm1.sent_at`)
    ]);

    const metrics = sessionMetrics.recordset[0];
    const rating = safeParseFloat(ratingResult.recordset[0]?.avg_rating, 4.8);
    const avgResponseTime = safeParseInt(responseTimeResult.recordset[0]?.avg_response_time, 30);

    res.json({
      success: true,
      data: {
        completed_sessions: safeParseInt(metrics.completed_sessions),
        upcoming_sessions: safeParseInt(metrics.upcoming_sessions),
        avg_earnings: safeParseFloat(metrics.avg_earnings),
        total_earnings: safeParseFloat(metrics.total_earnings),
        student_satisfaction: rating,
        response_rate: avgResponseTime <= 10 ? 95 : avgResponseTime <= 30 ? 85 : 75
      }
    });

  } catch (error: any) {
    console.error('Error fetching performance metrics:', error.message);
    if (error.message.includes('Tutor profile not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch performance metrics' });
  }
});

router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tutorId = await getTutorId(userId);
    const pool = await getPool();

    const sessions = await pool.request()
      .input('tutor_id', sql.VarChar, tutorId)
      .query(`SELECT bs.session_id, bs.scheduled_time, bs.duration_minutes, bs.status, bs.price, bs.notes as topic, u.username as student_username, s.name as subject_name FROM BookedSessions bs INNER JOIN Users u ON bs.student_id = u.id INNER JOIN Subjects s ON bs.subject_id = s.subject_id WHERE bs.tutor_id = @tutor_id AND bs.status IN ('scheduled', 'confirmed') AND bs.scheduled_time >= GETDATE() ORDER BY bs.scheduled_time ASC`);

    res.json({ success: true, sessions: sessions.recordset });

  } catch (error: any) {
    console.error('Error fetching tutor sessions:', error.message);
    if (error.message.includes('Tutor profile not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tutorId = await getTutorId(userId);
    const pool = await getPool();

    const stats = await pool.request()
      .input('tutor_id', sql.VarChar, tutorId)
      .query(`SELECT COUNT(*) as total_sessions, COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count, COUNT(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 END) as scheduled_count, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count FROM BookedSessions WHERE tutor_id = @tutor_id`);

    const data = stats.recordset[0];

    res.json({
      success: true,
      data: {
        total_sessions: safeParseInt(data.total_sessions),
        completed_count: safeParseInt(data.completed_count),
        scheduled_count: safeParseInt(data.scheduled_count),
        pending_count: safeParseInt(data.pending_count),
        cancelled_count: safeParseInt(data.cancelled_count)
      }
    });

  } catch (error: any) {
    console.error('Error fetching tutor stats:', error.message);
    if (error.message.includes('Tutor profile not found')) {
      return res.status(404).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;