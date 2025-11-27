// app/dashboard/profile/page.tsx - Becomes redirector
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect based on user role
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Fetch user role and redirect
      fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const role = data.user.role;
          router.push(`/dashboard/${role}/profile`);
        }
      })
      .catch(() => router.push('/signin'));
    } else {
      router.push('/signin');
    }
  }, [router]);

  return <div>Redirecting...</div>;
}