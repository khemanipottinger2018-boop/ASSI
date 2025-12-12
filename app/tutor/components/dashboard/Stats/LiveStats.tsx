import { TrendingUp, TrendingDown } from 'lucide-react';
import StatCard from './StatCard';
import { useTutorDashboardSocket } from '../../../hooks/useTutorDashboardSocket';

interface LiveStatsProps {
  stats: any;
}

export default function LiveStats({ stats }: LiveStatsProps) {
  const { realTimeStats, isConnected } = useTutorDashboardSocket();

  const liveData = realTimeStats || stats;

  const statItems = [
    { 
      label: 'Completed Sessions', 
      value: liveData?.completed_sessions?.toString() || '0', 
      change: '+0', 
      trend: 'up' as const
    },
    { 
      label: 'Upcoming Sessions', 
      value: liveData?.upcoming_sessions?.toString() || '0', 
      change: '+0',
      trend: 'up' as const
    },
    { 
      label: 'Total Students', 
      value: liveData?.total_students?.toString() || '0', 
      change: '+0', 
      trend: 'up' as const
    },
    { 
      label: 'Total Earnings', 
      value: `$${liveData?.total_earnings || 0}`, 
      change: '+$0', 
      trend: 'up' as const
    }
  ];

  return (
    <div className="relative">
      {isConnected && (
        <div className="absolute -top-2 right-0 flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-medium">LIVE</span>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>
    </div>
  );
}