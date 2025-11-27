import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pool = await getPool();

    const result = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = @user_id AND is_read = 0');

    res.json({
      success: true,
      count: parseInt(result.recordset[0]?.unread_count || '0')
    });

  } catch (error: any) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification count' });
  }
});

// Get all notifications for user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pool = await getPool();

    const result = await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query(`
        SELECT 
          notification_id, title, message, type, 
          is_read, created_at, related_entity_id, related_entity_type
        FROM notifications 
        WHERE user_id = @user_id 
        ORDER BY created_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/:notificationId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const notificationId = req.params.notificationId;
    const pool = await getPool();

    await pool.request()
      .input('notification_id', sql.VarChar, notificationId)
      .input('user_id', sql.VarChar, userId)
      .query('UPDATE notifications SET is_read = 1 WHERE notification_id = @notification_id AND user_id = @user_id');

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pool = await getPool();

    await pool.request()
      .input('user_id', sql.VarChar, userId)
      .query('UPDATE notifications SET is_read = 1 WHERE user_id = @user_id AND is_read = 0');

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

export default router;