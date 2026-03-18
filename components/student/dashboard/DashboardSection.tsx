'use client';

import { ReactNode } from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface DashboardSectionProps {
  title: string;
  icon?: LucideIcon;
  onSeeAll?: () => void;
  children: ReactNode;
}

export default function DashboardSection({ title, icon: Icon, onSeeAll, children }: DashboardSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={13} className="text-white/30" />}
          <h2 className="text-white/40 text-xs font-medium uppercase tracking-widest">{title}</h2>
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-white/30 hover:text-white/60 text-xs transition"
          >
            See all <ChevronRight size={11} />
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}