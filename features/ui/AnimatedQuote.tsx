'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface AnimatedQuoteProps {
  className?: string;
  onComplete?: () => void;
}

/* =====================================================
 * ASSI QUOTES (Human, grounded)
 * ===================================================== */

const QUOTES = [
  "Dont worry about how youll finish, just focus on starting.",
  "You’re not behind. Youre moving at your own pace.",
  "Some days feel heavy because you actually care. That’s not a flaw.",
  "Progress isn’t loud. Most of it happens quietly when no one is watching.",
  "You don’t have to be perfect to be consistent.",
  "It’s okay if today was slower than yesterday. You still showed up.",
  "You’re allowed to learn at your own pace.",
  "Not every effort feels rewarding immediately.",
  "Some ups, some downs, Its okay to pause, you're refueling.. not stopping.",
  "You’ve survived things you thought would break you.",
  "Growth feels uncomfortable because change hurts. Our muscles break to rebuild stronger.",
  "You don’t need permission to believe in what you’re building.",
  "Discipline doesn’t mean being harsh with yourself.",
  "Small beginnings still matter. Its proof that you started.",
  "It’s okay to ask for help early.",
  "You journey is different to your neighbors. Honor your own path.",
  "Some lessons come from mistakes, failure, patience, and more.",
  "Difficulty does not make you weak. You just don’t understand it yet.",
  "Theres no fastlane to success. Everyone arrives at their own time.",
  "Quiet steps attract less attention, less distractions",
  "Some days discipline looks like rest.",
  "You’re not lazy. You’re human.",
  "Even slow progress counts.",
  "Some nights are for breathing.",
  "Be proud of even the smallest of wins.",
  "Continue to be productive, even when you dont see progress immediately.",
  "You did it once, you can do it again.",
  "Today surviving was enough.",
  "You’re doing better than you think.",
] as const;

/* =====================================================
 * COMPONENT
 * ===================================================== */

export default function AnimatedQuote({
  className = '',
  onComplete,
}: AnimatedQuoteProps) {
  const [quote, setQuote] = useState('');
  const [visibleText, setVisibleText] = useState('');
  const [phase, setPhase] = useState<'opening' | 'holding' | 'closing'>('opening');

  // Pick quote once
  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  // Text reveal
  useEffect(() => {
    if (!quote) return;

    let index = 0;
    const interval = setInterval(() => {
      setVisibleText(quote.slice(0, index));
      index++;

      if (index > quote.length) {
        clearInterval(interval);
        setPhase('holding');

        // Let user read
        setTimeout(() => {
          setPhase('closing');
        }, 2600);

        // Exit after close
        setTimeout(() => {
          onComplete?.();
        }, 3800);
      }
    }, 26);

    return () => clearInterval(interval);
  }, [quote, onComplete]);

  return (
    <motion.div
      className={`relative mx-auto max-w-2xl px-8 ${className}`}
      initial={{
        opacity: 0,
        scale: 0.96,
        y: 12,
        filter: 'blur(6px)',
      }}
      animate={{
        opacity: phase === 'closing' ? 0 : 1,
        scale: phase === 'closing' ? 0.94 : 1,
        y: phase === 'closing' ? 10 : 0,
        filter: phase === 'closing' ? 'blur(6px)' : 'blur(0px)',
      }}
      transition={{
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Surface */}
      <motion.div
        className="
          relative
          rounded-3xl
          glass-soft
          shadow-[0_20px_60px_rgba(0,0,0,0.35)]
          px-8 py-10
          text-center
        "
        animate={{
          scaleY: phase === 'opening' ? 1 : phase === 'closing' ? 0.92 : 1,
        }}
        transition={{
          duration: 1.1,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* Quote */}
        <p className="text-white text-lg md:text-xl leading-relaxed">
          {visibleText}
        </p>

        {/* Signature */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{
            opacity: phase === 'holding' ? 0.7 : 0,
            y: phase === 'holding' ? 0 : 6,
          }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="mt-5 text-sm text-white/70"
        >
          — ASSI
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
