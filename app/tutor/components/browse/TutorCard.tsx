'use client';

import { motion } from 'framer-motion';
import { Star, Clock, Users, MessageCircle, Wifi, BookOpen, Calendar } from 'lucide-react';

interface TutorCardProps {
  tutor: {
    // From your /api/tutors endpoint response
    id: string;           // tutor.tutor_id (UUID)
    userId: string;       // tutor.user_id (UUID)
    name: string;         // Users.username
    hourlyRate: number;   // Tutors.hourly_rate
    isAvailable: boolean; // Tutors.is_available
    status: string;       // user_presence.status ('online', 'idle', 'busy', 'offline')
    bio?: string;         // Tutors.bio (tutor-specific bio)
    teachingPhilosophy?: string; // Tutors.teaching_philosophy
    
    // Optional fields you might want to fetch
    avgRating?: number;   // From TutorReviews
    reviewCount?: number; // From TutorReviews
    subjects?: Array<{    // From TutorSubjects join Subjects
      id: string;
      name: string;
      level: string;
    }>;
  };
  onInstantChat: () => void;
  onBookSession: () => void;
  onViewDetails: () => void;
}

export default function TutorCard({ 
  tutor, 
  onInstantChat, 
  onBookSession, 
  onViewDetails 
}: TutorCardProps) {
  
  // Status display logic
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'busy': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online Now';
      case 'idle': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  // Check if instant chat is available
  const isInstantChatAvailable = tutor.status === 'online' && tutor.isAvailable;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all"
    >
      {/* Header with Avatar and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              {tutor.name.charAt(0).toUpperCase()}
            </div>
            {/* Status indicator */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(tutor.status)} rounded-full border-2 border-slate-900`} />
          </div>
          
          {/* Name and Status */}
          <div>
            <h3 className="text-white font-semibold text-lg">{tutor.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 ${getStatusColor(tutor.status)} rounded-full`} />
              <span className="text-sm text-slate-300">{getStatusText(tutor.status)}</span>
            </div>
          </div>
        </div>

        {/* Rating (if available) */}
        {tutor.avgRating && (
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-full px-3 py-1">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="text-white font-medium">{tutor.avgRating.toFixed(1)}</span>
            {tutor.reviewCount && (
              <span className="text-xs text-slate-400">({tutor.reviewCount})</span>
            )}
          </div>
        )}
      </div>

      {/* Bio Preview */}
      {tutor.bio && (
        <p className="text-slate-300 text-sm line-clamp-2 mb-4">
          {tutor.bio}
        </p>
      )}

      {/* Subjects (if available) */}
      {tutor.subjects && tutor.subjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tutor.subjects.slice(0, 3).map((subject) => (
            <span
              key={subject.id}
              className="px-2 py-1 bg-slate-800/50 text-slate-300 text-xs rounded-full border border-slate-700"
            >
              {subject.name}
            </span>
          ))}
          {tutor.subjects.length > 3 && (
            <span className="text-xs text-slate-500">
              +{tutor.subjects.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Rate Display */}
      <div className="mb-4">
        <div className="text-right">
          <div className="text-xl font-bold text-white">${tutor.hourlyRate}/hr</div>
          <div className="text-xs text-slate-400">Rate</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Instant Chat Button (only if online & available) */}
        <button
          onClick={onInstantChat}
          disabled={!isInstantChatAvailable}
          className={`w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            isInstantChatAvailable
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 cursor-pointer'
              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          <MessageCircle size={16} />
          <span>Chat Now</span>
        </button>

        {/* Book Session Button (always available) */}
        <button
          onClick={onBookSession}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-700 to-teal-700 rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2"
        >
          <Calendar size={16} />
          <span>Book Session</span>
        </button>

        {/* View Details Button */}
        <button
          onClick={onViewDetails}
          className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 flex items-center justify-center gap-2"
        >
          <Users size={16} />
          <span>View Profile</span>
        </button>
      </div>
    </motion.div>
  );
}