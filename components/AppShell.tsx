'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth }     from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { PresenceProvider } from '@/contexts/PresenceProvider';

import Sidebar              from './shared/nav/Sidebar';
import MobileNav            from './shared/nav/MobileNav';
import AssiFloatingLauncher from './shared/assi/AssiFloatingLauncher';
import SentinelLauncher     from './shared/../admin/sentinel/SentinelLauncher';
import AuthModals           from './shared/auth/AuthModals';

const STORAGE_KEY    = 'assi:sidebar-collapsed';
const UNDERCOVER_KEY = 'sentinel:undercover';

// Routes that render with no chrome at all
const BARE_ROUTES  = ['/signin', '/signup'];
// Routes that use the admin shell (no sidebar, no ASSI)
const ADMIN_ROUTES = ['/admin', '/sentinel'];

// Routes where <main> must NOT scroll — the page manages its own scroll
// (e.g. ASSI chat has a docked input that needs overflow:hidden on the parent)
const NO_SCROLL_ROUTES = ['/assi', '/live-chat'];

type UndercoverRole = 'student' | 'tutor' | null;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user }                          = useAuth();
  const { settings }                      = useSettings();
  const { features, tier, isLoading: featuresLoading } = useFeatures();
  const pathname                          = usePathname();

  const [collapsed,      setCollapsed]      = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [undercoverRole, setUndercover]     = useState<UndercoverRole>(null);

  useEffect(() => {
    setMounted(true);
    const sc = localStorage.getItem(STORAGE_KEY);
    if (sc !== null) setCollapsed(sc === 'true');
    const uc = localStorage.getItem(UNDERCOVER_KEY) as UndercoverRole;
    if (uc) setUndercover(uc);
  }, []);

  const handleToggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // ── Bare routes (auth pages) ─────────────────────────────────────
  if (BARE_ROUTES.some(r => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  // ── Admin routes ─────────────────────────────────────────────────
  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  if (isAdminRoute) {
    return (
      <>
        {children}
        <AuthModals />
        {mounted && user?.role === 'admin' && (
          <SentinelLauncher onUndercoverChange={setUndercover} />
        )}
      </>
    );
  }

  // ── Guest / unauthenticated ──────────────────────────────────────
  if (!user && mounted) {
    return (
      <>
        {children}
        <AuthModals />
        <AssiFloatingLauncher enabled isGuest />
      </>
    );
  }

  // ── Derived role/feature state ───────────────────────────────────
  const isAdmin   = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isTutor   = user?.role === 'tutor' || user?.role === 'tutor_applicant';
  const isPlus    = tier === 'plus' || tier === 'assi_plus';

  // ASSI floating launcher:
  // — Shown for students/tutors if settings allow
  // — ai_bundles feature flag gates it (when features are loaded)
  // — Always shown for admins undercover
  const assiAllowed = settings?.assiEnabled !== false;
  const assiEnabled = featuresLoading
    ? false  // don't flash it on before features load
    : features.ai_bundles || isPlus;

  const showAssi =
    assiAllowed &&
    (
      (isStudent && assiEnabled) ||
      (isTutor   && assiEnabled) ||
      (isAdmin   && undercoverRole !== null)
    );

  // Whether this route manages its own scroll (ASSI chat, live chat)
  const noScroll = NO_SCROLL_ROUTES.some(r => pathname.startsWith(r));

  // ── Authenticated app shell ──────────────────────────────────────
  return (
    <PresenceProvider>
      <div className="flex h-full w-full overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          undercoverRole={isAdmin ? undercoverRole : undefined}
          features={features}
          tier={tier}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className={`flex-1 overflow-x-hidden ${
            noScroll
              ? 'overflow-y-hidden'   // page handles its own scroll (ASSI chat etc.)
              : 'overflow-y-auto pb-16 md:pb-0'
          }`}>
            {children}
          </main>

          {/* Mobile nav hidden on no-scroll routes (live chat, ASSI) */}
          {!noScroll && <MobileNav features={features} />}
        </div>

        {/* ASSI floating orb — authenticated only */}
        {mounted && showAssi && (
          <AssiFloatingLauncher
            enabled
            isPlus={isPlus}
          />
        )}

        {/* Sentinel (admin only) */}
        {mounted && isAdmin && (
          <SentinelLauncher onUndercoverChange={setUndercover} />
        )}
      </div>

      <AuthModals />
    </PresenceProvider>
  );
}