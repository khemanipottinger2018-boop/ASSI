import { Bell } from 'lucide-react';

interface NotificationBellProps {
  count: number;
}

export default function NotificationBell({ count }: NotificationBellProps) {
  return (
    <button className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
      <Bell size={20} className="text-white" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
          {count}
        </span>
      )}
    </button>
  );
}