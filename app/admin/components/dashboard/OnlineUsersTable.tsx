// app/dashboard/adm./components/OnlineUsersTable.tsx
import { OnlineUser } from '../../types/admin';
import { Wifi, Globe, Clock, User } from 'lucide-react';

interface OnlineUsersTableProps {
  onlineUsers: OnlineUser[];
}

export default function OnlineUsersTable({ onlineUsers }: OnlineUsersTableProps) {
  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
      tutor: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white',
      student: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
    };
    return styles[role as keyof typeof styles] || styles.student;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Online Users</h2>
            <p className="text-gray-600 mt-1">
              Users active in the last 15 minutes • {onlineUsers.length} currently online
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
            <Wifi className="text-green-600" size={20} />
            <span className="text-green-800 text-sm font-medium">Live Status</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Session Start
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {onlineUsers.map((user) => (
              <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-2 text-gray-400" />
                    {formatDate(user.login_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="text-green-600 font-medium">
                    {getTimeAgo(user.last_activity)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Globe size={14} className="mr-2 text-gray-400" />
                    {user.ip_address}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-green-500 to-green-600 text-white">
                    <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                    Online
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onlineUsers.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-400 mb-2">
            <User className="mx-auto" size={48} />
          </div>
          <p className="text-gray-500 text-lg">No users currently online</p>
          <p className="text-gray-400 text-sm mt-1">Users will appear here when they become active</p>
        </div>
      )}
    </div>
  );
}