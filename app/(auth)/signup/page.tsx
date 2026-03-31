'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '@/features/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type DemoCredentials = {
  username: string;
  email: string;
  password: string;
};

export default function SignUp() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || demoLoading) return;

    setError('');
    setSuccess('');

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();

    if (!username) {
      setError('Username is required.');
      return;
    }

    if (!email) {
      setError('Email is required.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Registration failed.');
      }

      setSuccess('Account created successfully. Redirecting to sign in…');

      setTimeout(() => {
        router.replace('/signin');
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDemo() {
    if (loading || demoLoading) return;

    setError('');
    setSuccess('');

    setDemoLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          isDemo: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Demo account generation failed.');
      }

      const creds = data.credentials as DemoCredentials | undefined;

      if (!creds?.email || !creds?.password || !creds?.username) {
        throw new Error('Demo credentials were not returned.');
      }

      sessionStorage.setItem(
        'assi_demo_credentials',
        JSON.stringify({
          username: creds.username,
          email: creds.email,
          password: creds.password,
          expiresAt: data.expiresAt ?? null,
        })
      );

      setSuccess('Demo account generated. Redirecting to sign in…');

      setTimeout(() => {
        router.push('/signin?demo=1');
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Could not generate demo account.');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <main className="app-background min-h-screen overflow-y-auto flex items-start justify-center px-4 py-16">
      <div className="animate-blob fixed top-[-10%] left-[-10%] w-96 h-96 bg-white/10 blur-3xl pointer-events-none" />
      <div className="animate-blob-reverse fixed bottom-[-10%] right-[-10%] w-80 h-80 bg-white/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-3xl p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="glass-soft w-12 h-12 rounded-2xl flex items-center justify-center">
            <BookOpen size={20} className="text-white/80" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-semibold text-xl tracking-tight">
              Create your account
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Start learning in a calm, supportive space
            </p>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mb-5 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mb-5 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-xs"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            disabled={loading || demoLoading}
            placeholder="Username"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            autoComplete="username"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition disabled:opacity-40"
          />

          <input
            required
            type="email"
            disabled={loading || demoLoading}
            placeholder="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            autoComplete="email"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition disabled:opacity-40"
          />

          <input
            required
            type="password"
            disabled={loading || demoLoading}
            placeholder="Password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            autoComplete="new-password"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition disabled:opacity-40"
          />

          <input
            required
            type="password"
            disabled={loading || demoLoading}
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            autoComplete="new-password"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition disabled:opacity-40"
          />

          <motion.button
            type="submit"
            disabled={loading || demoLoading}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-1"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </motion.button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">
            Or explore first
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGenerateDemo}
          disabled={loading || demoLoading}
          className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white/80 hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10"
        >
          {demoLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
              Generating demo account…
            </>
          ) : (
            <>
              <Sparkles size={16} className="text-white/70" />
              Generate demo account
            </>
          )}
        </button>

        <div className="mt-4 glass-soft rounded-xl px-3 py-2.5 text-xs text-white/35 text-center leading-relaxed">
          Everyone starts as a student. Tutor applications are available from your dashboard.
        </div>

        <p className="mt-5 text-center text-xs text-white/30">
          Already have an account?{' '}
          <Link
            href="/signin"
            className="text-white/60 hover:text-white font-medium transition"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </main>
  );
}