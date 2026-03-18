import { api } from './client';
import type { UserSettings } from '@/contexts/SettingsContext';

export const userApi = {
  getMe: () =>
    api.get<{ success: boolean; user: any }>('/api/user/me'),

  getSettings: () =>
    api.get<{ success: boolean; settings: UserSettings }>('/api/user/settings'),

  updateSettings: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
    api.patch<{ success: boolean }>('/api/user/settings', { key, value }),

  updateProfile: (body: Record<string, unknown>) =>
    api.patch<{ success: boolean }>('/api/user/settings', body),
};
