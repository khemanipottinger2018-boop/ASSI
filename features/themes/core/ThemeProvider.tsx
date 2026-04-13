'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// =============================================================================
// THEME GROUPS
// =============================================================================

export type ThemeGroup =
  | 'lavalamp'
  | 'space'
  | 'seasons'
  | 'events'
  | 'subjects'
  | 'premium'
  | 'sentinel';

export type PremiumVariant =
  | 'cyberpunk'
  | 'ocean'
  | 'lofi';

// =============================================================================
// THEME VARIANTS PER GROUP
// =============================================================================

export type LavaLampVariant =
  | 'assi'
  | 'midnight'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'aurora'
  | 'rose';

export type SpaceVariant =
  | 'stars'
  | 'starfall'
  | 'nebula'
  | 'galaxy';

export type SeasonVariant =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'dry'
  | 'rainy';

export type EventVariant =
  | 'christmas'
  | 'halloween'
  | 'new_year'
  | 'independence';

export type SubjectVariant =
  | 'mathematics'
  | 'sciences'
  | 'languages'
  | 'business'
  | 'technology'
  | 'arts'
  | 'health';

export type ThemeVariant =
  | LavaLampVariant
  | SpaceVariant
  | SeasonVariant
  | EventVariant
  | SubjectVariant
  | PremiumVariant
  | 'sentinel';

export const ASSI_PLUS_VARIANTS: ThemeVariant[] = ['cyberpunk', 'ocean', 'lofi', 'galaxy'];

export function requiresAssisPlus(variant: ThemeVariant): boolean {
  return ASSI_PLUS_VARIANTS.includes(variant);
}

export type ThemeType       = ThemeVariant;
export type CustomPreset    = LavaLampVariant;
export type ColorMode       = 'dark' | 'light' | 'system' | 'custom';
export type VisualIntensity = 'high' | 'balanced' | 'minimal';
export type TimeOfDay       = 'dawn' | 'morning' | 'day' | 'afternoon' | 'dusk' | 'evening' | 'night' | 'midnight';
export type WeatherOverlay = 'clear' | 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy' | 'windy';

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
  spring: 'linear-gradient(135deg, #a8e063, #56ab2f)',
  summer: 'linear-gradient(135deg, #f7971e, #ffd200)',
  autumn: 'linear-gradient(135deg, #e96443, #904e95)',
  winter: 'linear-gradient(135deg, #83a4d4, #b6fbff)',
  dry:    'linear-gradient(135deg, #f4a261, #e76f51)',
  rainy:  'linear-gradient(135deg, #4facfe, #00f2fe)',
};

export const SEASON_BLOB_COLORS: Record<SeasonVariant, string[]> = {
  spring: ['#a8e063', '#56ab2f'],
  summer: ['#f7971e', '#ffd200'],
  autumn: ['#e96443', '#904e95'],
  winter: ['#83a4d4', '#b6fbff'],
  dry:    ['#f4a261', '#e76f51'],
  rainy:  ['#4facfe', '#00f2fe'],
};

export const EVENT_GRADIENTS: Record<EventVariant, string> = {
  christmas:    'linear-gradient(135deg, #0f5132, #198754, #dc3545)',
  halloween:    'linear-gradient(135deg, #1a1a1a, #ff7518, #ff0000)',
  new_year:     'linear-gradient(135deg, #000000, #1a1a2e, #4fc3f7)',
  independence: 'linear-gradient(135deg, #009b3a, #fed100, #000000)',
};

