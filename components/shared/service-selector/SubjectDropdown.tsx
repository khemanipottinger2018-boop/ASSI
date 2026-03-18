'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, GraduationCap, BookOpen } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface Subject {
  subject_id: string;
  name:       string;
  level:      'CSEC' | 'CAPE';
  tutorCount: number;
}

interface Props {
  selected:         Subject | null;
  onSelect:         (subject: Subject) => void;
  onOpenChange?:    (open: boolean) => void;
  /** Called when the internal subjects fetch starts/finishes. */
  onLoadingChange?: (loading: boolean) => void;
}

export default function SubjectDropdown({ selected, onSelect, onOpenChange, onLoadingChange }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  const toggle = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) setTimeout(() => inputRef.current?.focus(), 80);
  };

  useEffect(() => {
    onLoadingChange?.(true);
    fetch(`${API_URL}/api/subjects/public`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSubjects([...data.subjects].sort((a, b) => {
            if (a.level !== b.level) return a.level === 'CSEC' ? -1 : 1;
            return a.name.localeCompare(b.name);
          }));
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        onLoadingChange?.(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, search]);

  const csec = filtered.filter((s) => s.level === 'CSEC');
  const cape = filtered.filter((s) => s.level === 'CAPE');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        toggle(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* ── Trigger ── */}
      <button
        onClick={() => toggle(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200"
        style={{
          background:   open ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.09)',
          border:       `1px solid ${open ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)'}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            {selected
              ? <GraduationCap size={16} className="text-white/90" />
              : <BookOpen size={15} className="text-white/50" />
            }
          </div>

          <div className="text-left min-w-0">
            {selected ? (
              <>
                <div className="text-sm font-semibold text-white truncate">{selected.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-px rounded-full
                    ${selected.level === 'CAPE' ? 'bg-purple-500/35 text-purple-200' : 'bg-emerald-500/35 text-emerald-200'}`}
                  >
                    {selected.level}
                  </span>
                  <span className="text-[11px] text-white/40">
                    {selected.tutorCount} registered
                  </span>
                </div>
              </>
            ) : (
              <span className="text-white/45 text-sm">
                {loading ? 'Loading subjects…' : 'Select a subject'}
              </span>
            )}
          </div>
        </div>

        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-white/40 flex-shrink-0" />
        </motion.div>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 mt-2 z-50 overflow-hidden rounded-2xl"
            style={{
              background:           'rgba(10,8,24,0.88)',
              border:               '1px solid rgba(255,255,255,0.14)',
              backdropFilter:       'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow:            '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Search bar */}
            <div className="p-3 border-b border-white/8">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${subjects.length} subjects…`}
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-sm text-white
                             placeholder-white/25 outline-none transition"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto p-2">
              {[
                { label: 'CSEC', items: csec },
                { label: 'CAPE', items: cape },
              ].map(({ label, items }) =>
                items.length === 0 ? null : (
                  <div key={label} className="mb-1">
                    <div className="px-3 pt-2.5 pb-1.5">
                      <span className={`text-[10px] font-bold tracking-[0.15em] uppercase
                        ${label === 'CAPE' ? 'text-purple-400/60' : 'text-emerald-400/60'}`}
                      >
                        {label}
                      </span>
                    </div>
                    {items.map((sub) => (
                      <button
                        key={sub.subject_id}
                        onClick={() => { onSelect(sub); toggle(false); setSearch(''); }}
                        className="w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 hover:bg-white/8"
                        style={selected?.subject_id === sub.subject_id ? { background: 'rgba(255,255,255,0.10)' } : {}}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white/90 truncate">{sub.name}</div>
                          <div className="text-[11px] text-white/35 mt-0.5">
                            {sub.tutorCount > 0
                              ? `${sub.tutorCount} tutor${sub.tutorCount !== 1 ? 's' : ''} registered`
                              : 'No tutors yet'}
                          </div>
                        </div>
                        {sub.tutorCount > 0 && (
                          <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                            ${label === 'CAPE' ? 'bg-purple-500/25 text-purple-300' : 'bg-emerald-500/25 text-emerald-300'}`}
                          >
                            {sub.tutorCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )
              )}

              {!loading && filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-white/25">No subjects found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
