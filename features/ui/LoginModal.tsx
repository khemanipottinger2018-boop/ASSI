'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth';

/* ===============================
   PROPS
   =============================== */

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  switchToSignup?: () => void;
};

/* ===============================
   COMPONENT
   =============================== */

export default function LoginModal({
  isOpen,
  onClose,
  switchToSignup,
}: LoginModalProps) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ===============================
     RESET STATE ON OPEN
     =============================== */

  useEffect(() => {
    if (!isOpen) return;

    setEmail('');
    setPassword('');
    setError(null);
    setLoading(false);
  }, [isOpen]);

  /* ===============================
     SUBMIT
     =============================== */

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);

      /**
       * IMPORTANT:
       * Close AFTER successful login
       * (do not set any state after this)
       */
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      setLoading(false);
    }
  }

  const disabled =
    loading || !email.trim() || !password.trim();

  /* ===============================
     RENDER
     =============================== */

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BACKDROP */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* MODAL */}
          <motion.div
            className="
              fixed z-[101]
              left-1/2 top-1/2
              w-full max-w-md
              -translate-x-1/2 -translate-y-1/2
              px-4
            "
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              {/* HEADER */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Sign in
                  </h2>
                  <p className="text-xs text-gray-500">
                    Welcome back to ASSI
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ERROR */}
              {error && (
                <div className="mb-3 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-3"
              >
                <TextInput
                  autoFocus
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

                <button
                  type="submit"
                  disabled={disabled}
                  className="
                    w-full py-2.5 rounded-xl
                    bg-blue-600 hover:bg-blue-700
                    text-white text-sm font-medium
                    transition disabled:opacity-50
                  "
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* FOOTER */}
              {switchToSignup && (
                <div className="mt-4 text-xs text-center text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={switchToSignup}
                    className="text-blue-600 font-medium inline-flex items-center gap-1"
                  >
                    Sign up <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ===============================
   INPUT
   =============================== */

function TextInput({
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  autoFocus = false,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
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
