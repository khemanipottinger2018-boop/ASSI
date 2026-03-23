'use client';

import { useState } from 'react';
import { motion }   from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Zap, CalendarPlus } from 'lucide-react';
import BookingModal from '@/components/shared/booking/BookingModal';
import type { SubjectSummary } from '@/lib/api/tutors';

export interface AvailableTutorCardProps {
  userId:          string;
  tutorId:         string;
  username:        string;
  avatarUrl?:      string | null;
  subjects:        SubjectSummary[];
  hourlyRate?:     number;
  isStudentTutor?: boolean;
  isOnline?:       boolean;
}

export default function AvailableTutorCard({
  userId, tutorId, username, avatarUrl,
  subjects, hourlyRate, isStudentTutor, isOnline = false,
}: AvailableTutorCardProps) {
  const router = useRouter();
  const [modalOpen,   setModalOpen]   = useState(false);
  const [defaultMode, setDefaultMode] = useState<'instant' | 'scheduled'>('scheduled');

  function goToProfile(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/u/${username}`);
  }

  function openInstant(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isOnline) return;
    setDefaultMode('instant');
    setModalOpen(true);
  }

  function openBook(e: React.MouseEvent) {
    e.stopPropagation();
    setDefaultMode('scheduled');
    setModalOpen(true);
  }

  const capeSubjects    = subjects.filter(s => s.category === 'CAPE');
  const csecSubjects    = subjects.filter(s => s.category === 'CSEC');
  const displaySubjects = subjects.slice(0, 3);
  const overflow        = subjects.length - 3;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-2xl p-4 space-y-3.5 hover:bg-white/[0.06] transition-colors duration-200"
      >
        {/* ── Top row ── */}
        <div className="flex items-start justify-between gap-3">
          <button onClick={goToProfile} className="flex items-center gap-3 min-w-0 text-left">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl glass-soft flex items-center justify-center overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                  : <span className="text-white/60 text-sm font-semibold">{username[0]?.toUpperCase()}</span>
                }
              </div>
              <span className={`
                absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black/30
                ${isOnline ? 'bg-emerald-400' : 'bg-white/20'}
              `} />
            </div>
            <div className="min-w-0">
              <p className="text-white/85 text-sm font-medium truncate">{username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isStudentTutor && <span className="text-emerald-400/70 text-[10px]">Peer tutor</span>}
                {isStudentTutor && (capeSubjects.length > 0 || csecSubjects.length > 0) && (
                  <span className="text-white/15 text-[10px]">·</span>
                )}
                {capeSubjects.length > 0 && <span className="text-purple-300/60 text-[10px]">CAPE</span>}
                {capeSubjects.length > 0 && csecSubjects.length > 0 && (
                  <span className="text-white/15 text-[10px]">·</span>
                )}
                {csecSubjects.length > 0 && <span className="text-emerald-300/60 text-[10px]">CSEC</span>}
              </div>
            </div>
          </button>

          {hourlyRate !== undefined && (
            <span className={`text-xs flex-shrink-0 mt-0.5 ${hourlyRate === 0 ? 'text-emerald-400/60' : 'text-white/40'}`}>
              {hourlyRate === 0 ? 'Free' : `$${hourlyRate}/hr`}
            </span>
          )}
        </div>

        {/* Subject chips */}
        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displaySubjects.map(s => (
              <span key={s.id} className={`
                px-2 py-0.5 rounded-full text-[10px] font-medium border
                ${s.category === 'CAPE'
                  ? 'bg-purple-500/12 border-purple-500/20 text-purple-300/80'
                  : 'bg-emerald-500/12 border-emerald-500/20 text-emerald-300/80'
                }
              `}>
                {s.name}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-white/20 text-[10px] self-center">+{overflow} more</span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={openInstant}
            disabled={!isOnline}
            className={`
              flex-1 flex items-center justify-center gap-1.5
              py-2 rounded-xl text-xs font-medium border transition-all duration-200
              ${isOnline
                ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-white/4 border-white/8 text-white/20 cursor-not-allowed'
              }
            `}
          >
            <Zap size={11} className={isOnline ? 'text-emerald-400' : 'text-white/15'} />
            {isOnline ? 'Instant Chat' : 'Offline'}
          </button>

          <button
            onClick={openBook}
            className="
              flex-1 flex items-center justify-center gap-1.5
              py-2 rounded-xl text-xs font-medium border transition-all duration-200
              bg-white/8 border-white/12 text-white/70
              hover:bg-white/14 hover:border-white/22 hover:text-white/90
            "
          >
            <CalendarPlus size={11} />
            Book Session
          </button>
        </div>
      </motion.div>

      {/* Booking modal — mounted outside card so it's not clipped */}
      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tutorId={tutorId}
        username={username}
        avatarUrl={avatarUrl}
        hourlyRate={hourlyRate}
        subjects={subjects}
        isOnline={isOnline}
        onSuccess={(sessionId, mode) => {
          setModalOpen(false);
          if (mode === 'instant') router.push(`/session/${sessionId}`);
        }}
      />
    </>
  );
}