export const EVENT_BLOB_COLORS: Record<EventVariant, string[]> = {
  christmas:    ['#198754', '#dc3545'],
  halloween:    ['#ff7518', '#ff0000'],
  new_year:     ['#1a1a2e', '#4fc3f7'],
  independence: ['#009b3a', '#fed100', '#000000'],
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

export const PREMIUM_GRADIENTS: Record<PremiumVariant, string> = {
  cyberpunk: 'linear-gradient(135deg, #0a0a1a, #0d0d2b, #1a0030)',
  ocean:     'linear-gradient(135deg, #001220, #003060, #005080)',
  lofi:      'linear-gradient(135deg, #1a0f00, #2d1a00, #1a1000)',
};

export const PREMIUM_BLOB_COLORS: Record<PremiumVariant, string[]> = {
  cyberpunk: ['#00ffff', '#ff00ff', '#7700ff'],
  ocean:     ['#0077b6', '#00b4d8', '#48cae4'],
  lofi:      ['#ff9a3c', '#ffb347', '#8B4513'],
};

export const CUSTOM_PRESET_GRADIENTS = LAVA_GRADIENTS;

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

export function detectJamaicaEvent(): EventVariant | null {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();

  if (month === 12 && day >= 20) return 'christmas';
  if (month === 10 && day >= 25) return 'halloween';
  if (month === 1  && day === 1) return 'new_year';
  if (month === 8  && day <= 10) return 'independence';

  return null;
}

export function detectSeason(): SeasonVariant {
  const month = new Date().getMonth(); // 0-indexed

  // Jamaica calendar:
  // Jan–Apr  (0–3)  — dry
  // May–Jun  (4–5)  — rainy (early wet season)
  // Jul–Aug  (6–7)  — dry (summer dry spell)
  // Sep–Oct  (8–9)  — rainy (peak — hurricane season)
  // Nov–Dec  (10–11) — dry (late dry / Christmas)
  const RAINY_MONTHS = new Set([4, 5, 8, 9]);
  return RAINY_MONTHS.has(month) ? 'rainy' : 'dry';
}

export const SUBJECT_NAME_TO_VARIANT: Record<string, SubjectVariant> = {
  'Mathematics': 'mathematics', 'Additional Mathematics': 'mathematics',
  'Pure Mathematics': 'mathematics', 'Applied Mathematics': 'mathematics',
  'Integrated Mathematics': 'mathematics',
  'Biology': 'sciences', 'Chemistry': 'sciences', 'Physics': 'sciences',
  'Human and Social Biology': 'sciences', 'Integrated Science': 'sciences',
  'Agricultural Science': 'sciences', 'Environmental Science': 'sciences',
  'English A': 'languages', 'English B': 'languages', 'Spanish': 'languages',
  'French': 'languages', 'Portuguese': 'languages',
  'Communication Studies': 'languages', 'Literatures in English': 'languages',
  'Principles of Business': 'business', 'Principles of Accounts': 'business',
  'Economics': 'business', 'Accounting': 'business',
  'Management of Business': 'business', 'Entrepreneurship': 'business',
  'Financial Services Studies': 'business',
  'Logistics and Supply Chain Operations': 'business',
  'Information Technology': 'technology', 'Computer Science': 'technology',
  'Electronic Document Preparation and Management': 'technology',
  'Digital Media': 'technology', 'Animation and Game Design': 'technology',
  'Electrical and Electronic Engineering Technology': 'technology',
  'Caribbean History': 'arts', 'History': 'arts', 'Geography': 'arts',
  'Social Studies': 'arts', 'Caribbean Studies': 'arts', 'Sociology': 'arts',
  'Religious Education': 'arts', 'Visual Arts': 'arts', 'Theatre Arts': 'arts',
  'Music': 'arts', 'Performing Arts': 'arts', 'Office Administration': 'arts',
  'Physical Education and Sport': 'health', 'Physical Education and Sports': 'health',
  'Food, Nutrition and Health': 'health', 'Food and Nutrition': 'health',
  'Family and Resource Management': 'health',
  'Textiles, Clothing and Fashion': 'health',
};

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

// Continuous 0.0–1.0 darkness value driven by actual minutes
// 0.0 = solar noon (brightest), 1.0 = midnight (darkest)
export function getNightIntensity(date: Date = new Date()): number {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const noon = 12 * 60;
  const midnight = 24 * 60;

  const distanceFromNoon = Math.abs(totalMinutes - noon);
  const wrapped = Math.min(distanceFromNoon, midnight - distanceFromNoon);
  const normalized = wrapped / 720; // 0.0 at noon, 1.0 at midnight

  // Gentle ease curve — more natural than linear
  return Math.pow(normalized, 1.4);
}

export function getTimeOverlay(tod: TimeOfDay, intensity?: number): string {
  if (intensity !== undefined) {
    if (intensity < 0.15) return 'rgba(0,0,0,0)';
    if (intensity < 0.35) {
      const alpha = (intensity - 0.15) * 1.5;
      return `rgba(180, 80, 20, ${(alpha * 0.22).toFixed(3)})`;
    }
    const alpha = ((intensity - 0.35) / 0.65) * 0.68;
    return `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
  }

  // Fallback bucket mode (SSR / no intensity)
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

export function getBlobOpacity(tod: TimeOfDay, intensity?: number): number {
  if (intensity !== undefined) {
    // Daytime base 0.65, night floor 0.28
    // Peek-through boost kicks in at high intensity so blobs stay visible
    const base = 0.65 - (intensity * 0.37);
    const peekBoost = intensity > 0.6 ? (intensity - 0.6) * 0.25 : 0;
    return Math.max(0.22, base + peekBoost);
  }

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
// WEATHER
// =============================================================================

function interpretWeatherCode(code: number): WeatherOverlay {
  if (code === 0)                return 'sunny';   // clear sky
  if (code <= 2)                 return 'cloudy';  // partly/mostly cloudy
  if (code === 3)                return 'cloudy';  // overcast
  if (code >= 45 && code <= 48)  return 'foggy';   // fog / rime fog
  if (code >= 51 && code <= 67)  return 'rainy';   // drizzle / rain
  if (code >= 71 && code <= 77)  return 'cloudy';  // snow — cloudy for JA
  if (code >= 80 && code <= 82)  return 'rainy';   // rain showers
  if (code >= 85 && code <= 86)  return 'cloudy';  // snow showers — cloudy
  if (code >= 95 && code <= 99)  return 'stormy';  // thunderstorm
  return 'clear';
}

async function fetchWeather(): Promise<WeatherOverlay> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve('clear');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude: lat, longitude: lon } = coords;
          const url = `https://api.open-meteo.com/v1/forecast`
            + `?latitude=${lat}&longitude=${lon}`
            + `&current=weather_code`
            + `&forecast_days=1`;

          const res  = await fetch(url);
          const data = await res.json();
          const code = data?.current?.weather_code ?? 0;
          resolve(interpretWeatherCode(code));
        } catch {
          resolve('clear');
        }
      },
      () => resolve('clear'),      // permission denied — no overlay
      { timeout: 8000 }
    );
  });
}

