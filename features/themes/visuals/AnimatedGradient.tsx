'use client';

import { useEffect, useState } from 'react';
import {
  useTheme,
  LAVA_GRADIENTS,
  SPACE_GRADIENTS,
  SEASON_GRADIENTS,
  SUBJECT_GRADIENTS,
  getTimeOverlay,
} from '@/features/themes/core/ThemeProvider';
import type { LavaLampVariant, SpaceVariant, SeasonVariant, SubjectVariant, PremiumVariant } from '@/features/themes/core/ThemeProvider';
import { PREMIUM_GRADIENTS } from '@/features/themes/core/ThemeProvider';

function resolveGradient(group: string, variant: string): string {
  switch (group) {
    case 'lavalamp': return LAVA_GRADIENTS[variant as LavaLampVariant]     ?? LAVA_GRADIENTS.assi;
    case 'space':    return SPACE_GRADIENTS[variant as SpaceVariant]       ?? SPACE_GRADIENTS.stars;
    case 'seasons':  return SEASON_GRADIENTS[variant as SeasonVariant]     ?? SEASON_GRADIENTS.summer;
    case 'subjects': return SUBJECT_GRADIENTS[variant as SubjectVariant]   ?? SUBJECT_GRADIENTS.mathematics;
    case 'premium':  return PREMIUM_GRADIENTS[variant as PremiumVariant]   ?? PREMIUM_GRADIENTS.cyberpunk;
    default:         return LAVA_GRADIENTS.assi;
  }
}

// Per-theme atmospheric top layer — adds depth and character
const ATMOSPHERE: Record<string, string> = {
  // LavaLamp
  lavalamp_assi: 'radial-gradient(circle at 20% 30%, rgba(255,120,80,0.25), transparent 60%)',
  lavalamp_midnight: 'radial-gradient(circle at 80% 20%, rgba(120,80,255,0.25), transparent 60%)',
  lavalamp_forest: 'radial-gradient(circle at 30% 70%, rgba(80,200,120,0.25), transparent 60%)',
  lavalamp_ocean: 'radial-gradient(circle at 70% 60%, rgba(80,160,255,0.25), transparent 60%)',
  lavalamp_sunset: 'radial-gradient(circle at 50% 50%, rgba(255,140,80,0.25), transparent 60%)',
  lavalamp_aurora: 'radial-gradient(circle at 40% 20%, rgba(120,255,200,0.25), transparent 60%)',
  lavalamp_rose: 'radial-gradient(circle at 60% 80%, rgba(255,120,160,0.25), transparent 60%)',

  // Space
  space_stars: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
  space_starfall: 'linear-gradient(120deg, rgba(255,255,255,0.15), transparent)',
  space_nebula: 'radial-gradient(circle at 30% 30%, rgba(180,120,255,0.2), transparent)',
  space_galaxy: 'radial-gradient(circle at 70% 70%, rgba(120,160,255,0.2), transparent)',

  // Premium
  premium_cyberpunk: 'linear-gradient(135deg, rgba(255,0,128,0.2), rgba(0,255,255,0.2))',
  premium_ocean: 'radial-gradient(circle at 50% 50%, rgba(0,180,255,0.2), transparent)',
  premium_lofi: 'linear-gradient(135deg, rgba(255,200,150,0.15), rgba(150,180,255,0.15))',
};

export default function AnimatedGradient() {
  const { themeGroup, themeVariant, colorMode, timeOfDay, nightIntensity, isSentinel } = useTheme();
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
  const atmosphereKey = `${themeGroup}_${themeVariant}`;
  const atmosphere = ATMOSPHERE[atmosphereKey] ?? '';
  const timeOverlay   = mounted ? getTimeOverlay(timeOfDay, nightIntensity) : 'rgba(0,0,0,0)';
  const isSpace       = themeGroup === 'space';
  const isPremium     = themeGroup === 'premium';

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

      {/* Space / cyberpunk: extra deep darkness */}
      {(isSpace || isPremium) && (
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
