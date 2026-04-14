'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X, Check } from 'lucide-react';
import type { InviteRequest } from '@/features/live-chat/types/SocketEvents';

interface Props {
  invite: InviteRequest;
  onAccept: () => void;
  onDecline: () => void;
}

export default function InviteModal({ invite, onAccept, onDecline }: Props) {
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="glass rounded-2xl p-6 w-full max-w-sm text-center"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="glass-soft w-12 h-12 rounded-full flex items-center justify-center">
              <UserPlus size={20} className="text-white/80" />
            </div>
          </div>

          {/* Copy */}
          <h3 className="text-white font-semibold text-base mb-2">
            Invite request
          </h3>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            <span className="text-white/90 font-medium">{invite.fromUsername}</span>
            {' '}wants to invite{' '}
            <span className="text-white/90 font-medium">{invite.inviteeUsername}</span>
            {' '}to this session. Do you agree?
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="
                flex-1 flex items-center justify-center gap-2
                py-2.5 rounded-xl
                glass-soft text-white/70 text-sm font-medium
                hover:bg-white/10 transition
              "
            >
              <X size={15} />
              Decline
            </button>
            <button
              onClick={onAccept}
              className="
                flex-1 flex items-center justify-center gap-2
                py-2.5 rounded-xl
                bg-white text-orange-600 text-sm font-semibold
                hover:bg-white/90 transition
                shadow-md shadow-black/20
              "
            >
              <Check size={15} />
              Allow
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
