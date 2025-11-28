'use client';

import { useState } from 'react';
import { useChat } from '../../../contexts/chat/ChatContext';

interface Tutor {
  tutor_id: string;
  user_id: string;
  name: string;
  hourly_rate: number;
  is_available: boolean;
  subjects: string[];
  response_time: string;
  rating: number;
}

interface LiveChatRequestProps {
  tutor: Tutor;
  subject: string;
  onClose: () => void;
}

export default function LiveChatRequest({ tutor, subject, onClose }: LiveChatRequestProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { requestLiveChat } = useChat();

  const handleSubmit = async () => {
    if (!notes.trim()) {
      alert('Please add a message about what you need help with');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await requestLiveChat(tutor.tutor_id, subject, notes);
      if (success) {
        alert('Chat request sent! The tutor will respond shortly.');
        onClose();
      } else {
        alert('Failed to send chat request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending chat request:', error);
      alert('Error sending chat request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">Request Live Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {tutor.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{tutor.name}</h4>
              <p className="text-sm text-gray-600">{subject} • ${tutor.hourly_rate}/hr</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What do you need help with?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you're struggling with or the specific topic you need help on..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              'Request Chat'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
