'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useFeatures } from '@/contexts/FeaturesContext';
import { PresenceProvider } from '@/contexts/PresenceProvider';

import Sidebar from './shared/nav/Sidebar';
import MobileNav from './shared/nav/MobileNav';
import AssiFloatingLauncher from './shared/assi/AssiFloatingLauncher';
import SentinelLauncher from './admin/sentinel/SentinelLauncher';
import AuthModals from './shared/auth/AuthModals';

// ✅ NEW
import AvailabilityModal from './shared/ui/AvailabilityModal';

const STORAGE_KEY = 'assi:sidebar-collapsed';
const UNDERCOVER_KEY = 'sentinel:undercover';

const BARE_ROUTES = ['/signin', '/signup'];
const ADMIN_ROUTES = ['/admin', '/sentinel'];
const NO_SCROLL_ROUTES = ['/assi', '/live-chat'];

type UndercoverRole = 'student' | 'tutor' | null;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { features, tier, isLoading: featuresLoading } = useFeatures();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [undercoverRole, setUndercover] = useState<UndercoverRole>(null);

  // ✅ NEW: availability modal state
  const [showAvailability, setShowAvailability] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sc = localStorage.getItem(STORAGE_KEY);
    if (sc !== null) setCollapsed(sc === 'true');
    const uc = localStorage.getItem(UNDERCOVER_KEY) as UndercoverRole;
    if (uc) setUndercover(uc);
  }, []);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // ── Bare routes ─────────────────────────────
  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  // ── Admin routes ────────────────────────────
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
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

  // ── Guest ───────────────────────────────────
  if (!user && mounted) {
    return (
      <>
        {children}
        <AuthModals />
        <AssiFloatingLauncher enabled isGuest />
      </>
    );
  }

  // ── Derived state ───────────────────────────
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isTutor = user?.role === 'tutor' || user?.role === 'tutor_applicant';
  const isPlus = tier === 'early_bird' || tier === 'alpha';

  const assiAllowed = settings?.assiEnabled !== false;
  const assiEnabled = featuresLoading ? false : features.ai_bundles || isPlus;
  const showAssi =
    assiAllowed &&
    ((isStudent && assiEnabled) ||
      (isTutor && assiEnabled) ||
      (isAdmin && undercoverRole !== null));

  const noScroll = NO_SCROLL_ROUTES.some((r) => pathname.startsWith(r));

  // ── Authenticated App Shell ─────────────────
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

          // ✅ NEW: allow sidebar to open availability modal
          onOpenAvailability={isTutor ? () => setShowAvailability(true) : undefined}
        />

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main
            className={`flex-1 overflow-x-hidden ${
              noScroll ? 'overflow-y-hidden' : 'overflow-y-auto pb-16 md:pb-0'
            }`}
          >
            {children}
          </main>

          {!noScroll && <MobileNav features={features} />}
        </div>

        {/* ASSI */}
        {mounted && showAssi && <AssiFloatingLauncher enabled isPlus={isPlus} />}

        {/* Sentinel */}
        {mounted && isAdmin && (
          <SentinelLauncher onUndercoverChange={setUndercover} />
        )}
      </div>

      {/* ✅ GLOBAL AVAILABILITY MODAL (TUTORS ONLY) */}
      {mounted && isTutor && showAvailability && (
        <AvailabilityModal onClose={() => setShowAvailability(false)} />
      )}

      <AuthModals />
    </PresenceProvider>
  );
}