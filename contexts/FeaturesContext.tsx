'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { userApi } from '@/lib/api';
import type { UserFeatures } from '@/lib/api/user';

/* =====================================================
 * TYPES
 * ===================================================== */

type FeaturesContextType = {
  tier:     string;
  features: UserFeatures;
  isLoading: boolean;
  refresh:  () => Promise<void>;
};

/* Safe defaults — all features off until loaded */
const DEFAULT_FEATURES: UserFeatures = {
  forums:           false,
  assignments:      false,
  ai_bundles:       false,
  past_papers:      false,
  assi_plus_prompt: false,
};

/* ===================================================== */

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined);

/* =====================================================
 * PROVIDER
 *
 * Mount inside AuthProvider — needs user to be resolved
 * before fetching features.
 *
 * Usage in app/layout.tsx:
 *   <AuthProvider>
 *     <FeaturesProvider>
 *       ...
 *     </FeaturesProvider>
 *   </AuthProvider>
 * ===================================================== */

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [tier,      setTier]      = useState<string>('standard');
  const [features,  setFeatures]  = useState<UserFeatures>(DEFAULT_FEATURES);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    if (!isAuthenticated) {
      setTier('standard');
      setFeatures(DEFAULT_FEATURES);
      setIsLoading(false);
      return;
    }

    try {
      const data = await userApi.getFeatures();
      if (data.success) {
        setTier(data.tier);
        setFeatures(data.features);
      }
    } catch {
      // silent — defaults stay in place
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  return (
    <FeaturesContext.Provider value={{ tier, features, isLoading, refresh }}>
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures() {
  const ctx = useContext(FeaturesContext);
  if (!ctx) throw new Error('useFeatures must be used within FeaturesProvider');
  return ctx;
}