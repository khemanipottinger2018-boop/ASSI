'use client';

import PresenceBadge         from '@/features/presence/PresenceBadge';
import { usePresenceDisplay } from '@/features/presence/usePresenceDisplay';

export function StudentStatusCard() {
  const display = usePresenceDisplay();
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-sm">Your status</span>
        <PresenceBadge display={display} />
      </div>
    </div>
  );
}