// =============================================================================
// CONTEXT
// =============================================================================

interface ThemeContextProps {
  themeGroup:      ThemeGroup;
  themeVariant:    ThemeVariant;
  colorMode:       ColorMode;
  customPreset:    LavaLampVariant;
  visualIntensity: VisualIntensity;
  timeOfDay:       TimeOfDay;
  nightIntensity:  number;
  timeAuto:        boolean;
  isSentinel:      boolean;
  isSyncing:       boolean;

  setThemeGroup:      (group: ThemeGroup)           => void;
  setThemeVariant:    (variant: ThemeVariant)        => void;
  setColorMode:       (mode: ColorMode)              => void;
  setCustomPreset:    (preset: LavaLampVariant)      => void;
  setVisualIntensity: (intensity: VisualIntensity)   => void;
  setTimeAuto:        (val: boolean)                 => void;
  setSubjectOverride: (subjectName: string | null)   => void;

  // Automation
  seasonAuto:     boolean;
  weatherAuto:    boolean;
  currentSeason:  SeasonVariant;
  currentWeather: WeatherOverlay;
  weatherLoading: boolean;
  setSeasonAuto:  (val: boolean) => void;
  setWeatherAuto: (val: boolean) => void;

  // Called by SettingsContext after GET /api/user/settings resolves
  hydrateFromServer: (prefs: { colorMode: string; themeGroup: string; themeVariant: string; seasonAuto?: boolean; weatherAuto?: boolean; visualIntensity?: string }) => void;

