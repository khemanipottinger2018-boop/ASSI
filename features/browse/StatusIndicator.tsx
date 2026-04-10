'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  loading:      boolean;
  error:        string | null;
  totalTutors:  number;
  hasSelection: boolean;
}

export default function StatusIndicator({ loading, error, totalTutors, hasSelection }: Props) {
  if (!hasSelection) return null;

  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div key="error"
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-white"
          style={{ background: '#c0392b', boxShadow: '0 4px 16px rgba(192,57,43,0.4)' }}
        >
          <AlertTriangle size={13} className="flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {!error && loading && (
        <motion.div key="loading"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="mt-3 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs text-white/50"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <Loader2 size={12} className="animate-spin" />
          Loading…
        </motion.div>
      )}

      {!error && !loading && totalTutors > 0 && (
        <motion.div key="has-tutors"
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-white"
          style={{ background: '#7c3aed', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
        >
          <Users size={13} className="flex-shrink-0 text-white/80" />
          <span>
            <span className="font-bold">{totalTutors}</span>
            {' '}tutor{totalTutors !== 1 ? 's' : ''} registered,{' '}
            <span className="text-white/70">pick Live Tutor to see who's available</span>
          </span>
        </motion.div>
      )}

      {!error && !loading && totalTutors === 0 && (
        <motion.div key="no-tutors"
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-white"
          style={{ background: '#ea6000', boxShadow: '0 4px 16px rgba(234,96,0,0.35)' }}
        >
          <BookOpen size={13} className="flex-shrink-0 text-white/80" />
          <span>Sorry, there are no tutors available yet, <span className="text-white/70">try AI Assistant or submit an assignment</span></span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
