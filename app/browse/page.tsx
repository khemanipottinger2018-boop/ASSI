'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react';
import AvailableTutorCard from '@/components/student/dashboard/AvailableTutorCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type Tutor = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  hourlyRate: number;
  isStudentTutor: boolean;
  subjects: { id: string; name: string; level: string }[];
};

type Filter = 'all' | 'available' | 'CAPE' | 'CSEC';

export default function BrowsePage() {
  const [tutors,   setTutors]   = useState<Tutor[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [filter,   setFilter]   = useState<Filter>('all');

  useEffect(() => {
    fetch(`${API_URL}/api/tutors/available`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.success) setTutors(d.tutors ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = tutors.filter((t) => {
    const matchesQuery =
      !query ||
      t.username.toLowerCase().includes(query.toLowerCase()) ||
      t.subjects.some((s) => s.name.toLowerCase().includes(query.toLowerCase()));

    const matchesFilter =
      filter === 'all' ||
      (filter === 'available') || // all from API are available
      t.subjects.some((s) => s.level === filter);

    return matchesQuery && matchesFilter;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-white font-semibold text-xl tracking-tight">Browse Tutors</h1>
        <p className="text-white/40 text-sm mt-1">
          {loading ? 'Finding available tutors…' : `${tutors.length} tutor${tutors.length !== 1 ? 's' : ''} available`}
        </p>
      </motion.div>

      {/* ── Search + filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="space-y-3"
      >
        {/* Search bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full glass rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/25 transition"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-white/30 flex-shrink-0" />
          {(['all', 'CAPE', 'CSEC'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium border transition capitalize
                ${filter === f
                  ? 'bg-white/15 border-white/25 text-white'
                  : 'glass-soft border-transparent text-white/40 hover:text-white/70'
                }
              `}
            >
              {f === 'all' ? 'All levels' : f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Results ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl px-4 py-12 text-center"
        >
          <p className="text-white/30 text-sm">
            {query ? `No tutors match "${query}"` : 'No tutors available right now'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tutor, i) => (
            <motion.div
              key={tutor.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <AvailableTutorCard
                userId={tutor.userId}
                username={tutor.username}
                avatarUrl={tutor.avatarUrl}
                subjects={tutor.subjects}
                hourlyRate={tutor.hourlyRate}
                isStudentTutor={tutor.isStudentTutor}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
