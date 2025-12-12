'use client';

import { motion } from 'framer-motion';
import { BookOpen, Users, Zap, Filter, RefreshCw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TutorsHeaderProps {
  subjectName: string;
  theme: string;
  tutorCount: number;
  loading: boolean;
  onlineTutors?: number;
  availableTutors?: number;
  onRefresh?: () => void;
  onFilter?: () => void;
  showBackButton?: boolean;
}

export default function TutorsHeader({ 
  subjectName, 
  theme, 
  tutorCount, 
  loading, 
  onlineTutors = 0,
  availableTutors = 0,
  onRefresh,
  onFilter,
  showBackButton = true
}: TutorsHeaderProps) {
  const router = useRouter();
  
  const getThemeGradient = () => {
    const gradients = {
      'math': 'from-blue-600 to-purple-700',
      'science': 'from-green-600 to-teal-700', 
      'english': 'from-red-600 to-pink-700',
      'it': 'from-indigo-600 to-blue-700',
      'business': 'from-amber-600 to-orange-700',
      'arts': 'from-purple-600 to-pink-700',
      'language': 'from-emerald-600 to-green-700',
      'caribbean-vibrant': 'from-blue-600 via-purple-600 to-blue-800'
    };
    return gradients[theme as keyof typeof gradients] || gradients['caribbean-vibrant'];
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className={`bg-gradient-to-r ${getThemeGradient()} text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with actions */}
        <div className="flex items-center justify-between py-4">
          {showBackButton && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Subjects</span>
            </motion.button>
          )}
          
          <div className="flex items-center gap-3">
            {onFilter && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onFilter}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors"
              >
                <Filter size={16} />
                <span className="hidden sm:inline">Filter</span>
              </motion.button>
            )}
            
            {onRefresh && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Main header content */}
        <div className="py-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-3 mb-4">
              <BookOpen size={36} className="text-white/80" />
              <h1 className="text-3xl md:text-4xl font-bold">Available Tutors</h1>
            </div>
            
            <p className="text-lg md:text-xl text-white/80 mb-6">
              For <span className="font-semibold text-white">{subjectName}</span>
            </p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold">
                  {loading ? '...' : tutorCount}
                </div>
                <div className="text-sm text-white/80 mt-1">Total Tutors</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold text-green-300">
                  {loading ? '...' : onlineTutors}
                </div>
                <div className="text-sm text-white/80 mt-1 flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Online Now
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="text-2xl font-bold">
                  {loading ? '...' : availableTutors}
                </div>
                <div className="text-sm text-white/80 mt-1">Available</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-center gap-2">
                  <Zap size={20} className="text-yellow-300" />
                  <div className="text-2xl font-bold">Live</div>
                </div>
                <div className="text-sm text-white/80 mt-1">Instant Chat</div>
              </div>
            </div>

            {/* Quick tip */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/60 text-sm mt-6 max-w-md"
            >
              💡 <span className="font-medium">Tip:</span> Green status means tutor is online and ready for instant chat!
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}