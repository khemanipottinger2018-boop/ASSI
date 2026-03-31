import { THEME_REGISTRY } from '../registry/theme.registry';
import { ThemeGroup, ThemeVariant } from '../core/theme.types';

export function getThemeStyles(group: ThemeGroup, variant: ThemeVariant) {
  const groupThemes = THEME_REGISTRY[group as keyof typeof THEME_REGISTRY];

  if (!groupThemes) return THEME_REGISTRY.lavalamp.assi;

  const theme = (groupThemes as any)[variant];

  if (!theme) return THEME_REGISTRY.lavalamp.assi;

  return theme;
}
