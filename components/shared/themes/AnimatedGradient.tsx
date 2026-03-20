'use client';

import { useEffect, useState } from 'react';
import {
  useTheme,
  LAVA_GRADIENTS,
  SPACE_GRADIENTS,
  SEASON_GRADIENTS,
  SUBJECT_GRADIENTS,
  getTimeOverlay,
} from '@/components/shared/themes/ThemeProvider';
import type { LavaLampVariant, SpaceVariant, SeasonVariant, SubjectVariant } from '@/components/shared/themes/ThemeProvider';

function resolveGradient(group: string, variant: string): string {
  switch (group) {
    case 'lavalamp': return LAVA_GRADIENTS[variant as LavaLampVariant]     ?? LAVA_GRADIENTS.assi;
    case 'space':    return SPACE_GRADIENTS[variant as SpaceVariant]       ?? SPACE_GRADIENTS.stars;
    case 'seasons':  return SEASON_GRADIENTS[variant as SeasonVariant]     ?? SEASON_GRADIENTS.summer;
    case 'subjects': return SUBJECT_GRADIENTS[variant as SubjectVariant]   ?? SUBJECT_GRADIENTS.mathematics;
    default:         return LAVA_GRADIENTS.assi;
  }
}

// Per-theme atmospheric top layer — adds depth and character
const ATMOSPHERE: Record<string, string> = {
  // Lava lamp variants: warm glow at top
  assi:     'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,120,60,0.35) 0%, transparent 70%)',
  midnight: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(100,80,200,0.30) 0%, transparent 70%)',
  forest:   'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(50,160,80,0.25) 0%, transparent 70%)',
  ocean:    'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,150,220,0.30) 0%, transparent 70%)',
  sunset:   'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(247,151,30,0.35) 0%, transparent 70%)',
  aurora:   'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,195,255,0.30) 0%, transparent 70%)',
  rose:     'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(200,75,75,0.35) 0%, transparent 70%)',
  // Space: horizon glow from below
  stars:    'radial-gradient(ellipse 100% 30% at 50% 100%, rgba(76,195,247,0.12) 0%, transparent 60%)',
  starfall: 'radial-gradient(ellipse 100% 30% at 50% 100%, rgba(124,77,255,0.15) 0%, transparent 60%)',
  nebula:   'radial-gradient(ellipse 100% 40% at 50% 100%, rgba(123,47,247,0.20) 0%, transparent 60%)',
  galaxy:   'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(157,78,221,0.18) 0%, transparent 60%)',
};

export default function AnimatedGradient() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, isSentinel } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (isSentinel) {
    return <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none" style={{ backgroundColor: '#050505' }} />;
  }

  if (colorMode === 'light') {
    // Light mode: theme-tinted white background, handled mostly by CSS
    return (
      <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none" style={{ backgroundColor: '#f8f8f8' }}>
        {/* Subtle warm tint in corner */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(249,115,22,0.04) 0%, transparent 70%), radial-gradient(ellipse 50% 30% at 20% 100%, rgba(249,115,22,0.03) 0%, transparent 60%)',
        }} />
      </div>
    );
  }

  if (colorMode === 'dark') {
    return (
      <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none" style={{ backgroundColor: '#080808' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 15% 85%, rgba(255,112,60,0.07) 0%, transparent 50%), radial-gradient(ellipse at 85% 15%, rgba(255,202,79,0.05) 0%, transparent 50%)',
        }} />
      </div>
    );
  }

  const baseGradient  = resolveGradient(themeGroup, themeVariant as string);
  const atmosphere    = ATMOSPHERE[themeVariant as string] ?? '';
  const timeOverlay   = mounted ? getTimeOverlay(timeOfDay) : 'rgba(0,0,0,0)';
  const isSpace       = themeGroup === 'space';

  return (
    <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none"
      style={{
        backgroundImage: baseGradient,
        backgroundSize: '400% 400%',
        backgroundRepeat: 'no-repeat',
        animation: 'gradient-shift 18s ease-in-out infinite',
      }}
    >
      {/* Atmospheric depth layer */}
      {atmosphere && (
        <div style={{ position: 'absolute', inset: 0, backgroundImage: atmosphere, pointerEvents: 'none' }} />
      )}

      {/* Time-of-day overlay */}
      {mounted && (
        <div style={{
          position: 'absolute', inset: 0,
          background: timeOverlay,
          transition: 'background 4s ease',
          pointerEvents: 'none',
        }} />
      )}

      {/* Space: extra deep darkness for star contrast */}
      {isSpace && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', pointerEvents: 'none' }} />
      )}

      <style>{`
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}