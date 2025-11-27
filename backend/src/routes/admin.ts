// backend/src/routes/admin.ts
import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard-stats', authenticateToken, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const pool = await getPool();

    // Get total users count
    const usersResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'tutor' THEN 1 END) as total_tutors,
        COUNT(CASE WHEN role = 'student' THEN 1 END) as total_students,
        COUNT(CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) THEN 1 END) as new_users_30d
      FROM Users
    `);

    // Get tutor applications stats
    const applicationsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_applications,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications
      FROM TutorApplications
    `);

    // Get recent activity (last 7 days)
    const activityResult = await pool.request().query(`
      SELECT 
        COUNT(*) as logins_7d
      FROM UserSessions 
      WHERE login_at >= DATEADD(day, -7, GETDATE())
    `);

    // Get online users (active in last 15 minutes)
    const onlineUsersResult = await pool.request().query(`
      SELECT COUNT(DISTINCT user_id) as online_users
      FROM UserSessions 
      WHERE last_activity >= DATEADD(minute, -15, GETDATE())
    `);

    const stats = {
      users: usersResult.recordset[0],
      applications: applicationsResult.recordset[0],
      activity: activityResult.recordset[0],
      online: onlineUsersResult.recordset[0]
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching dashboard stats:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard statistics',
      details: errorMessage
    });
  }
});

// Get all users with pagination
router.get('/users', authenticateToken, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    if (search) {
      whereClause += ` AND (username LIKE '%${search}%' OR email LIKE '%${search}%')`;
    }
    if (role) {
      whereClause += ` AND role = '${role}'`;
    }

    const usersResult = await pool.request().query(`
      SELECT 
        id, username, email, role, created_at, last_login,
        (SELECT COUNT(*) FROM TutorApplications WHERE user_id = Users.id) as application_count
      FROM Users 
      ${whereClause}
      ORDER BY created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM Users 
      ${whereClause}
    `);

    res.json({
      success: true,
      data: {
        users: usersResult.recordset,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.recordset[0].total,
          totalPages: Math.ceil(countResult.recordset[0].total / Number(limit))
        }
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching users:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users',
      details: errorMessage
    });
  }
});

// Get user activity logs
router.get('/user-activity', authenticateToken, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, userId = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const pool = await getPool();

    let whereClause = 'WHERE 1=1';
    if (userId) {
      whereClause += ` AND user_id = '${userId}'`;
    }

    const activityResult = await pool.request().query(`
      SELECT 
        us.session_id, us.user_id, u.username, u.email,
        us.login_at, us.last_activity, us.ip_address,
        us.user_agent, us.logout_at
      FROM UserSessions us
      INNER JOIN Users u ON us.user_id = u.id
      ${whereClause}
      ORDER BY us.login_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM UserSessions us
      ${whereClause}
    `);

    res.json({
      success: true,
      data: {
        activity: activityResult.recordset,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: countResult.recordset[0].total,
          totalPages: Math.ceil(countResult.recordset[0].total / Number(limit))
        }
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching user activity:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user activity',
      details: errorMessage
    });
  }
});

// Get online users
router.get('/online-users', authenticateToken, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const pool = await getPool();

    const onlineUsersResult = await pool.request().query(`
      SELECT 
        us.user_id, u.username, u.email, u.role,
        us.last_activity, us.ip_address, us.login_at
      FROM UserSessions us
      INNER JOIN Users u ON us.user_id = u.id
      WHERE us.last_activity >= DATEADD(minute, -15, GETDATE())
      ORDER BY us.last_activity DESC
    `);

    res.json({
      success: true,
      data: onlineUsersResult.recordset
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error fetching online users:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch online users',
      details: errorMessage
    });
  }
});

// Update user role
router.put('/users/:userId/role', authenticateToken, authorizeRoles(['admin']), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['student', 'tutor', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be student, tutor, or admin'
      });
    }

    const pool = await getPool();

    // Check if user exists
    const userCheck = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT id FROM Users WHERE id = @user_id');

    if (userCheck.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user role
    await pool.request()
      .input('user_id', sql.VarChar, userId)
      .input('role', sql.VarChar, role)
      .query('UPDATE Users SET role = @role WHERE id = @user_id');

    res.json({
      success: true,
      message: `User role updated to ${role} successfully`
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error updating user role:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user role',
      details: errorMessage
    });
  }
});

export default router;