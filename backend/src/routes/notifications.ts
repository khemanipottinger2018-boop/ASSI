// backend/src/routes/notifications.ts
import express from 'express';
import { db } from '@/config/database';
import { authenticate, AuthRequest } from '@/middleware/auth'; // Import AuthRequest

const router = express.Router();

// ✅ SIMPLE: Create notification (UUID compatible)
async function createNotification(
  user_id: string, // UUID string
  type: string,
  title: string,
  message: string,
  data: any = {}
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO notifications (user_id, type, title, message, data, is_read, created_at)
     OUTPUT INSERTED.id
     VALUES (@user_id, @type, @title, @message, @data, 0, GETDATE())`,
    {
      user_id,
      type,
      title,
      message,
      data: JSON.stringify(data)
    }
  );
  
  return result[0]?.id || '';
}

// ✅ GET RECENT NOTIFICATIONS
router.get('/recent', authenticate, async (req: AuthRequest, res) => { // Use AuthRequest
  try {
    const userId = req.user!.id; // Now TypeScript knows this exists
    
    const notifications = await db.query<{
      id: string; // UUID
      user_id: string; // UUID
      type: string;
      title: string;
      message: string;
      data: string;
      is_read: boolean;
      created_at: Date;
    }>(
      `SELECT TOP 10 id, type, title, message, data, is_read, created_at
       FROM notifications 
       WHERE user_id = @user_id 
       ORDER BY created_at DESC`,
      { user_id: userId }
    );
    
    // Parse JSON data
    const parsedNotifications = notifications.map(notif => ({
      ...notif,
      data: notif.data ? JSON.parse(notif.data) : {}
    }));
    
    res.json({ 
      success: true, 
      notifications: parsedNotifications 
    });
  } catch (error: any) {
    console.error('Notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notifications' 
    });
  }
});

// ✅ GET UNREAD COUNT (for notification badge)
router.get('/unread-count', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const result = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE user_id = @user_id AND is_read = 0`,
      { user_id: userId }
    );
    
    res.json({ 
      success: true, 
      count: result?.count || 0 
    });
  } catch (error: any) {
    console.error('Unread count error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch unread count' 
    });
  }
});

// ✅ MARK AS READ
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    await db.query(
      `UPDATE notifications SET is_read = 1 
       WHERE id = @id AND user_id = @user_id`,
      { 
        id, // UUID string
        user_id: userId // UUID string
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Notification marked as read' 
    });
  } catch (error: any) {
    console.error('Mark read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark as read' 
    });
  }
});

// ✅ MARK ALL AS READ
router.post('/mark-all-read', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    await db.query(
      `UPDATE notifications SET is_read = 1 
       WHERE user_id = @user_id AND is_read = 0`,
      { user_id: userId }
    );
    
    res.json({ 
      success: true, 
      message: 'All notifications marked as read' 
    });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark all as read' 
    });
  }
});

// ✅ DELETE NOTIFICATION
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    
    await db.query(
      `DELETE FROM notifications 
       WHERE id = @id AND user_id = @user_id`,
      { id, user_id: userId }
    );
    
    res.json({ 
      success: true, 
      message: 'Notification deleted' 
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete notification' 
    });
  }
});

export default router;
export { createNotification };