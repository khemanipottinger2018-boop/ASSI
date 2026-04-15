'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { MessageCircle, ArrowRight } from 'lucide-react';

interface ActiveChatCardProps {
  chatId: string;
  tutorName: string;
  subject: string;
  avatarUrl?: string | null;
}

export default function ActiveChatCard({ chatId, tutorName, subject, avatarUrl }: ActiveChatCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      onClick={() => router.push(`/live-chat/${chatId}`)}
      className="panel rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/[0.05] transition"
    >
      <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatarUrl
          ? <img src={avatarUrl} alt={tutorName} className="w-full h-full object-cover" />
          : <MessageCircle size={15} className="text-emerald-400" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <p className="text-white/80 text-sm font-medium truncate">{subject}</p>
        </div>
        <p className="text-white/35 text-xs mt-0.5">with {tutorName}</p>
      </div>

      <ArrowRight size={14} className="text-white/25 flex-shrink-0" />
    </motion.div>
  );
}