  // Called by SettingsContext on logout — resets to defaults and disables DB persistence
  resetTheme: () => void;

  // Atomic setter — sets mode + group + variant in one call, persists once
  applyTheme: (mode: ColorMode, group: ThemeGroup, variant: ThemeVariant) => void;

  theme:    ThemeType;
  setTheme: (t: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// How long to wait after the last change before persisting to DB (ms)
const DB_DEBOUNCE_MS = 800;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeGroup,      setGroupState]   = useState<ThemeGroup>('lavalamp');
  const [themeVariant,    setVariantState] = useState<ThemeVariant>('assi');
  const [colorMode,       setModeState]    = useState<ColorMode>('dark');
  const [customPreset,    setPresetState]  = useState<LavaLampVariant>('assi');
  const [subjectOverride, setSubjectOverrideState] = useState<string | null>(null);
  const [timeOfDay,       setTimeOfDay]      = useState<TimeOfDay>('day');
  const [nightIntensity,  setNightIntensity] = useState<number>(0);
  const [timeAuto,        setTimeAutoState]  = useState<boolean>(true);
  const [isSyncing,       setIsSyncing]      = useState(false);
  const [seasonAuto,      setSeasonAuto]     = useState<boolean>(false);
  const [weatherAuto,     setWeatherAuto]    = useState<boolean>(false);
  const [currentSeason,   setCurrentSeason]  = useState<SeasonVariant>(detectSeason());
  const [currentWeather,  setCurrentWeather] = useState<WeatherOverlay>('clear');
  const [weatherLoading,  setWeatherLoading]  = useState<boolean>(false);
  const [visualIntensity, setIntensityState]  = useState<VisualIntensity>('balanced');

