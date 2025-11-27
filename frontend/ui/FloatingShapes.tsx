'use client';
import { motion } from 'framer-motion';

interface ThemeColors {
  glow: string;
  accent: string;
  secondary?: string;
  tertiary?: string;
  white?: string;
}

interface OrganicShape {
  type: string;
  color: string;
  size: string;
  top: string;
  left: string;
  delay: number;
}

export default function FloatingShapes({ theme = 'caribbean-vibrant' }: { theme?: string }) {
  const themeColors: Record<string, ThemeColors> = {
    'caribbean-vibrant': { 
      glow: 'shadow-orange-400/60', 
      accent: 'bg-orange-400/50', 
      secondary: 'bg-red-400/50', 
      tertiary: 'bg-yellow-400/50',
      white: 'bg-white/40'
    },
    math: { glow: 'shadow-blue-400/70', accent: 'bg-blue-400/60' },
    english: { glow: 'shadow-purple-400/70', accent: 'bg-purple-400/60' },
    science: { glow: 'shadow-green-400/70', accent: 'bg-green-400/60' },
    business: { glow: 'shadow-teal-400/70', accent: 'bg-teal-400/60' },
    accounts: { glow: 'shadow-gray-400/70', accent: 'bg-gray-400/60' },
    it: { glow: 'shadow-indigo-400/70', accent: 'bg-indigo-400/60' },
    physics: { glow: 'shadow-blue-500/70', accent: 'bg-blue-500/60' },
    chemistry: { glow: 'shadow-orange-400/70', accent: 'bg-orange-400/60' },
    'social-studies': { glow: 'shadow-amber-400/70', accent: 'bg-amber-400/60' },
  };

  const currentTheme = themeColors[theme] || themeColors['caribbean-vibrant'];
  const isVibrant = theme === 'caribbean-vibrant';

  // Safe access to theme properties with fallbacks
  const whiteColor = isVibrant ? (currentTheme.white || 'bg-white/50') : 'bg-white/50';
  const secondaryColor = isVibrant ? (currentTheme.secondary || currentTheme.accent) : currentTheme.accent;
  const tertiaryColor = isVibrant ? (currentTheme.tertiary || 'bg-white/50') : 'bg-white/50';

  const organicShapes: OrganicShape[] = [
    { type: 'blob1', color: whiteColor, size: 'w-24 h-24', top: '15%', left: '10%', delay: 0 },
    { type: 'blob2', color: currentTheme.accent, size: 'w-32 h-32', top: '75%', left: '85%', delay: 3 },
    { type: 'blob3', color: secondaryColor, size: 'w-28 h-28', top: '50%', left: '15%', delay: 6 },
    { type: 'blob4', color: tertiaryColor, size: 'w-20 h-20', top: '25%', left: '75%', delay: 9 },
    { type: 'blob5', color: whiteColor, size: 'w-36 h-36', top: '65%', left: '45%', delay: 12 },
  ];

  const getBlobPath = (type: string): string => {
    const paths: Record<string, string> = {
      blob1: "polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)",
      blob2: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
      blob3: "polygon(25% 0%, 100% 0%, 100% 100%, 25% 100%, 0% 50%)",
      blob4: "polygon(0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%)",
      blob5: "polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)",
    };
    return paths[type] || paths.blob1;
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {organicShapes.map((shape, index) => (
        <motion.div
          key={index}
          className={`absolute ${shape.size} ${shape.color} ${currentTheme.glow} backdrop-blur-sm`}
          style={{
            top: shape.top,
            left: shape.left,
            clipPath: getBlobPath(shape.type),
            filter: isVibrant ? 'blur(1px)' : 'blur(1px) drop-shadow(0 0 10px rgba(0,0,0,0.08))',
          }}
          animate={{
            y: [0, -30, 20, -10, 0],
            x: [0, 25, -15, 30, 0],
            scale: [1, 1.15, 0.9, 1.1, 1],
            rotate: [0, 15, -10, 20, 0],
            borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '60% 40% 30% 70% / 60% 30% 70% 40%', '30% 60% 70% 40% / 50% 60% 30% 60%', '60% 30% 40% 70% / 60% 40% 60% 40%', '30% 70% 70% 30% / 30% 30% 70% 70%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        />
      ))}
    </div>
  );
}
