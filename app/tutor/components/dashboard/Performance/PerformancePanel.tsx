import { TrendingUp } from 'lucide-react';
import MetricCard from './MetricCard';

interface PerformancePanelProps {
  performanceMetrics: any;
}

export default function PerformancePanel({ performanceMetrics }: PerformancePanelProps) {
  const metrics = [
    {
      label: 'Completed',
      value: performanceMetrics?.completed_sessions || 0,
      color: 'green' as const
    },
    {
      label: 'Upcoming',
      value: performanceMetrics?.upcoming_sessions || 0,
      color: 'blue' as const
    },
    {
      label: 'Avg Earnings',
      value: `$${performanceMetrics?.avg_earnings?.toFixed(2) || '0.00'}`,
      color: 'purple' as const
    },
    {
      label: 'Total Earnings',
      value: `$${performanceMetrics?.total_earnings || 0}`,
      color: 'yellow' as const
    }
  ];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
        <TrendingUp size={20} />
        Performance Analytics
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            label={metric.label}
            value={metric.value}
            color={metric.color}
          />
        ))}
      </div>
    </div>
  );
}