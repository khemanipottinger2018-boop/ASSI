'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Tutor } from '@/types/user.types';
import ProfileCard from '@/frontend/ui/ProfileCard';
import ProfileEditModal from '@/frontend/ui/ProfileEditModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<User | Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!authLoading && !authUser) router.push('/signin');
    if (authUser) fetchProfile();
  }, [authUser, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/me`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setProfile(data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <div>Loading profile...</div>;
  if (!profile) return <div>Profile unavailable</div>;

  return (
    <>
      <ProfileCard 
        profile={profile} 
        isPrivate={true} 
        onEdit={() => setIsEditing(true)} 
        onLogout={logout} 
      />
      {isEditing && profile && (
        <ProfileEditModal 
          profile={profile} 
          onClose={() => setIsEditing(false)} 
          onUpdate={(updated) => setProfile(updated)} 
        />
      )}
    </>
  );
}
