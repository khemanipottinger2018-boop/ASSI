// backend/src/routes/admin.ts
import express from 'express';
import { db } from '@/config/database';
import { authenticate, AuthRequest, requireAdmin } from '@/middleware/auth';
// import { io } from '@/socket-server'; // Make sure you export `io` from your socket-server

const router = express.Router();

// ==================== ADMIN DASHBOARD STATS ====================
router.get('/dashboard-stats', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [stats, recentSignups, activeSessions, pendingApps, onlineUsers] = await Promise.all([
      // Overall platform stats
      db.queryOne<{
        total_users: number;
        total_tutors: number;
        total_students: number;
        total_sessions: number;
        active_sessions: number;
      }>(
        `SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'tutor' THEN 1 END) as total_tutors,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
          (SELECT COUNT(*) FROM chat_sessions) as total_sessions,
          (SELECT COUNT(*) FROM chat_sessions WHERE status = 'active') as active_sessions
         FROM Users`,
        {}
      ),

      // Recent signups (last 7 days)
      db.query<{
        id: string;
        username: string;
        email: string;
        role: string;
        created_at: Date;
      }>(
        `SELECT id, username, email, role, created_at
         FROM Users 
         WHERE created_at > DATEADD(DAY, -7, GETDATE())
         ORDER BY created_at DESC
         OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY`,
        {}
      ),

      // Active chat sessions
      db.query<{
        id: string;
        student_id: string;
        tutor_id: string;
        student_name: string;
        tutor_name: string;
        subject_name: string;
        started_at: Date;
      }>(
        `SELECT 
          cs.id,
          cs.student_id,
          cs.tutor_id,
          stu.username as student_name,
          tut.username as tutor_name,
          s.name as subject_name,
          cs.started_at
         FROM chat_sessions cs
         JOIN Users stu ON cs.student_id = stu.id
         JOIN Users tut ON cs.tutor_id = tut.id
         JOIN Subjects s ON cs.subject_id = s.subject_id
         WHERE cs.status = 'active'
         ORDER BY cs.started_at DESC`,
        {}
      ),

      // Pending tutor applications
      db.query<{
        application_id: string;
        user_id: string;
        username: string;
        email: string;
        applied_at: Date;
      }>(
        `SELECT 
          ta.application_id,
          ta.user_id,
          u.username,
          u.email,
          ta.applied_at
         FROM TutorApplications ta
         JOIN Users u ON ta.user_id = u.id
         WHERE ta.status = 'pending'
         ORDER BY ta.applied_at ASC`,
        {}
      ),

      // Online users (legacy – disabled during refactor)
      Promise.resolve(0)

    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: stats?.total_users || 0,
        totalTutors: stats?.total_tutors || 0,
        totalStudents: stats?.total_students || 0,
        totalSessions: stats?.total_sessions || 0,
        activeSessions: stats?.active_sessions || 0,
        onlineUsers: onlineUsers || 0,
        pendingApplications: pendingApps.length
      },
      recentSignups: recentSignups.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        joined: u.created_at
      })),
      activeSessions: activeSessions.map(s => ({
        id: s.id,
        student: s.student_name,
        tutor: s.tutor_name,
        subject: s.subject_name,
        started: s.started_at
      })),
      pendingApplications: pendingApps.map(a => ({
        id: a.application_id,
        userId: a.user_id,
        username: a.username,
        email: a.email,
        applied: a.applied_at
      }))
    });

  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// ==================== GET ALL USERS ====================
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { page = '1', limit = '20', role, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT id, username, email, role, created_at, last_login, date_of_birth
      FROM Users 
      WHERE 1=1
    `;
    
    const params: Record<string, any> = {};

    if (role && ['student','tutor','tutor-applicant','admin'].includes(role as string)) {
      query += ` AND role = @role`;
      params.role = role;
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      query += ` AND (username LIKE @search OR email LIKE @search)`;
      params.search = `%${search}%`;
    }

    query += ` ORDER BY created_at DESC`;

    const countQuery = query.replace(
      'SELECT id, username, email, role, created_at, last_login, date_of_birth',
      'SELECT COUNT(*) as total'
    );

    const totalResult = await db.queryOne<{ total: number }>(countQuery, params);

    query += ` OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
    params.offset = offset;
    params.limit = limitNum;

    const users = await db.query(query, params);

    res.json({
      success: true,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResult?.total || 0,
        totalPages: Math.ceil((totalResult?.total || 0) / limitNum)
      }
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// ==================== UPDATE USER ROLE ====================
router.put('/users/:userId/role', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['student','tutor-applicant','tutor','admin'].includes(role)) {
      return res.status(400).json({ success:false, error: 'Invalid role' });
    }

    await db.query(`UPDATE Users SET role = @role WHERE id = @user_id`, { user_id: userId, role });

    if (role === 'tutor') {
      const exists = await db.queryOne<{ tutor_id: string }>(
        `SELECT tutor_id FROM Tutors WHERE user_id=@user_id`, { user_id: userId }
      );
      if (!exists) {
        await db.query(
          `INSERT INTO Tutors (user_id, chat_mode, max_concurrent_chats, is_student_tutor) 
           VALUES (@user_id, 'request', 1, 0)`,
          { user_id: userId }
        );
      }
    }

    res.json({ success:true, message: `User role updated to ${role}` });

  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ success:false, error: 'Failed to update user role' });
  }
});

