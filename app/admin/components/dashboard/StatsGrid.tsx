// app/dashboard/adm./components/StatsGrid.tsx
import { Users, UserCheck, TrendingUp, FileText, Clock, Zap } from 'lucide-react';
import { DashboardStats } from '../../types/admin';

interface StatsGridProps {
  stats: DashboardStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total_users,
      icon: Users,
      color: 'blue',
      trend: `${stats.users.new_users_30d} new this month`,
      breakdown: [
        { label: 'Students', value: stats.users.total_students, color: 'blue' },
        { label: 'Tutors', value: stats.users.total_tutors, color: 'green' },
      ]
    },
    {
      title: 'Tutor Applications',
      value: stats.applications.total_applications,
      icon: FileText,
      color: 'purple',
      trend: `${stats.applications.pending_applications} pending review`,
      breakdown: [
        { label: 'Approved', value: stats.applications.approved_applications, color: 'green' },
        { label: 'Rejected', value: stats.applications.rejected_applications, color: 'red' },
      ]
    },
    {
      title: 'Active Users',
      value: stats.online.online_users,
      icon: UserCheck,
      color: 'green',
      trend: 'Currently online',
      breakdown: []
    },
    {
      title: 'Platform Activity',
      value: stats.activity.logins_7d,
      icon: TrendingUp,
      color: 'orange',
      trend: 'Logins past 7 days',
      breakdown: []
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTextColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        const colorClasses = getColorClasses(card.color);
        const textColor = getTextColor(card.color);
        
        return (
          <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${colorClasses} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm font-medium uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-white text-3xl font-bold mt-2">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4 flex items-center">
                <Zap size={14} className="mr-1 text-yellow-500" />
                {card.trend}
              </p>
              
              {card.breakdown.length > 0 && (
                <div className="space-y-2">
                  {card.breakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className={`font-semibold ${getTextColor(item.color)}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}