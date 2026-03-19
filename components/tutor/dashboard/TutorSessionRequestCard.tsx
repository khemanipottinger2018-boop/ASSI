'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User, Clock, BookOpen, ArrowRight } from 'lucide-react';

interface TutorSessionRequestCardProps {
  sessionId: string;
  studentName: string;
  studentAvatarUrl?: string | null;
  subject: string;
  scheduledAt: string;
  durationMinutes: number;
}

export default function TutorSessionRequestCard({
  sessionId, studentName, studentAvatarUrl, subject, scheduledAt, durationMinutes,
}: TutorSessionRequestCardProps) {
  const router = useRouter();

  const dateStr = new Date(scheduledAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const timeStr = new Date(scheduledAt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      onClick={() => router.push(`/sessions/${sessionId}`)}
      className="relative glass rounded-2xl p-4 cursor-pointer hover:bg-white/8 transition overflow-hidden group"
    >
      {/* Orange left accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-orange-400/60 group-hover:bg-orange-400/90 transition" />

      <div className="flex items-center gap-3 pl-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center flex-shrink-0 overflow-hidden">
          {studentAvatarUrl
            ? <img src={studentAvatarUrl} alt={studentName} className="w-full h-full object-cover" />
            : <User size={16} className="text-white/35" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white/85 text-sm font-medium truncate">{studentName}</p>
            <span className="flex-shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-400">
              Request
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1 text-white/30">
              <BookOpen size={10} />
              <span className="text-xs">{subject}</span>
            </div>
            <div className="flex items-center gap-1 text-white/30">
              <Clock size={10} />
              <span className="text-xs">{durationMinutes}m</span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-white/50 text-xs">{dateStr}</p>
          <p className="text-white/30 text-[10px] mt-0.5">{timeStr}</p>
        </div>

        <ArrowRight size={13} className="text-white/20 flex-shrink-0 ml-1" />
      </div>
    </motion.div>
  );
}