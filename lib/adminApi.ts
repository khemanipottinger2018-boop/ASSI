// frontend/lib/adminApi.ts

export async function adminFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`/api/admin/${endpoint}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Admin API request failed');
  }

  return res.json();
}
