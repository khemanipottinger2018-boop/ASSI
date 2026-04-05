'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Loader2, X, ChevronDown } from 'lucide-react';
import AvailableTutorCard from '@/features/browse/AvailableTutorCard';

import { tutorsApi }   from '@/lib/api';
import { useCurrency } from '@/features/platform';
import type { TutorSummary, SubjectSummary } from '@/lib/api/tutors';

/* ── Types ── */
type LevelFilter = 'all' | 'CAPE' | 'CSEC';
type AvailFilter = 'all' | 'online';
type SortOption  = 'sessions' | 'rate_asc' | 'rate_desc';

interface ActiveFilters {
  query:     string;
  level:     LevelFilter;
  avail:     AvailFilter;
  subjectId: string;
  sort:      SortOption;
  minRate:   string;
  maxRate:   string;
}

const DEFAULT_FILTERS: ActiveFilters = {
  query: '', level: 'all', avail: 'all',
  subjectId: '', sort: 'sessions', minRate: '', maxRate: '',
};

function countActiveFilters(f: ActiveFilters) {
  let n = 0;
  if (f.level     !== 'all') n++;
  if (f.avail     !== 'all') n++;
  if (f.subjectId !== '')    n++;
  if (f.minRate   !== '')    n++;
  if (f.maxRate   !== '')    n++;
  return n;
}

