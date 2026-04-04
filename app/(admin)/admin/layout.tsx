'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { useViewContext } from '@/features/admin';
import AdminShell from '@/features/admin/shell/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAdmin } = useAuth();
  const { isElevated } = useViewContext();

  useEffect(() => {
    if (isLoading) return;

    // Admin is viewing as student/tutor — redirect out of admin routes
    if (isElevated) { router.replace('/'); return; }

    // Not logged in or not admin → back to signin
    if (!user || !isAdmin) { router.replace('/signin'); return; }
  }, [user, isAdmin, isLoading, isElevated, router, pathname]);

  // Still checking auth
  if (isLoading) return null;

  // Not admin — redirect is in flight
  if (!user || !isAdmin) return null;

  return <AdminShell>{children}</AdminShell>;
}
