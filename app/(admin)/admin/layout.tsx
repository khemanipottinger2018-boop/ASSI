'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

const UNDERCOVER_KEY = 'sentinel:undercover';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // If undercover mode is active, admin should not be on the dashboard at all
    const uc = localStorage.getItem(UNDERCOVER_KEY);
    if (uc === 'student' || uc === 'tutor') {
      router.replace('/');
    }
  }, [router]);

  return <AdminShell>{children}</AdminShell>;
}
