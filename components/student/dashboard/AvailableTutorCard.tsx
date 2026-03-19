'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';

// Matches SubjectSummary from lib/api/tutors — uses category not level
interface Subject {
  id:       string;
  name:     string;
  category: string | null;  // was level — backend returns category (CSEC | CAPE)
}

interface AvailableTutorCardProps {
  userId:          string;
  username:        string;
  // avatarUrl removed — backend does not return this field
  subjects:        Subject[];
  hourlyRate?:     number;
  isStudentTutor?: boolean;
}

export default function AvailableTutorCard({
  userId, username, subjects, hourlyRate, isStudentTutor,
}: AvailableTutorCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      onClick={() => router.push(`/u/${username}`)}
      className="glass rounded-2xl p-4 cursor-pointer hover:bg-white/8 transition space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl glass-soft flex items-center justify-center overflow-hidden">
              {/* No avatarUrl — always use initials */}
              <span className="text-white/50 text-sm font-semibold">
                {username[0]?.toUpperCase()}
              </span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black/20" />
          </div>
          <div>
            <p className="text-white/80 text-sm font-medium">{username}</p>
            {isStudentTutor && (
              <p className="text-emerald-400/60 text-[10px] mt-0.5">Peer tutor</p>
            )}
          </div>
        </div>
        {hourlyRate !== undefined && (
          <span className="text-white/35 text-xs flex-shrink-0">${hourlyRate}/hr</span>
        )}
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subjects.slice(0, 3).map((s) => (
            <span key={s.id} className={`
              px-2 py-0.5 rounded-full text-[10px] font-medium border
              ${s.category === 'CAPE'
                ? 'bg-purple-500/15 border-purple-500/20 text-purple-300'
                : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300'
              }
            `}>
              {s.name}
            </span>
          ))}
          {subjects.length > 3 && (
            <span className="text-white/25 text-[10px] self-center">+{subjects.length - 3}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}