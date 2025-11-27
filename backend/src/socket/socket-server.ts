import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import PresenceService from '../services/presence-service.js';
import { ChatValidationService } from '../services/chat-validation.js';
import SessionManager from '../services/session-manager.js';
import LiveChatHandler from './handlers/live-chat.js';
import RateLimiter from '../utils/rateLimiter.js';

// Rate limit configurations
const RATE_LIMITS = {
  CHAT_REQUEST: { tokens: 3, windowSec: 300 },      // 3 requests per 5 minutes
  MESSAGES: { tokens: 60, windowSec: 60 },          // 60 messages per minute  
  TYPING_INDICATORS: { tokens: 30, windowSec: 30 }, // 30 typing events per 30 seconds
  PRESENCE_UPDATES: { tokens: 10, windowSec: 10 },  // 10 presence updates per 10 seconds
  CONNECTION_ATTEMPTS: { tokens: 10, windowSec: 60 } // 10 connections per minute per IP
} as const;

export default function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: { 
      origin: process.env.CLIENT_URL || 'http://localhost:3000', 
      credentials: true 
    },
    connectionStateRecovery: { 
      maxDisconnectionDuration: 2 * 60 * 1000, 
      skipMiddlewares: false 
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // ✅ INITIALIZE ALL SERVICES WITH RATE LIMITER
  const rateLimiter = new RateLimiter();
  const presenceService = new PresenceService();
  const chatValidationService = new ChatValidationService();
  const sessionManager = new SessionManager(presenceService, io);
  
  // ✅ PASS ADVANCED RATE LIMITER TO LIVE CHAT HANDLER
  const liveChatHandler = new LiveChatHandler(
    io,                    // 1st - Socket.IO server
    sessionManager,        // 2nd - SessionManager
    chatValidationService, // 3rd - ChatValidationService  
    presenceService,       // 4th - PresenceService
    rateLimiter            // 5th - Advanced RateLimiter
  );

  // 🔐 ENHANCED AUTHENTICATION WITH RATE LIMITING
  io.use(async (socket: any, next) => {
    try {
      const clientIp = socket.handshake.address;
      const authLimit = rateLimiter.allow(`auth:ip:${clientIp}`, RATE_LIMITS.CONNECTION_ATTEMPTS);
      
      if (!authLimit.allowed) {
        console.warn(`🚫 Rate limited auth attempt from IP: ${clientIp}`);
        return next(new Error('AUTH_RATE_LIMITED'));
      }

      const token = socket.handshake.auth?.token || 
                   socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('AUTH_TOKEN_REQUIRED'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.sub || decoded.userId;
      socket.userRole = decoded.role || decoded.roles;
      socket.username = decoded.username || decoded.name;
      socket.isAuthenticated = !!socket.userId;

      if (!socket.isAuthenticated) {
        return next(new Error('INVALID_TOKEN_PAYLOAD'));
      }

      console.log(`🔐 Socket authenticated: ${socket.userId} (${socket.userRole})`);
      return next();
      
    } catch (err) {
      console.error('Socket auth error:', err);
      return next(new Error('AUTH_FAILED'));
    }
  });

  // 🔗 CONNECTION HANDLER WITH ENHANCED PRESENCE
  io.on('connection', (socket: any) => {
    if (!socket.isAuthenticated) {
      socket.disconnect(true);
      return;
    }

    console.log(`🔗 User ${socket.userId} connected (${socket.id})`);
    
    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);
    
    // Join role-based rooms
    socket.join(`role:${socket.userRole}`);
    socket.join(`role:all`);

    // ===== ENHANCED PRESENCE INTEGRATION =====
    presenceService.userConnected(socket.userId, socket.id)
      .then(() => {
        console.log(`📍 User ${socket.userId} marked as online`);
        
        // Send tutor their initial online student count with rate limiting
        if (socket.userRole === 'tutor') {
          setTimeout(() => {
            presenceService.getOnlineUsersCount()
              .then(count => {
                const limitStatus = rateLimiter.checkForUser(
                  socket.userId, 
                  'presence_updates', 
                  RATE_LIMITS.PRESENCE_UPDATES
                );
                
                socket.emit('tutor:online_students_count', {
                  count,
                  timestamp: Date.now(),
                  rateLimit: {
                    remaining: limitStatus.remaining,
                    resetTime: limitStatus.resetTime
                  }
                });
              })
              .catch(console.error);
          }, 1000);
        }
      })
      .catch(error => {
        console.error('❌ Presence tracking error:', error);
      });

    // ✅ SETUP LIVE CHAT HANDLERS WITH ADVANCED RATE LIMITING
    liveChatHandler.setupHandlers(socket);

    // ===== ENHANCED ACTIVITY TRACKING WITH RATE LIMITING =====
    const activityEvents = [
      'typing_start', 'typing_stop', 'send_message', 
      'start_chat_session', 'view_messages'
    ];

    activityEvents.forEach(event => {
      socket.on(event, () => {
        // Rate limit typing indicators specifically
        if (event.includes('typing')) {
          const typingLimit = rateLimiter.allowForUser(
            socket.userId, 
            'typing_indicators', 
            RATE_LIMITS.TYPING_INDICATORS
          );
          
          if (!typingLimit.allowed) {
            console.log(`🚫 Typing rate limit exceeded for user: ${socket.userId}`);
            return;
          }
        }

        presenceService.updateUserActivity(socket.userId, socket.id)
          .catch(error => {
            console.error('Activity update error:', error);
          });
      });
    });

    // ===== ENHANCED PRESENCE MANAGEMENT =====
    
    // Manual status updates with rate limiting
    socket.on('set_status', async (data: { status: string }, ack?: Function) => {
      try {
        const limitResult = rateLimiter.allowForUser(
          socket.userId,
          'presence_updates',
          RATE_LIMITS.PRESENCE_UPDATES
        );

        if (!limitResult.allowed) {
          return ack?.({
            success: false, 
            error: 'RATE_LIMITED',
            message: `Too many status updates. Try again in ${limitResult.retryAfter} seconds.`,
            retryAfter: limitResult.retryAfter
          });
        }

        await presenceService.setUserStatus(socket.userId, data.status as any);
        ack?.({ 
          success: true,
          rateLimit: {
            remaining: limitResult.remaining,
            resetTime: limitResult.resetTime
          }
        });
      } catch (error: any) {
        console.error('Status update error:', error);
        ack?.({ success: false, error: error.message });
      }
    });

    // Get presence status for specific users
    socket.on('get_presence', async (data: { userIds: string[] }, ack?: Function) => {
      try {
        const statuses = await presenceService.getUserOnlineStatus(data.userIds);
        ack?.({ success: true, data: statuses });
      } catch (error: any) {
        console.error('Get presence error:', error);
        ack?.({ success: false, error: error.message });
      }
    });

    // ===== ENHANCED TUTOR-SPECIFIC FEATURES =====
    
    // Get current online student count (on-demand with rate limiting)
    socket.on('tutor:get_student_count', async (ack?: Function) => {
      if (socket.userRole !== 'tutor') {
        ack?.({ success: false, error: 'Unauthorized' });
        return;
      }

      try {
        const limitResult = rateLimiter.allowForUser(
          socket.userId,
          'presence_updates',
          RATE_LIMITS.PRESENCE_UPDATES
        );

        if (!limitResult.allowed) {
          return ack?.({
            success: false,
            error: 'RATE_LIMITED',
            retryAfter: limitResult.retryAfter
          });
        }

        const count = await presenceService.getOnlineUsersCount();
        ack?.({
          success: true,
          data: {
            onlineStudents: count,
            timestamp: Date.now()
          },
          rateLimit: {
            remaining: limitResult.remaining,
            resetTime: limitResult.resetTime
          }
        });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    // Get online students in tutor's subjects
    socket.on('tutor:get_available_students', async (ack?: Function) => {
      if (socket.userRole !== 'tutor') {
        ack?.({ success: false, error: 'Unauthorized' });
        return;
      }

      try {
        const availableStudents = await getStudentsInTutorSubjects(socket.userId);
        const studentStatuses = await presenceService.getUserOnlineStatus(availableStudents);
        
        ack?.({
          success: true,
          data: {
            availableStudents: studentStatuses,
            timestamp: Date.now()
          }
        });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    // ===== RATE LIMIT STATUS CHECKING =====
    socket.on('get_rate_limit_status', (data: { action: string }, ack?: Function) => {
      try {
        const limitConfig = RATE_LIMITS[data.action as keyof typeof RATE_LIMITS] || RATE_LIMITS.MESSAGES;
        const limitStatus = rateLimiter.checkForUser(socket.userId, data.action, limitConfig);
        
        ack?.({
          success: true,
          data: {
            allowed: limitStatus.allowed,
            remaining: limitStatus.remaining,
            retryAfter: limitStatus.retryAfter,
            resetTime: limitStatus.resetTime,
            limit: limitConfig.tokens,
            window: limitConfig.windowSec
          }
        });
      } catch (error: any) {
        ack?.({ success: false, error: error.message });
      }
    });

    // ===== PAYMENT NOTIFICATIONS (Future Ready) =====
    socket.on('payment:subscribe', (ack?: Function) => {
      socket.join(`payments:${socket.userId}`);
      ack?.({ success: true, message: 'Subscribed to payment notifications' });
    });

    // ===== ENHANCED DISCONNECTION HANDLING =====
    socket.on('disconnect', async (reason: string) => {
      console.log(`🔌 User ${socket.userId} disconnected: ${reason}`);
      
      try {
        await presenceService.userDisconnected(socket.userId, socket.id);
        console.log(`📍 User ${socket.userId} presence updated for disconnect`);
      } catch (error) {
        console.error('❌ Presence disconnect error:', error);
      }
    });

    // Handle graceful client-side disconnection
    socket.on('client_disconnect', async (data: { reason?: string }) => {
      console.log(`🖐️  User ${socket.userId} initiated disconnect: ${data.reason}`);
      socket.disconnect(true);
    });

    // Handle connection errors
    socket.on('error', (error: any) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    // Enhanced heartbeat with rate limiting
    socket.on('heartbeat', () => {
      const heartbeatLimit = rateLimiter.allowForUser(
        socket.userId,
        'presence_updates',
        { tokens: 2, windowSec: 1 } // Very generous for heartbeats
      );

      if (heartbeatLimit.allowed) {
        presenceService.updateUserActivity(socket.userId, socket.id)
          .catch(error => {
            console.error('Heartbeat activity update error:', error);
          });
      }
    });
  });

  // ===== PRESENCE BROADCASTING =====
  presenceService.onPresenceUpdate((update: any) => {
    console.log(`📢 Broadcasting presence update: ${update.userId} -> ${update.status}`);
    
    // Broadcast to user's personal room (for their own devices)
    io.to(`user:${update.userId}`).emit('presence_updated', update);
    
    // Broadcast to all connected clients
    io.emit('user_presence_updated', update);
  });

  // ===== PERIODIC UPDATES =====
  
  // Clean up stale connections every 5 minutes
  setInterval(async () => {
    try {
      await presenceService.cleanupStaleSockets();
      console.log('🧹 Stale connection cleanup completed');
    } catch (error) {
      console.error('Stale connection cleanup error:', error);
    }
  }, 5 * 60 * 1000);

  // Update tutors with online student count every 5 minutes (not too spammy)
  setInterval(async () => {
    try {
      const count = await presenceService.getOnlineUsersCount();
      io.to('role:tutor').emit('tutor:online_students_count', {
        count,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Student count update error:', error);
    }
  }, 5 * 60 * 1000);

  // Rate limiter stats logging (for monitoring)
  setInterval(() => {
    const size = rateLimiter.getSize();
    if (size > 0) {
      console.log(`📊 Rate limiter tracking ${size} active users`);
    }
  }, 60000); // Every minute

  console.log('✅ Socket.IO server initialized - Advanced Rate Limiting Enabled');
  return io;
}

// Helper function - get students interested in tutor's subjects
async function getStudentsInTutorSubjects(tutorId: string): Promise<string[]> {
  // This would query your database for students who:
  // 1. Have the tutor in their favorites
  // 2. Are interested in subjects the tutor teaches
  // 3. Have previously messaged the tutor
  
  // For now, return empty array - implement based on your business logic
  return [];
}