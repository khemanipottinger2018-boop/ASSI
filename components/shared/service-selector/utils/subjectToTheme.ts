// components/shared/service-selector/utils/subjectToTheme.ts
import { ThemeType } from '@/components/shared/themes/core/ThemeProvider';

export function subjectToTheme(name: string): ThemeType {
  const n = name.toLowerCase();

  if (n.includes('math'))                                                        return 'mathematics';
  if (n.includes('english') || n.includes('language'))                          return 'languages';
  if (n.includes('physics') || n.includes('chemistry') || n.includes('bio'))    return 'sciences';
  if (n.includes('information technology') || n.includes('computer'))           return 'technology';
  if (n.includes('business') || n.includes('economics'))                        return 'business';
  if (n.includes('accounts') || n.includes('accounting'))                       return 'business';
  if (n.includes('social') || n.includes('history') || n.includes('geography')) return 'arts';

  return 'assi';
}