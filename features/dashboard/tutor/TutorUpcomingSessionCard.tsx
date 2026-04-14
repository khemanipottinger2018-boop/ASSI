'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User, Clock, Video } from 'lucide-react';
import { listItemVariants, listTransition } from '@/lib/motion';

interface TutorUpcomingSessionCardProps {
  sessionId: string;
  studentName: string;
  studentAvatarUrl?: string | null;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'scheduled' | 'confirmed';
}

export default function TutorUpcomingSessionCard({
  sessionId, studentName, studentAvatarUrl, subject,
  scheduledAt, durationMinutes, status,
}: TutorUpcomingSessionCardProps) {
  const router = useRouter();

  const now       = Date.now();
  const sessionMs = new Date(scheduledAt).getTime();
  const diffMins  = Math.round((sessionMs - now) / 60000);
  const isIminent = diffMins <= 30 && diffMins > 0;

  const dateLabel = diffMins < 0
    ? 'Starting now'
    : diffMins < 60
    ? `In ${diffMins}m`
    : diffMins < 1440
    ? `In ${Math.round(diffMins / 60)}h`
    : new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <motion.div
      variants={listItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={listTransition(0)}
      onClick={() => router.push(`/sessions/${sessionId}`)}
      className={`
        glass-soft rounded-2xl px-4 py-3.5 cursor-pointer hover:bg-white/8 transition
        flex items-center gap-3
        ${isIminent ? 'border border-emerald-500/20 bg-emerald-500/5' : ''}
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-xl glass flex items-center justify-center overflow-hidden">
          {studentAvatarUrl
            ? <img src={studentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
            : <User size={14} className="text-white/60" />
          }
        </div>
        {isIminent && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black/20 animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{subject}</p>
        <p className="text-white/65 text-xs mt-0.5">with {studentName}</p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs font-medium ${isIminent ? 'text-emerald-400' : 'text-white/70'}`}>
          {dateLabel}
        </span>
        <div className="flex items-center gap-1 text-white/50">
          <Clock size={10} />
          <span className="text-[10px]">{durationMinutes}m</span>
        </div>
      </div>
    </motion.div>
  );
}