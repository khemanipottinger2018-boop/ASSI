'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { motion } from 'framer-motion';

export default function DashboardIndexPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/signin');
      return;
    }

    switch (user.role) {
      case 'student':         router.replace('/dashboard/student'); break;
      case 'tutor':           router.replace('/dashboard/tutor');   break;
      case 'tutor_applicant': router.replace('/dashboard/tutor');   break;
      case 'admin':           router.replace('/admin');             break;
      default:                router.replace('/dashboard/student'); break;
    }
  }, [user, isLoading, router]);

  // Show a minimal pulse while auth resolves — never a blank screen
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        className="glass-soft rounded-2xl px-6 py-3"
      >
        <p className="text-white/40 text-sm">Loading…</p>
      </motion.div>
    </div>
  );
}