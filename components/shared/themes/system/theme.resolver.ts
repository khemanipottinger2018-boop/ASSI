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
  if (subjectOverride) {
    const sv = SUBJECT_NAME_TO_VARIANT[subjectOverride];
    if (sv) return { group: 'subjects', variant: sv };
  }

  const event = detectJamaicaEvent();
  if (event) return { group: 'events', variant: event };

  const season = detectSeason();
  return { group: 'seasons', variant: season };

  return { group: userGroup, variant: userVariant };
}