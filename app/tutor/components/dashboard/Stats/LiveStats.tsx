import { TrendingUp, TrendingDown } from 'lucide-react';
import StatCard from './StatCard';

interface LiveStatsProps {
  quickStats: any;
  performanceMetrics: any;
  studentAnalytics?: {
    onlineStudents: number;
    newStudentsThisWeek: number;
    weeklyTrend: number;
  };
}

export default function LiveStats({ quickStats, performanceMetrics, studentAnalytics }: LiveStatsProps) {
  const stats = [
    { 
      label: 'Online Students', 
      value: studentAnalytics?.onlineStudents?.toString() || '0', 
      change: studentAnalytics?.weeklyTrend ? `${studentAnalytics.weeklyTrend > 0 ? '+' : ''}${studentAnalytics.weeklyTrend}%` : '+0%', 
      trend: (studentAnalytics?.weeklyTrend || 0) >= 0 ? 'up' as const : 'down' as const
    },
    { 
      label: 'New Students This Week', 
      value: studentAnalytics?.newStudentsThisWeek?.toString() || '0', 
      change: '+0%', // Will be calculated from database
      trend: 'up' as const
    },
    { 
      label: 'Session Requests', 
      value: quickStats?.pending_count?.toString() || '0', 
      change: '+0', 
      trend: 'up' as const
    },
    { 
      label: 'Total Earnings', 
      value: `$${performanceMetrics?.total_earnings || 0}`, 
      change: '+$0', 
      trend: 'up' as const
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  );
}