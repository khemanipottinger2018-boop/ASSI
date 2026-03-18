import { ThemeType } from '@/components/shared/themes/ThemeProvider';

export function subjectToTheme(name: string): ThemeType {
  const n = name.toLowerCase();

  if (n.includes('math'))                                          return 'math';
  if (n.includes('english') || n.includes('language'))            return 'english';
  if (n.includes('physics'))                                       return 'physics';
  if (n.includes('chemistry'))                                     return 'chemistry';
  if (n.includes('information technology') || n.includes('computer') || n.includes('it')) return 'it';
  if (n.includes('business') || n.includes('economics'))          return 'business';
  if (n.includes('accounts') || n.includes('accounting'))         return 'accounts';
  if (n.includes('social'))                                        return 'social-studies';

  return 'assi';
}