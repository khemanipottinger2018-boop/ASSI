'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value?: string | number;
  icon?: LucideIcon;
  accent?: 'white' | 'emerald' | 'orange' | 'purple';
}

const accents = {
  white:   'text-white/70',
  emerald: 'text-emerald-400',
  orange:  'text-orange-400',
  purple:  'text-purple-400',
};

export default function StatCard({ title, value, icon: Icon, accent = 'white' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
      className="glass-soft rounded-2xl px-3 py-3.5 flex flex-col gap-1.5"
    >
      {Icon && <Icon size={13} className="text-white/30" />}
      {value === undefined
        ? <div className="h-6 w-16 rounded-lg bg-white/8 animate-pulse mt-1" />
        : <p className={`text-lg font-semibold ${accents[accent]}`}>{value}</p>
      }
      <p className="text-white/25 text-[10px] uppercase tracking-wide">{title}</p>
    </motion.div>
  );
}