'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LavalampBackground from '@/components/ui/LavalampBackground';
import FloatingShapes from '@/components/ui/FloatingShapes';
import AnimatedQuote from '@/components/ui/AnimatedQuote';
import ServiceSelector from '@/components/ui/ServiceSelector';

export default function Home() {
  const [currentPhase, setCurrentPhase] = useState('loading');
  const [currentTheme, setCurrentTheme] = useState('caribbean-vibrant');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPhase('quote');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleServiceSelect = (service: string) => {
    console.log('Selected service:', service);
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
  };

  const displayTheme = currentPhase === 'loading' || currentPhase === 'quote' 
    ? 'caribbean-vibrant' 
    : currentTheme;

  // Only use black background for subject themes (not Caribbean intro)
  const isSubjectTheme = currentTheme !== 'caribbean-vibrant' && currentPhase === 'selection';

  return (
    <main className={`min-h-screen relative overflow-hidden ${
      isSubjectTheme ? 'bg-black' : ''
    }`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={displayTheme}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
        >
          <LavalampBackground theme={displayTheme} />
          <FloatingShapes theme={displayTheme} />
        </motion.div>
      </AnimatePresence>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
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
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ASSI
              </motion.h1>
              <motion.p
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
              />
            </motion.div>
          )}

          {currentPhase === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
            >
              <ServiceSelector 
                onServiceSelect={handleServiceSelect} 
                onThemeChange={handleThemeChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
