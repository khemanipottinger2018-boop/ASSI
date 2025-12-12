'use client';

import { motion } from 'framer-motion';
import TutorCard from './TutorCard';

interface TutorsGridProps {
  tutors: Array<{
    id: string;
    userId: string;
    name: string;
    hourlyRate: number;
    isAvailable: boolean;
    status: 'online' | 'idle' | 'busy' | 'offline';
    bio?: string;
    teachingPhilosophy?: string;
    subjects?: Array<{ id: string; name: string; level: string }>;
    avgRating?: number;
    reviewCount?: number;
  }>;
  loading: boolean;
  message?: string;
  onInstantChat: (tutor: any) => void;
  onBookSession: (tutor: any) => void;
  onViewDetails: (tutor: any) => void;
}

export default function TutorsGrid({
  tutors,
  loading,
  message,
  onInstantChat,
  onBookSession,
  onViewDetails
}: TutorsGridProps) {

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 animate-pulse"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-slate-700 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-24 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-16"></div>
              </div>
            </div>
            <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-10 bg-slate-700 rounded"></div>
              <div className="h-10 bg-slate-700 rounded"></div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Empty state
  if (tutors.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="text-slate-400">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <p className="text-xl mb-2">No tutors found</p>
          <p className="text-sm">Try selecting a different subject</p>
        </div>
      </motion.div>
    );
  }

  // Tutors grid
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tutors.map((tutor, index) => (
        <motion.div
          key={tutor.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <TutorCard
            tutor={tutor}
            onInstantChat={() => onInstantChat(tutor)}
            onBookSession={() => onBookSession(tutor)}
            onViewDetails={() => onViewDetails(tutor)}
          />
        </motion.div>
      ))}
    </div>
  );
}