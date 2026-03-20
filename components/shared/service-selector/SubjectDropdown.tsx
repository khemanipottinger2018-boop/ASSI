'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, GraduationCap, BookOpen, X } from 'lucide-react';
import { api } from '@/lib/api/client';

export interface Subject {
  id:         string;
  name:       string;
  category:   string;
  tutorCount: number;
}

interface Props {
  selected:         Subject | null;
  onSelect:         (subject: Subject) => void;
  onClear?:         () => void;
  onOpenChange?:    (open: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export default function SubjectDropdown({ selected, onSelect, onClear, onOpenChange, onLoadingChange }: Props) {
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
    api.get<{ success: boolean; subjects: Subject[] }>('/api/subjects/public')
      .then((data) => {
        if (data.success) {
          setSubjects([...data.subjects].sort((a, b) => {
            if (a.category !== b.category) return a.category === 'CSEC' ? -1 : 1;
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

  const csec = filtered.filter((s) => s.category === 'CSEC');
  const cape = filtered.filter((s) => s.category === 'CAPE');

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
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 ${
          open
            ? 'bg-white/10 border-white/20'
            : 'glass-soft border-white/10 hover:border-white/20 hover:bg-white/8'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="glass-soft w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
            {selected
              ? <GraduationCap size={15} className="text-white/80" />
              : <BookOpen size={14} className="text-white/40" />
            }
          </div>

          <div className="text-left min-w-0">
            {selected ? (
              <>
                <div className="text-sm font-semibold text-white truncate">{selected.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-px rounded-full ${
                    selected.category === 'CAPE'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {selected.category}
                  </span>
                  <span className="text-[11px] text-white/35">
                    {selected.tutorCount} registered
                  </span>
                </div>
              </>
            ) : (
              <span className="text-white/40 text-sm">
                {loading ? 'Loading subjects…' : 'Select a subject'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Clear button — only shown when something is selected */}
          {selected && onClear && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onClear(); toggle(false); setSearch(''); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition"
            >
              <X size={12} />
            </span>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-white/35" />
          </motion.div>
        </div>
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 mt-2 z-50 overflow-hidden rounded-2xl panel border border-white/10"
          >
            {/* Search bar */}
            <div className="p-2.5 border-b border-white/8">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${subjects.length} subjects…`}
                  className="w-full glass-soft rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 outline-none border border-white/8 focus:border-white/20 transition"
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
                    <div className="px-3 pt-2 pb-1">
                      <span className={`text-[10px] font-bold tracking-widest uppercase ${
                        label === 'CAPE' ? 'text-purple-400/50' : 'text-emerald-400/50'
                      }`}>
                        {label}
                      </span>
                    </div>
                    {items.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => { onSelect(sub); toggle(false); setSearch(''); }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 ${
                          selected?.id === sub.id
                            ? 'bg-white/10'
                            : 'hover:bg-white/6'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white/85 truncate">{sub.name}</div>
                          <div className="text-[11px] text-white/30 mt-0.5">
                            {sub.tutorCount > 0
                              ? `${sub.tutorCount} tutor${sub.tutorCount !== 1 ? 's' : ''} registered`
                              : 'No tutors yet'}
                          </div>
                        </div>
                        {sub.tutorCount > 0 && (
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            label === 'CAPE'
                              ? 'bg-purple-500/15 text-purple-300/80'
                              : 'bg-emerald-500/15 text-emerald-300/80'
                          }`}>
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