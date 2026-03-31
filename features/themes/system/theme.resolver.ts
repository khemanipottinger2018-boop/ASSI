// theme.resolver.ts
import { ThemeGroup, ThemeVariant } from '../core/theme.types';
import { detectSeason, detectJamaicaEvent } from './theme.utils';
import { SUBJECT_NAME_TO_VARIANT } from '../core/ThemeProvider';

export function resolveTheme({
  userGroup,
  userVariant,
  subjectOverride,
}: {
  userGroup: ThemeGroup;
  userVariant: ThemeVariant;
  subjectOverride?: string | null;
}) {
  // 1. Subject override from live chat wins first
  if (subjectOverride) {
    const sv = SUBJECT_NAME_TO_VARIANT[subjectOverride];
    if (sv) return { group: 'subjects' as ThemeGroup, variant: sv as ThemeVariant };
  }

  // 2. If user is on seasons group, auto-detect event → season
  if (userGroup === 'seasons') {
    const event = detectJamaicaEvent();
    if (event) return { group: 'events' as ThemeGroup, variant: event as ThemeVariant };
    const season = detectSeason();
    return { group: 'seasons' as ThemeGroup, variant: season as ThemeVariant };
  }

  // 3. Everything else (lavalamp, space, events, subjects, premium, sentinel)
  //    → respect exactly what the user picked
  return { group: userGroup, variant: userVariant };
}
