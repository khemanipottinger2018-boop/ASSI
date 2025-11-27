// components/ChatRequestView.tsx
'use client';

import { ChatRequest } from '../types/tutor.types';
import { useState } from 'react';

interface ChatRequestViewProps {
  requests: ChatRequest[];
  onAccept: (sessionId: string) => void;
  onDecline: (sessionId: string, reason?: string) => void;
}

export default function ChatRequestView({ requests, onAccept, onDecline }: ChatRequestViewProps) {
  const [declineReasons, setDeclineReasons] = useState<{ [key: string]: string }>({});
  const [showDeclineModal, setShowDeclineModal] = useState<string | null>(null);

  const handleDeclineClick = (sessionId: string) => {
    setShowDeclineModal(sessionId);
  };

  const handleConfirmDecline = (sessionId: string) => {
    onDecline(sessionId, declineReasons[sessionId] || 'No reason provided');
    setShowDeclineModal(null);
    setDeclineReasons(prev => ({ ...prev, [sessionId]: '' }));
  };

  const handleCancelDecline = (sessionId: string) => {
    setShowDeclineModal(null);
    setDeclineReasons(prev => ({ ...prev, [sessionId]: '' }));
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No pending chat requests</div>
        <p className="text-gray-400 mt-2">When students request to chat with you, they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request.session_id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {request.student_name}
                </h3>
                <span className="text-sm text-gray-500">{request.student_email}</span>
              </div>
              
              <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {request.subject_name} • {request.subject_level}
                </span>
              </div>

              {request.student_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{request.student_notes}</p>
                </div>
              )}

              <div className="text-sm text-gray-500">
                Requested: {new Date(request.requested_at).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                Expires: {new Date(request.expiry_time).toLocaleString()}
              </div>
            </div>

            <div className="flex space-x-3 ml-4">
              <button
                onClick={() => onAccept(request.session_id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Accept
              </button>
              
              <button
                onClick={() => handleDeclineClick(request.session_id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>

          {/* Decline Reason Modal */}
          {showDeclineModal === request.session_id && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                <h3 className="text-lg font-semibold mb-3">Decline Chat Request</h3>
                <p className="text-gray-600 mb-4">Please provide a reason for declining this chat request (optional):</p>
                
                <textarea
                  value={declineReasons[request.session_id] || ''}
                  onChange={(e) => setDeclineReasons(prev => ({
                    ...prev,
                    [request.session_id]: e.target.value
                  }))}
                  placeholder="Reason for declining..."
                  className="w-full p-3 border border-gray-300 rounded-lg mb-4"
                  rows={3}
                />
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleCancelDecline(request.session_id)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmDecline(request.session_id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirm Decline
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}