  // Prevents the debounced save from firing on the initial hydration write
  const hydratedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Time of day ticker ──
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeOfDay(resolveTimeOfDay());
      setNightIntensity(getNightIntensity(now));
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Season automation — re-detect hourly ──
  useEffect(() => {
    if (!seasonAuto) return;
    setCurrentSeason(detectSeason());
    const interval = setInterval(() => setCurrentSeason(detectSeason()), 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [seasonAuto]);

  // ── Weather automation — fetch on enable, then every 30 minutes ──
  useEffect(() => {
    if (!weatherAuto) {
      setCurrentWeather('clear');
      return;
    }

    const run = async () => {
      setWeatherLoading(true);
      const overlay = await fetchWeather();
      setCurrentWeather(overlay);
      setWeatherLoading(false);
    };

    run();
    const interval = setInterval(run, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [weatherAuto]);

  // ── Sync data-attributes to <html> ──
  useEffect(() => {
    document.documentElement.setAttribute('data-color-mode', colorMode);
  }, [colorMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-intensity', visualIntensity);
  }, [visualIntensity]);

  // ── Debounced DB persist ──
  const persistToDb = useCallback((
    mode: ColorMode,
    group: ThemeGroup,
    variant: ThemeVariant,
    intensity?: VisualIntensity,
  ) => {
    if (!hydratedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await fetch(`${API_URL}/api/user/settings`, {
          method:      'PATCH',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({
            colorMode:       mode,
            themeGroup:      group,
            themeVariant:    variant,
            seasonAuto,
            weatherAuto,
            visualIntensity: intensity,
            timeAuto,
          }),
        });
      } catch (err) {
        console.warn('[ThemeProvider] failed to persist theme to DB:', err);
      } finally {
        setIsSyncing(false);
      }
    }, DB_DEBOUNCE_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonAuto, weatherAuto, timeAuto]);

  // ── Called by SettingsContext once GET /api/user/settings resolves ──
  // Server is the single source of truth — no localStorage involved
  const hydrateFromServer = useCallback((prefs: {
    colorMode:        string;
    themeGroup:       string;
    themeVariant:     string;
    seasonAuto?:      boolean;
    weatherAuto?:     boolean;
    visualIntensity?: string;
    timeAuto?:        boolean;
  }) => {
    const mode    = (prefs.colorMode    as ColorMode)    || 'dark';
    const group   = (prefs.themeGroup   as ThemeGroup)   || 'lavalamp';
    const variant = (prefs.themeVariant as ThemeVariant) || 'assi';

    setModeState(mode);
    setGroupState(group);
    setVariantState(variant);
    if (prefs.seasonAuto  !== undefined) setSeasonAuto(prefs.seasonAuto);
    if (prefs.weatherAuto !== undefined) setWeatherAuto(prefs.weatherAuto);
    if (prefs.visualIntensity) setIntensityState(prefs.visualIntensity as VisualIntensity);
    if (prefs.timeAuto    !== undefined) setTimeAutoState(prefs.timeAuto);

    // Mark hydrated — future changes will trigger DB saves
    hydratedRef.current = true;
  }, []);

  // ── Reset to defaults on logout — stops DB persistence until next hydration ──
  const resetTheme = useCallback(() => {
    hydratedRef.current = false;
    setModeState('dark');
    setGroupState('lavalamp');
    setVariantState('assi');
    setPresetState('assi');
    setSubjectOverrideState(null);
    setSeasonAuto(false);
    setWeatherAuto(false);
    setIntensityState('balanced');
    setTimeAutoState(true);
  }, []);

  // ── Resolve active variant (subject override wins) ──
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme-group',   activeGroup);
    document.documentElement.setAttribute('data-theme-variant', activeVariant as string);
  }, [activeGroup, activeVariant]);

  // ── Setters — update state and trigger DB debounce ──
  function setThemeGroup(next: ThemeGroup) {
    setGroupState(next);
    persistToDb(colorMode, next, themeVariant);
  }

  function setThemeVariant(next: ThemeVariant) {
    setVariantState(next);
    persistToDb(colorMode, themeGroup, next);
  }

  function setColorMode(next: ColorMode) {
    setModeState(next);
    persistToDb(next, themeGroup, themeVariant);
  }

  function setCustomPreset(next: LavaLampVariant) {
    setPresetState(next);
    setVariantState(next);
    persistToDb(colorMode, themeGroup, next);
  }

  function setVisualIntensity(next: VisualIntensity) {
    setIntensityState(next);
    persistToDb(colorMode, themeGroup, themeVariant, next);
  }

  function setTimeAuto(val: boolean) {
    setTimeAutoState(val);
    persistToDb(colorMode, themeGroup, themeVariant);
  }

  function setSubjectOverride(subjectName: string | null) {
    setSubjectOverrideState(subjectName);
    // Subject override is ephemeral (page-scoped) — never persisted to DB
  }

  function applyTheme(mode: ColorMode, group: ThemeGroup, variant: ThemeVariant) {
    setModeState(mode);
    setGroupState(group);
    setVariantState(variant);
    persistToDb(mode, group, variant);
  }

  const isSentinel = activeVariant === 'sentinel';
  const theme      = activeVariant as ThemeType;
  function setTheme(t: ThemeType) { setThemeVariant(t); }

  const value = useMemo(() => ({
    themeGroup: activeGroup,
    themeVariant: activeVariant,
    colorMode,
    customPreset,
    visualIntensity,
    timeOfDay,
    nightIntensity,
    timeAuto,
    isSentinel,
    isSyncing,
    seasonAuto,
    weatherAuto,
    currentSeason,
    currentWeather,
    weatherLoading,
    setThemeGroup,
    setThemeVariant,
    setColorMode,
    setCustomPreset,
    setVisualIntensity,
    setTimeAuto,
    setSubjectOverride,
    setSeasonAuto,
    setWeatherAuto,
    hydrateFromServer,
    resetTheme,
    applyTheme,
    theme,
    setTheme,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activeGroup, activeVariant, colorMode, customPreset, visualIntensity, timeOfDay, nightIntensity, timeAuto, isSentinel, isSyncing, seasonAuto, weatherAuto, currentSeason, currentWeather, weatherLoading]);

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