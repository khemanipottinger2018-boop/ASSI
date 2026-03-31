// features/platform/index.ts
export { FeaturesProvider, useFeatures } from './FeaturesContext';
export { useBadges } from './useBadges';
export { useCurrency } from './useCurrency';
export { useOutsideClick } from './useOutsideClick';
export { useStreak } from './useStreak';
export { useSubjects } from './useSubjects';
export type { Subject } from './useSubjects';

export { subjectToModel, subjectHint } from './subjectToModel';
export type { ModelConfig } from './subjectToModel';
