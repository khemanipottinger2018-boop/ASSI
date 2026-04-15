'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Copy, Check, ShieldCheck, Sparkles,
  GraduationCap, MessageSquare, Brain, Target, Zap,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import type { TwoFactorRequired } from '@/features/auth';

type DemoCredentials = {
  username: string;
  email:    string;
  password: string;
  expiresAt?: string | null;
};

const PLATFORM_HIGHLIGHTS = [
  { icon: GraduationCap, label: 'Verified Caribbean tutors',      sub: 'CSEC · CAPE · CVQ' },
  { icon: MessageSquare,  label: 'Live 1:1 & group sessions',      sub: 'Instant or scheduled' },
  { icon: Brain,          label: 'ASSI AI study assistant',        sub: 'Always available' },
  { icon: Target,         label: 'Goals, streaks & progress',      sub: 'Stay on track' },
  { icon: Zap,            label: 'Assignment help & feedback',     sub: 'From real tutors' },
];

export default function SignIn() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, login, completeTwoFactor, isLoading } = useAuth();

  // Credentials step
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState<string | null>(null);

  // Demo banner
  const [demoCredentials, setDemoCredentials] = useState<DemoCredentials | null>(null);

  // 2FA step
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [tempToken,     setTempToken]     = useState('');
  const [totpCode,      setTotpCode]      = useState('');

  useEffect(() => {
    if (!isLoading && user) router.replace(user.role === 'admin' ? '/admin' : '/');
  }, [user, isLoading, router]);

  // Load demo credentials if ?demo=1
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
    } catch { /* silent */ }
  }, []);

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1400);
    } catch { /* silent */ }
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
      if (err?.code === 'REQUIRES_2FA' && err?.tempToken) {
        const twoFa = err as TwoFactorRequired;
        setTempToken(twoFa.tempToken);
        setTwoFactorStep(true);
        setError('');
      } else {
        setError(err?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    if (loading || totpCode.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      await completeTwoFactor(tempToken, totpCode);
      sessionStorage.removeItem('assi_demo_credentials');
      router.replace('/');
    } catch (err: any) {
      if (err?.code === 'TOKEN_EXPIRED') {
        // Session window expired — force restart
        setTwoFactorStep(false);
        setTempToken('');
        setTotpCode('');
        setError('Session expired. Please sign in again.');
      } else {
        setError(err?.message || 'Invalid code. Please try again.');
        setTotpCode('');
      }
    } finally {
      setLoading(false);
    }
  }

  const showDemoBanner = searchParams.get('demo') === '1' && demoCredentials;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      {/* Ambient blobs */}
      <div className="animate-blob fixed top-[-10%] left-[-10%] w-96 h-96 bg-white/5 blur-3xl pointer-events-none" />
      <div className="animate-blob-reverse fixed bottom-[-10%] right-[-10%] w-80 h-80 bg-white/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="panel rounded-3xl w-full max-w-4xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* ── LEFT: Form ── */}
        <div className="p-8 flex flex-col justify-center gap-6">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-white/70" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg tracking-tight leading-none">Welcome back</h1>
              <p className="text-white/40 text-xs mt-0.5">Sign in to continue with ASSI</p>
            </div>
          </div>

          {/* Demo banner */}
          <AnimatePresence>
            {showDemoBanner && demoCredentials && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
                className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-blue-300 shrink-0" />
                  <p className="text-white/70 text-xs font-medium">Demo account ready — save these credentials</p>
                </div>
                <CredentialRow label="Username" value={demoCredentials.username} copied={copied === 'username'} onCopy={() => copyText(demoCredentials.username, 'username')} />
                <CredentialRow label="Email"    value={demoCredentials.email}    copied={copied === 'email'}    onCopy={() => copyText(demoCredentials.email, 'email')} />
                <CredentialRow label="Password" value={demoCredentials.password} copied={copied === 'password'} onCopy={() => copyText(demoCredentials.password, 'password')} />
                {demoCredentials.expiresAt && (
                  <p className="text-[10px] text-white/30 pt-0.5">
                    Expires {new Date(demoCredentials.expiresAt).toLocaleString()}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2FA step */}
          <AnimatePresence mode="wait">
            {twoFactorStep ? (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-white/70" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Two-factor verification</p>
                    <p className="text-white/40 text-xs">Enter the 6-digit code from your authenticator</p>
                  </div>
                </div>

                {error && <ErrorBanner message={error} />}

                <form onSubmit={handleTwoFactor} className="space-y-3">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                    required autoFocus disabled={loading}
                    placeholder="000000" value={totpCode}
                    onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 text-center tracking-[0.5em] font-mono bg-white/6 border border-white/10"
                  />
                  <motion.button
                    type="submit" disabled={loading || totpCode.length !== 6}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition"
                  >
                    {loading ? <Spinner /> : 'Verify'}
                  </motion.button>
                  <button
                    type="button" disabled={loading}
                    onClick={() => { setTwoFactorStep(false); setTempToken(''); setTotpCode(''); setError(''); }}
                    className="w-full py-1.5 text-xs text-white/30 hover:text-white/60 transition"
                  >
                    ← Back to sign in
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                {error && <ErrorBanner message={error} />}

                <form onSubmit={handleSubmit} autoComplete="off" className="space-y-2.5">
                  <input
                    type="email" required disabled={loading}
                    placeholder="Email address"
                    value={email} onChange={e => setEmail(e.target.value)}
                    autoComplete="off"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 bg-white/6 border border-white/10"
                  />
                  <input
                    type="password" required disabled={loading}
                    placeholder="Password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 bg-white/6 border border-white/10"
                  />

                  {/* Remember me */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setRememberMe(r => !r)}
                      className="flex items-center gap-2.5 group"
                    >
                      <div className={`w-8 h-4.5 rounded-full relative transition-colors flex-shrink-0 ${rememberMe ? 'bg-orange-500' : 'bg-white/15'}`}
                           style={{ height: '18px', width: '34px' }}>
                        <motion.div
                          animate={{ x: rememberMe ? 15 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm"
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-white/55 group-hover:text-white/75 transition leading-tight">
                          {rememberMe ? 'Remembered — streak counts' : 'Remember me'}
                        </p>
                        {rememberMe && (
                          <p className="text-[10px] text-orange-400/70 leading-tight">30-day session · streak active</p>
                        )}
                      </div>
                    </button>
                    <Link href="/forgot-password" className="text-[11px] text-white/35 hover:text-white/60 transition">
                      Forgot?
                    </Link>
                  </div>

                  <motion.button
                    type="submit" disabled={loading}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition mt-1"
                  >
                    {loading ? <Spinner color="orange" /> : 'Sign in'}
                  </motion.button>
                </form>

                <p className="text-center text-xs text-white/30 pt-1">
                  No account?{' '}
                  <Link href="/signup" className="text-white/55 hover:text-white font-medium transition">
                    Create one
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: Info panel ── */}
        <div className="hidden md:flex flex-col justify-between p-8 border-l border-white/8 bg-white/[0.03]">
          <div className="space-y-6">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest font-medium mb-2">The ASSI platform</p>
              <h2 className="text-white/90 font-semibold text-2xl leading-tight">
                Your study space<br />is ready.
              </h2>
            </div>

            <div className="space-y-3">
              {PLATFORM_HIGHLIGHTS.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-white/55" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm leading-tight">{label}</p>
                    <p className="text-white/35 text-xs">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/6 rounded-2xl border border-white/8 px-4 py-3 mt-6">
            <p className="text-white/35 text-xs leading-relaxed">
              Enable <span className="text-orange-400/80">Remember me</span> to track your daily login streak.
              365 consecutive days earns you ASSI+ for a full year — free.
            </p>
          </div>
        </div>

      </motion.div>
    </main>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs"
    >
      {message}
    </motion.div>
  );
}

function Spinner({ color = 'white' }: { color?: 'white' | 'orange' }) {
  return (
    <span className={`inline-flex items-center justify-center gap-2 w-full`}>
      <span className={`w-4 h-4 border-2 ${color === 'orange' ? 'border-orange-400' : 'border-white/40'} border-t-transparent rounded-full animate-spin`} />
    </span>
  );
}

function CredentialRow({ label, value, copied, onCopy }: {
  label: string; value: string; copied: boolean; onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-white/30">{label}</p>
        <p className="text-xs text-white font-mono truncate">{value}</p>
      </div>
      <button type="button" onClick={onCopy}
        className="shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition">
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
