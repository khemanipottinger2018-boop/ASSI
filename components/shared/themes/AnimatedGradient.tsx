'use client';

import { useTheme, ThemeType, CUSTOM_PRESET_GRADIENTS } from '@/components/shared/themes/ThemeProvider';

/* =====================================================
 * GRADIENT DEFINITIONS  (used in dark + subject modes)
 * ===================================================== */

const THEME_GRADIENTS: Record<ThemeType, string> = {
  assi:           'linear-gradient(135deg, #ff703c, #ff2c2c, #ffca4f)',
  math:           'linear-gradient(135deg, #2980b9, #3498db, #5dade2)',
  english:        'linear-gradient(135deg, #8e44ad, #9b59b6, #bb8fce)',
  science:        'linear-gradient(135deg, #27ae60, #2ecc71, #58d68d)',
  business:       'linear-gradient(135deg, #16a085, #1abc9c, #48c9b0)',
  accounts:       'linear-gradient(135deg, #2c3e50, #34495e, #7f8c8d)',
  it:             'linear-gradient(135deg, #674172, #7d66a8, #a29bfe)',
  physics:        'linear-gradient(135deg, #1e3799, #3867d6, #56ccf2)',
  chemistry:      'linear-gradient(135deg, #e67e22, #f39c12, #f8c471)',
  'social-studies':'linear-gradient(135deg, #8d6e63, #aa8e83, #c7b2a9)',
  sentinel:       'none',
};

export default function AnimatedGradient() {
  const { theme, colorMode, customPreset, timeOfDay, isSentinel } = useTheme();

  /* ── Sentinel: always pitch dark ── */
  if (isSentinel) {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundColor: '#050505' }}
      />
    );
  }

  /* ── Light mode: soft neutral background ── */
  if (colorMode === 'light') {
    return (
      <div
        aria-hidden
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{ backgroundColor: '#f0f0f0' }}
      />
    );
  }

  /* ── Custom mode: user's chosen preset gradient ── */
  const baseGradient =
    colorMode === 'custom'
      ? CUSTOM_PRESET_GRADIENTS[customPreset]
      : THEME_GRADIENTS[theme];

  const gradient =
    timeOfDay === 'night'
      ? `linear-gradient(135deg,rgba(0,0,0,0.35),rgba(0,0,0,0.35)), ${baseGradient}`
      : baseGradient;

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-20 pointer-events-none animate-gradient-shift"
      style={{
        backgroundImage: gradient,
        backgroundSize: '400% 400%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '0% 50%',
      }}
    >
      <style jsx>{`
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 16s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
