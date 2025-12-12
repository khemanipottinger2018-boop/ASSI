import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  stat: {
    label: string;
    value: string;
    change: string;
    trend: 'up' | 'down';
  };
}

export default function StatCard({ stat }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">{stat.label}</p>
          <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{stat.value}</p>
        </div>
        <div className={`flex items-center gap-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span className="text-sm font-medium">{stat.change}</span>
        </div>
      </div>
    </div>
  );
}