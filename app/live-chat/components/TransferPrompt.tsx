'use client';

import { motion } from 'framer-motion';
import { Users, ArrowRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  participantCount: number;
  onDismiss: () => void;
}

export default function TransferPrompt({ participantCount, onDismiss }: Props) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="glass-soft border-b border-white/10 px-4 py-3 flex items-center gap-3"
    >
      {/* Icon */}
      <div className="glass-soft w-8 h-8 rounded-full flex items-center justify-center shrink-0">
        <Users size={14} className="text-white/70" />
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="text-white/90 text-xs font-medium">
          {participantCount}/{participantCount} participants — session is full
        </p>
        <p className="text-white/50 text-xs mt-0.5">
          Need more people? Book a structured session instead.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push('/sessions/book')}
          className="
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-white text-orange-600 text-xs font-semibold
            hover:bg-white/90 transition shadow-sm
          "
        >
          Book session
          <ArrowRight size={12} />
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 rounded-lg glass-soft text-white/40 hover:text-white/70 transition"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}