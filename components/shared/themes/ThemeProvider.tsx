'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// =============================================================================
// THEME GROUPS
// =============================================================================

export type ThemeGroup =
  | 'lavalamp'   // Lava lamp blob themes
  | 'space'      // Space / cosmic themes
  | 'seasons'    // Seasonal themes
  | 'subjects'   // Subject-based themes
  | 'sentinel';  // 🔒 Admin only

// =============================================================================
// THEME VARIANTS PER GROUP
// =============================================================================

export type LavaLampVariant =
  | 'assi'       // Default — orange/red/gold
  | 'midnight'   // Deep blue/purple
  | 'forest'     // Green
  | 'ocean'      // Blue
  | 'sunset'     // Orange/pink
  | 'aurora'     // Cyan/purple
  | 'rose';      // Pink/red

export type SpaceVariant =
  | 'stars'      // Peaceful drifting stars
  | 'starfall'   // Shooting stars
  | 'nebula'     // Deep space colors
  | 'galaxy';    // Spiral galaxy effect

export type SeasonVariant =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'dry'        // Caribbean dry season
  | 'rainy';     // Caribbean rainy season

export type SubjectVariant =
  | 'mathematics'  // All math subjects
  | 'sciences'     // Biology, Chemistry, Physics etc.
  | 'languages'    // English, Spanish, French etc.
  | 'business'     // Business, Accounts, Economics etc.
  | 'technology'   // IT, Computer Science etc.
  | 'arts'         // History, Geography, Visual Arts etc.
  | 'health';      // PE, Food & Nutrition etc.

export type ThemeVariant =
  | LavaLampVariant
  | SpaceVariant
  | SeasonVariant
  | SubjectVariant
  | 'sentinel';

// Legacy compat
export type ThemeType = ThemeVariant;
export type CustomPreset = LavaLampVariant;
export type ColorMode = 'dark' | 'light' | 'custom';
export type TimeOfDay = 'dawn' | 'morning' | 'day' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight';

// =============================================================================
// COLOR DEFINITIONS
// =============================================================================

export const LAVA_GRADIENTS: Record<LavaLampVariant, string> = {
  assi:     'linear-gradient(135deg, #ff703c, #ff2c2c, #ffca4f)',
  midnight: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  forest:   'linear-gradient(135deg, #134e5e, #1a6b45, #71b280)',
  ocean:    'linear-gradient(135deg, #003973, #005c97, #00b4db)',
  sunset:   'linear-gradient(135deg, #f7971e, #e55d87, #ffd200)',
  aurora:   'linear-gradient(135deg, #00c3ff, #a855f7, #00ff88)',
  rose:     'linear-gradient(135deg, #c94b4b, #4b134f, #e91e63)',
};

export const LAVA_BLOB_COLORS: Record<LavaLampVariant, string[]> = {
  assi:     ['#FF6B35', '#FF4D4D', '#FFD166'],
  midnight: ['#302b63', '#7c3aed', '#1e1b4b'],
  forest:   ['#134e5e', '#1a6b45', '#71b280'],
  ocean:    ['#003973', '#0077b6', '#00b4db'],
  sunset:   ['#f7971e', '#e55d87', '#ffd200'],
  aurora:   ['#00c3ff', '#a855f7', '#00ff88'],
  rose:     ['#c94b4b', '#e91e63', '#4b134f'],
};

export const SPACE_GRADIENTS: Record<SpaceVariant, string> = {
  stars:    'linear-gradient(135deg, #0a0a1a, #0d1b2a, #1a1a2e)',
  starfall: 'linear-gradient(135deg, #050510, #0d0d2b, #1a0a2e)',
  nebula:   'linear-gradient(135deg, #0d0221, #240046, #3a0ca3)',
  galaxy:   'linear-gradient(135deg, #03045e, #023e8a, #9d4edd)',
};

