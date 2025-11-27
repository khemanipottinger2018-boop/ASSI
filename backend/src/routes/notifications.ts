import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ===== GLOBAL NOTIFICATION SERVICE =====
class NotificationService {
  // ✅ Core notification creation for GLOBAL ALERTS only
  static async createNotification(
    user_id: string,
    type: string,
    title: string,
    message: string,
    data: any = {}
  ): Promise<string> {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('user_id', sql.VarChar, user_id)
      .input('type', sql.VarChar, type)
      .input('title', sql.VarChar, title)
      .input('message', sql.VarChar, message)
      .input('data', sql.NVarChar, JSON.stringify(data))
      .input('is_read', sql.Bit, 0)
      .query(`
        INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
        OUTPUT INSERTED.notification_id
        VALUES (@user_id, @type, @title, @message, @data, @is_read, GETDATE())
      `);

    return result.recordset[0].notification_id;
  }

  // ✅ GLOBAL ALERT: New session booked (shows in notification bell)
  static async notifySessionBooked(tutorId: string, studentName: string, sessionId: string, subject: string): Promise<string> {
    return this.createNotification(
      tutorId,
      'session_booked',
      'New Session Booked! 🎉',
      `${studentName} booked ${subject}`,
      { session_id: sessionId, redirect_url: `/sessions/${sessionId}` }
    );
  }

  // ✅ GLOBAL ALERT: Tutor application status
  static async notifyTutorApplicationStatus(userId: string, status: 'approved' | 'rejected', reason?: string): Promise<string> {
    const isApproved = status === 'approved';
    
    return this.createNotification(
      userId,
      'tutor_application_status',
      isApproved ? 'Application Approved! 🎉' : 'Application Update',
      isApproved ? 'Start tutoring now!' : (reason || 'Needs review'),
      { 
        status, 
        reason,
        redirect_url: isApproved ? '/dashboard/tutor' : '/tutor-application' 
      }
    );
  }

  // ✅ GLOBAL ALERT: New message notification (NOT the message itself)
  static async notifyNewMessage(recipientId: string, senderName: string): Promise<string> {
    return this.createNotification(
      recipientId,
      'new_message',
      `💬 New message`,
      `From ${senderName}`,
      { redirect_url: '/inbox' } // Points to inbox, not the message
    );
  }

  // ✅ GLOBAL ALERT: Payment received
  static async notifyPaymentReceived(userId: string, amount: number): Promise<string> {
    return this.createNotification(
      userId,
      'payment_received',
      'Payment Received! 💰',
      `You've received $${amount}`,
      { redirect_url: '/earnings' }
    );
  }

  // ✅ GLOBAL ALERT: Session reminder
  static async notifySessionReminder(userId: string, sessionTopic: string, minutes: number): Promise<string> {
    return this.createNotification(
      userId,
      'session_reminder',
      'Session Starting Soon ⏰',
      `"${sessionTopic}" in ${minutes} minutes`,
      { redirect_url: '/sessions' }
    );
  }

  // ✅ GLOBAL ALERT: System announcements
  static async notifySystemAnnouncement(userId: string, title: string, message: string): Promise<string> {
    return this.createNotification(
      userId,
      'system_announcement',
      title,
      message,
      { redirect_url: '/announcements' }
    );
  }
}

// ===== GLOBAL NOTIFICATION ROUTES (for header/bell) =====

// ✅ GET RECENT NOTIFICATIONS (for notification bell/dropdown)
router.get('/recent', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pool = await getPool();

    // Get only recent notifications (last 10) for the bell
    const result = await pool.request()
      .input('user_id', sql.VarChar, req.user.id)
      .query(`
        SELECT TOP 10
          notification_id,
          type,
          title,
          message,
          data,
          is_read,
          created_at
        FROM notifications 
        WHERE user_id = @user_id 
        ORDER BY created_at DESC
      `);

    const notifications = result.recordset.map(notif => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : {}
    }));

    res.json({
      success: true,
      data: notifications
    });

  } catch (error: any) {
    console.error('Error fetching recent notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// ✅ GET UNREAD COUNT (for notification badge)
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('user_id', sql.VarChar, req.user.id)
      .query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = @user_id AND is_read = 0');

    res.json({
      success: true,
      count: parseInt(result.recordset[0]?.unread_count || '0')
    });

  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
});

// ✅ MARK NOTIFICATION AS READ (when user clicks on notification)
router.patch('/:notificationId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { notificationId } = req.params;
    const pool = await getPool();

    const result = await pool.request()
      .input('notification_id', sql.VarChar, notificationId)
      .input('user_id', sql.VarChar, req.user.id)
      .query('UPDATE notifications SET is_read = 1 WHERE notification_id = @notification_id AND user_id = @user_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification marked as read' });

  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// ✅ MARK ALL AS READ (clear all notifications)
router.post('/mark-all-read', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.VarChar, req.user.id)
      .query('UPDATE notifications SET is_read = 1 WHERE user_id = @user_id AND is_read = 0');

    res.json({ success: true, message: 'All notifications marked as read' });

  } catch (error: any) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

// ✅ GET FULL NOTIFICATION HISTORY (for notifications page)
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { limit = 50, page = 1 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const pool = await getPool();

    const result = await pool.request()
      .input('user_id', sql.VarChar, req.user.id)
      .input('limit', sql.Int, parseInt(limit as string))
      .input('offset', sql.Int, offset)
      .query(`
        SELECT 
          notification_id,
          type,
          title,
          message,
          data,
          is_read,
          created_at
        FROM notifications 
        WHERE user_id = @user_id
        ORDER BY created_at DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    const notifications = result.recordset.map(notif => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : {}
    }));

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        hasMore: notifications.length === parseInt(limit as string)
      }
    });

  } catch (error: any) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

export default router;
export { NotificationService };