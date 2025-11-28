import { Server as SocketServer } from 'socket.io';
import { getPool } from '../../config/database.js';
import { NotificationHandler } from './notificationHandler.js';

export class ChatHandler {
  private io: SocketServer;
  private notificationHandler: NotificationHandler;

  constructor(io: SocketServer, notificationHandler: NotificationHandler) {
    this.io = io;
    this.notificationHandler = notificationHandler;
    this.setupChatHandlers();
  }

  private setupChatHandlers() {
    this.io.on('connection', (socket) => {
      console.log('💬 Chat user connected:', socket.id, socket.data.userId);

      // ==================== CHAT ROOM MANAGEMENT ====================

      // Join a chat session
      socket.on('join_chat_session', async (data: { session_id: string }) => {
        if (!data.session_id) return;

        try {
          const pool = await getPool();
          
          // Verify user has access to this session
          const accessCheck = await pool.request()
            .input('session_id', data.session_id)
            .input('user_id', socket.data.userId)
            .query(`
              SELECT 1 as has_access
              FROM chat_sessions
              WHERE id = @session_id
              AND (student_id = @user_id OR tutor_id IN (SELECT tutor_id FROM Tutors WHERE user_id = @user_id))
            `);

          if (accessCheck.recordset.length > 0) {
            socket.join(`chat_session:${data.session_id}`);
            console.log(`👥 User ${socket.data.userId} joined chat session: ${data.session_id}`);

            // Notify others in the room
            socket.to(`chat_session:${data.session_id}`).emit('user_joined_chat', {
              user_id: socket.data.userId,
              session_id: data.session_id
            });
          }
        } catch (error) {
          console.error('Error joining chat session:', error);
        }
      });

      // Leave a chat session
      socket.on('leave_chat_session', (data: { session_id: string }) => {
        if (!data.session_id) return;
        
        socket.leave(`chat_session:${data.session_id}`);
        console.log(`🚪 User ${socket.data.userId} left chat session: ${data.session_id}`);
      });

      // ==================== MESSAGING ====================

      // Send chat message
      socket.on('send_chat_message', async (data: { 
        session_id: string; 
        message: string; 
        message_type_id?: number;
        tempId?: string;
      }) => {
        if (!data.session_id || !data.message) return;

        try {
          const pool = await getPool();
          const message_type_id = data.message_type_id || 1; // Default to text

          // Save message to database
          const result = await pool.request()
            .input('session_id', data.session_id)
            .input('sender_id', socket.data.userId)
            .input('message', data.message)
            .input('message_type_id', message_type_id)
            .query(`
              INSERT INTO chat_messages (chat_session_id, sender_id, message, message_type_id, sent_at)
              OUTPUT INSERTED.message_id, INSERTED.sent_at
              VALUES (@session_id, @sender_id, @message, @message_type_id, GETDATE())
            `);

          const messageRecord = result.recordset[0];

          // Get sender details
          const senderResult = await pool.request()
            .input('user_id', socket.data.userId)
            .query('SELECT name FROM Users WHERE id = @user_id');

          const senderName = senderResult.recordset[0]?.name;

          // Get session details for notification
          const sessionResult = await pool.request()
            .input('session_id', data.session_id)
            .query(`
              SELECT 
                cs.student_id,
                cs.tutor_id,
                t.user_id as tutor_user_id,
                u_student.name as student_name,
                u_tutor.name as tutor_name
              FROM chat_sessions cs
              INNER JOIN Tutors t ON cs.tutor_id = t.tutor_id
              INNER JOIN Users u_student ON cs.student_id = u_student.id
              INNER JOIN Users u_tutor ON t.user_id = u_tutor.id
              WHERE cs.id = @session_id
            `);

          const session = sessionResult.recordset[0];
          if (!session) return;

          // Determine recipient
          const recipientId = socket.data.userId === session.student_id 
            ? session.tutor_user_id 
            : session.student_id;

          const recipientName = socket.data.userId === session.student_id
            ? session.tutor_name
            : session.student_name;

          // Create message object for real-time delivery
          const messageData = {
            message_id: messageRecord.message_id,
            message: data.message,
            sent_at: messageRecord.sent_at,
            read_at: null,
            sender_id: socket.data.userId,
            sender_name: senderName,
            sender_role: socket.data.userId === session.student_id ? 'student' : 'tutor',
            tempId: data.tempId // For optimistic updates
          };

          // Send to all in chat room (including sender for confirmation)
          this.io.to(`chat_session:${data.session_id}`).emit('new_chat_message', messageData);

          // Send notification to recipient if they're not in the chat
          const recipientsInRoom = await this.io.in(`chat_session:${data.session_id}`).fetchSockets();
          const recipientInRoom = recipientsInRoom.some(s => s.data.userId === recipientId);

          if (!recipientInRoom) {
            await this.notificationHandler.sendNotification(
              recipientId,
              'new_message',
              `💬 New message from ${senderName}`,
              data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
              { 
                session_id: data.session_id,
                redirect_url: `/chat/${data.session_id}`
              }
            );
          }

          // Mark session as active if it's accepted but not started
          await pool.request()
            .input('session_id', data.session_id)
            .query(`
              UPDATE chat_sessions 
              SET status = 'active', started_at = COALESCE(started_at, GETDATE())
              WHERE id = @session_id AND status = 'accepted'
            `);

        } catch (error) {
          console.error('Error sending chat message:', error);
          
          // Notify sender of failure
          socket.emit('message_failed', { 
            tempId: data.tempId,
            error: 'Failed to send message'
          });
        }
      });

      // ==================== TYPING INDICATORS ====================

      socket.on('typing_start', (data: { session_id: string }) => {
        if (!data.session_id) return;
        
        socket.to(`chat_session:${data.session_id}`).emit('user_typing', {
          session_id: data.session_id,
          user_id: socket.data.userId
        });
      });

      socket.on('typing_stop', (data: { session_id: string }) => {
        if (!data.session_id) return;
        
        socket.to(`chat_session:${data.session_id}`).emit('user_stopped_typing', {
          session_id: data.session_id,
          user_id: socket.data.userId
        });
      });

      // ==================== CHAT REQUESTS ====================

      socket.on('request_live_chat', async (data: { 
        tutor_id: string; 
        subject_id: string; 
        student_notes?: string;
      }) => {
        if (!data.tutor_id || !data.subject_id) return;

        try {
          const pool = await getPool();

          // Get tutor user_id from tutor_id
          const tutorResult = await pool.request()
            .input('tutor_id', data.tutor_id)
            .query('SELECT user_id FROM Tutors WHERE tutor_id = @tutor_id');

          if (tutorResult.recordset.length === 0) return;

          const tutorUserId = tutorResult.recordset[0].user_id;

          // Notify tutor of new chat request via notification system
          await this.notificationHandler.sendNotification(
            tutorUserId,
            'chat_request',
            '📞 New Chat Request',
            'A student wants to start a live chat session',
            {
              student_id: socket.data.userId,
              tutor_id: data.tutor_id,
              subject_id: data.subject_id,
              student_notes: data.student_notes,
              redirect_url: '/dashboard/tutor/chat-requests'
            }
          );

          // Also emit real-time event to tutor if online
          socket.to(`user:${tutorUserId}`).emit('new_chat_request', {
            student_id: socket.data.userId,
            tutor_id: data.tutor_id,
            subject_id: data.subject_id,
            student_notes: data.student_notes,
            requested_at: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error handling chat request:', error);
        }
      });

      // ==================== DISCONNECTION ====================

      socket.on('disconnect', () => {
        console.log('💬 Chat user disconnected:', socket.id);
      });
    });
  }
}
