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