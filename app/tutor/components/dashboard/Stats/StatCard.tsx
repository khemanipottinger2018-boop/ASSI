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
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-200 text-sm">{stat.label}</p>
          <p className="text-white text-2xl font-bold">{stat.value}</p>
        </div>
        <div className={`flex items-center gap-1 ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
          {stat.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span className="text-sm font-medium">{stat.change}</span>
        </div>
      </div>
    </div>
  );
}