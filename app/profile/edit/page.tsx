'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileEdit() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setUser(user);
      // Redirect to role-specific profile edit
      router.push(`/dashboard/${user.role}/profile/edit`);
    } else {
      router.push('/signin');
    }
  }, [router]);

  return <div>Redirecting to profile editor...</div>;
}
