'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Clock, Star } from 'lucide-react';

type SessionStatus =
  | 'scheduled'
  | 'active'
  | 'grace_period'
  | 'ended'
  | 'cancelled'
  | 'waiting'
  | 'paused'
  | 'completed'
  | 'confirmed'
  | 'pending'
  | 'in_progress'
  | 'host_left_grace'
  | 'matched'
  | 'instant_pending';

interface RecentSessionRowProps {
  sessionId:        string;
  subject:          string;
  partnerName:      string;
  scheduledAt:      string;
  durationMinutes?: number;
  status:           SessionStatus;
  rating?:          number | null;
}

const statusStyles: Record<SessionStatus, string> = {
  scheduled:       'text-emerald-400/70',
  active:          'text-emerald-400',
  in_progress:     'text-emerald-400',
  grace_period:    'text-yellow-400/70',
  host_left_grace: 'text-yellow-400/70',
  waiting:         'text-yellow-400/70',
  paused:          'text-orange-400/70',
  ended:           'text-white/30',
  completed:       'text-white/30',
  cancelled:       'text-red-400/50',
  confirmed:       'text-blue-400/70',
  pending:         'text-white/40',
  matched:         'text-emerald-400/70',
  instant_pending: 'text-white/40',
};

export default function RecentSessionRow({
  sessionId,
  subject,
  partnerName,
  scheduledAt,
  durationMinutes,
  status,
  rating,
}: RecentSessionRowProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/sessions/${sessionId}`)}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer hover:bg-white/8"
    >
      <div className="w-8 h-8 flex items-center justify-center">
        <BookOpen size={13} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{subject}</p>
        <p className="text-xs">
          {partnerName} · {new Date(scheduledAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs capitalize ${statusStyles[status]}`}>
          {status}
        </span>

        {rating != null ? (
          <div className="flex items-center gap-1">
            <Star size={10} />
            <span>{rating}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>{durationMinutes ?? '—'}m</span>
          </div>
        )}
      </div>
    </div>
  );
}