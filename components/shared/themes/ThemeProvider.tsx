'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from 'react';

/* =====================================================
 * TYPES
 * ===================================================== */

export type ThemeType =
  | 'assi'
  | 'math'
  | 'english'
  | 'science'
  | 'business'
  | 'accounts'
  | 'it'
  | 'physics'
  | 'chemistry'
  | 'social-studies'
  | 'sentinel'; // 🔒 C-level admin theme

/** UI colour mode:
 *  dark   = dark panels on coloured gradient (default)
 *  light  = light panels on white/light bg
 *  custom = dark panels, but user's chosen custom gradient preset
 */
export type ColorMode = 'dark' | 'light' | 'custom';

/** Custom theme presets available in settings */
export type CustomPreset =
  | 'assi'
  | 'midnight'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'aurora'
  | 'rose';

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

interface ThemeContextProps {
  theme: ThemeType;
  colorMode: ColorMode;
  customPreset: CustomPreset;
  timeOfDay: TimeOfDay;
  setTheme: (theme: ThemeType) => void;
  setColorMode: (mode: ColorMode) => void;
  setCustomPreset: (preset: CustomPreset) => void;
  isSentinel: boolean;
}

/* =====================================================
 * CONTEXT
 * ===================================================== */

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

/* =====================================================
 * HELPERS
 * ===================================================== */

function resolveTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'evening';
  return 'night';
}

/* =====================================================
 * CUSTOM PRESET GRADIENTS
 * (used when colorMode === 'custom')
 * ===================================================== */

export const CUSTOM_PRESET_GRADIENTS: Record<CustomPreset, string> = {
  assi:     'linear-gradient(135deg, #ff703c, #ff2c2c, #ffca4f)',
  midnight: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  forest:   'linear-gradient(135deg, #134e5e, #1a6b45, #71b280)',
  ocean:    'linear-gradient(135deg, #003973, #005c97, #00b4db)',
  sunset:   'linear-gradient(135deg, #f7971e, #e55d87, #ffd200)',
  aurora:   'linear-gradient(135deg, #00c3ff, #a855f7, #00ff88)',
  rose:     'linear-gradient(135deg, #c94b4b, #4b134f, #e91e63)',
};

export const CUSTOM_PRESET_LABELS: Record<CustomPreset, string> = {
  assi:     'ASSI (Default)',
  midnight: 'Midnight',
  forest:   'Forest',
  ocean:    'Ocean',
  sunset:   'Sunset',
  aurora:   'Aurora',
  rose:     'Rose',
};

export const CUSTOM_PRESET_COLORS: Record<CustomPreset, [string, string]> = {
  assi:     ['#ff703c', '#ffca4f'],
  midnight: ['#302b63', '#24243e'],
  forest:   ['#1a6b45', '#71b280'],
  ocean:    ['#005c97', '#00b4db'],
  sunset:   ['#f7971e', '#e55d87'],
  aurora:   ['#a855f7', '#00ff88'],
  rose:     ['#c94b4b', '#e91e63'],
};

/* =====================================================
 * PROVIDER
 * ===================================================== */

const LS_COLOR_MODE    = 'assi:color-mode';
const LS_CUSTOM_PRESET = 'assi:custom-preset';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]         = useState<ThemeType>('assi');
  const [colorMode, setColorModeState] = useState<ColorMode>('dark');
  const [customPreset, setPresetState] = useState<CustomPreset>('assi');

  const timeOfDay = useMemo(resolveTimeOfDay, []);

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    const storedMode   = localStorage.getItem(LS_COLOR_MODE)   as ColorMode | null;
    const storedPreset = localStorage.getItem(LS_CUSTOM_PRESET) as CustomPreset | null;
    if (storedMode)   setColorModeState(storedMode);
    if (storedPreset) setPresetState(storedPreset);
  }, []);

  /* ── Apply data-color-mode attr on <html> for CSS targeting ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-color-mode', colorMode);
  }, [colorMode]);

  /* ── Setters ── */
  function setTheme(next: ThemeType) {
    if (next === 'sentinel') { setThemeState('sentinel'); return; }
    setThemeState(next);
  }

  function setColorMode(next: ColorMode) {
    setColorModeState(next);
    localStorage.setItem(LS_COLOR_MODE, next);
  }

  function setCustomPreset(next: CustomPreset) {
    setPresetState(next);
    localStorage.setItem(LS_CUSTOM_PRESET, next);
  }

  const value = useMemo(() => ({
    theme,
    colorMode,
    customPreset,
    timeOfDay,
    setTheme,
    setColorMode,
    setCustomPreset,
    isSentinel: theme === 'sentinel',
  }), [theme, colorMode, customPreset, timeOfDay]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/* =====================================================
 * HOOK
 * ===================================================== */

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
