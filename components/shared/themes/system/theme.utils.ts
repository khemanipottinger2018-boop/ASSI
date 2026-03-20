export type Season =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'dry'
  | 'rainy';

export type JamaicaEvent =
  | 'christmas'
  | 'halloween'
  | 'new_year'
  | 'independence';

export function detectSeason(): Season {
  const month = new Date().getMonth() + 1;

  // Caribbean logic
  if (month >= 12 || month <= 4) return 'dry';
  return 'rainy';
}

export function detectJamaicaEvent(): JamaicaEvent | null {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  if (m === 12) return 'christmas';
  if (m === 10 && d >= 25) return 'halloween';
  if (m === 1 && d <= 3) return 'new_year';
  if (m === 8 && d >= 1 && d <= 10) return 'independence';

  return null;
}