export const SPACE_BLOB_COLORS: Record<SpaceVariant, string[]> = {
  stars:    ['#4fc3f7', '#e0e0e0', '#90caf9'],
  starfall: ['#7c4dff', '#e040fb', '#40c4ff'],
  nebula:   ['#7b2ff7', '#f72585', '#4cc9f0'],
  galaxy:   ['#9d4edd', '#4361ee', '#4cc9f0'],
};

export const SEASON_GRADIENTS: Record<SeasonVariant, string> = {
  spring: 'linear-gradient(135deg, #a8edea, #fed6e3, #c3f5c8)',
  summer: 'linear-gradient(135deg, #f7971e, #ffd200, #21d190)',
  autumn: 'linear-gradient(135deg, #c94b4b, #e67e22, #f39c12)',
  winter: 'linear-gradient(135deg, #e0eafc, #cfdef3, #a8c0ff)',
  dry:    'linear-gradient(135deg, #f7971e, #ffd200, #56ab2f)',
  rainy:  'linear-gradient(135deg, #373b44, #4286f4, #5c6bc0)',
};

export const SEASON_BLOB_COLORS: Record<SeasonVariant, string[]> = {
  spring: ['#f48fb1', '#a5d6a7', '#80deea'],
  summer: ['#ffd54f', '#4db6ac', '#ff8a65'],
  autumn: ['#ff7043', '#ffa726', '#8d6e63'],
  winter: ['#90caf9', '#b0bec5', '#e0e0e0'],
  dry:    ['#ffcc02', '#ff9800', '#8bc34a'],
  rainy:  ['#5c6bc0', '#4fc3f7', '#7986cb'],
};

export const SUBJECT_GRADIENTS: Record<SubjectVariant, string> = {
  mathematics: 'linear-gradient(135deg, #1565c0, #1976d2, #42a5f5)',
  sciences:    'linear-gradient(135deg, #1b5e20, #2e7d32, #66bb6a)',
  languages:   'linear-gradient(135deg, #6a1b9a, #8e24aa, #ce93d8)',
  business:    'linear-gradient(135deg, #004d40, #00695c, #4db6ac)',
  technology:  'linear-gradient(135deg, #1a237e, #283593, #7986cb)',
  arts:        'linear-gradient(135deg, #bf360c, #e64a19, #ff8a65)',
  health:      'linear-gradient(135deg, #880e4f, #c2185b, #f48fb1)',
};

export const SUBJECT_BLOB_COLORS: Record<SubjectVariant, string[]> = {
  mathematics: ['#1976d2', '#42a5f5', '#1565c0'],
  sciences:    ['#2e7d32', '#66bb6a', '#a5d6a7'],
  languages:   ['#8e24aa', '#ce93d8', '#6a1b9a'],
  business:    ['#00695c', '#4db6ac', '#80cbc4'],
  technology:  ['#283593', '#5c6bc0', '#9fa8da'],
  arts:        ['#e64a19', '#ff8a65', '#ffccbc'],
  health:      ['#c2185b', '#f48fb1', '#fce4ec'],
};