// ==================== GET USER DETAILS ====================
router.get('/users/:userId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const user = await db.queryOne<{
      id: string;
      username: string;
      email: string;
      role: string;
      bio?: string;
      phone_number?: string;
      show_phone: boolean;
      avatar_url?: string;
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
      created_at: Date;
      updated_at?: Date;
      last_login?: Date;
      is_age_verified: boolean;
    }>(`SELECT * FROM Users WHERE id=@user_id`, { user_id: userId });

    if (!user) return res.status(404).json({ success:false, error:'User not found' });

    const presence = await db.queryOne<{ status: string; last_activity: Date }>(
      `SELECT status, last_activity FROM user_presence WHERE user_id=@user_id`,
      { user_id: userId }
    );

    let tutorInfo: { id: string; hourlyRate: number } | null = null;
    if (user.role === 'tutor') {
      const t = await db.queryOne<{ tutor_id: string; hourly_rate: number }>(
        `SELECT tutor_id, hourly_rate FROM Tutors WHERE user_id=@user_id`,
        { user_id: userId }
      );
      if (t) tutorInfo = { id: t.tutor_id, hourlyRate: t.hourly_rate };
    }

    let applicationInfo: { id: string; status: string; appliedAt: Date } | null = null;
    if (user.role === 'tutor-applicant') {
      const a = await db.queryOne<{ application_id: string; status: string; applied_at: Date }>(
        `SELECT application_id, status, applied_at FROM TutorApplications 
         WHERE user_id=@user_id AND status='pending'`,
        { user_id: userId }
      );
      if (a) applicationInfo = { id: a.application_id, status: a.status, appliedAt: a.applied_at };
    }

    res.json({
      success: true,
      user: {
        ...user,
        presence: presence || { status: 'offline', last_activity: new Date() },
        tutorInfo,
        applicationInfo
      }
    });

  } catch (error: any) {
    console.error('Get user details error:', error);
    res.status(500).json({ success:false, error:'Failed to fetch user details' });
  }
});

// ==================== DELETE USER ====================
router.delete('/users/:userId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user!.id;

    if (userId === adminId) return res.status(400).json({ success:false, error:'Cannot delete your own account' });

    await db.query(`DELETE FROM Users WHERE id=@user_id`, { user_id: userId });

    res.json({ success:true, message:'User deleted successfully' });

  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ success:false, error:'Failed to delete user' });
  }
});

export default router;
