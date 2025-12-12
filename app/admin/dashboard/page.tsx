// app/dashboard/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  DashboardStats, 
  User, 
  UserActivity, 
  OnlineUser, 
  AdminTab 
} from '../types/admin';
import AdminHeader from '../components/dashboard/AdminHeader';
import StatsGrid from '../components/dashboard/StatsGrid';
import QuickActions from '../components/dashboard/QuickActions';
import UsersTable from '../components/dashboard/UsersTable';
import ActivityTable from '../components/dashboard/ActivityTable';
import OnlineUsersTable from '../components/dashboard/OnlineUsersTable';
import ApplicationsPanel from '../components/dashboard/ApplicationsPanel';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Users pagination and search
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'activity') {
      fetchUserActivity();
    } else if (activeTab === 'online') {
      fetchOnlineUsers();
    }
  }, [activeTab, usersPage, usersSearch, usersRoleFilter]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/admin/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: '20',
        ...(usersSearch && { search: usersSearch }),
        ...(usersRoleFilter && { role: usersRoleFilter })
      });

      const response = await fetch(`http://localhost:3001/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(result.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserActivity = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/admin/user-activity?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setUserActivity(result.data.activity);
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/admin/online-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setOnlineUsers(result.data);
      }
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        // Refresh users list
        fetchUsers();
        // Show success notification
        console.log('User role updated successfully');
      } else {
        console.error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    setActiveTab(action as AdminTab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-lg">Loading Admin Console...</p>
          <p className="text-gray-400 text-sm">Initializing system dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Premium Admin Header */}
      <AdminHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-8">
            {/* Statistics Grid */}
            <StatsGrid stats={stats} />
            
            {/* Quick Actions */}
            <QuickActions stats={stats} onAction={handleQuickAction} />

            {/* Recent Activity Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Online Users Preview */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Currently Online</h3>
                <div className="space-y-3">
                  {onlineUsers.slice(0, 5).map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium text-gray-900">{user.username}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                          {user.role}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(user.last_activity).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  {onlineUsers.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No users currently online</p>
                  )}
                  {onlineUsers.length > 5 && (
                    <button 
                      onClick={() => setActiveTab('online')}
                      className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
                    >
                      View all {onlineUsers.length} online users →
                    </button>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">System Status</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-800 font-medium">Platform</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-700 text-sm">Operational</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-blue-800 font-medium">Database</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-blue-700 text-sm">Connected</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <span className="text-purple-800 font-medium">API Services</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-purple-700 text-sm">Running</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <UsersTable
            users={users}
            loading={usersLoading}
            search={usersSearch}
            roleFilter={usersRoleFilter}
            onSearchChange={setUsersSearch}
            onRoleFilterChange={setUsersRoleFilter}
            onUpdateUserRole={updateUserRole}
          />
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <ApplicationsPanel />
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <ActivityTable activity={userActivity} />
        )}

        {/* Online Users Tab */}
        {activeTab === 'online' && (
          <OnlineUsersTable onlineUsers={onlineUsers} />
        )}
      </div>
    </div>
  );
}