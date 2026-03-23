'use client';

// app/live-chat/[chatId]/page.tsx
// Unified session room — routes to the right view by session type + user role.
// All session types live here: instant 1:1, group study, conference, admin monitor.

import { use, useEffect, useState } from 'react';
import { useRouter }  from 'next/navigation';
import { Loader2 }    from 'lucide-react';
import { useAuth }    from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeaturesContext';

import { InstantChatView }  from '../views/InstantChatView';
import { GroupStudyView }   from '../views/GroupStudyView';
import { ConferenceView }   from '../views/ConferenceView';
import { AdminMonitorView } from '../views/AdminMonitorView';

import type { SessionType, SessionMeta } from '../types/SocketEvents';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Props {
  params: Promise<{ chatId: string }>;
}

export default function ChatRoomPage({ params }: Props) {
  const { chatId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const { tier } = useFeatures();
  const router   = useRouter();

  const [meta,    setMeta]    = useState<SessionMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const isPlus = tier === 'early_bird' || tier === 'alpha';

  /* ── Auth guard ── */
  useEffect(() => {
    if (!authLoading && !user) router.replace('/signin');
  }, [authLoading, user, router]);

  /* ── Fetch session meta to determine type ──
     Falls back to 'instant' if the endpoint doesn't exist yet
     so existing sessions keep working during migration.          */
  useEffect(() => {
    if (!chatId || !user) return;

    fetch(`${API_URL}/api/live-chat/${chatId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.session) {
          // Construct SessionMeta from whatever the server returns.
          // Legacy sessions don't have type/speakMode — default them.
          setMeta({
            sessionId:       chatId,
            type:            (d.session.type as SessionType) ?? 'instant',
            speakMode:       d.session.speakMode ?? 'request',
            hostId:          d.session.tutorId ?? d.session.hostId ?? '',
            subjectName:     d.session.subjectName ?? undefined,
            maxParticipants: d.session.maxParticipants ?? (isPlus ? 6 : 3),
          });
        } else {
          // Session not found or error — still render with defaults
          // so the view can handle it gracefully
          setMeta({
            sessionId:       chatId,
            type:            'instant',
            speakMode:       'request',
            hostId:          '',
            maxParticipants: 2,
          });
        }
      })
      .catch(() => {
        // Network error — still try to render
        setMeta({
          sessionId:       chatId,
          type:            'instant',
          speakMode:       'request',
          hostId:          '',
          maxParticipants: 2,
        });
      })
      .finally(() => setLoading(false));
  }, [chatId, user, isPlus]);

  if (authLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  /* ── Admin always gets monitor view ── */
  if (user.role === 'admin') {
    return <AdminMonitorView sessionId={chatId} />;
  }

  if (!meta) {
    return (
      <div className="h-full flex items-center justify-center px-4">
        <div className="glass rounded-2xl px-10 py-12 text-center max-w-sm space-y-3">
          <p className="text-white/50 text-sm">Session not found.</p>
          <button onClick={() => router.push('/browse')}
            className="text-xs text-white/30 hover:text-white/60 transition underline underline-offset-2">
            Back to browse
          </button>
        </div>
      </div>
    );
  }

  const role = user.role as 'student' | 'tutor';

  const sharedProps = {
    sessionId:       chatId,
    currentUserId:   user.id,
    currentUsername: user.username,
    meta,
    isPlus,
    role,
  };

  /* ── Route by session type ── */
  if (meta.type === 'group_study') {
    return (
      <GroupStudyView
        {...sharedProps}
        maxParticipants={meta.maxParticipants}
      />
    );
  }

  if (meta.type === 'conference') {
    return (
      <ConferenceView
        {...sharedProps}
        isHost={meta.hostId === user.id}
      />
    );
  }

  // Default: instant 1:1
  return <InstantChatView {...sharedProps} />;
}