import { Socket } from 'socket.io';
import { ChatValidationService } from '../../services/chat-validation.js';
import { SessionManager } from '../../services/session-manager.js';
import PresenceService from '../../services/presence-service.js';
import RateLimiter from '../../utils/rateLimiter.js';
import { executeQuery } from '../../config/database.js';
import sql from 'mssql';

type Ack<T = any> = (response: T) => void;

interface ChatRequestData {
  tutor_id: string;
  subject_id: string;
  student_notes?: string;
}

interface ChatResponseData {
  session_id: string;
  accept: boolean;
  decline_reason?: string;
}

interface MessageData {
  chat_id: string;
  message: string;
}

// Constants
const CHAT_ERRORS = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SERVER_ERROR: 'SERVER_ERROR',
  INVALID_MESSAGE: 'INVALID_MESSAGE'
} as const;

const RATE_LIMITS = {
  CHAT_REQUEST: { tokens: 3, windowSec: 300 },
  MESSAGES: { tokens: 60, windowSec: 60 }
} as const;

interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: 'student' | 'tutor' | 'admin';
  username: string;
  isAuthenticated: boolean;
}

export class LiveChatHandler {
  constructor(
    private io: any,
    private sessionManager: SessionManager,
    private chatValidation: ChatValidationService,
    private presence: PresenceService,
    private rateLimiter: RateLimiter = new RateLimiter()
  ) {}

