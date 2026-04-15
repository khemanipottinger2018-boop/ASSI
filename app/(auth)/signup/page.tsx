'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Sparkles,
  GraduationCap, MessageSquare, Brain, Target, Zap, BookMarked,
  CheckCircle, ArrowRight, DollarSign, Clock, Users,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type Role = 'student' | 'tutor_applicant';

type DemoCredentials = {
  username:  string;
  email:     string;
  password:  string;
  expiresAt?: string | null;
};

const STUDENT_FEATURES = [
  { icon: GraduationCap, label: 'Browse & book verified tutors',  sub: 'CSEC · CAPE · CVQ subjects' },
  { icon: MessageSquare,  label: 'Instant & scheduled sessions',  sub: 'Live 1:1 and group study' },
  { icon: Brain,          label: 'ASSI AI study assistant',       sub: 'Available any time' },
  { icon: Target,         label: 'Goals, streaks & progress',     sub: 'Stay motivated' },
  { icon: Zap,            label: 'Assignment help & feedback',    sub: 'From qualified tutors' },
  { icon: BookMarked,     label: 'Caribbean curriculum focus',    sub: 'CSEC, CAPE, CVQ & more' },
];

const TUTOR_FEATURES = [
  { icon: DollarSign, label: 'Earn by teaching',           sub: 'Set your own hourly rate' },
  { icon: Clock,      label: 'Flexible scheduling',        sub: 'Teach when it suits you' },
  { icon: Users,      label: 'Growing student base',       sub: 'Caribbean-wide audience' },
  { icon: Target,     label: 'Build your profile',         sub: 'Showcase your expertise' },
];

const TUTOR_REQUIREMENTS = [
  'At least 18 years old',
  'Strong command of at least one CSEC or CAPE subject',
  'Able to communicate clearly and patiently',
];

// Password must be min 8 chars with uppercase, lowercase, number, special char
function validatePassword(p: string): string | null {
  if (p.length < 8)            return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(p))        return 'Password needs at least one uppercase letter.';
  if (!/[a-z]/.test(p))        return 'Password needs at least one lowercase letter.';
  if (!/[0-9]/.test(p))        return 'Password needs at least one number.';
  if (!/[^A-Za-z0-9]/.test(p)) return 'Password needs at least one special character.';
  return null;
}

