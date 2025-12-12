"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  switchToSignup?: () => void; // Add this prop
}

export default function LoginModal({ isOpen, onClose, onSuccess, switchToSignup }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login: authLogin, user } = useAuth();

  // Check if user is logged in to show success state
  useEffect(() => {
    if (user && isOpen) {
      const timer = setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, isOpen, onClose, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await authLogin(email, password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onClose();
    window.location.href = '/forgot-password';
  };

  const handleDemoLogin = () => {
    setEmail('demo@assi.com');
    setPassword('demo123');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 mx-4">
              {/* Header - Compact */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Welcome Back</h2>
                  <p className="text-gray-500 text-xs mt-0.5">Sign in to your account</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* Success Message */}
              {user && isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg"
                >
                  <p className="text-green-700 text-xs flex items-center">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
                    Login successful! Closing...
                  </p>
                </motion.div>
              )}

              {/* Error Message */}
              {error && !user && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-red-700 text-xs">⚠️ {error}</p>
                </motion.div>
              )}

              {/* Login Form - Only show if not just logged in */}
              {!user ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Email
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-blue-600 hover:text-blue-700"
                        disabled={isLoading}
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember-me-compact"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      disabled={isLoading}
                    />
                    <label htmlFor="remember-me-compact" className="ml-2 text-xs text-gray-600">
                      Remember me for 30 days
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed mt-2"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Signing in...
                      </div>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              ) : null}

              {/* Demo Login */}
              {!user && (
                <div className="mt-3">
                  <button
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 text-xs rounded-lg font-medium transition-colors border border-gray-200 disabled:opacity-50"
                  >
                    Use Demo Account
                  </button>
                </div>
              )}

              {/* Switch to Signup */}
              {!user && (
                <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                  <p className="text-gray-600 text-xs">
                    New to ASSI?{' '}
                    <button
                      onClick={switchToSignup}
                      className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                      disabled={isLoading}
                    >
                      Create account
                      <ArrowRight size={12} />
                    </button>
                  </p>
                </div>
              )}

              {/* Security Note - Tiny */}
              <div className="mt-3 pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 text-center">
                  🔒 Secure login with encryption
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}