export default function BrowsePage() {
  const { format, symbol, loading: currencyLoading } = useCurrency();

  const [tutors,      setTutors]      = useState<TutorSummary[]>([]);
  const [onlineIds,   setOnlineIds]   = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters,     setFilters]     = useState<ActiveFilters>(DEFAULT_FILTERS);

  const refreshOnlineIds = useCallback(() => {
    tutorsApi.getAvailable()
      .then(d => {
        if (d.success) setOnlineIds(new Set((d.tutors ?? []).map(t => t.userId)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    tutorsApi.browse()
      .then(d => { if (d.success) setTutors(d.tutors ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));

    refreshOnlineIds();
  }, [refreshOnlineIds]);

  // Re-fetch online status when the user returns to the tab so presence dots
  // stay current without a full page reload.
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) refreshOnlineIds();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshOnlineIds]);

  const allSubjects = useMemo<SubjectSummary[]>(() => {
    const seen = new Map<string, SubjectSummary>();
    tutors.forEach(t => t.subjects.forEach(s => {
      if (!seen.has(s.id)) seen.set(s.id, s);
    }));
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [tutors]);

  const filtered = useMemo(() => {
    let list = tutors.filter(t => {
      const q = filters.query.toLowerCase();
      if (q && !t.username.toLowerCase().includes(q) &&
          !t.subjects.some(s => s.name.toLowerCase().includes(q))) return false;
      if (filters.level !== 'all' &&
          !t.subjects.some(s => s.category === filters.level)) return false;
      if (filters.avail === 'online' && !onlineIds.has(t.userId)) return false;
      if (filters.subjectId &&
          !t.subjects.some(s => s.id === filters.subjectId)) return false;
      const rate = t.hourlyRate ?? 0;
      if (filters.minRate !== '' && rate < Number(filters.minRate)) return false;
      if (filters.maxRate !== '' && rate > Number(filters.maxRate)) return false;
      return true;
    });

    if (filters.sort === 'sessions')   list = [...list].sort((a, b) => (b.totalSessions ?? 0) - (a.totalSessions ?? 0));
    if (filters.sort === 'rate_asc')   list = [...list].sort((a, b) => (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0));
    if (filters.sort === 'rate_desc')  list = [...list].sort((a, b) => (b.hourlyRate ?? 0) - (a.hourlyRate ?? 0));
    return list;
  }, [tutors, onlineIds, filters]);

  function setFilter<K extends keyof ActiveFilters>(key: K, val: ActiveFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: val }));
  }
  function resetFilters() { setFilters(DEFAULT_FILTERS); }

  const activeCount = countActiveFilters(filters);
  const onlineCount = tutors.filter(t => onlineIds.has(t.userId)).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-white font-semibold text-xl tracking-tight">Browse Tutors</h1>
        <p className="text-white/40 text-sm mt-1">
          {loading ? 'Finding tutors…' : (
            <>
              {tutors.length} tutor{tutors.length !== 1 ? 's' : ''}
              {onlineCount > 0 && <span className="text-emerald-400/70"> · {onlineCount} online</span>}
            </>
          )}
        </p>
      </motion.div>

      {/* ── Search + filter toggle ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or subject…"
              value={filters.query}
              onChange={e => setFilter('query', e.target.value)}
              className="w-full glass rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:ring-1 focus:ring-white/15 transition"
            />
            {filters.query && (
              <button onClick={() => setFilter('query', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition">
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(p => !p)}
            className={`
              relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all
              ${showFilters || activeCount > 0
                ? 'bg-white/12 border-white/20 text-white'
                : 'glass-soft border-transparent text-white/40 hover:text-white/70'
              }
            `}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Expanded filter panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              key="filters"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-4 space-y-4">

                <div className="space-y-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">Level</p>
                  <div className="flex gap-2">
                    {(['all', 'CAPE', 'CSEC'] as LevelFilter[]).map(l => (
                      <button key={l} onClick={() => setFilter('level', l)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${filters.level === l ? 'bg-white/15 border-white/25 text-white' : 'glass-soft border-transparent text-white/35 hover:text-white/60'}`}>
                        {l === 'all' ? 'All levels' : l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">Availability</p>
                  <div className="flex gap-2">
                    {([['all', 'All tutors'], ['online', 'Online now']] as [AvailFilter, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setFilter('avail', val)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${filters.avail === val ? 'bg-white/15 border-white/25 text-white' : 'glass-soft border-transparent text-white/35 hover:text-white/60'}`}>
                        {val === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {allSubjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white/30 text-[10px] uppercase tracking-widest">Subject</p>
                    <div className="relative">
                      <select value={filters.subjectId} onChange={e => setFilter('subjectId', e.target.value)} className="w-full glass rounded-xl px-3 py-2 text-sm text-white/70 outline-none appearance-none cursor-pointer">
                        <option value="">All subjects</option>
                        {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Rate range — currency-aware label */}
                <div className="space-y-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">
                    Hourly Rate
                    {!currencyLoading && <span className="text-white/15 ml-1 normal-case">({symbol})</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <input type="number" placeholder="Min" value={filters.minRate} onChange={e => setFilter('minRate', e.target.value)} className="flex-1 glass rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none" />
                    <span className="text-white/20 text-xs">–</span>
                    <input type="number" placeholder="Max" value={filters.maxRate} onChange={e => setFilter('maxRate', e.target.value)} className="flex-1 glass rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-widest">Sort by</p>
                  <div className="flex gap-2 flex-wrap">
                    {([['sessions', 'Most sessions'], ['rate_asc', 'Rate: low → high'], ['rate_desc', 'Rate: high → low']] as [SortOption, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setFilter('sort', val)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${filters.sort === val ? 'bg-white/15 border-white/25 text-white' : 'glass-soft border-transparent text-white/35 hover:text-white/60'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {activeCount > 0 && (
                  <button onClick={resetFilters} className="text-white/30 text-xs hover:text-white/60 transition flex items-center gap-1">
                    <X size={11} /> Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick pills ── */}
        {!showFilters && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {(['all', 'CAPE', 'CSEC'] as LevelFilter[]).map(l => (
              <button key={l} onClick={() => setFilter('level', l)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition ${filters.level === l ? 'bg-white/15 border-white/25 text-white' : 'glass-soft border-transparent text-white/40 hover:text-white/70'}`}>
                {l === 'all' ? 'All levels' : l}
              </button>
            ))}
            <button
              onClick={() => setFilter('avail', filters.avail === 'online' ? 'all' : 'online')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${filters.avail === 'online' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300' : 'glass-soft border-transparent text-white/40 hover:text-white/70'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online now
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Results ── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl px-4 py-12 text-center space-y-2">
          <p className="text-white/30 text-sm">
            {filters.query ? `No tutors match "${filters.query}"` : 'No tutors match your filters'}
          </p>
          {activeCount > 0 && (
            <button onClick={resetFilters} className="text-white/25 text-xs hover:text-white/50 transition underline underline-offset-2">
              Clear filters
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tutor, i) => (
            <motion.div
              key={tutor.userId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.28 }}
            >
              <AvailableTutorCard
                userId={tutor.userId}
                tutorId={tutor.tutorId}
                username={tutor.username}
                avatarUrl={tutor.avatarUrl}
                subjects={tutor.subjects}
                hourlyRate={tutor.hourlyRate}
                isStudentTutor={tutor.isStudentTutor}
                isOnline={onlineIds.has(tutor.userId)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}