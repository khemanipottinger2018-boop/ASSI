'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Radio, Inbox } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { broadcastApi } from '@/features/broadcasts/broadcastApi';
import type { SessionBroadcast } from '@/features/broadcasts/broadcastApi';
import BroadcastCard from '@/features/broadcasts/BroadcastCard';
import { listItemVariants, listTransition } from '@/lib/motion';

export default function BroadcastsPage() {
  const { user, isStudent, isTutor } = useAuth();
  const router = useRouter();

  const [broadcasts, setBroadcasts] = useState<SessionBroadcast[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!user) return;
    if (isTutor) { router.push('/dashboard/tutor'); return; }

    broadcastApi.getMyBroadcasts()
      .then(d => { if (d.success) setBroadcasts(d.broadcasts ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isTutor, router]);

  if (!isStudent && !loading) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <motion.div
        variants={listItemVariants} initial="initial" animate="animate"
        transition={listTransition(0)}
      >
        <div className="flex items-center gap-3 mb-1">
          <Radio size={18} className="text-orange-400" />
          <h1 className="text-white font-semibold text-xl tracking-tight">Broadcasts</h1>
        </div>
        <p className="text-white/45 text-sm">
          Notes and announcements from your live sessions.
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass-soft rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && broadcasts.length === 0 && (
        <motion.div
          variants={listItemVariants} initial="initial" animate="animate"
          transition={listTransition(1)}
          className="glass-soft rounded-2xl px-6 py-10 text-center"
        >
          <Inbox size={28} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/50 text-sm font-medium">No broadcasts yet</p>
          <p className="text-white/30 text-xs mt-1">
            Broadcasts from your live sessions will appear here.
          </p>
        </motion.div>
      )}

      {/* Broadcast list */}
      {!loading && broadcasts.map((b, i) => (
        <BroadcastCard key={b.id} broadcast={b} index={i} />
      ))}
    </div>
  );
}
