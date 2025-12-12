'use client';

import { useState, useEffect } from 'react';
import { useChat } from '../../../../contexts/chat/ChatContext';
import LiveChatSession from '../../../shared/components/live-chat/LiveChatSession';
import ChatRequestNotification from '../../components/live-chat/ChatRequestNotification';

export default function TutorLiveChatPage() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const { chatSessions, pendingRequests, joinChatSession, leaveChatSession } = useChat();

  // Auto-join the first active session if available
  useEffect(() => {
    const firstActiveSession = chatSessions.find(session => 
      session.status === 'active' || session.status === 'accepted'
    );
    
    if (firstActiveSession && !activeSession) {
      setActiveSession(firstActiveSession);
      joinChatSession(firstActiveSession.session_id);
    }
  }, [chatSessions, joinChatSession, activeSession]);

  const handleJoinSession = (session: any) => {
    setActiveSession(session);
    joinChatSession(session.session_id);
  };

  const handleEndSession = () => {
    if (activeSession) {
      leaveChatSession();
      setActiveSession(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Live Chat Sessions</h1>
          <p className="text-white/60">
            Connect with students in real-time for instant tutoring sessions
          </p>
        </div>

        {/* Chat Request Notifications */}
        <ChatRequestNotification />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Chat Session */}
          <div className="lg:col-span-2">
            {activeSession ? (
              <LiveChatSession
                sessionId={activeSession.session_id}
                otherUser={{
                  id: activeSession.student_id,
                  name: activeSession.student_name,
                  role: 'student'
                }}
                onEndSession={handleEndSession}
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 text-center">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-bold text-white mb-2">No Active Session</h3>
                <p className="text-white/60 mb-4">
                  When a student requests a chat, you'll see it here.
                </p>
                <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-200 px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Ready to accept requests</span>
                </div>
              </div>
            )}
          </div>

          {/* Session List */}
          <div className="space-y-6">
            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-orange-500/20 backdrop-blur-md rounded-2xl border border-orange-500/30 p-6">
                <h3 className="font-bold text-white mb-3 flex items-center">
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></span>
                  Pending Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.session_id}
                      className="bg-white/10 rounded-lg p-3 border border-white/20"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {request.student_name?.charAt(0)}
                        </div>
                        <span className="text-white text-sm font-medium">
                          {request.student_name}
                        </span>
                      </div>
                      <p className="text-white/70 text-xs mb-2">
                        {request.subject_name}
                      </p>
                      <button
                        onClick={() => handleJoinSession({
                          session_id: request.session_id,
                          student_id: request.student_id,
                          student_name: request.student_name
                        })}
                        className="w-full bg-green-600 text-white text-xs py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Accept & Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Sessions */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h3 className="font-bold text-white mb-3">Active Sessions</h3>
              {chatSessions.filter(session => 
                session.status === 'active' || session.status === 'accepted'
              ).length === 0 ? (
                <div className="text-center py-4 text-white/50 text-sm">
                  No active sessions
                </div>
              ) : (
                <div className="space-y-3">
                  {chatSessions
                    .filter(session => session.status === 'active' || session.status === 'accepted')
                    .map((session) => (
                      <div
                        key={session.session_id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          activeSession?.session_id === session.session_id
                            ? 'bg-white/20 border border-white/40'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                        }`}
                        onClick={() => handleJoinSession(session)}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {session.student_name?.charAt(0)}
                          </div>
                          <span className="text-white text-sm font-medium">
                            {session.student_name}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">{session.subject_name}</span>
                          <span className={`px-2 py-1 rounded ${
                            session.status === 'active' 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h3 className="font-bold text-white mb-3">Chat Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-white font-bold text-xl">{pendingRequests.length}</div>
                  <div className="text-white/60 text-xs">Pending</div>
                </div>
                <div>
                  <div className="text-white font-bold text-xl">
                    {chatSessions.filter(s => s.status === 'active').length}
                  </div>
                  <div className="text-white/60 text-xs">Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
