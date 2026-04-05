'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth }        from '@/features/auth';
import { useSettings }    from '@/features/settings';
import { useFeatures }    from '@/features/platform';
import { useSocketContext } from '@/features/socket';
import { PresenceProvider } from '@/features/presence';
import { useViewContext, ViewContextBanner } from '@/features/admin';
import { useSessionStore } from '@/features/live-chat/store/useSessionStore';
import { SessionInviteBanner } from '@/app/live-chat/components/SessionInviteBanner';

import Sidebar               from './Sidebar';
import MobileNav             from './MobileNav';
import AssiFloatingLauncher  from '@/features/assi/AssiFloatingLauncher';
import SentinelLauncher      from '@/features/admin/SentinelLauncher';
import AuthModals            from '@/features/auth/AuthModals';
import TutorRequestModal     from '@/features/dashboard/tutor/TutorRequestModal';

type GlobalRequest = {
  sessionId:   string;
  studentName: string;
  subjectName: string;
  requestedAt: number;
};

// Pages that already mount their own session:request handler
const SESSION_REQUEST_HANDLED_ROUTES = ['/dashboard/tutor', '/assi'];

const STORAGE_KEY      = 'assi:sidebar-collapsed';

const BARE_ROUTES      = ['/signin', '/signup'];
const ADMIN_ROUTES     = ['/admin', '/sentinel'];
const NO_SCROLL_ROUTES = ['/assi', '/live-chat'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user }                                       = useAuth();
  const { settings }                                   = useSettings();
  const { features, tier } = useFeatures();
  const { subscribe }                                  = useSocketContext();
  const { viewContext, isElevated }                    = useViewContext();
  const pathname                                       = usePathname();

  const setPendingInvite   = useSessionStore(s => s.setPendingInvite);
  const setUpcomingSession = useSessionStore(s => s.setUpcomingSession);

  const [collapsed,      setCollapsed]     = useState(false);
  const [mounted,        setMounted]       = useState(false);
  const [globalRequest,  setGlobalRequest] = useState<GlobalRequest | null>(null);

  useEffect(() => {
    setMounted(true);
    const sc = localStorage.getItem(STORAGE_KEY);
    if (sc !== null) setCollapsed(sc === 'true');
  }, []);

  // Global session:request handler — fires for tutors on pages that don't
  // have their own handler (i.e. NOT /dashboard/tutor and NOT /assi).
  useEffect(() => {
    const isTutorRole = user?.role === 'tutor' || user?.role === 'tutor_applicant';
    if (!isTutorRole) return;
    const alreadyHandled = SESSION_REQUEST_HANDLED_ROUTES.some(r => pathname.startsWith(r));
    if (alreadyHandled) return;

    return subscribe('session:request', (payload: any) => {
      setGlobalRequest(prev => prev ?? {
        sessionId:   payload.sessionId   ?? '',
        studentName: payload.studentName ?? 'Student',
        subjectName: payload.subjectName ?? '',
        requestedAt: payload.requestedAt ?? Date.now(),
      });
    });
  }, [user?.role, pathname, subscribe]);

  // Global session:invited and session:upcoming — fire for all authenticated
  // users regardless of which route they're on. These were previously handled
  // only inside useSessionEvents (which required being inside a session view).
  // By subscribing here, the SessionInviteBanner shows across the entire app.
  useEffect(() => {
    if (!user) return;
    const unsubInvited  = subscribe('session:invited',  (p: any) => setPendingInvite(p));
    const unsubUpcoming = subscribe('session:upcoming', (p: any) => setUpcomingSession(p));
    return () => { unsubInvited(); unsubUpcoming(); };
  }, [user, subscribe, setPendingInvite, setUpcomingSession]);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // ── Bare routes ──────────────────────────────────────────────
  if (BARE_ROUTES.some((r) => pathname.startsWith(r))) {
    return <>{children}</>;
  }

  // ── Admin routes ─────────────────────────────────────────────
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdminRoute) {
    return (
      <>
        {children}
        <AuthModals />
        {mounted && user?.role === 'admin' && <SentinelLauncher />}
      </>
    );
  }

  // ── Guest ────────────────────────────────────────────────────
  if (!user && mounted) {
    return (
      <>
        {children}
        <AuthModals />
        <AssiFloatingLauncher enabled isGuest />
      </>
    );
  }

  // ── Derived state ────────────────────────────────────────────
  const isAdmin   = user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isTutor   = user?.role === 'tutor' || user?.role === 'tutor_applicant';
  const isPlus    = tier === 'early_bird' || tier === 'alpha';

  // Derive undercoverRole for Sidebar prop (view only — not authority)
  const undercoverRole = isElevated ? (viewContext as 'student' | 'tutor') : null;

  const assiAllowed = settings?.assiEnabled !== false;
  const showAssi =
    assiAllowed &&
    (isStudent || isTutor || (isAdmin && isElevated));

  const noScroll = NO_SCROLL_ROUTES.some((r) => pathname.startsWith(r));

  // ── Authenticated shell ──────────────────────────────────────
  return (
    <PresenceProvider>
      <ViewContextBanner />
      <div className="flex h-full w-full overflow-hidden">

        <Sidebar
          collapsed={collapsed}
          onToggle={handleToggle}
          undercoverRole={isAdmin ? undercoverRole : undefined}
          features={features}
          tier={tier}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className={`flex-1 overflow-x-hidden ${
            noScroll ? 'overflow-y-hidden' : 'overflow-y-auto pb-16 md:pb-0'
          }`}>
            {children}
          </main>

          {!noScroll && <MobileNav features={features} />}
        </div>

        {mounted && showAssi && <AssiFloatingLauncher enabled isPlus={isPlus} />}

        {mounted && isAdmin && <SentinelLauncher />}
      </div>

      <AuthModals />

      {/* Global tutor session-request modal — shown when tutor is outside /dashboard/tutor and /assi */}
      {globalRequest && (
        <TutorRequestModal
          key={globalRequest.sessionId}
          sessionId={globalRequest.sessionId}
          studentName={globalRequest.studentName}
          subjectName={globalRequest.subjectName}
          arrivedAt={globalRequest.requestedAt}
          onAccept={() => setGlobalRequest(null)}
          onDecline={() => setGlobalRequest(null)}
        />
      )}

      {/* Global invite / upcoming-session banner — visible on all routes */}
      <SessionInviteBanner />
    </PresenceProvider>
  );
}
