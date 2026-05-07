'use client';

import { motion } from 'framer-motion';
import { FileText, Link, Megaphone, StickyNote } from 'lucide-react';
import { panelVariants } from '@/lib/motion';
import type { SessionBroadcast, BroadcastType } from './broadcastApi';

const TYPE_META: Record<BroadcastType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  note:         { label: 'Note',         icon: StickyNote, color: 'text-white/55',    bg: 'bg-white/8' },
  formula:      { label: 'Formula',      icon: FileText,   color: 'text-blue-400/70',  bg: 'bg-blue-500/10' },
  link:         { label: 'Link',         icon: Link,       color: 'text-purple-400/70', bg: 'bg-purple-500/10' },
  announcement: { label: 'Announcement', icon: Megaphone,  color: 'text-orange-400/80', bg: 'bg-orange-500/10' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-JM', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-JM', { hour: 'numeric', minute: '2-digit' });
}

type Props = {
  broadcast:    SessionBroadcast;
  subjectName?: string;
  tutorName?:   string;
  index?:       number;
};

export default function BroadcastCard({ broadcast, subjectName, tutorName, index = 0 }: Props) {
  const meta = TYPE_META[broadcast.type] ?? TYPE_META.note;
  const Icon = meta.icon;

  return (
    <motion.div
      variants={panelVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.18, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
      className="glass-soft rounded-2xl px-4 py-3.5 relative"
    >
      {/* Type badge */}
      <span className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide ${meta.color} ${meta.bg}`}>
        <Icon size={9} />
        {meta.label}
      </span>

      {/* Header */}
      {(subjectName || tutorName) && (
        <p className="text-[10px] text-white/30 mb-1.5 pr-20">
          {[subjectName, tutorName].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Content */}
      <p className="text-sm text-white/80 leading-relaxed pr-20">{broadcast.content}</p>

      {/* Timestamp */}
      <p className="text-[10px] text-white/28 mt-2">{formatTime(broadcast.createdAt)}</p>
    </motion.div>
  );
}
