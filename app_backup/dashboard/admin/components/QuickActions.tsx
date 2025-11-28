// app/dashboard/admin/components/QuickActions.tsx
import { Users, FileText, UserCheck, Settings, Shield, Rocket } from 'lucide-react';

interface QuickActionsProps {
  stats: any;
  onAction: (action: string) => void;
}

export default function QuickActions({ stats, onAction }: QuickActionsProps) {
  const actions = [
    {
      icon: FileText,
      label: 'Review Applications',
      description: `${stats.applications.pending_applications} pending tutor applications`,
      color: 'blue',
      action: 'applications'
    },
    {
      icon: Users,
      label: 'Manage Users',
      description: 'View and manage all user accounts',
      color: 'green',
      action: 'users'
    },
    {
      icon: UserCheck,
      label: 'Online Users',
      description: `${stats.online.online_users} users currently active`,
      color: 'purple',
      action: 'online'
    },
    {
      icon: Shield,
      label: 'System Settings',
      description: 'Platform configuration and settings',
      color: 'orange',
      action: 'settings'
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 hover:border-blue-500 bg-blue-50 hover:bg-blue-100',
      green: 'border-green-200 hover:border-green-500 bg-green-50 hover:bg-green-100',
      purple: 'border-purple-200 hover:border-purple-500 bg-purple-50 hover:bg-purple-100',
      orange: 'border-orange-200 hover:border-orange-500 bg-orange-50 hover:bg-orange-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getIconColor = (color: string) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          <p className="text-gray-600 mt-1">Frequently used administrative tasks</p>
        </div>
        <Rocket className="text-gray-400" size={24} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <button
              key={index}
              onClick={() => onAction(action.action)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${getColorClasses(action.color)}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${getIconColor(action.color)} bg-white`}>
                  <Icon size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 text-sm">{action.label}</h3>
                  <p className="text-gray-600 text-xs mt-1">{action.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}