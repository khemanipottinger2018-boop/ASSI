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

  // Seasons
  seasons_dry:    'radial-gradient(ellipse at 80% 10%, rgba(255,180,60,0.22), transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(230,120,40,0.15), transparent 50%)',
  seasons_rainy:  'radial-gradient(ellipse at 30% 20%, rgba(80,120,180,0.22), transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(60,100,160,0.15), transparent 50%)',
  seasons_spring: 'radial-gradient(ellipse at 60% 30%, rgba(100,200,80,0.20), transparent 55%), radial-gradient(ellipse at 30% 80%, rgba(160,220,100,0.12), transparent 50%)',
  seasons_summer: 'radial-gradient(ellipse at 50% 10%, rgba(255,210,60,0.24), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(255,160,40,0.14), transparent 50%)',
  seasons_autumn: 'radial-gradient(ellipse at 40% 30%, rgba(220,90,50,0.22), transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(160,60,120,0.14), transparent 50%)',
  seasons_winter: 'radial-gradient(ellipse at 50% 0%,  rgba(160,200,240,0.22), transparent 55%), radial-gradient(ellipse at 20% 90%, rgba(180,220,255,0.12), transparent 50%)',
};

const WEATHER_ATMOSPHERE: Record<string, string> = {
  clear:   '',
  sunny:   'radial-gradient(ellipse at 60% 0%, rgba(255,220,100,0.18), transparent 50%)',
  cloudy:  'radial-gradient(ellipse at 50% 30%, rgba(160,160,180,0.20), transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(140,140,160,0.12), transparent 55%)',
  rainy:   'radial-gradient(ellipse at 40% 20%, rgba(80,110,160,0.25), transparent 55%), radial-gradient(ellipse at 60% 80%, rgba(60,90,140,0.18), transparent 50%)',
  stormy:  'radial-gradient(ellipse at 50% 40%, rgba(40,40,60,0.35),  transparent 60%), radial-gradient(ellipse at 20% 20%, rgba(60,50,80,0.20), transparent 50%)',
  foggy:   'radial-gradient(ellipse at 50% 50%, rgba(200,200,210,0.28), transparent 70%)',
  windy:   'linear-gradient(115deg, rgba(200,220,255,0.08) 0%, transparent 60%, rgba(200,220,255,0.06) 100%)',
};

export default function AnimatedGradient() {
  const {
    themeGroup, themeVariant, colorMode, timeOfDay,
    nightIntensity, timeAuto, isSentinel,
    seasonAuto, currentSeason,
    weatherAuto, currentWeather,
  } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (isSentinel) {
    return <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none" style={{ backgroundColor: '#050505' }} />;
  }

  /* ── Neutral modes — no themed gradient ── */
  const lightBg = (
    <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none" style={{ backgroundColor: '#f8f8f8' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 40% at 80% 0%, rgba(249,115,22,0.04) 0%, transparent 70%), radial-gradient(ellipse 50% 30% at 20% 100%, rgba(249,115,22,0.03) 0%, transparent 60%)',
      }} />
    </div>
  );
  const darkBg = (
    <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none" style={{ backgroundColor: '#050505' }} />
  );

  if (colorMode === 'light') return lightBg;

  if (colorMode === 'dark') return darkBg;

  if (colorMode === 'system') {
    // Prefer dark if not yet mounted (SSR safe) or OS prefers dark
    const prefersDark = !mounted || !window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersDark ? darkBg : lightBg;
  }

  // colorMode === 'custom' — render themed gradient
  const baseGradient  = resolveGradient(themeGroup, themeVariant as string);
  const atmosphereKey = `${themeGroup}_${themeVariant}`;
  const atmosphere    = ATMOSPHERE[atmosphereKey] ?? '';
  const timeOverlay   = (mounted && timeAuto) ? getTimeOverlay(timeOfDay, nightIntensity) : 'rgba(0,0,0,0)';
  const isSpace       = themeGroup === 'space';
  const isPremium     = themeGroup === 'premium';

  const seasonAtmosphere  = seasonAuto  ? (ATMOSPHERE[`seasons_${currentSeason}`] ?? '')    : '';
  const weatherAtmosphere = weatherAuto ? (WEATHER_ATMOSPHERE[currentWeather]     ?? '')    : '';

  return (
    <div aria-hidden className="fixed inset-0 -z-20 pointer-events-none"
      style={{
        backgroundImage: baseGradient,
        backgroundSize: '400% 400%',
        backgroundRepeat: 'no-repeat',
        animation: 'gradient-shift 18s ease-in-out infinite',
      }}
    >
      {/* Layer 1: base theme atmosphere */}
      {atmosphere && (
        <div style={{ position: 'absolute', inset: 0, backgroundImage: atmosphere, pointerEvents: 'none' }} />
      )}

      {/* Layer 2: seasonal atmosphere overlay — only when seasonAuto is on */}
      {seasonAtmosphere && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: seasonAtmosphere,
          transition: 'background-image 6s ease',
          mixBlendMode: 'screen',
          opacity: 0.85,
          pointerEvents: 'none',
        }} />
      )}

      {/* Layer 3: weather atmosphere overlay — only when weatherAuto is on */}
      {weatherAtmosphere && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: weatherAtmosphere,
          transition: 'background-image 8s ease',
          mixBlendMode: 'screen',
          opacity: currentWeather === 'stormy' ? 1.0 : 0.75,
          pointerEvents: 'none',
        }} />
      )}

      {/* Layer 4: time-of-day overlay */}
      {mounted && (
        <div style={{
          position: 'absolute', inset: 0,
          background: timeOverlay,
          transition: 'background 4s ease',
          pointerEvents: 'none',
        }} />
      )}

      {/* Base darkness overlay — keeps surfaces neutral against the gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.30)', pointerEvents: 'none' }} />

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
