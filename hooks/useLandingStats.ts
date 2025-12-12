// hooks/useLandingStats.ts
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        // Use your actual backend routes
        const [tutorsResponse, subjectsResponse] = await Promise.all([
          fetch(`${API_URL}/api/tutors/public/count`),
          fetch(`${API_URL}/api/subjects/public`)
        ]);

        const tutorsData = tutorsResponse.ok ? await tutorsResponse.json() : { onlineTutors: 0, totalTutors: 0 };
        const subjectsData = subjectsResponse.ok ? await subjectsResponse.json() : { subjects: [] };

        setStats({
          onlineTutors: tutorsData.onlineTutors || 0,
          totalTutors: tutorsData.totalTutors || 0,
          availableSubjects: subjectsData.count || subjectsData.subjects?.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch platform stats:', error);
        // Keep zeros if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealStats();

    // Refresh stats every 30 seconds (only in production/development)
    if (process.env.NODE_ENV !== 'test') {
      const interval = setInterval(fetchRealStats, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  return { stats, isLoading };
};