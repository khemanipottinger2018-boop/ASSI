'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface QuickActionButtonProps {
  label: string;
  sub?: string;
  icon?: LucideIcon;
  onClick: () => void;
  accent?: 'emerald' | 'purple' | 'orange' | 'blue';
}

const accents = {
  emerald: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',
  purple:  'bg-purple-500/15  border-purple-500/20  text-purple-400',
  orange:  'bg-orange-500/15  border-orange-500/20  text-orange-400',
  blue:    'bg-blue-500/15    border-blue-500/20    text-blue-400',
};

export default function QuickActionButton({
  label, sub, icon: Icon, onClick, accent = 'blue',
}: QuickActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="panel rounded-2xl p-4 text-left hover:bg-white/[0.05] transition w-full"
    >
      {Icon && (
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center mb-3 ${accents[accent]}`}>
          <Icon size={14} />
        </div>
      )}
      <p className="text-white/80 text-sm font-medium">{label}</p>
      {sub && <p className="text-white/35 text-xs mt-0.5">{sub}</p>}
    </motion.button>
  );
}