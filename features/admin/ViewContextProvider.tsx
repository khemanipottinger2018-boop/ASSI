'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from '@/features/auth';
import type { ViewContext } from '@/features/auth';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */

type ViewContextState = {
  viewContext:   ViewContext;
  isElevated:    boolean;   // true when admin is viewing as student or tutor
  isSwitching:   boolean;   // true while POST /api/admin/context/switch is in-flight
  switchContext: (role: ViewContext) => Promise<void>;
  exitContext:   () => Promise<void>;
};

const Ctx = createContext<ViewContextState | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

/* ══════════════════════════════════════════════════════
   PROVIDER
   ══════════════════════════════════════════════════════ */

export function ViewContextProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();

  // Admin's active view context — initialised from /api/auth/me response (no extra round-trip).
  const [viewContext,  setViewContext]  = useState<ViewContext>('admin');
  const [isSwitching,  setIsSwitching]  = useState(false);

  // When user object changes (login / refresh / 2FA), sync viewContext from the
  // piggy-backed field returned by the backend's /api/auth/me.
  useEffect(() => {
    if (!isAdmin || !user) return;
    setViewContext((user.viewContext as ViewContext) ?? 'admin');
  }, [user?.id, user?.viewContext, isAdmin]);

  async function switchContext(role: ViewContext) {
    setIsSwitching(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/context/switch`, {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ viewContext: role }),
      });
      if (!res.ok) throw new Error('Context switch failed');
      const data = await res.json();
      setViewContext(data.viewContext as ViewContext);
    } finally {
      setIsSwitching(false);
    }
  }

  const exitContext = () => switchContext('admin');
  const isElevated  = isAdmin && viewContext !== 'admin';

  // Non-admins get a passthrough derived from their actual role — never elevated.
  const effectiveContext: ViewContext = isAdmin
    ? viewContext
    : (user?.role === 'tutor' || user?.role === 'tutor_applicant')
      ? 'tutor'
      : 'student';

  return (
    <Ctx.Provider value={{
      viewContext: effectiveContext,
      isElevated,
      isSwitching,
      switchContext,
      exitContext,
    }}>
      {children}
    </Ctx.Provider>
  );
}

/* ══════════════════════════════════════════════════════
   HOOK
   ══════════════════════════════════════════════════════ */

export function useViewContext(): ViewContextState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useViewContext must be used within ViewContextProvider');
  return ctx;
}
