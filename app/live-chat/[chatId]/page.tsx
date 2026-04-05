'use client';

// app/live-chat/[chatId]/page.tsx
// Unified session room — routes to the correct view by session type + user role.

import { lazy, Suspense, use, useEffect, useState } from 'react';
import { useRouter }   from 'next/navigation';
import { Loader2 }     from 'lucide-react';
import { useAuth }     from '@/features/auth';
import { useFeatures } from '@/features/platform';
import { api }         from '@/lib/api';

const InstantChatView  = lazy(() => import('../views/InstantChatView').then(m => ({ default: m.InstantChatView })));
const GroupStudyView   = lazy(() => import('../views/GroupStudyView').then(m => ({ default: m.GroupStudyView })));
const ConferenceView   = lazy(() => import('../views/ConferenceView').then(m => ({ default: m.ConferenceView })));
const AdminMonitorView = lazy(() => import('../views/AdminMonitorView').then(m => ({ default: m.AdminMonitorView })));

import type { SessionType, SessionMeta, SpeakMode } from '@/features/live-chat/types/SocketEvents';
import type { ConferenceRole }           from '../views/ConferenceView';


interface Props {
  params: Promise<{ chatId: string }>;
}

export default function ChatRoomPage({ params }: Props) {
  const { chatId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { tier } = useFeatures();
  const router   = useRouter();

  const [meta,        setMeta]        = useState<SessionMeta | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  const isPlus = tier === 'early_bird' || tier === 'alpha';

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/signin');
  }, [authLoading, user, router]);

  /* ── Fetch session meta ── */
  useEffect(() => {
    if (!chatId || !user) return;

    api.get<{ success: boolean; session?: Record<string, unknown>; error?: string }>(`/api/live-chat/${chatId}`)
      .then(d => {
        if (!d.success) {
          setAccessError((d.error) ?? 'Session not found or access denied.');
          return;
        }
        if (d.session) {
          setMeta({
            sessionId:       chatId,
            type:            (d.session.type as SessionType) ?? 'instant',
            speakMode:       (d.session.speakMode as SpeakMode) ?? 'request',
            hostId:          d.session.tutorId as string ?? d.session.hostId as string ?? '',
            subjectName:     d.session.subjectName as string ?? undefined,
            maxParticipants: d.session.maxParticipants as number ?? (isPlus ? 6 : 3),
            isPublic:        d.session.isPublic as boolean ?? false,
          });
        }
      })
      .catch(() => {
        setAccessError('Could not load session. You may not have access.');
      })
      .finally(() => setLoading(false));
  }, [chatId, user, isPlus]);

  /* ── Loading ── */
  if (authLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const viewFallback = (
    <div className="h-full flex items-center justify-center">
      <Loader2 size={20} className="text-white/30 animate-spin" />
    </div>
  );

  /* ── Access error (e.g. private conference, not invited) ── */
  if (accessError) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-10 py-12 text-center max-w-sm space-y-3">
          <p className="text-white/50 text-sm">{accessError}</p>
          <button
            onClick={() => router.push('/browse')}
            className="text-xs text-white/30 hover:text-white/60 transition underline underline-offset-2"
          >
            Back to browse
          </button>
        </div>
      </div>
    );
  }

  /* ── Admin: monitor view for 1:1 and group sessions ── */
  if (user.role === 'admin' && meta?.type !== 'conference') {
    return (
      <Suspense fallback={viewFallback}>
        <AdminMonitorView sessionId={chatId} />
      </Suspense>
    );
  }

  if (!meta) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-10 py-12 text-center max-w-sm space-y-3">
          <p className="text-white/50 text-sm">Session not found.</p>
          <button
            onClick={() => router.push('/browse')}
            className="text-xs text-white/30 hover:text-white/60 transition underline underline-offset-2"
          >
            Back to browse
          </button>
        </div>
      </div>
    );
  }

  const role = user.role as 'student' | 'tutor' | 'admin';

  const sharedProps = {
    sessionId:       chatId,
    currentUserId:   user.id,
    currentUsername: user.username,
    meta,
    isPlus,
    role: role === 'admin' ? 'tutor' : role, // admin acts as tutor in non-conference views
  };

  /* ── Conference: derive viewerRole for the three-way split ── */
  if (meta.type === 'conference') {
    const viewerRole: ConferenceRole =
      user.role === 'admin'          ? 'admin'
      : meta.hostId === user.id      ? 'tutor'
      :                                'attendee';

    return (
      <Suspense fallback={viewFallback}>
        <ConferenceView
          sessionId={chatId}
          currentUserId={user.id}
          currentUsername={user.username}
          meta={meta}
          isPlus={isPlus}
          viewerRole={viewerRole}
        />
      </Suspense>
    );
  }

  /* ── Group study ── */
  if (meta.type === 'group_study') {
    return (
      <Suspense fallback={viewFallback}>
        <GroupStudyView
          {...sharedProps}
          maxParticipants={meta.maxParticipants}
        />
      </Suspense>
    );
  }

  /* ── Default: instant 1:1 ── */
  return (
    <Suspense fallback={viewFallback}>
      <InstantChatView {...sharedProps} />
    </Suspense>
  );
}