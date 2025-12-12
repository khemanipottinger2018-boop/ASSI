import { TrendingUp, DollarSign, Calendar, CheckCircle, Target } from 'lucide-react';
import MetricCard from './MetricCard';

interface PerformancePanelProps {
  data?: {
    completed_sessions?: number;
    upcoming_sessions?: number;
    avg_earnings?: number;
    total_earnings?: number;
    pending_payments?: number;
    student_satisfaction?: number;
  };
}

export default function PerformancePanel({ data }: PerformancePanelProps) {
  const metrics = [
    {
      label: 'Completed Sessions',
      value: data?.completed_sessions || 0,
      icon: CheckCircle,
      color: 'green' as const,
    },
    {
      label: 'Upcoming Sessions',
      value: data?.upcoming_sessions || 0,
      icon: Calendar,
      color: 'blue' as const
    },
    {
      label: 'Avg Session Earnings',
      value: `$${data?.avg_earnings?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'purple' as const
    },
    {
      label: 'Total Earnings',
      value: `$${data?.total_earnings || 0}`,
      icon: Target,
      color: 'yellow' as const,
    },
    {
      label: 'Pending Payments',
      value: data?.pending_payments || 0,
      icon: DollarSign,
      color: 'orange' as const
    },
    {
      label: 'Student Satisfaction',
      value: `${data?.student_satisfaction || 0}%`,
      icon: TrendingUp,
      color: 'green' as const
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
        <TrendingUp size={20} />
        Performance Analytics
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            color={metric.color}
          />
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Payment Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <span className="text-slate-600 dark:text-slate-400">Available Balance</span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              ${((data?.total_earnings || 0) * 0.8).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <span className="text-slate-600 dark:text-slate-400">Next Payout</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {data?.pending_payments ? `$${data.pending_payments}` : '$0.00'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}