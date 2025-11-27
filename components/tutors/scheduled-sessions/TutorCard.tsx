"use client";

import { Star, GraduationCap, Crown, Bookmark } from 'lucide-react';

interface Tutor {
  tutor_id: string;
  user_id: string;
  hourly_rate: number;
  is_available: boolean;
  bio: string;
  teaching_philosophy?: string;
  preferred_teaching_times?: string;
  timezone?: string;
  is_student_tutor: boolean;
  service_tier?: string;
  username: string;
  email: string;
  subjects: Array<{
    subject_id: string;
    name: string;
    level: string;
  }>;
}

interface TutorCardProps {
  tutor: Tutor;
  viewMode: 'grid' | 'list';
  onBookSession: (tutor: Tutor) => void;
}

export default function TutorCard({ tutor, viewMode, onBookSession }: TutorCardProps) {
  const getExpertiseLevel = (tutor: Tutor) => {
    if (tutor.is_student_tutor) return 'Student Tutor';
    if (tutor.service_tier === 'premium') return 'Expert Tutor';
    return 'Professional Tutor';
  };

  const getLevelColor = (tutor: Tutor) => {
    if (tutor.is_student_tutor) return 'from-green-400 to-green-600';
    if (tutor.service_tier === 'premium') return 'from-purple-400 to-purple-600';
    return 'from-blue-400 to-blue-600';
  };

  const getLevelIcon = (tutor: Tutor) => {
    if (tutor.is_student_tutor) return <GraduationCap size={16} />;
    if (tutor.service_tier === 'premium') return <Crown size={16} />;
    return <Star size={16} />;
  };

  return (
    <div
      className={`bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group hover:transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
        viewMode === 'list' ? 'flex items-center p-6' : 'p-6'
      }`}
    >
      <div className={`${viewMode === 'list' ? 'flex items-center space-x-4 flex-1' : 'flex items-start justify-between mb-4'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 bg-gradient-to-br ${getLevelColor(tutor)} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
            {tutor.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-white/90">
              {tutor.username}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1 text-white/60">
                {getLevelIcon(tutor)}
                <span className="text-sm">{getExpertiseLevel(tutor)}</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${tutor.is_available ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            </div>
          </div>
        </div>
        {viewMode === 'grid' && (
          <div className="text-right">
            <div className="text-lg font-bold text-white">${tutor.hourly_rate}</div>
            <div className="text-white/60 text-sm">per hour</div>
          </div>
        )}
      </div>

      <p className={`text-white/70 leading-relaxed ${
        viewMode === 'list' 
          ? 'flex-1 mx-6 line-clamp-2' 
          : 'text-sm mb-4 line-clamp-3'
      }`}>
        {tutor.bio || 'Passionate educator ready to help you succeed...'}
      </p>

      <div className={viewMode === 'list' ? 'w-48' : 'mb-4'}>
        <div className="flex flex-wrap gap-2">
          {tutor.subjects.slice(0, viewMode === 'list' ? 2 : 4).map((subject) => (
            <span
              key={subject.subject_id}
              className="bg-white/10 text-white/80 px-3 py-1 rounded-full text-sm border border-white/10 shadow-sm"
            >
              {subject.name}
            </span>
          ))}
          {tutor.subjects.length > (viewMode === 'list' ? 2 : 4) && (
            <span className="bg-white/5 text-white/60 px-3 py-1 rounded-full text-sm">
              +{tutor.subjects.length - (viewMode === 'list' ? 2 : 4)}
            </span>
          )}
        </div>
      </div>

      <div className={viewMode === 'list' ? 'w-32' : ''}>
        <button
          onClick={() => onBookSession(tutor)}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2"
        >
          <Bookmark size={16} />
          <span>Book Session</span>
        </button>
        {viewMode === 'list' && (
          <div className="text-right mt-2">
            <div className="text-lg font-bold text-white">${tutor.hourly_rate}</div>
            <div className="text-white/60 text-sm">per hour</div>
          </div>
        )}
      </div>
    </div>
  );
}
