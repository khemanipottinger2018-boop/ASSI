'use client';

// components/shared/ui/PublicProfileCard.tsx
// Public-facing tutor profile card — visible to logged-out users too.
// Presence is fetched live via GET /api/presence/:userId on mount,
// replacing the stale profile.tutor?.isAvailable REST snapshot.

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { motion }              from 'framer-motion';
import {
  Star, BookOpen, DollarSign,
  MessageCircle, Calendar,
} from 'lucide-react';
import type { UserProfileView } from '@/features/types/profile.view';
import { presenceApi }          from '@/lib/api/presence';

const fade = (delay = 0) => ({
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] as const },
});

export default function PublicProfileCard({ profile }: { profile: UserProfileView }) {
  const router   = useRouter();
  const isTutor  = profile.role === 'tutor' || profile.role === 'tutor_applicant';
  const bio      = profile.tutorBio ?? profile.tutor?.bio ?? null;
  const rate     = profile.hourlyRate ?? profile.tutor?.hourlyRate ?? null;
  const subjects = profile.subjects ?? [];

  // Live presence — fetched from server, not the stale profile snapshot.
  // Falls back to profile.tutor?.isAvailable until the fetch resolves.
  const [isOnline, setIsOnline] = useState<boolean>(
    profile.tutor?.isAvailable ?? false
  );

  useEffect(() => {
    if (!isTutor || !profile.id) return;
    let cancelled = false;

    presenceApi.getUser(profile.id)
      .then(data => {
        if (!cancelled && data.success) {
          setIsOnline(data.presence.online && data.presence.intent === 'available');
        }
      })
      .catch(() => {
        // Non-fatal — stale snapshot from profile is already showing
      });

    return () => { cancelled = true; };
  }, [profile.id, isTutor]);

  return (
    <div className="space-y-4">

      {/* ── Hero card ── */}
      <motion.div {...fade(0)} className="panel rounded-3xl overflow-hidden">
        {/* Role accent bar */}
        <div className={`h-1 w-full ${
          isTutor
            ? 'bg-gradient-to-r from-teal-500/50 via-emerald-400 to-teal-500/50'
            : 'bg-gradient-to-r from-orange-500/50 via-orange-400 to-orange-500/50'
        }`} />

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl glass-soft flex items-center justify-center text-white/60 font-bold text-3xl">
                {profile.username[0].toUpperCase()}
              </div>
              {isTutor && (
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black/30 transition-colors ${
                  isOnline ? 'bg-emerald-500' : 'bg-white/20'
                }`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-white font-semibold text-2xl tracking-tight leading-none">
                  {profile.username}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${
                  isTutor
                    ? 'glass-soft text-teal-400 border-teal-500/20'
                    : 'glass-soft text-orange-400 border-orange-500/20'
                }`}>
                  {isTutor ? 'Tutor' : 'Student'}
                </span>
              </div>

              {isTutor && (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`text-xs font-medium ${isOnline ? 'text-emerald-400' : 'text-white/25'}`}>
                    {isOnline ? 'Available now' : 'Currently offline'}
                  </span>
                </div>
              )}

              {isTutor && rate != null && (
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-white/45 text-xs">
                    <DollarSign size={12} className="text-emerald-400/70" />
                    <span className="text-emerald-400 font-semibold">${rate}</span>
                    <span>/hr</span>
                  </div>
                  {subjects.length > 0 && (
                    <div className="flex items-center gap-1.5 text-white/30 text-xs">
                      <BookOpen size={11} />
                      {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-white/25 text-xs">
                    <Star size={11} className="text-yellow-400/40" />
                    <span className="text-yellow-400/50 text-[11px]">—</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {bio && (
            <p className="mt-5 text-white/55 text-sm leading-relaxed border-t border-white/6 pt-5">
              {bio}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Subjects ── */}
      {isTutor && subjects.length > 0 && (
        <motion.div {...fade(0.07)} className="panel rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={13} className="text-white/30" />
            <span className="text-white/40 text-xs font-medium uppercase tracking-widest">
              Subjects taught
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s.id} className={`
                px-2.5 py-1 rounded-full text-xs font-medium border
                ${s.category === 'CAPE'
                  ? 'bg-purple-500/15 border-purple-500/25 text-purple-300'
                  : 'bg-teal-500/15 border-teal-500/25 text-teal-300'
                }
              `}>
                {s.name}
                {s.category && (
                  <span className="ml-1.5 opacity-40 text-[10px]">{s.category}</span>
                )}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── CTA ── */}
      {isTutor && (
        <motion.div {...fade(0.12)} className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push(`/browse?tutor=${profile.username}`)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 hover:scale-[1.01] active:scale-[0.99] transition shadow-lg shadow-black/20"
          >
            <Calendar size={15} />
            Book a session
          </button>
          <button
            onClick={() => router.push(`/live-chat?tutor=${profile.username}`)}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl glass border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium text-sm transition"
          >
            <MessageCircle size={15} />
            Send message
          </button>
        </motion.div>
      )}

      {/* ── Reviews placeholder ── */}
      {isTutor && (
        <motion.div {...fade(0.16)} className="glass-soft rounded-3xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Star size={13} className="text-yellow-400/40" />
            <span className="text-white/25 text-xs font-medium uppercase tracking-widest">
              Reviews
            </span>
          </div>
          <p className="text-white/20 text-xs mt-2">No reviews yet.</p>
        </motion.div>
      )}
    </div>
  );
}