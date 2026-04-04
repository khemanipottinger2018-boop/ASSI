// theme.types.ts

// ==============================
// GROUPS
// ==============================

export type ThemeGroup =
  | 'lavalamp'
  | 'space'
  | 'seasons'
  | 'events'
  | 'subjects'
  | 'premium'
  | 'sentinel';

// ==============================
// VARIANTS
// ==============================

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

export type PremiumVariant =
  | 'cyberpunk'
  | 'ocean'
  | 'lofi';

export type ThemeVariant =
  | LavaLampVariant
  | SpaceVariant
  | SeasonVariant
  | EventVariant
  | SubjectVariant
  | PremiumVariant
  | 'sentinel';

// ==============================
// AUTOMATION
// ==============================

// Lightweight weather descriptor — not a full theme variant
export type WeatherOverlay =
  | 'clear'    // no overlay — sunny and open
  | 'sunny'    // warm radial boost
  | 'cloudy'   // soft grey atmosphere, muted blobs
  | 'rainy'    // reuses rainy season atmosphere + rain particle layer
  | 'stormy'   // heavy dark overlay, blob suppression
  | 'foggy'    // elevated blur, low contrast atmosphere
  | 'windy';   // subtle diagonal streak layer (CSS only)

export interface AutomationState {
  seasonAuto:     boolean;
  weatherAuto:    boolean;
  currentSeason:  SeasonVariant;
  currentWeather: WeatherOverlay;
  weatherLoading: boolean;
}