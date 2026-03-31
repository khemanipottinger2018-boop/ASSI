'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/'); // MAYBE '/signin' 
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Loading dashboard…
      </div>
    );
  }

  if (!user) {
    return null; // prevents flash
  }

  return (
    <div className="min-h-screen bg-black/40 backdrop-blur-xl">
      {children}
    </div>
  );
}
