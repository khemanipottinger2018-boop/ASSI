// app/dashboard/student/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Star, 
  MessageCircle, 
  Users, 
  TrendingUp,
  Mail
} from 'lucide-react';
import StudentMessages from '@/app/chat/components/StudentMessages';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile_completed: boolean;
}

interface Session {
  id: string;
  tutor_name: string;
  subject: string;
  date: string;
  duration: number;
  status: 'completed' | 'upcoming' | 'in-progress';
}

export default function StudentDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchRecentSessions();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/signin';
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          setUser(result.user);
        }
      } else {
        window.location.href = '/signin';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/signin';
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/booked-sessions/student', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRecentSessions(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const stats = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      label: 'Total Sessions',
      value: recentSessions.length,
      color: 'bg-blue-500'
    },
    {
      icon: <Clock className="h-6 w-6" />,
      label: 'Hours Learned',
      value: recentSessions.reduce((total, session) => total + session.duration, 0),
      color: 'bg-green-500'
    },
    {
      icon: <Star className="h-6 w-6" />,
      label: 'Average Rating',
      value: '4.8',
      color: 'bg-yellow-500'
    },
    {
      icon: <Users className="h-6 w-6" />,
      label: 'Tutors Connected',
      value: new Set(recentSessions.map(s => s.tutor_name)).size,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.username}!
              </h1>
              <p className="text-gray-600 mt-1">
                Continue your learning journey with ASSI
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/tutors/browse'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Find Tutors
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full text-white`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Sessions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{session.tutor_name}</p>
                    <p className="text-sm text-gray-600">{session.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{session.date}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                      session.status === 'completed' ? 'bg-green-100 text-green-800' :
                      session.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
              {recentSessions.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No sessions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start your first tutoring session!</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <StudentMessages />
          </div>
        </div>
      </div>
    </div>
  );
}