export default function SignUp() {
  const router     = useRouter();
  const { user, login, refresh } = useAuth();

  const [role,    setRole]    = useState<Role>('student');
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [loading,      setLoading]      = useState(false);
  const [demoLoading,  setDemoLoading]  = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [pwStrength,   setPwStrength]   = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const update = (key: keyof typeof form, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    if (key === 'password') setPwStrength(value ? validatePassword(value) : null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || demoLoading) return;

    setError('');
    setSuccess('');

    const username = form.username.trim();
    const email    = form.email.trim().toLowerCase();

    if (!username) { setError('Username is required.'); return; }
    if (!email)    { setError('Email is required.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    const pwError = validatePassword(form.password);
    if (pwError) { setError(pwError); return; }

    setLoading(true);

    try {
      // Step 1: Register (always creates a student account)
      const regRes = await fetch(`${API_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password: form.password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok || !regData?.success) {
        throw new Error(regData?.error || 'Registration failed.');
      }

      if (role === 'tutor_applicant') {
        // Step 2: Auto-login
        await login(email, form.password, false);

        // Step 3: Start application (role → tutor_applicant)
        const appRes = await fetch(`${API_URL}/api/tutor-applications/start`, {
          method: 'POST', credentials: 'include',
        });
        const appData = await appRes.json();
        if (!appRes.ok || !appData?.success) {
          // Graceful fallback — account created, navigate to /apply manually
          router.push('/apply');
          return;
        }

        // Step 4: Refresh auth so role is tutor_applicant in context
        await refresh();
        router.push('/apply/form');
      } else {
        setSuccess('Account created! Redirecting to sign in…');
        setTimeout(() => router.replace('/signin'), 900);
      }
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
      const res  = await fetch(`${API_URL}/api/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isDemo: true }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Demo generation failed.');

      const creds = data.credentials as DemoCredentials | undefined;
      if (!creds?.email || !creds?.password || !creds?.username) throw new Error('Demo credentials missing.');

      sessionStorage.setItem('assi_demo_credentials', JSON.stringify({
        username:  creds.username,
        email:     creds.email,
        password:  creds.password,
        expiresAt: data.expiresAt ?? null,
      }));

      setSuccess('Demo account created. Redirecting…');
      setTimeout(() => router.push('/signin?demo=1'), 700);
    } catch (err: any) {
      setError(err?.message || 'Could not generate demo account.');
    } finally {
      setDemoLoading(false);
    }
  }

  const isBusy = loading || demoLoading;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="animate-blob fixed top-[-10%] left-[-10%] w-96 h-96 bg-white/5 blur-3xl pointer-events-none" />
      <div className="animate-blob-reverse fixed bottom-[-10%] right-[-10%] w-80 h-80 bg-white/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="panel rounded-3xl w-full max-w-4xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* ── LEFT: Form ── */}
        <div className="p-8 flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center flex-shrink-0">
              <BookOpen size={16} className="text-white/70" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg tracking-tight leading-none">Create your account</h1>
              <p className="text-white/40 text-xs mt-0.5">Join the ASSI learning community</p>
            </div>
          </div>

          {/* Role toggle */}
          <div className="bg-white/8 rounded-xl p-1 border border-white/8 grid grid-cols-2 gap-1">
            {(['student', 'tutor_applicant'] as Role[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(''); setSuccess(''); }}
                className={`py-2 rounded-lg text-xs font-medium transition ${
                  role === r
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-white/45 hover:text-white/70'
                }`}
              >
                {r === 'student' ? 'Student' : 'Become a Tutor'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-xs"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-2.5">
            <input
              required disabled={isBusy}
              placeholder="Username"
              value={form.username}
              onChange={e => update('username', e.target.value)}
              autoComplete="off"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 bg-white/6 border border-white/10"
            />
            <input
              required type="email" disabled={isBusy}
              placeholder="Email address"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              autoComplete="off"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 bg-white/6 border border-white/10"
            />
            <div className="space-y-1">
              <input
                required type="password" disabled={isBusy}
                placeholder="Password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 bg-white/6 border border-white/10"
              />
              {form.password && pwStrength && (
                <p className="text-[11px] text-red-400/80 px-1">{pwStrength}</p>
              )}
              {form.password && !pwStrength && (
                <p className="text-[11px] text-emerald-400/70 px-1">Strong password</p>
              )}
            </div>
            <input
              required type="password" disabled={isBusy}
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={e => update('confirmPassword', e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition disabled:opacity-40 bg-white/6 border border-white/10"
            />

            {role === 'tutor_applicant' && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5 flex items-start gap-2">
                <ArrowRight size={13} className="text-blue-400/70 flex-shrink-0 mt-0.5" />
                <p className="text-white/50 text-[11px] leading-relaxed">
                  After creating your account you'll fill out a short application (5–10 min).
                  Our team reviews within 24–48 hours.
                </p>
              </div>
            )}

            <motion.button
              type="submit" disabled={isBusy}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm hover:bg-white/90 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <><Spinner /> {role === 'tutor_applicant' ? 'Setting up…' : 'Creating account…'}</>
              ) : role === 'tutor_applicant' ? (
                <>Create account &amp; apply <ArrowRight size={14} /></>
              ) : (
                'Create account'
              )}
            </motion.button>
          </form>

          {/* Demo account — student path only */}
          {role === 'student' && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[10px] uppercase tracking-widest text-white/20">or explore first</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>
              <button
                type="button"
                onClick={handleGenerateDemo}
                disabled={isBusy}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white/70 hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10 bg-white/6"
              >
                {demoLoading ? (
                  <><Spinner /> Generating demo…</>
                ) : (
                  <><Sparkles size={14} className="text-white/50" /> Try with a demo account</>
                )}
              </button>
            </>
          )}

          <p className="text-center text-xs text-white/30">
            Already have an account?{' '}
            <Link href="/signin" className="text-white/55 hover:text-white font-medium transition">Sign in</Link>
          </p>
        </div>

        {/* ── RIGHT: Role-info panel ── */}
        <div className="hidden md:flex flex-col justify-between p-8 border-l border-white/8 bg-white/[0.03]">
          <AnimatePresence mode="wait">
            {role === 'student' ? (
              <motion.div
                key="student-panel"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                className="space-y-6 h-full flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div>
                    <p className="text-white/30 text-xs uppercase tracking-widest font-medium mb-2">As a student</p>
                    <h2 className="text-white/90 font-semibold text-2xl leading-tight">
                      Start your<br />learning journey.
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {STUDENT_FEATURES.map(({ icon: Icon, label, sub }) => (
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
                <div className="bg-white/6 rounded-2xl border border-white/8 px-4 py-3">
                  <p className="text-white/35 text-xs leading-relaxed">
                    Want to teach too?{' '}
                    <button onClick={() => setRole('tutor_applicant')} className="text-orange-400/70 hover:text-orange-400 underline transition">
                      Apply to become a tutor
                    </button>{' '}
                    after creating your account.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tutor-panel"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                className="space-y-6 h-full flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div>
                    <p className="text-white/30 text-xs uppercase tracking-widest font-medium mb-2">As a tutor</p>
                    <h2 className="text-white/90 font-semibold text-2xl leading-tight">
                      Share your<br />expertise.
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {TUTOR_FEATURES.map(({ icon: Icon, label, sub }) => (
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

                  <div className="space-y-2">
                    <p className="text-white/30 text-xs uppercase tracking-widest font-medium">Requirements</p>
                    {TUTOR_REQUIREMENTS.map(req => (
                      <div key={req} className="flex items-start gap-2">
                        <CheckCircle size={12} className="text-emerald-400/70 flex-shrink-0 mt-0.5" />
                        <p className="text-white/50 text-xs leading-relaxed">{req}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/6 rounded-2xl border border-white/8 px-4 py-3 space-y-1">
                  <p className="text-white/55 text-xs font-medium">How it works</p>
                  <p className="text-white/30 text-xs leading-relaxed">
                    Create your account → fill out a short application → our team reviews within 24–48 hours → start earning.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </motion.div>
    </main>
  );
}

function Spinner() {
  return <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />;
}