// Subject → variant mapping (for auto-switching)
export const SUBJECT_NAME_TO_VARIANT: Record<string, SubjectVariant> = {
  // Mathematics
  'Mathematics': 'mathematics', 'Additional Mathematics': 'mathematics',
  'Pure Mathematics': 'mathematics', 'Applied Mathematics': 'mathematics',
  'Integrated Mathematics': 'mathematics',
  // Sciences
  'Biology': 'sciences', 'Chemistry': 'sciences', 'Physics': 'sciences',
  'Human and Social Biology': 'sciences', 'Integrated Science': 'sciences',
  'Agricultural Science': 'sciences', 'Environmental Science': 'sciences',
  // Languages
  'English A': 'languages', 'English B': 'languages', 'Spanish': 'languages',
  'French': 'languages', 'Portuguese': 'languages',
  'Communication Studies': 'languages', 'Literatures in English': 'languages',
  // Business
  'Principles of Business': 'business', 'Principles of Accounts': 'business',
  'Economics': 'business', 'Accounting': 'business',
  'Management of Business': 'business', 'Entrepreneurship': 'business',
  'Financial Services Studies': 'business',
  'Logistics and Supply Chain Operations': 'business',
  // Technology
  'Information Technology': 'technology', 'Computer Science': 'technology',
  'Electronic Document Preparation and Management': 'technology',
  'Digital Media': 'technology', 'Animation and Game Design': 'technology',
  'Electrical and Electronic Engineering Technology': 'technology',
  // Arts & Social
  'Caribbean History': 'arts', 'History': 'arts', 'Geography': 'arts',
  'Social Studies': 'arts', 'Caribbean Studies': 'arts', 'Sociology': 'arts',
  'Religious Education': 'arts', 'Visual Arts': 'arts', 'Theatre Arts': 'arts',
  'Music': 'arts', 'Performing Arts': 'arts', 'Office Administration': 'arts',
  // Health & PE
  'Physical Education and Sport': 'health', 'Physical Education and Sports': 'health',
  'Food, Nutrition and Health': 'health', 'Food and Nutrition': 'health',
  'Family and Resource Management': 'health',
  'Textiles, Clothing and Fashion': 'health',
};

// Labels for settings UI
export const CUSTOM_PRESET_LABELS: Record<LavaLampVariant, string> = {
  assi:     'ASSI (Default)',
  midnight: 'Midnight',
  forest:   'Forest',
  ocean:    'Ocean',
  sunset:   'Sunset',
  aurora:   'Aurora',
  rose:     'Rose',
};

export const CUSTOM_PRESET_COLORS: Record<LavaLampVariant, [string, string]> = {
  assi:     ['#ff703c', '#ffca4f'],
  midnight: ['#302b63', '#24243e'],
  forest:   ['#1a6b45', '#71b280'],
  ocean:    ['#005c97', '#00b4db'],
  sunset:   ['#f7971e', '#e55d87'],
  aurora:   ['#a855f7', '#00ff88'],
  rose:     ['#c94b4b', '#e91e63'],
};

// Legacy compat
export const CUSTOM_PRESET_GRADIENTS = LAVA_GRADIENTS;

// =============================================================================
// TIME OF DAY
// =============================================================================

export function resolveTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 7)  return 'dawn';
  if (h >= 7  && h < 10) return 'morning';
  if (h >= 10 && h < 14) return 'day';
  if (h >= 14 && h < 17) return 'afternoon';
  if (h >= 17 && h < 19) return 'dusk';
  if (h >= 19 && h < 22) return 'evening';
  if (h >= 22 || h < 1)  return 'night';
  return 'midnight';
}

/** Returns an RGBA overlay color based on time of day */
export function getTimeOverlay(tod: TimeOfDay): string {
  switch (tod) {
    case 'dawn':      return 'rgba(255, 160, 80, 0.18)';
    case 'morning':   return 'rgba(255, 200, 120, 0.08)';
    case 'day':       return 'rgba(0, 0, 0, 0)';
    case 'afternoon': return 'rgba(255, 160, 60, 0.10)';
    case 'dusk':      return 'rgba(220, 100, 40, 0.22)';
    case 'evening':   return 'rgba(80, 20, 100, 0.30)';
    case 'night':     return 'rgba(0, 0, 0, 0.45)';
    case 'midnight':  return 'rgba(0, 0, 0, 0.62)';
  }
}

