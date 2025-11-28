// app/dashboard/profile/edit/page.tsx - REDIRECTOR
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileEditRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const role = data.user.role;
          router.push(`/dashboard/${role}/profile/edit`);
        }
      })
      .catch(() => router.push('/signin'));
    } else {
      router.push('/signin');
    }
  }, [router]);

  return <div>Redirecting to profile editor...</div>;
}