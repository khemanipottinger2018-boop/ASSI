'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  profile_completed: boolean;
}

export default function UniversalProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user');

        if (userData) {
          setUser(JSON.parse(userData));
        }

        if (!token) {
          router.push('/signin');
          return;
        }

        const response = await fetch('http://localhost:3001/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setUser(result.user);
            localStorage.setItem('user', JSON.stringify(result.user));
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  // Redirect to role-specific profile view
  useEffect(() => {
    if (user) {
      router.push(`/dashboard/${user.role}/profile`);
    }
  }, [user, router]);

  return <div>Redirecting to your profile...</div>;
}
