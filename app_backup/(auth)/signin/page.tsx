'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import LavalampBackground from 'frontend/ui/LavalampBackground';
import FloatingShapes from 'frontend/ui/FloatingShapes';

export default function SignIn() {
  const [login, setLogin] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Check if user is already logged in on component mount
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          // User is already authenticated, redirect based on profile completion
          redirectUser(result.user);
        }
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  };

  const redirectUser = (user: any) => {
    if (!user.profile_completed) {
      // First-time user or incomplete profile - send to profile completion
      router.push('/dashboard/profile/edit');
    } else {
      // Returning user with complete profile - send to appropriate dashboard
      if (user.role === 'tutor') {
        router.push('/dashboard/tutor');
      } else {
        router.push('/dashboard/student');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: login, // Backend accepts email OR username
          password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store the JWT token and user data
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_data', JSON.stringify(result.user));
        
        // Smart redirect based on user status
        redirectUser(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Unable to connect to server');
    }
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen relative overflow-hidden pt-16">
      <LavalampBackground theme="caribbean-vibrant" />
      <FloatingShapes theme="caribbean-vibrant" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-sm rounded-xl p-5 max-w-xs w-full border border-gray-100 shadow-xl"
        >
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              Sign In
            </h1>
            <p className="text-gray-500 text-xs">
              Welcome back to ASSI
            </p>
          </div>
          
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-xs"
            >
              ⚠️ {error}
            </motion.div>
          )}
          
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email or username"
              />
            </div>
            
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                placeholder="Password"
              />
            </div>
            
            <motion.button 
              type="submit" 
              disabled={isLoading}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                  />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>
          
          {/* Sign up link */}
          <div className="mt-4 pt-3 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-xs">
              Don't have an account?{' '}
              <motion.a 
                href="/signup"
                whileHover={{ scale: 1.05 }}
                className="text-blue-600 hover:text-blue-700 font-medium inline-block"
              >

          {/* Forgot password link */}
          <div className="mt-3 text-center">
            <motion.a 
              href="/forgot-password"
              whileHover={{ scale: 1.05 }}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-block"
            >
              Forgot your password?
            </motion.a>
          </div>
                Sign up
              </motion.a>
            </p>
          </div>

          {/* Status */}
          <div className="mt-3 p-2 bg-gray-50/50 rounded-lg text-center">
            <div className="text-xs text-gray-500">
              {isLoading ? (
                <span className="flex items-center justify-center gap-1">
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 bg-yellow-500 rounded-full inline-block"
                  />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <motion.span 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"
                  />
                  Ready to sign in
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}