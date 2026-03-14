'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Copy, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type DemoCredentials = {
  username: string;
  email: string;
  password: string;
  expiresAt?: string | null;
};

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [demoCredentials, setDemoCredentials] = useState<DemoCredentials | null>(null);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  useEffect(() => {
    const raw = sessionStorage.getItem('assi_demo_credentials');
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as DemoCredentials;

      if (parsed?.email && parsed?.password) {
        setDemoCredentials(parsed);
        setEmail(parsed.email);
        setPassword(parsed.password);
      }
    } catch {
      // silent
    }
  }, []);

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      // silent
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError('');
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password, rememberMe);

      sessionStorage.removeItem('assi_demo_credentials');
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  const showDemoBanner = searchParams.get('demo') === '1' && demoCredentials;

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
              Welcome back
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Sign in to continue with ASSI
            </p>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {showDemoBanner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mb-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-blue-300 mt-0.5 shrink-0" />
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Demo account ready
                  </h2>
                  <p className="text-xs text-white/50 mt-1">
                    Your demo credentials have been autofilled below. Save them before continuing.
                  </p>
                </div>
              </div>

              <CredentialRow
                label="Username"
                value={demoCredentials.username}
                copied={copied === 'username'}
                onCopy={() => copyText(demoCredentials.username, 'username')}
              />

              <CredentialRow
                label="Email"
                value={demoCredentials.email}
                copied={copied === 'email'}
                onCopy={() => copyText(demoCredentials.email, 'email')}
              />

              <CredentialRow
                label="Password"
                value={demoCredentials.password}
                copied={copied === 'password'}
                onCopy={() => copyText(demoCredentials.password, 'password')}
              />

              {demoCredentials.expiresAt && (
                <div className="text-[11px] text-white/45 pt-1">
                  Expires: {new Date(demoCredentials.expiresAt).toLocaleString()}
                </div>
              )}
            </motion.div>
          )}

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
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            disabled={loading}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition disabled:opacity-40"
          />

          <input
            type="password"
            required
            disabled={loading}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full glass-soft rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition disabled:opacity-40"
          />

          <div className="flex items-center justify-between pt-1 pb-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/40 hover:text-white/60 transition">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="accent-white/80"
              />
              Remember me
            </label>

            <Link
              href="/forgot-password"
              className="text-xs text-white/40 hover:text-white/70 transition"
            >
              Forgot password?
            </Link>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="text-white/60 hover:text-white font-medium transition"
          >
            Create one
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

function CredentialRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-white/35 mb-1">
            {label}
          </div>
          <div className="text-sm text-white font-mono break-all">
            {value}
          </div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-lg px-2.5 py-2 text-white/60 hover:text-white hover:bg-white/5 transition"
          title={`Copy ${label}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}