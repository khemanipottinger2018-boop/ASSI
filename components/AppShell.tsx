'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { PresenceProvider } from '@/contexts/PresenceProvider';

import Sidebar from './shared/nav/Sidebar';
import MobileNav from './shared/nav/MobileNav';
import AssiFloatingLauncher from './shared/assi/AssiFloatingLauncher';
import SentinelLauncher from './shared/../admin/sentinel/SentinelLauncher';
import AuthModals from './shared/auth/AuthModals';

const STORAGE_KEY = 'assi:sidebar-collapsed';
const UNDERCOVER_KEY = 'sentinel:undercover';

const BARE_ROUTES = ['/signin', '/signup'];
const ADMIN_ROUTES = ['/admin', '/sentinel'];

type UndercoverRole = 'student' | 'tutor' | null;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [undercoverRole, setUndercover] = useState<UndercoverRole>(null);

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

  // Auth pages stay completely bare
  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  // Admin routes use their own shell
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

  // Public / signed-out app view
  if (!user && mounted) {
    return (
      <>
        {children}
        <AuthModals />
      </>
    );
  }

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isTutor = user?.role === 'tutor' || user?.role === 'tutor-applicant';

  const showAssi =
    (isStudent || isTutor || (isAdmin && undercoverRole !== null)) &&
    (settings?.assi_enabled !== false);

  return (
    <PresenceProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          undercoverRole={isAdmin ? undercoverRole : undefined}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
            {children}
          </main>

          <MobileNav />
        </div>

        {mounted && showAssi && <AssiFloatingLauncher enabled />}

        {mounted && isAdmin && (
          <SentinelLauncher onUndercoverChange={setUndercover} />
        )}
      </div>

      <AuthModals />
    </PresenceProvider>
  );
}