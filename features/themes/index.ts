// features/themes/index.ts
export { ThemeProvider, useTheme } from './core/ThemeProvider';
export type {
  ThemeGroup, ThemeVariant, ThemeType, ColorMode, TimeOfDay,
  LavaLampVariant, SpaceVariant, SeasonVariant, EventVariant,
  SubjectVariant, PremiumVariant, CustomPreset,
  LAVA_GRADIENTS, SPACE_GRADIENTS, SEASON_GRADIENTS,
  SUBJECT_GRADIENTS, PREMIUM_GRADIENTS,
} from './core/ThemeProvider';

export { default as AnimatedGradient } from './visuals/AnimatedGradient';
export { default as FloatingBlobs } from './visuals/FloatingBlobs';
export { SeasonalEffectsLayer } from './SeasonalEffects';
export { SubjectSymbolsLayer } from './SubjectSymbols';
export { CyberpunkTheme, OceanDepthsTheme, LoFiStudyTheme } from './PremiumThemes';