/** Returns blob opacity based on time */
export function getBlobOpacity(tod: TimeOfDay): number {
  switch (tod) {
    case 'dawn':      return 0.50;
    case 'morning':   return 0.60;
    case 'day':       return 0.65;
    case 'afternoon': return 0.58;
    case 'dusk':      return 0.50;
    case 'evening':   return 0.42;
    case 'night':     return 0.32;
    case 'midnight':  return 0.22;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface ThemeContextProps {
  // Current active group + variant
  themeGroup:    ThemeGroup;
  themeVariant:  ThemeVariant;
  colorMode:     ColorMode;
  customPreset:  LavaLampVariant;
  timeOfDay:     TimeOfDay;
  isSentinel:    boolean;

  // Setters
  setThemeGroup:   (group: ThemeGroup) => void;
  setThemeVariant: (variant: ThemeVariant) => void;
  setColorMode:    (mode: ColorMode) => void;
  setCustomPreset: (preset: LavaLampVariant) => void;

  // Subject override (from live chat)
  setSubjectOverride: (subjectName: string | null) => void;

  // Legacy compat
  theme:    ThemeType;
  setTheme: (t: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

const LS_GROUP   = 'assi:theme-group';
const LS_VARIANT = 'assi:theme-variant';
const LS_MODE    = 'assi:color-mode';
const LS_PRESET  = 'assi:custom-preset';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeGroup,   setGroupState]   = useState<ThemeGroup>('lavalamp');
  const [themeVariant, setVariantState] = useState<ThemeVariant>('assi');
  const [colorMode,    setModeState]    = useState<ColorMode>('dark');
  const [customPreset, setPresetState]  = useState<LavaLampVariant>('assi');
  const [subjectOverride, setSubjectOverrideState] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');

  // Hydrate from localStorage
  useEffect(() => {
    const g = localStorage.getItem(LS_GROUP)   as ThemeGroup | null;
    const v = localStorage.getItem(LS_VARIANT) as ThemeVariant | null;
    const m = localStorage.getItem(LS_MODE)    as ColorMode | null;
    const p = localStorage.getItem(LS_PRESET)  as LavaLampVariant | null;
    if (g) setGroupState(g);
    if (v) setVariantState(v);
    if (m) setModeState(m);
    if (p) setPresetState(p);
  }, []);

  // Tick time of day — update every minute
  useEffect(() => {
    setTimeOfDay(resolveTimeOfDay());
    const interval = setInterval(() => setTimeOfDay(resolveTimeOfDay()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Apply data-color-mode on <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-color-mode', colorMode);
  }, [colorMode]);

  // Resolve active variant — subject override wins if set
  const activeVariant: ThemeVariant = useMemo(() => {
    if (subjectOverride) {
      const sv = SUBJECT_NAME_TO_VARIANT[subjectOverride];
      if (sv) return sv;
    }
    return themeVariant;
  }, [subjectOverride, themeVariant]);

  const activeGroup: ThemeGroup = useMemo(() => {
    if (subjectOverride && SUBJECT_NAME_TO_VARIANT[subjectOverride]) return 'subjects';
    return themeGroup;
  }, [subjectOverride, themeGroup]);

  function setThemeGroup(next: ThemeGroup) {
    setGroupState(next);
    localStorage.setItem(LS_GROUP, next);
  }

  function setThemeVariant(next: ThemeVariant) {
    setVariantState(next);
    localStorage.setItem(LS_VARIANT, next);
  }

  function setColorMode(next: ColorMode) {
    setModeState(next);
    localStorage.setItem(LS_MODE, next);
  }

  function setCustomPreset(next: LavaLampVariant) {
    setPresetState(next);
    setVariantState(next);
    localStorage.setItem(LS_PRESET, next);
    localStorage.setItem(LS_VARIANT, next);
  }

  function setSubjectOverride(subjectName: string | null) {
    setSubjectOverrideState(subjectName);
  }

  // Legacy compat
  const theme = activeVariant as ThemeType;
  function setTheme(t: ThemeType) {
    setThemeVariant(t);
  }

  const isSentinel = activeVariant === 'sentinel';

  const value = useMemo(() => ({
    themeGroup: activeGroup,
    themeVariant: activeVariant,
    colorMode,
    customPreset,
    timeOfDay,
    isSentinel,
    setThemeGroup,
    setThemeVariant,
    setColorMode,
    setCustomPreset,
    setSubjectOverride,
    theme,
    setTheme,
  }), [activeGroup, activeVariant, colorMode, customPreset, timeOfDay, isSentinel]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}