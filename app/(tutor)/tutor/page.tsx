'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The /tutor route group is unused — role-based routing in
 * dashboard/page.tsx sends tutors to /dashboard/tutor instead.
 * This page just redirects in case anyone lands here directly.
 */
export default function TutorHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/tutor');
  }, [router]);

  return null;
}
