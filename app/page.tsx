'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingShapes from '../frontend/ui/themes/FloatingBlobs';
import AnimatedQuote from '../frontend/ui/AnimatedQuote';
import ServiceSelector from '../frontend/ui/service-selector/ServiceSelector';

export default function Home() {
  const [currentPhase, setCurrentPhase] = useState<'loading' | 'quote' | 'selection'>('loading');
  const [currentTheme, setCurrentTheme] = useState('caribbean-vibrant');

  // Initial loading -> quote
  useEffect(() => {
    const timer = setTimeout(() => setCurrentPhase('quote'), 1800);
    return () => clearTimeout(timer);
  }, []);

  const displayTheme = currentPhase === 'loading' || currentPhase === 'quote' 
    ? 'caribbean-vibrant' 
    : currentTheme;

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      <h1 className="sr-only">ASSI - Your Warm, Soulful Study Sidekick</h1>
      
      {/* Background */}
      <div className="fixed inset-0 w-full h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={displayTheme}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2,
              ease: "easeInOut"
            }}
            className="w-full h-full"
          >
            <FloatingShapes theme={displayTheme} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 md:p-6">
        <AnimatePresence mode="wait">
          {currentPhase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center text-white drop-shadow-2xl"
            >
              {/* ASSI Logo */}
              <motion.div
                className="relative"
                initial={{ rotateY: 0 }}
                animate={{ rotateY: 360 }}
                transition={{ 
                  duration: 2.5, 
                  ease: "easeInOut"
                }}
              >
                <motion.h1
                  className="text-7xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-amber-300 via-pink-400 to-orange-400 bg-clip-text text-transparent"
                  animate={{ 
                    scale: [1, 1.08, 1]
                  }}
                  transition={{ 
                    duration: 2.8, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  ASSI
                </motion.h1>
              </motion.div>
              
              {/* Loading text */}
              <motion.p
                className="text-white/90 mt-6 text-lg md:text-xl font-light"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ 
                  duration: 2.2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Your study sanctuary is preparing...
              </motion.p>

              {/* Loading dots */}
              <motion.div className="flex justify-center mt-8 space-x-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-pink-500"
                    animate={{ 
                      scale: [1, 1.6, 1],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {currentPhase === 'quote' && (
            <motion.div
              key="quote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-3xl px-4"
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6,
                ease: "easeOut"
              }}
              className="flex flex-col items-center w-full"
            >
              {/* Just the Service Selector - no extra text */}
              <ServiceSelector onThemeChange={setCurrentTheme} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}