// app/dashboard/adm./components/AdminHeader.tsx
import { Shield, Activity, Users, FileText, Clock, UserCheck } from 'lucide-react';

interface AdminHeaderProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'applications', label: 'Applications', icon: FileText },
  { id: 'activity', label: 'Activity Logs', icon: Clock },
  { id: 'online', label: 'Online Users', icon: UserCheck },
];

export default function AdminHeader({ activeTab, onTabChange }: AdminHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-gray-900 to-blue-900 shadow-2xl border-b border-blue-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Header */}
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <Shield className="text-blue-300" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Console</h1>
              <p className="text-blue-200 mt-1">Platform Management & Analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white font-semibold">System Active</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center space-x-3 py-4 px-6 border-b-2 font-semibold text-sm transition-all duration-200
                  ${isActive
                    ? 'border-blue-400 text-white bg-blue-600/20 backdrop-blur-sm'
                    : 'border-transparent text-blue-200 hover:text-white hover:bg-white/5'
                  }
                  rounded-t-xl
                `}
              >
                <Icon size={18} className={isActive ? 'text-blue-300' : 'text-blue-400'} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}