'use client';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedQuoteProps {
  className?: string;
  onComplete?: () => void;
}

const REAL_STUDENT_QUOTES = [
  "Everyone has their own learning style, and that’s okay. Your path is yours.",
  "Consistency doesnt mean a giving 100% everyday, some days are 90%, some are 10%.. Both are progress.",
  "Your journey is different from others, thats what makes us unique.",
  "It may take 10 years, it may take 1 month, but if you keep going, you will get there.",
  "Asking for help isn’t weakness.. it’s intelligence refusing to drown.",
  "Take rests, take it easy on yourself champ, but remember cars dont run on an empty tank.",
  "Stay curious, keep exploring, and never stop learning. Knowledge is endless, theres always more to discover.",
  "Your decisions today will determine where you are tomorrow, but your mistakes dont define you, they teach you."
];

export default function AnimatedQuote({
  className = '',
  onComplete
}: AnimatedQuoteProps) {
  const [quote, setQuote] = useState('');
  const [displayed, setDisplayed] = useState('');

  // Pick a random quote
  useEffect(() => {
    const q = REAL_STUDENT_QUOTES[Math.floor(Math.random() * REAL_STUDENT_QUOTES.length)];
    setQuote(q);
  }, []);

  // Typing animation
  useEffect(() => {
    if (!quote) return;
    let i = 0;

    const interval = setInterval(() => {
      setDisplayed(quote.slice(0, i));
      i++;

      if (i > quote.length) {
        clearInterval(interval);
        setTimeout(() => onComplete?.(), 2500);
      }
    }, 35); // typing speed

    return () => clearInterval(interval);
  }, [quote]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`w-full max-w-3xl mx-auto ${className}`}
    >
      <motion.div
        className="
          relative p-8 rounded-3xl 
          backdrop-blur-xl bg-white/5 border border-white/10
          shadow-[0_0_40px_rgba(255,255,255,0.05)]
          overflow-hidden
        "
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 6,
          ease: "easeInOut",
        }}
      >
        {/* Accent gradient orb */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-br from-amber-500/40 to-pink-500/40 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-br from-red-400/20 to-yellow-400/20 blur-2xl rounded-full" />
        </div>

        {/* Quote */}
        <p className="relative text-2xl md:text-3xl font-light leading-relaxed text-center">
          <span className="
            bg-gradient-to-r from-amber-300 via-pink-300 to-red-300 
            bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]
          ">
            “{displayed}”
          </span>
        </p>

        {/* Typing cursor */}
        <span className="text-amber-200 text-3xl animate-pulse">|</span>
      </motion.div>
    </motion.div>
  );
}
