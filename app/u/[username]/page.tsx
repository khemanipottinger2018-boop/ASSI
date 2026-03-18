'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicProfileCard from '@/components/shared/ui/PublicProfileCard';
import { UserProfileView } from '@/components/types/profile.view';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/users-public/${params.username}`)
      .then((res) => {
        if (res.status === 404 || res.status === 403) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error('Failed to fetch profile');
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setProfile(data.user);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="glass-soft rounded-2xl px-6 py-4 text-white/45 text-sm">
          Loading profile…
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="glass rounded-2xl px-6 py-8 text-center max-w-sm w-full mx-4">
          <p className="text-white/60 text-sm">This profile doesn't exist or is unavailable.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-white/40 hover:text-white/70 text-xs underline underline-offset-2 transition"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PublicProfileCard profile={profile} />
    </div>
  );
}