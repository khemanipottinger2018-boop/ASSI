'use client';

// hooks/useSubjects.ts
// Fetches all subjects from /api/subjects/public once and caches in module scope.
// Safe to call from multiple components — only one network request is made.

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

export interface Subject {
  id:         string;
  name:       string;
  category:   'CSEC' | 'CAPE' | string;
  tutorCount: number;
}

interface UseSubjectsReturn {
  subjects:  Subject[];
  csec:      Subject[];
  cape:      Subject[];
  isLoading: boolean;
  error:     string | null;
}

// Module-level cache — survives re-renders, cleared on page reload
let _cache:   Subject[] | null = null;
let _promise: Promise<Subject[]> | null = null;

async function fetchSubjects(): Promise<Subject[]> {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = api
    .get<{ success: boolean; subjects: Subject[] }>('/api/subjects/public')
    .then(data => {
      if (!data.success) return [];
      const sorted = [...data.subjects].sort((a, b) => {
        if (a.category !== b.category) return a.category === 'CSEC' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      _cache = sorted;
      return sorted;
    })
    .catch(() => [])
    .finally(() => { _promise = null; });

  return _promise;
}

export function useSubjects(): UseSubjectsReturn {
  const [subjects,  setSubjects]  = useState<Subject[]>(_cache ?? []);
  const [isLoading, setIsLoading] = useState(!_cache);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (_cache) {
      setSubjects(_cache);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchSubjects()
      .then(data => {
        setSubjects(data);
        if (data.length === 0) setError('Could not load subjects');
      })
      .catch(() => setError('Could not load subjects'))
      .finally(() => setIsLoading(false));
  }, []);

  const csec = subjects.filter(s => s.category === 'CSEC');
  const cape = subjects.filter(s => s.category === 'CAPE');

  return { subjects, csec, cape, isLoading, error };
}