  setupHandlers(socket: AuthenticatedSocket) {
    // Event handlers mapping
    const handlers = {
      'tutor_online': (data: any, ack?: Ack) => this.handleTutorOnline(socket, ack),
      'set_status': (data: { status: string }, ack?: Ack) => this.handleSetStatus(socket, data, ack),
      'request_live_chat': (data: ChatRequestData, ack?: Ack) => this.handleChatRequest(socket, data, ack),
      'respond_chat_request': (data: ChatResponseData, ack?: Ack) => this.handleChatResponse(socket, data, ack),
      'get_pending_requests': (data: any, ack?: Ack) => this.handleGetPendingRequests(socket, ack),
      'start_chat_session': (data: { session_id: string }, ack?: Ack) => this.handleStartChatSession(socket, data, ack),
      'end_chat_session': (data: { session_id: string }, ack?: Ack) => this.handleEndChatSession(socket, data, ack),
      'send_message': (data: MessageData, ack?: Ack) => this.handleSendMessage(socket, data, ack),
      'typing_start': (data: { chat_id: string }) => this.handleTypingStart(socket, data),
      'typing_stop': (data: { chat_id: string }) => this.handleTypingStop(socket, data),
      'get_chat_presence': (data: { chat_id: string }, ack?: Ack) => this.handleGetChatPresence(socket, data, ack)
    };

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Setup activity tracking and cleanup
    this.setupActivityTracking(socket);
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  // ============ CORE HANDLERS ============

  private async handleTutorOnline(socket: AuthenticatedSocket, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);
      socket.join(`tutor:${socket.userId}`);
      
      await this.presence.userConnected(socket.userId, socket.id);
      await this.updateTutorAvailability(socket.userId, true);

      console.log(`👨‍🏫 Tutor ${socket.userId} is online for requests`);
      this.sendSuccess(ack, { online: true });
    } catch (error) {
      this.handleError('Tutor online', error, ack);
    }
  }

  private async handleSetStatus(socket: AuthenticatedSocket, data: { status: string }, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);
      await this.presence.setUserStatus(socket.userId, data.status as any);
      this.sendSuccess(ack, { status: data.status });
    } catch (error) {
      this.handleError('Set status', error, ack);
    }
  }

  private async handleChatRequest(socket: AuthenticatedSocket, data: ChatRequestData, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);

      // Rate limiting
      if (!this.rateLimiter.allowForUser(socket.userId, 'request_live_chat', RATE_LIMITS.CHAT_REQUEST)) {
        return this.sendError(ack, CHAT_ERRORS.RATE_LIMITED);
      }

      // Validation
      const validation = await this.chatValidation.validateChatRequest({
        student_id: socket.userId,
        tutor_id: data.tutor_id,
        subject_id: data.subject_id
      });

      if (!validation.valid) {
        return this.sendError(ack, CHAT_ERRORS.VALIDATION_FAILED, validation.message);
      }

      // Create session
      const session = await this.sessionManager.createChatSession({
        student_id: socket.userId,
        tutor_id: data.tutor_id,
        subject_id: data.subject_id,
        student_notes: data.student_notes
      });

      this.notifyTutor(session, socket.userId);
      console.log(`💬 Live chat requested: Student ${socket.userId} → Tutor ${data.tutor_id}`);
      this.sendSuccess(ack, { session_id: session.id });

    } catch (error: any) {
      if (error.message === 'DUPLICATE_REQUEST') {
        return this.sendError(ack, CHAT_ERRORS.DUPLICATE_REQUEST);
      }
      this.handleError('Chat request', error, ack);
    }
  }

  private async handleChatResponse(socket: AuthenticatedSocket, data: ChatResponseData, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);

      if (!await this.chatValidation.canTutorRespond(socket.userId, data.session_id)) {
        return this.sendError(ack, CHAT_ERRORS.NOT_AUTHORIZED);
      }

      data.accept 
        ? await this.handleChatAccept(socket, data)
        : await this.handleChatDecline(socket, data);

      this.sendSuccess(ack);

    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND') {
        return this.sendError(ack, CHAT_ERRORS.SESSION_NOT_FOUND);
      }
      this.handleError('Chat response', error, ack);
    }
  }

  private async handleStartChatSession(socket: AuthenticatedSocket, data: { session_id: string }, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);

      if (!await this.chatValidation.canAccessSession(socket.userId, data.session_id)) {
        return this.sendError(ack, CHAT_ERRORS.NOT_AUTHORIZED);
      }

      const session = await this.sessionManager.startChatSession(data.session_id, socket.userId);
      await this.joinChatRoom(socket, data.session_id);

      // Set both users as "in_session" for universal presence
      await this.presence.setUserStatus(socket.userId, 'in_session');
      
      console.log(`🚪 User ${socket.userId} joined chat: ${data.session_id}`);
      this.sendSuccess(ack);
    } catch (error) {
      this.handleError('Start chat session', error, ack);
    }
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: MessageData, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);

      // Rate limiting & validation
      if (!this.rateLimiter.allowForUser(socket.userId, 'send_message', RATE_LIMITS.MESSAGES)) {
        return this.sendError(ack, CHAT_ERRORS.RATE_LIMITED);
      }

      if (!this.isValidMessage(data.message)) {
        return this.sendError(ack, CHAT_ERRORS.INVALID_MESSAGE);
      }

      if (!await this.chatValidation.canAccessSession(socket.userId, data.chat_id)) {
        return this.sendError(ack, CHAT_ERRORS.NOT_AUTHORIZED);
      }

      // Update activity and send message
      await this.presence.updateUserActivity(socket.userId, socket.id);
      const messageData = await this.saveMessageToDatabase(data.chat_id, socket.userId, data.message.trim());
      
      this.io.to(`chat:${data.chat_id}`).emit('new_message', messageData);
      this.sendSuccess(ack, { message_id: messageData.message_id });

    } catch (error) {
      this.handleError('Send message', error, ack);
    }
  }

  // ============ UNIVERSAL PRESENCE HANDLER ============

  private async handleGetChatPresence(socket: AuthenticatedSocket, data: { chat_id: string }, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);

      if (!await this.chatValidation.canAccessSession(socket.userId, data.chat_id)) {
        return this.sendError(ack, CHAT_ERRORS.NOT_AUTHORIZED);
      }

      // Get both users in the chat session
      const sessionUsers = await this.getChatSessionUsers(data.chat_id);
      const userStatuses = await this.presence.getUserOnlineStatus(sessionUsers);

      this.sendSuccess(ack, { 
        chat_id: data.chat_id,
        users: userStatuses 
      });
    } catch (error) {
      this.handleError('Get chat presence', error, ack);
    }
  }

  // ============ SUPPORTING HANDLERS ============

  private async handleChatAccept(socket: AuthenticatedSocket, data: ChatResponseData) {
    const session = await this.sessionManager.acceptChatSession(data.session_id, socket.userId);
    await this.setupChatRoom(data.session_id, session.student_id, socket.userId);
    
    // Set both users as "in_session" for universal presence
    await this.presence.setUserStatus(socket.userId, 'in_session');
    await this.presence.setUserStatus(session.student_id, 'in_session');
    
    console.log(`✅ Chat accepted: Tutor ${socket.userId} → Student ${session.student_id}`);
  }

  private async handleChatDecline(socket: AuthenticatedSocket, data: ChatResponseData) {
    const session = await this.sessionManager.declineChatSession(
      data.session_id, 
      data.decline_reason || '', 
      socket.userId
    );

    this.io.to(`user:${session.student_id}`).emit('chat_request_declined', {
      session_id: data.session_id,
      tutor_id: socket.userId,
      tutor_name: session.tutor_name,
      decline_reason: data.decline_reason,
      declined_at: new Date().toISOString()
    });

    console.log(`❌ Chat declined: Tutor ${socket.userId} → Student ${session.student_id}`);
  }

  private async handleEndChatSession(socket: AuthenticatedSocket, data: { session_id: string }, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);
      const session = await this.sessionManager.endChatSession(data.session_id, socket.userId);
      
      // Reset both users from "in_session" back to "online"
      await this.presence.setUserStatus(session.student_id, 'online');
      if (session.tutor_id) {
        await this.presence.setUserStatus(session.tutor_id, 'online');
      }

      this.io.to(`chat:${data.session_id}`).emit('chat_session_ended', {
        session_id: data.session_id,
        ended_at: new Date().toISOString()
      });

      console.log(`🔚 Chat session ended: ${data.session_id}`);
      this.sendSuccess(ack);
    } catch (error) {
      this.handleError('End chat session', error, ack);
    }
  }

  private async handleGetPendingRequests(socket: AuthenticatedSocket, ack?: Ack) {
    try {
      this.ensureAuthenticated(socket);
      const requests = await this.sessionManager.getTutorPendingRequests(socket.userId);
      this.sendSuccess(ack, { requests });
    } catch (error) {
      this.handleError('Get pending requests', error, ack);
    }
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: { chat_id: string }) {
    this.ensureAuthenticated(socket);
    this.presence.updateUserActivity(socket.userId, socket.id).catch(console.error);
    
    socket.to(`chat:${data.chat_id}`).emit('user_typing', {
      user_id: socket.userId,
      username: socket.username,
      chat_id: data.chat_id
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: { chat_id: string }) {
    this.ensureAuthenticated(socket);
    socket.to(`chat:${data.chat_id}`).emit('user_stopped_typing', {
      user_id: socket.userId,
      chat_id: data.chat_id
    });
  }

  // ============ HELPER METHODS ============

  private async handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      await this.presence.userDisconnected(socket.userId, socket.id);
    }
  }

  private setupActivityTracking(socket: AuthenticatedSocket) {
    const activityEvents = ['typing_start', 'typing_stop', 'send_message', 'start_chat_session', 'heartbeat'];
    
    activityEvents.forEach(event => {
      socket.on(event, () => {
        this.presence.updateUserActivity(socket.userId, socket.id).catch(console.error);
      });
    });
  }

  private ensureAuthenticated(socket: AuthenticatedSocket): void {
    if (!socket.userId) throw new Error(CHAT_ERRORS.UNAUTHENTICATED);
  }

  private isValidMessage(message: string): boolean {
    const trimmed = message.trim();
    return trimmed.length > 0 && trimmed.length <= 2000;
  }

  private sendSuccess(ack: Ack | undefined, data: any = {}): void {
    ack?.({ ok: true, ...data });
  }

  private sendError(ack: Ack | undefined, error: string, message?: string): void {
    ack?.({ ok: false, error, message });
  }

  private handleError(context: string, error: any, ack?: Ack): void {
    console.error(`${context} error:`, error);
    this.sendError(ack, CHAT_ERRORS.SERVER_ERROR);
  }

  private notifyTutor(session: any, studentId: string) {
    this.io.to(`tutor:${session.tutor_id}`).emit('new_chat_request', {
      session_id: session.id,
      student_id: studentId,
      student_name: session.student_name,
      student_avatar: session.student_avatar,
      subject_name: session.subject_name,
      student_notes: session.student_notes,
      requested_at: session.requested_at,
      expiry_time: session.expiry_time
    });
  }

  private async joinChatRoom(socket: AuthenticatedSocket, sessionId: string) {
    socket.join(`chat:${sessionId}`);
    socket.to(`chat:${sessionId}`).emit('user_joined_chat', {
      user_id: socket.userId,
      session_id: sessionId,
      user_role: socket.userRole,
      username: socket.username
    });
  }

  private async setupChatRoom(sessionId: string, studentId: string, tutorId: string) {
    this.io.to(`user:${studentId}`).socketsJoin(`chat:${sessionId}`);
    this.io.to(`tutor:${tutorId}`).socketsJoin(`chat:${sessionId}`);
    
    this.io.to(`chat:${sessionId}`).emit('chat_session_ready', {
      session_id: sessionId,
      ready_at: new Date().toISOString()
    });

    console.log(`💬 Chat room created: ${sessionId} (Student: ${studentId}, Tutor: ${tutorId})`);
  }

  private async updateTutorAvailability(tutorId: string, available: boolean) {
    await executeQuery(
      'UPDATE Tutors SET is_available = @available WHERE tutor_id = @tutorId',
      { 
        tutorId: { value: tutorId },
        available: { value: available ? 1 : 0, type: sql.Bit }
      }
    );
  }

  private async saveMessageToDatabase(chatId: string, userId: string, message: string) {
    const result = await executeQuery<{ message_id: string; sent_at: Date }>(`
      INSERT INTO chat_messages (chat_session_id, sender_id, message, message_type_id, sent_at)
      OUTPUT INSERTED.message_id, INSERTED.sent_at
      VALUES (@chatId, @userId, @message, @messageTypeId, GETDATE())
    `, {
      chatId: { value: chatId },
      userId: { value: userId },
      message: { value: message },
      messageTypeId: { value: 1, type: sql.Int }
    });

    const dbMessage = result[0];
    
    return {
      message_id: dbMessage.message_id,
      chat_id: chatId,
      user_id: userId,
      message: message,
      timestamp: dbMessage.sent_at.toISOString(),
      sender_name: userId
    };
  }

  private async getChatSessionUsers(chatId: string): Promise<string[]> {
    const result = await executeQuery<{ student_id: string; tutor_id: string }>(`
      SELECT student_id, tutor_id 
      FROM chat_sessions 
      WHERE id = @chatId
    `, {
      chatId: { value: chatId }
    });

    if (result.length === 0) {
      throw new Error('Session not found');
    }

    const session = result[0];
    const users = [session.student_id];
    if (session.tutor_id) {
      users.push(session.tutor_id);
    }

    return users;
  }
}

export default LiveChatHandler;