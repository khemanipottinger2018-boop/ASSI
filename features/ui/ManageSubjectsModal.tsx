'use client';

import { useEffect, useState } from 'react';
import { X, Check, Lock } from 'lucide-react';
import { api } from '@/lib/api/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Subject = { id: string; name: string; category: string | null };

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function ManageSubjectsModal({ onClose, onSaved }: Props) {
  const [allSubjects,  setAllSubjects]  = useState<Subject[]>([]);
  const [selected,     setSelected]     = useState<string[]>([]);
  const [limit,        setLimit]        = useState(3);
  const [tier,         setTier]         = useState('standard');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/subjects`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_URL}/api/tutors/my-subjects`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([allData, myData]) => {
      if (allData.success)  setAllSubjects(allData.subjects ?? []);
      if (myData.success) {
        setSelected(myData.subjects.map((s: Subject) => s.id));
        setLimit(myData.limit ?? 3);
        setTier(myData.tier ?? 'standard');
      }
    }).catch(() => setError('Failed to load subjects'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= limit) return prev; // already at limit
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/tutors/my-subjects`, {
        method:      'PUT',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ subjectIds: selected }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save subjects');
    } finally {
      setSaving(false);
    }
  }

  // Group by category
  const csec = allSubjects.filter(s => s.category === 'CSEC');
  const cape = allSubjects.filter(s => s.category === 'CAPE');
  const other = allSubjects.filter(s => s.category !== 'CSEC' && s.category !== 'CAPE');

  const atLimit = selected.length >= limit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div onClick={onClose} className="absolute inset-0" />

      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">Manage Subjects</h2>
            <p className="text-sm text-white/50 mt-1">
              Select up to {limit} subject{limit !== 1 ? 's' : ''}
              {tier === 'standard' && (
                <span className="ml-1 text-white/30">· <span className="text-amber-400/70">Upgrade for more</span></span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition mt-1">
            <X size={18} />
          </button>
        </div>

        {/* Counter */}
        <div className="px-6 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < selected.length ? 'bg-emerald-500' : 'bg-white/10'
              }`} />
            ))}
            <span className="text-xs text-white/40 ml-1 flex-shrink-0">{selected.length}/{limit}</span>
          </div>
        </div>

        {/* Subject list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3,4,5].map(i => <div key={i} className="h-9 rounded-xl bg-white/8" />)}
            </div>
          ) : (
            <>
              {[{ label: 'CSEC', items: csec, color: 'emerald' }, { label: 'CAPE', items: cape, color: 'purple' }, { label: 'Other', items: other, color: 'blue' }]
                .filter(g => g.items.length > 0)
                .map(group => (
                  <div key={group.label}>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${
                      group.color === 'emerald' ? 'text-emerald-400/60' :
                      group.color === 'purple'  ? 'text-purple-400/60' : 'text-blue-400/60'
                    }`}>{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map(subject => {
                        const isSelected = selected.includes(subject.id);
                        const isDisabled = !isSelected && atLimit;
                        return (
                          <button
                            key={subject.id}
                            onClick={() => toggle(subject.id)}
                            disabled={isDisabled}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition ${
                              isSelected
                                ? 'bg-white/15 border border-white/20 text-white'
                                : isDisabled
                                  ? 'bg-white/3 border border-white/5 text-white/25 cursor-not-allowed'
                                  : 'bg-white/5 border border-white/8 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {subject.name}
                            {isSelected ? (
                              <Check size={14} className="text-emerald-400 flex-shrink-0" />
                            ) : isDisabled ? (
                              <Lock size={12} className="text-white/20 flex-shrink-0" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              }
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-3 border-t border-white/8 flex-shrink-0 space-y-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {tier === 'standard' && atLimit && (
            <p className="text-xs text-amber-400/70 text-center">
                Upgrade to Pro to add more than {limit} subjects
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-white/60 hover:text-white glass-soft transition text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : 'Save subjects'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}