import { useState, useEffect } from 'react';

interface PlatformStats {
  onlineTutors: number;
  totalTutors: number;
  availableSubjects: number;
}

export const useLandingStats = () => {
  const [stats, setStats] = useState<PlatformStats>({
    onlineTutors: 0,
    totalTutors: 0,
    availableSubjects: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real stats from your existing APIs
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        // Get tutor count and online status
        const tutorsResponse = await fetch('http://localhost:3001/api/tutors/public/count');
        const subjectsResponse = await fetch('http://localhost:3001/api/subjects');

        const [tutorsData, subjectsData] = await Promise.all([
          tutorsResponse.ok ? tutorsResponse.json() : { onlineCount: 0, totalCount: 0 },
          subjectsResponse.ok ? subjectsResponse.json() : { data: [] }
        ]);

        setStats({
          onlineTutors: tutorsData.onlineCount || 0,
          totalTutors: tutorsData.totalCount || 0,
          availableSubjects: subjectsData.data?.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        // Keep zeros - real data only
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealStats();

    // TODO: Add Socket.io integration for real-time updates
    // const socket = io('http://localhost:3001');
    // socket.on('tutor_online_update', (data) => {
    //   setStats(prev => ({ ...prev, onlineTutors: data.onlineCount }));
    // });

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchRealStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, isLoading };
};
