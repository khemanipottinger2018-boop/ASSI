// app/tutors/components/tutors/ChatRequestModal.tsx
'use client';
import { useState } from 'react';
import { Tutor } from '../../types/tutor.types';
import { X, Clock, DollarSign, MessageCircle } from 'lucide-react';

interface ChatRequestModalProps {
  tutor: Tutor;
  subjectName: string;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  isSubmitting?: boolean;
}

export function ChatRequestModal({ 
  tutor, 
  subjectName, 
  onClose, 
  onConfirm,
  isSubmitting = false 
}: ChatRequestModalProps) {
  const [studentNotes, setStudentNotes] = useState('');

  const handleSubmit = () => {
    onConfirm(studentNotes || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-purple-500/30 max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Request Live Chat</h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tutor Info */}
        <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-xl">
          <img
            src={tutor.profile_pic}
            alt={tutor.name}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-white">{tutor.name}</h4>
            <p className="text-gray-400 text-sm">{subjectName} • {tutor.expertise_level}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {tutor.response_time}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign size={12} />
                ${tutor.hourly_rate}/hr
              </span>
            </div>
          </div>
        </div>

        {/* Session Info */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-300 text-sm">
            <MessageCircle size={16} />
            <span className="font-medium">Live 1:1 Chat Session</span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            Tutor has 30 minutes to accept your request. Session starts immediately when accepted.
          </p>
        </div>

        {/* Notes Input */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">
            What do you need help with? (Optional)
          </label>
          <textarea
            value={studentNotes}
            onChange={(e) => setStudentNotes(e.target.value)}
            placeholder="Example: 'Struggling with calculus limits and derivatives...'"
            className="w-full h-24 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
            disabled={isSubmitting}
          />
          <p className="text-gray-500 text-xs mt-1">
            Providing context helps the tutor prepare better
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}