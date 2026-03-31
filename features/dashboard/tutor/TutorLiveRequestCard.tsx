'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, ArrowRight, Clock } from 'lucide-react';

interface TutorLiveRequestCardProps {
  sessionId: string;
  subjectId?: string;
  arrivedAt: number;
  /** Called when the request ages out so the parent can remove it */
  onExpire: (sessionId: string) => void;
}

const REQUEST_TTL_SECONDS = 60;

export default function TutorLiveRequestCard({
  sessionId,
  subjectId,
  arrivedAt,
  onExpire,
}: TutorLiveRequestCardProps) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, REQUEST_TTL_SECONDS - Math.floor((Date.now() - arrivedAt) / 1000))
  );

  /* ─── Countdown + auto-expire ─────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onExpire(sessionId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [sessionId, onExpire]);

  const urgency = remaining <= 15; // pulse red when < 15s left

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="relative glass rounded-2xl p-4 overflow-hidden border border-emerald-500/20"
    >
      {/* Progress bar — drains left to right */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/30 w-full">
        <div
          className={`h-full transition-all duration-1000 linear ${urgency ? 'bg-red-400' : 'bg-emerald-400'}`}
          style={{ width: `${(remaining / REQUEST_TTL_SECONDS) * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Zap size={16} className={`${urgency ? 'text-red-400' : 'text-emerald-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white/85 text-sm font-medium">Student needs help</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
              Live
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {subjectId && (
              <span className="text-white/35 text-xs">{subjectId}</span>
            )}
            <span className={`flex items-center gap-1 text-xs ${urgency ? 'text-red-400' : 'text-white/30'}`}>
              <Clock size={10} />
              {remaining}s
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push(`/live-chat/${sessionId}`)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-600 font-semibold text-xs hover:bg-white/90 active:scale-95 transition shadow-md shadow-black/20 flex-shrink-0"
        >
          Join <ArrowRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}
