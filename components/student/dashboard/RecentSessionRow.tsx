'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Star } from 'lucide-react';

interface RecentSessionRowProps {
  sessionId: string;
  subject: string;
  partnerName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  rating?: number | null;
}

const statusStyles: Record<string, string> = {
  completed: 'text-white/30',
  cancelled: 'text-red-400/50',
  scheduled: 'text-emerald-400/70',
  confirmed: 'text-emerald-400/70',
  active:    'text-emerald-400',
  pending:   'text-orange-400/70',
};

export default function RecentSessionRow({
  sessionId, subject, partnerName, scheduledAt,
  durationMinutes, status, rating,
}: RecentSessionRowProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/sessions/${sessionId}`)}
      className="flex items-center gap-3 glass-soft rounded-2xl px-4 py-3 cursor-pointer hover:bg-white/8 transition"
    >
      <div className="w-8 h-8 rounded-xl glass flex items-center justify-center flex-shrink-0">
        <BookOpen size={13} className="text-white/35" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-white/75 text-sm font-medium truncate">{subject}</p>
        <p className="text-white/35 text-xs mt-0.5">
          {partnerName} · {new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs capitalize ${statusStyles[status] ?? 'text-white/30'}`}>
          {status}
        </span>
        {rating != null ? (
          <div className="flex items-center gap-0.5">
            <Star size={10} className="text-yellow-400/60" />
            <span className="text-[10px] text-white/30">{rating}</span>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <Clock size={10} className="text-white/20" />
            <span className="text-[10px] text-white/20">{durationMinutes}m</span>
          </div>
        )}
      </div>
    </div>
  );
}