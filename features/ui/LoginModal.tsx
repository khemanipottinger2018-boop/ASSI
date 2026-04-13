'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/features/auth';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  switchToSignup?: () => void;
};

export default function LoginModal({ isOpen, onClose, switchToSignup }: LoginModalProps) {
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setPassword('');
    setError(null);
    setLoading(false);
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password');
      setLoading(false);
    }
  }

  const disabled = loading || !email.trim() || !password.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-[101] left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass rounded-2xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-white">Sign in</h2>
                  <p className="text-xs text-white/50 mt-0.5">Welcome back to ASSI</p>
                </div>
                <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-3 text-xs text-red-400">{error}</div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <FieldInput
                  autoFocus
                  icon={<Mail size={14} />}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={setEmail}
                />
                <FieldInput
                  icon={<Lock size={14} />}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={setPassword}
                />

                <button
                  type="submit"
                  disabled={disabled}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

              {/* Footer */}
              {switchToSignup && (
                <div className="mt-4 text-xs text-center text-white/50">
                  Don't have an account?{' '}
                  <button
                    onClick={switchToSignup}
                    className="text-[var(--accent)] font-medium inline-flex items-center gap-1 hover:brightness-110"
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

function FieldInput({
  icon, type = 'text', placeholder, value, onChange, autoFocus = false,
}: {
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2 text-sm focus-within:border-[var(--accent)]">
      <div className="text-white/40">{icon}</div>
      <input
        autoFocus={autoFocus}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-white placeholder-white/30 outline-none"
        required
      />
    </div>
  );
}
