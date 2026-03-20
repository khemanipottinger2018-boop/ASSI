import { ThemeGroup } from '../core/theme.types';

export const THEME_REGISTRY = {
  lavalamp: {
    assi: {
      gradient: 'linear-gradient(135deg, #ff703c, #ff2c2c, #ffca4f)',
      blobs: ['#FF6B35', '#FF4D4D'],
      atmosphere: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,120,60,0.35), transparent)',
    },
    ocean: {
      gradient: 'linear-gradient(135deg, #003973, #005c97, #00b4db)',
      blobs: ['#003973', '#0077b6'],
      atmosphere: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,150,220,0.30), transparent)',
    },
  },

  space: {
    stars: {
      gradient: 'linear-gradient(135deg, #0a0a1a, #0d1b2a, #1a1a2e)',
      blobs: ['#4fc3f7'],
      atmosphere: 'radial-gradient(ellipse 100% 30% at 50% 100%, rgba(76,195,247,0.12), transparent)',
    },
  },

  seasons: {
    summer: {
      gradient: 'linear-gradient(135deg, #f7971e, #ffd200)',
      blobs: ['#ffd54f'],
      atmosphere: '',
    },
  },

  events: {
    christmas: {
      gradient: 'linear-gradient(135deg, #0f9b0f, #ff0000)',
      blobs: ['#0f9b0f'],
      atmosphere: '',
    },
  },

  premium: {
    cyberpunk: {
      gradient: 'linear-gradient(135deg, #0a0a1a, #0d0d2b)',
      blobs: ['#00ffff'],
      atmosphere: '',
    },
  },
} as const;