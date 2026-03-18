'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Lock, ArrowRight } from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  switchToLogin?: () => void;
};

export default function SignupModal({
  isOpen,
  onClose,
  switchToLogin,
}: SignupModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  const [demoCreds, setDemoCreds] = useState<{
    username: string;
    password: string;
  } | null>(null);

  /* ================= RESET ON OPEN ================= */

  useEffect(() => {
    if (!isOpen) return;

    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setLoading(false);
    setDemoCreds(null);
  }, [isOpen]);

  /* ================= NORMAL SIGNUP ================= */

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(
        'Password must be at least 6 characters'
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data?.error || 'Registration failed'
        );
      }

      onClose();
      switchToLogin?.();
    } catch (err: any) {
      setError(
        err?.message || 'Unable to create account'
      );
      setLoading(false);
    }
  }

  /* ================= DEMO SIGNUP ================= */

  async function handleDemoSignup() {
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ demo: true }),
        }
      );

      const data = await res.json();

      if (
        !res.ok ||
        !data.success ||
        !data.credentials
      ) {
        throw new Error(
          data?.error || 'Demo creation failed'
        );
      }

      setDemoCreds(data.credentials);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to create demo account'
      );
    } finally {
      setLoading(false);
    }
  }

  const disabled =
    loading ||
    !username.trim() ||
    !email.trim() ||
    !password ||
    !confirmPassword;

  /* ================= RENDER ================= */

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!demoCreds) onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* MODAL */}
          <motion.div
            className="fixed z-[101] left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              {/* HEADER */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Join ASSI
                  </h2>
                  <p className="text-xs text-gray-500">
                    Create your account
                  </p>
                </div>

                {!demoCreds && (
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-3 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* DEMO CREDENTIALS VIEW */}
              {demoCreds ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm">
                    <p className="font-medium text-yellow-800">
                      Demo account created
                    </p>
                    <p className="text-yellow-700 mt-1">
                      Save these credentials. If you
                      lose them, this demo account
                      cannot be recovered.
                    </p>

                    <div className="mt-3 space-y-2 font-mono text-xs">
                      <div>
                        <span className="text-gray-500">
                          Username:
                        </span>
                        <div className="select-all">
                          {demoCreds.username}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">
                          Password:
                        </span>
                        <div className="select-all">
                          {demoCreds.password}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      switchToLogin?.();
                    }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium"
                  >
                    I’ve saved them — Sign in
                  </button>
                </div>
              ) : (
                <>
                  {/* FORM */}
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-3"
                  >
                    <TextInput
                      autoFocus
                      icon={<User size={14} />}
                      placeholder="Username"
                      value={username}
                      onChange={setUsername}
                    />

                    <TextInput
                      icon={<Mail size={14} />}
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={setEmail}
                    />

                    <TextInput
                      icon={<Lock size={14} />}
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={setPassword}
                    />

                    <TextInput
                      icon={<Lock size={14} />}
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                    />

                    <button
                      type="submit"
                      disabled={disabled}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {loading
                        ? 'Creating account…'
                        : 'Create account'}
                    </button>
                  </form>

                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleDemoSignup}
                      disabled={loading}
                      className="text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      Try a demo account instead
                    </button>
                  </div>

                  {switchToLogin && (
                    <div className="mt-4 text-xs text-center text-gray-600">
                      Already have an account?{' '}
                      <button
                        onClick={switchToLogin}
                        className="text-blue-600 font-medium inline-flex items-center gap-1"
                      >
                        Sign in <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================= INPUT ================= */

function TextInput({
  icon,
  placeholder,
  value,
  onChange,
  type = 'text',
  autoFocus = false,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus-within:border-blue-500">
      <div className="text-gray-400">{icon}</div>
      <input
        autoFocus={autoFocus}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-gray-900 outline-none placeholder-gray-400"
        required
      />
    </div>
  );
}
