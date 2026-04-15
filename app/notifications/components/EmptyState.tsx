import { BellOff } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="surface rounded-2xl text-center py-16 px-6 text-white/60">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto mb-4 flex items-center justify-center">
        <BellOff className="opacity-60" size={22} />
      </div>

      <div className="text-sm font-medium text-white/75">
        You’re all caught up
      </div>

      <div className="text-xs opacity-70 mt-1">
        No new notifications right now.
      </div>
    </div>
  );
}