import { Server as SocketServer } from 'socket.io';
import { NotificationService } from '../../routes/notifications.js';
import { getPool } from '../../config/database.js';

export class NotificationHandler {
  private io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('🔌 User connected:', socket.id);

      // Join user to personal notification room
      socket.on('join-user-room', (userId: string) => {
        if (!userId) return;
        socket.join(`user:${userId}`);
        console.log(`👤 User ${userId} joined notification room`);
      });

      // Chat typing indicators
      socket.on('typing-start', (data: { roomId: string; userId: string }) => {
        if (!data.roomId || !data.userId) return;
        socket.to(data.roomId).emit('user-typing', { userId: data.userId });
      });

      socket.on('typing-stop', (data: { roomId: string; userId: string }) => {
        if (!data.roomId || !data.userId) return;
        socket.to(data.roomId).emit('user-stopped-typing', { userId: data.userId });
      });

      socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
      });
    });
  }

  // ✅ Core notification method
  async sendNotification(
    userId: string, 
    type: string, 
    title: string, 
    message: string, 
    data: any = {}
  ): Promise<string | null> {
    if (!userId || !type || !title || !message) return null;

    try {
      // Save to database
      const notificationId = await NotificationService.createNotification(
        userId, type, title, message, data
      );

      // Get unread count
      const pool = await getPool();
      const countResult = await pool.request()
        .input('user_id', userId)
        .query('SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = @user_id AND is_read = 0');

      const unreadCount = parseInt(countResult.recordset[0]?.unread_count || '0');

      // Emit real-time notification
      this.io.to(`user:${userId}`).emit('new-notification', {
        notification: {
          notification_id: notificationId,
          user_id: userId,
          type,
          title,
          message,
          data,
          is_read: false,
          created_at: new Date().toISOString()
        },
        unread_count: unreadCount
      });

      return notificationId;

    } catch (error) {
      console.error('❌ Notification error:', error);
      return null;
    }
  }

  // ✅ Business-specific methods
  async notifySessionBooked(tutorId: string, studentName: string, sessionId: string, subject: string) {
    return this.sendNotification(
      tutorId,
      'session_booked',
      'New Session Booked! 🎉',
      `${studentName} booked a ${subject} session`,
      { session_id: sessionId, redirect_url: `/sessions/${sessionId}` }
    );
  }

  async notifyMessageReceived(recipientId: string, senderName: string, messagePreview: string) {
    return this.sendNotification(
      recipientId,
      'message_received',
      `💬 New message from ${senderName}`,
      messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
      { redirect_url: '/messages' }
    );
  }

  async notifyTutorApplication(userId: string, status: 'approved' | 'rejected', reason?: string) {
    const isApproved = status === 'approved';
    
    return this.sendNotification(
      userId,
      'tutor_application_status',
      isApproved ? 'Application Approved! 🎉' : 'Application Update',
      isApproved ? 'You can now start tutoring!' : (reason || 'Needs additional review'),
      { 
        status, 
        reason,
        redirect_url: isApproved ? '/dashboard/tutor' : '/tutor-application' 
      }
    );
  }

  // ✅ Batch notifications for system alerts
  async notifyMultipleUsers(userIds: string[], title: string, message: string, data: any = {}) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendNotification(userId, 'system_alert', title, message, data))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`📢 Batch notification: ${successful}/${userIds.length} successful`);
    
    return successful;
  }
}