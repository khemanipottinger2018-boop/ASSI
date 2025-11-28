"use client";
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../AuthContext';

export interface ChatMessage {
  message_id: string;
  message: string;
  sent_at: Date;
  read_at: Date | null;
  sender_id: string;
  sender_name: string;
  sender_role: 'student' | 'tutor';
}

export interface ChatSession {
  session_id: string;
  status: 'requested' | 'accepted' | 'active' | 'ended' | 'cancelled' | 'declined';
  requested_at: Date;
  started_at: Date | null;
  ended_at: Date | null;
  student_notes?: string;
  decline_reason?: string;
  expiry_time: Date;
  
  // Student info (for tutor)
  student_id?: string;
  student_name?: string;
  
  // Tutor info (for student)  
  tutor_id?: string;
  tutor_name?: string;
  hourly_rate?: number;
  
  // Subject info
  subject_id: string;
  subject_name: string;
  
  // UI state
  unread_count: number;
}

export interface ChatRequest {
  session_id: string;
  student_id: string;
  subject_id: string;
  student_notes?: string;
  requested_at: Date;
  expiry_time: Date;
  expires_in_seconds: number;
  student_name: string;
  subject_name: string;
}

interface ChatContextType {
  // Current active chat
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  
  // Chat sessions list
  chatSessions: ChatSession[];
  
  // Chat requests (for tutors)
  pendingRequests: ChatRequest[];
  
  // Actions
  requestLiveChat: (tutorId: string, subjectId: string, notes?: string) => Promise<boolean>;
  respondToChatRequest: (sessionId: string, accept: boolean, declineReason?: string) => Promise<boolean>;
  sendMessage: (message: string) => void;
  startChatSession: (sessionId: string) => Promise<boolean>;
  markMessagesAsRead: (sessionId: string) => Promise<void>;
  joinChatSession: (sessionId: string) => void;
  leaveChatSession: () => void;
  
  // UI State
  isLoading: boolean;
  isConnected: boolean;
  isTyping: boolean;
  otherUserTyping: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ChatRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  const { socket, isConnected, emit, on, off } = useSocket();
  const { user } = useAuth();

  // Student: Request live chat with tutor
  const requestLiveChat = useCallback(async (tutorId: string, subjectId: string, notes?: string): Promise<boolean> => {
    if (!user || user.role !== 'student') return false;
    
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/chat/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          tutor_id: tutorId,
          subject_id: subjectId,
          student_notes: notes
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Socket event will update pending requests for tutor
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to request chat:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Tutor: Accept/Reject chat request
  const respondToChatRequest = useCallback(async (sessionId: string, accept: boolean, declineReason?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/chat/${sessionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          accept,
          decline_reason: declineReason
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Remove from pending requests
        setPendingRequests(prev => prev.filter(req => req.session_id !== sessionId));
        
        if (accept && user?.role === 'tutor') {
          // Tutor joins the accepted session
          joinChatSession(sessionId);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to respond to chat request:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Send message in active session
  const sendMessage = useCallback((message: string) => {
    if (!activeSession || !isConnected || !user) return;

    emit('send_chat_message', {
      session_id: activeSession.session_id,
      message,
      message_type_id: 1 // text
    });
  }, [activeSession, isConnected, user, emit]);

  // Start active chat session
  const startChatSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:3001/api/chat/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Failed to start chat session:', error);
      return false;
    }
  }, []);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (sessionId: string) => {
    try {
      await fetch(`http://localhost:3001/api/chat/sessions/${sessionId}/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      // Update local state
      setMessages(prev => prev.map(msg => ({ ...msg, read_at: msg.read_at || new Date() })));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, []);

  // Join existing chat session
  const joinChatSession = useCallback((sessionId: string) => {
    if (!isConnected) return;
    
    emit('join_chat_session', { session_id: sessionId });
    
    // Fetch session messages
    fetch(`http://localhost:3001/api/chat/sessions/${sessionId}/messages`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.messages || []);
        }
      })
      .catch(console.error);
  }, [isConnected, emit]);

  // Leave current session
  const leaveChatSession = useCallback(() => {
    if (activeSession && isConnected) {
      emit('leave_chat_session', { session_id: activeSession.session_id });
    }
    setActiveSession(null);
    setMessages([]);
  }, [activeSession, isConnected, emit]);

  // Load tutor's pending requests
  useEffect(() => {
    if (user?.role === 'tutor') {
      fetch('http://localhost:3001/api/chat/pending-requests')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setPendingRequests(data.requests || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Load user's chat sessions
  useEffect(() => {
    if (user) {
      fetch('http://localhost:3001/api/chat/sessions')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChatSessions(data.sessions || []);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Socket event listeners for LIVE CHAT
  useEffect(() => {
    if (!isConnected) return;

    const handleNewChatRequest = (request: ChatRequest) => {
      if (user?.role === 'tutor') {
        setPendingRequests(prev => [...prev, request]);
      }
    };

    const handleChatRequestAccepted = (session: ChatSession) => {
      setPendingRequests(prev => prev.filter(req => req.session_id !== session.session_id));
      setActiveSession(session);
      
      if (user?.role === 'student') {
        // Student joins their accepted session
        joinChatSession(session.session_id);
      }
    };

    const handleNewChatMessage = (message: ChatMessage) => {
      if (activeSession && message.sender_id !== user?.id) {
        setMessages(prev => [...prev, message]);
        
        // Auto-mark as read if we're in the session
        if (activeSession.session_id === message.sender_id) {
          markMessagesAsRead(activeSession.session_id);
        }
      }
    };

    const handleUserTyping = (data: { session_id: string; user_id: string }) => {
      if (data.session_id === activeSession?.session_id && data.user_id !== user?.id) {
        setOtherUserTyping(true);
      }
    };

    const handleUserStoppedTyping = (data: { session_id: string; user_id: string }) => {
      if (data.session_id === activeSession?.session_id && data.user_id !== user?.id) {
        setOtherUserTyping(false);
      }
    };

    // Register event listeners
    on('new_chat_request', handleNewChatRequest);
    on('chat_request_accepted', handleChatRequestAccepted);
    on('new_chat_message', handleNewChatMessage);
    on('user_typing', handleUserTyping);
    on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      off('new_chat_request');
      off('chat_request_accepted');
      off('new_chat_message');
      off('user_typing');
      off('user_stopped_typing');
    };
  }, [isConnected, activeSession, user, on, off, joinChatSession, markMessagesAsRead]);

  const value: ChatContextType = {
    activeSession,
    messages,
    chatSessions,
    pendingRequests,
    requestLiveChat,
    respondToChatRequest,
    sendMessage,
    startChatSession,
    markMessagesAsRead,
    joinChatSession,
    leaveChatSession,
    isLoading,
    isConnected,
    isTyping,
    otherUserTyping
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
