import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardData {
  profile: any;
  studentAnalytics: {
    onlineStudents: number;
    newStudentsThisWeek: number;
    weeklyTrend: number;
  };
  performanceMetrics: {
    completed_sessions: number;
    upcoming_sessions: number;
    avg_earnings: number;
    total_earnings: number;
    student_satisfaction: number;
    response_rate: number;
  };
  upcomingSessions: any[];
  quickStats: {
    total_sessions: number;
    completed_count: number;
    scheduled_count: number;
    pending_count: number;
    cancelled_count: number;
  };
  notifications: number;
  tutorRanking: {
    rating: number;
    totalReviews: number;
    rank: string;
    subjectRank: number | null;
    primarySubject: string;
    avgResponseTime: number;
  };
  realTime: {
    lastUpdated: string;
    tutorStatus: string;
    lastSeen: string;
  };
}

interface UseTutorDashboardReturn {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  startSession: (sessionId: string) => Promise<boolean>;
  completeSession: (sessionId: string, notes?: string) => Promise<boolean>;
  cancelSession: (sessionId: string, reason: string) => Promise<boolean>;
  sendMessageToStudent: (studentId: string, message: string) => Promise<boolean>;
}

// Constants
const API_BASE = 'http://localhost:3001/api';
const REFETCH_INTERVAL = 30000;
const CACHE_DURATION = 15000; // 15 seconds cache

export function useTutorDashboard(): UseTutorDashboardReturn {
  const [state, setState] = useState<{
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const router = useRouter();
  const lastFetchTime = useRef(0);
  const isFetching = useRef(false);

  // Optimized API call with timeout and retry
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/signin');
      throw new Error('No authentication token');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }, [router]);

  // Optimized dashboard fetcher with cache control
  const fetchDashboardData = useCallback(async (force: boolean = false) => {
    if (isFetching.current) return;

    const now = Date.now();
    if (!force && state.data && (now - lastFetchTime.current < CACHE_DURATION)) {
      return; // Use cached data
    }

    try {
      isFetching.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await apiCall('/tutors/dashboard/overview');
      
      if (result.success) {
        lastFetchTime.current = now;
        setState(prev => ({ 
          ...prev, 
          data: result.data, 
          loading: false 
        }));
      } else {
        throw new Error(result.error || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Failed to load dashboard', 
        loading: false 
      }));
    } finally {
      isFetching.current = false;
    }
  }, [apiCall, state.data]);

  // Optimized session operations with optimistic updates
  const startSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      // Optimistic update
      setState(prev => prev.data ? {
        ...prev,
        data: {
          ...prev.data,
          upcomingSessions: prev.data.upcomingSessions.map(session => 
            session.session_id === sessionId 
              ? { ...session, status: 'in-progress' }
              : session
          )
        }
      } : prev);

      const result = await apiCall(`/tutors/sessions/${sessionId}/start`, { 
        method: 'POST' 
      });
      
      if (!result.success) {
        // Revert optimistic update on failure
        fetchDashboardData(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      fetchDashboardData(true); // Revert on error
      return false;
    }
  }, [apiCall, fetchDashboardData]);

  const completeSession = useCallback(async (sessionId: string, notes: string = ''): Promise<boolean> => {
    try {
      // Optimistic update
      setState(prev => prev.data ? {
        ...prev,
        data: {
          ...prev.data,
          upcomingSessions: prev.data.upcomingSessions.filter(session => 
            session.session_id !== sessionId
          ),
          performanceMetrics: {
            ...prev.data.performanceMetrics,
            completed_sessions: prev.data.performanceMetrics.completed_sessions + 1,
            upcoming_sessions: Math.max(0, prev.data.performanceMetrics.upcoming_sessions - 1)
          }
        }
      } : prev);

      const result = await apiCall(`/tutors/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });

      return result.success;
    } catch (error) {
      console.error('Error completing session:', error);
      fetchDashboardData(true); // Revert on error
      return false;
    }
  }, [apiCall, fetchDashboardData]);

  const cancelSession = useCallback(async (sessionId: string, reason: string): Promise<boolean> => {
    try {
      // Optimistic update
      setState(prev => prev.data ? {
        ...prev,
        data: {
          ...prev.data,
          upcomingSessions: prev.data.upcomingSessions.filter(session => 
            session.session_id !== sessionId
          ),
          performanceMetrics: {
            ...prev.data.performanceMetrics,
            upcoming_sessions: Math.max(0, prev.data.performanceMetrics.upcoming_sessions - 1)
          }
        }
      } : prev);

      const result = await apiCall(`/tutors/sessions/${sessionId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });

      return result.success;
    } catch (error) {
      console.error('Error cancelling session:', error);
      fetchDashboardData(true);
      return false;
    }
  }, [apiCall, fetchDashboardData]);

  // Message and notification functions
  const sendMessageToStudent = useCallback(async (studentId: string, message: string): Promise<boolean> => {
    try {
      const result = await apiCall('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ recipient_id: studentId, message }),
      });
      return result.success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [apiCall]);

  const markNotificationAsRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      // Optimistic update
      setState(prev => prev.data ? {
        ...prev,
        data: {
          ...prev.data,
          notifications: Math.max(0, prev.data.notifications - 1)
        }
      } : prev);

      await apiCall(`/notifications/${notificationId}/read`, { method: 'POST' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      fetchDashboardData(true);
    }
  }, [apiCall, fetchDashboardData]);

  // Effects with cleanup
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
    }, REFETCH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // WebSocket integration for real-time updates (commented out for now)
  /*
  useEffect(() => {
    const socket = socketService.connect();
    
    const handleSessionUpdate = (data: any) => {
      fetchDashboardData(true);
    };
    
    socket.on('session_updated', handleSessionUpdate);
    socket.on('new_booking', handleSessionUpdate);
    socket.on('notification', handleSessionUpdate);
    
    return () => {
      socket.off('session_updated', handleSessionUpdate);
      socket.off('new_booking', handleSessionUpdate);
      socket.off('notification', handleSessionUpdate);
      socket.disconnect();
    };
  }, [fetchDashboardData]);
  */

  return {
    dashboardData: state.data,
    loading: state.loading,
    error: state.error,
    refetch: (force = false) => fetchDashboardData(force),
    markNotificationAsRead,
    startSession,
    completeSession,
    cancelSession,
    sendMessageToStudent,
  };
}