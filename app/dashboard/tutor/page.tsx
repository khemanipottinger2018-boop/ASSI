'use client';

import { useTutorDashboard } from './hooks/useTutorDashboard';
import TutorHeader from './components/Header/TutorHeader';
import LiveStats from './components/Stats/LiveStats';
import QuickActions from './components/Actions/QuickActions';
import SessionsPanel from './components/Sessions/SessionsPanel';
import PerformancePanel from './components/Performance/PerformancePanel';
import QuickTools from './components/Sidebar/QuickTools';
import MotivationQuote from './components/Sidebar/MotivationQuote';
import AnimatedBackground from './components/Layout/AnimatedBackground';
import CTASection from './components/Layout/CTASection';
import LoadingDashboard from './components/Loading/LoadingDashboard';

export default function TutorDashboard() {
  const {
    dashboardData,
    loading,
    error,
    refetch
  } = useTutorDashboard();

  if (loading) {
    return <LoadingDashboard />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Error Loading Dashboard</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <button 
              onClick={refetch}
              className="bg-white text-red-600 px-6 py-2 rounded-lg font-bold hover:scale-105 transition-transform"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Destructure from the single dashboard response
  const { 
    profile,
    studentAnalytics, 
    performanceMetrics, 
    upcomingSessions, 
    quickStats,
    notifications
  } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8">
      <AnimatedBackground />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <TutorHeader profile={profile} notifications={notifications || 0} />
        
        <LiveStats 
          quickStats={quickStats} 
          performanceMetrics={performanceMetrics}
          studentAnalytics={studentAnalytics}
        />
        
        <QuickActions 
          upcomingSessions={upcomingSessions || []}
        />
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <SessionsPanel 
              sessions={upcomingSessions || []}
            />
            <PerformancePanel performanceMetrics={performanceMetrics} />
          </div>
          
          <div className="space-y-8">
            <QuickTools />
            <MotivationQuote />
          </div>
        </div>

        <CTASection />
      </div>
    </div>
  );
}