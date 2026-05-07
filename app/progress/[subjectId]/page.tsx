'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { listItemVariants, listTransition } from '@/lib/motion';
import { useAuth } from '@/features/auth';
import TopicProgressView from '@/features/progress/TopicProgressView';

export default function SubjectProgressPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  const router = useRouter();
  const { user, isStudent } = useAuth();

  useEffect(() => {
    if (user && !isStudent) router.replace('/dashboard/tutor');
  }, [user, isStudent, router]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div
        variants={listItemVariants}
        initial="initial"
        animate="animate"
        transition={listTransition(0)}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/6 transition flex-shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={17} className="text-white/60" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-xl tracking-tight">Topic Progress</h1>
          <p className="text-white/35 text-sm">Your mastery across units and topics</p>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        variants={listItemVariants}
        initial="initial"
        animate="animate"
        transition={listTransition(1)}
      >
        <TopicProgressView subjectId={subjectId} />
      </motion.div>
    </div>
  );
}
