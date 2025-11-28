'use client';

import { useState, useEffect } from 'react';
import { useChat } from '../../../contexts/chat/ChatContext';

interface ChatRequest {
  session_id: string;
  student_id: string;
  subject_id: string;
  student_notes?: string;
  requested_at: string;
  expiry_time: string;
  expires_in_seconds: number;
  student_name: string;
  subject_name: string;
}

export default function ChatRequestNotification() {
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [visible, setVisible] = useState(false);
  const { pendingRequests, acceptChatRequest, rejectChatRequest } = useChat();

  // Show notification when new requests arrive
  useEffect(() => {
    if (pendingRequests.length > 0) {
      setRequests(pendingRequests);
      setVisible(true);
    }
  }, [pendingRequests]);

  const handleAccept = async (requestId: string) => {
    const success = await acceptChatRequest(requestId);
    if (success) {
      setRequests(prev => prev.filter(req => req.session_id !== requestId));
      if (requests.length === 1) {
        setVisible(false);
      }
    }
  };

  const handleReject = async (requestId: string) => {
    const success = await rejectChatRequest(requestId, 'Not available');
    if (success) {
      setRequests(prev => prev.filter(req => req.session_id !== requestId));
      if (requests.length === 1) {
        setVisible(false);
      }
    }
  };

  if (!visible || requests.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {requests.map((request) => (
        <div
          key={request.session_id}
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm animate-in slide-in-from-right duration-300"
        >
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {request.student_name.charAt(0)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm">
                {request.student_name}
              </h4>
              <p className="text-xs text-gray-600 mb-1">
                Needs help with {request.subject_name}
              </p>
              
              {request.student_notes && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  "{request.student_notes}"
                </p>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAccept(request.session_id)}
                  className="flex-1 bg-green-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(request.session_id)}
                  className="flex-1 bg-gray-300 text-gray-700 text-xs py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Decline
                </button>
              </div>
              
              <div className="text-xs text-gray-400 mt-2">
                Expires in {Math.floor(request.expires_in_seconds / 60)}min
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
