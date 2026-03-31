'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';

export default function ProfileRouterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/signin');
      return;
    }

    switch (user.role) {
      case 'student':         router.replace('/profile/student');         break;
      case 'tutor':           router.replace('/profile/tutor');           break;
      case 'tutor_applicant': router.replace('/profile/tutor'); break;
      case 'admin':           router.replace('/profile/admin');           break;
      default:                router.replace('/dashboard');               break;
    }
  }, [user, isLoading, router]);

  // Render nothing — redirect happens in effect
  return null;
}