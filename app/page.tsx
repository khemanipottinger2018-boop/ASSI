'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LavalampBackground from '../frontend/ui/LavalampBackground';
import FloatingShapes from '../frontend/ui/FloatingShapes';
import AnimatedQuote from '../frontend/ui/AnimatedQuote';
import ServiceSelector from '../frontend/ui/ServiceSelector';
import { useLandingStats } from '../hooks/useLandingStats';

export default function Home() {
  const [currentPhase, setCurrentPhase] = useState<'loading' | 'quote' | 'selection'>('loading');
  const [currentTheme, setCurrentTheme] = useState('caribbean-vibrant');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { stats, isLoading: statsLoading } = useLandingStats();

  // Initial loading -> quote
  useEffect(() => {
    const timer = setTimeout(() => setCurrentPhase('quote'), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Handle service selection - SIMPLIFIED
  const handleServiceSelect = async (serviceType: string) => {
    setError('');
    setIsLoading(true);

    try {
      console.log(`Selected service: ${serviceType}`);
      
      // Each service type will handle its own redirect in ServiceSelector
      // This function is now just for tracking/logging
      
    } catch (err) {
      console.error('Service selection error:', err);
      setError('Unable to proceed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine theme to display
  const displayTheme =
    currentPhase === 'loading' || currentPhase === 'quote'
      ? 'caribbean-vibrant'
      : currentTheme;

  const isSubjectTheme = currentTheme !== 'caribbean-vibrant' && currentPhase === 'selection';

  return (
    <main className="min-h-screen relative overflow-hidden bg-black"> {/* Force black background */}
      <h1 className="sr-only">ASSI - Academic Support & Study Initiative</h1>
      
      {/* Background Container - FIXED: Ensure it covers entire viewport */}
      <div className="fixed inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayTheme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="w-full h-full"
          >
            <LavalampBackground theme={displayTheme} />
            <FloatingShapes theme={displayTheme} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md text-center"
          >
            ⚠️ {error}
            <button 
              onClick={() => setError('')}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Real-time Platform Stats */}
        {currentPhase === 'selection' && !statsLoading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-4 right-4 bg-black/30 backdrop-blur-sm rounded-lg p-4 text-white border border-white/20 z-40"
          >
            <div className="text-xs space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{stats.onlineTutors || 0} tutors online</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{stats.totalTutors || 0} total tutors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>{stats.availableSubjects || 0} subjects</span>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentPhase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="text-center text-white drop-shadow-2xl"
            >
              <motion.h1
                className="text-7xl font-bold mb-4"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                ASSI
              </motion.h1>
              <motion.p
                className="text-white mt-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Your Assignment Assistant is loading...
              </motion.p>
            </motion.div>
          )}

          {currentPhase === 'quote' && (
            <motion.div
              key="quote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <AnimatedQuote
                text="Education is the most powerful weapon which you can use to change the world."
                onComplete={() => setCurrentPhase('selection')}
                className="text-white"
              />
            </motion.div>
          )}

          {currentPhase === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center w-full"
            >
              {/* Service selector - REMOVED onServiceSelect since it causes confusion */}
              <ServiceSelector onThemeChange={setCurrentTheme} />

              {/* Loading State for Redirect */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-white text-center"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Redirecting to selected service...</p>
                </motion.div>
              )}

              {/* Enhanced Call to Action with Real Stats */}
              {!isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 text-center text-white/80 max-w-md"
                >
                  <p className="text-sm mb-4">
                    Join <span className="text-green-400 font-semibold">{stats.totalTutors || 0}+ tutors</span> and thousands of students learning right now
                  </p>
                  <div className="mt-4 flex justify-center space-x-4 text-xs">
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                      {stats.onlineTutors || 0} Online Now
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Live Chat
                    </div>
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      {stats.availableSubjects || 0} Subjects
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
