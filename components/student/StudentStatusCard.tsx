import PresenceBadge from '@/components/shared/presence/PresenceBadge';

export function StudentStatusCard({ status }: { status: any }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <div className="flex justify-between items-center">
        <span className="text-white/70 text-sm">Your status</span>
        <PresenceBadge status={status} />
      </div>
    </div>
  );
}
