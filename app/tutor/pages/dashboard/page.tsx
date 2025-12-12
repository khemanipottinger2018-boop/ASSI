'use client';

import { useTutorDashboard } from '../../hooks/useTutorDashboard';
import TutorHeader from '../../components/dashboard/Header/TutorHeader';
import LiveStats from '../../components/dashboard/Stats/LiveStats';
import QuickActions from '../../components/dashboard/Actions/QuickActions';
import SessionsPanel from '../../components/dashboard/Sessions/SessionsPanel';
import PerformancePanel from '../../components/dashboard/Performance/PerformancePanel';
import QuickTools from '../../components/dashboard/Sidebar/QuickTools';
import MotivationQuote from '../../components/dashboard/Sidebar/MotivationQuote';
import AnimatedBackground from '../../components/dashboard/Layout/AnimatedBackground';
import CTASection from '../../components/dashboard/Layout/CTASection';
import LoadingDashboard from '../../components/dashboard/Loading/LoadingDashboard';
import InboxPanel from '../../components/dashboard/Inbox/InboxPanel';

export default function TutorDashboard() {
  const {
    user,
    stats,
    sessions,
    performance,
    isLoading,
    error
  } = useTutorDashboard();

  if (isLoading) {
    return <LoadingDashboard />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <TutorHeader 
          user={user}
          notifications={user?.notifications || 0}
          rating={user?.rating || 4.92}
          rank={user?.rank || 'Elite Tutor'}
          subjectRank={user?.subject_rank}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LiveStats stats={stats} />
          
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-8">
              <QuickActions 
                upcomingSessions={sessions?.filter((s: any) => 
                  s.status === 'scheduled' || s.status === 'upcoming' || s.status === 'confirmed'
                ) || []}
              />
              <SessionsPanel sessions={sessions} />
              <PerformancePanel data={performance} />
            </div>
            
            <div className="space-y-6">
              <QuickTools />
              <MotivationQuote />
              <InboxPanel />
            </div>
          </div>
          
          <CTASection />
        </div>
      </div>
    </div>
  );
}