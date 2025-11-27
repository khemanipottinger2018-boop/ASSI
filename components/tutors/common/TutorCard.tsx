// app/tutors/components/tutors/TutorCard.tsx
'use client';
import { Tutor, isUserAvailable } from '../../types/tutor.types';
import { AvailabilityBadge } from './AvailabilityBadge';
import { Star, Clock, Users, Award, MessageCircle } from 'lucide-react';

interface TutorCardProps {
  tutor: Tutor;
  subjectName: string;
  onSelect: (tutor: Tutor) => void;
  isOnline: boolean;
}

export function TutorCard({ tutor, subjectName, onSelect, isOnline }: TutorCardProps) {
  // Use our enterprise availability check
  const isAvailableForChat = isUserAvailable(tutor.status);
  
  // Calculate button text based on status
  const getButtonText = () => {
    if (!isAvailableForChat) {
      switch (tutor.status) {
        case 'offline': return 'Offline';
        case 'dnd': return 'Do Not Disturb';
        default: return 'Unavailable';
      }
    }
    return 'Request Chat';
  };

  const getButtonTitle = () => {
    if (!isAvailableForChat) {
      switch (tutor.status) {
        case 'offline': return 'Tutor is currently offline';
        case 'dnd': return 'Tutor has Do Not Disturb enabled';
        default: return 'Tutor is not available for chats';
      }
    }
    return `Request chat session with ${tutor.name}`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={tutor.profile_pic}
            alt={tutor.name}
            className="w-12 h-12 rounded-full border-2 border-purple-400"
          />
          <div>
            <h3 className="font-semibold text-white text-lg">{tutor.name}</h3>
            <AvailabilityBadge status={tutor.status} />
          </div>
        </div>
        {tutor.is_verified && (
          <span title="Verified Tutor">
            <Award size={20} className="text-yellow-400" />
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div className="text-white" title={`Rating: ${tutor.rating}/5`}>
          <div className="flex items-center justify-center gap-1">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="text-sm font-semibold">{tutor.rating}</span>
          </div>
          <span className="text-xs text-gray-400">Rating</span>
        </div>
        <div className="text-white" title={`${tutor.total_sessions} total sessions`}>
          <div className="flex items-center justify-center gap-1">
            <Users size={14} className="text-blue-400" />
            <span className="text-sm font-semibold">{tutor.total_sessions}</span>
          </div>
          <span className="text-xs text-gray-400">Sessions</span>
        </div>
        <div className="text-white" title={`Average response time: ${tutor.response_time}`}>
          <div className="flex items-center justify-center gap-1">
            <Clock size={14} className="text-green-400" />
            <span className="text-sm font-semibold">{tutor.response_time}</span>
          </div>
          <span className="text-xs text-gray-400">Response</span>
        </div>
      </div>

      {/* Bio */}
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">
        {tutor.bio || `Expert ${subjectName} tutor with ${tutor.total_sessions}+ sessions`}
      </p>

      {/* Expertise */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tutor.subjects?.slice(0, 2).map((subject, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30"
            title={`${subject.subject_name} - ${subject.subject_level}`}
          >
            {subject.subject_level}
          </span>
        ))}
        {tutor.subjects && tutor.subjects.length > 2 && (
          <span 
            className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full"
            title={`${tutor.subjects.length - 2} more subjects`}
          >
            +{tutor.subjects.length - 2} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-white font-bold" title={`Hourly rate: $${tutor.hourly_rate}`}>
          ${tutor.hourly_rate}/hr
        </div>
        <button
          onClick={() => onSelect(tutor)}
          disabled={!isAvailableForChat}
          title={getButtonTitle()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isAvailableForChat
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-105'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          <MessageCircle size={16} />
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}