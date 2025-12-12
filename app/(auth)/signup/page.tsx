'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LavalampBackground from 'frontend/ui/LavalampBackground';
import FloatingShapes from '@/frontend/ui/themes/FloatingBlobs';
import { BookOpen, GraduationCap, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type UserRole = 'student' | 'tutor-applicant';

export default function SignUp() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (!formData.username.trim() || !formData.email.trim()) {
      setError('Username and email are required');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      setSuccess('✅ Account created! Redirecting to login...');
      
      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/signin');
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleInfo = {
    student: {
      title: 'Student',
      description: 'Access courses and learning resources',
      features: [
        'AI Chat Assistant',
        'Live tutor support',
        'Assignment dropbox',
        'Learning dashboard'
      ],
      icon: BookOpen,
      color: 'blue',
      gradient: 'from-blue-500/10 to-cyan-500/10'
    },
    'tutor-applicant': {
      title: 'Tutor Applicant',
      description: 'Start as a student and apply to tutor',
      features: [
        'Start learning immediately',
        'Apply to tutor after signup',
        'Verified status upon approval',
        'Earn while teaching'
      ],
      icon: GraduationCap,
      color: 'purple',
      gradient: 'from-purple-500/10 to-pink-500/10'
    }
  };

  const currentRole = roleInfo[selectedRole];
  const IconComponent = currentRole.icon;

  return (
    <main className="min-h-screen relative overflow-hidden pt-16">
      <LavalampBackground theme="caribbean-vibrant" />
      <FloatingShapes theme="caribbean-vibrant" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-0 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-100 shadow-xl overflow-hidden"
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Left Side - Form */}
          <div className="w-72 p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                Join ASSI
              </h1>
              <p className="text-gray-500 text-xs">
                Choose your path
              </p>
            </div>

            {/* Role Selection */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  selectedRole === 'student'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-3 h-3 inline mr-1" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('tutor-applicant')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                  selectedRole === 'tutor-applicant'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GraduationCap className="w-3 h-3 inline mr-1" />
                Tutor Applicant
              </button>
            </div>

            {/* Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-xs"
              >
                ⚠️ {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg mb-4 text-xs"
              >
                ✅ {success}
              </motion.div>
            )}

            {/* Signup Form */}
            <motion.form
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit}
              className="space-y-3"
            >
              <div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Username"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Password (min. 6 characters)"
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm Password"
                  disabled={isLoading}
                />
              </div>

              <motion.button 
                type="submit" 
                disabled={isLoading}
                whileTap={{ scale: 0.95 }}
                className={`w-full ${
                  selectedRole === 'student' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white py-2 px-4 rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-xs`}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"
                    />
                    Creating Account...
                  </>
                ) : (
                  <>
                    {selectedRole === 'student' ? (
                      <>
                        <BookOpen className="w-3 h-3" />
                        Create Student Account
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3 h-3" />
                        Create Account & Apply
                      </>
                    )}
                  </>
                )}
              </motion.button>
            </motion.form>

            {/* Sign in link */}
            <div className="mt-4 pt-3 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-xs">
                Have an account?{' '}
                <a href="/signin" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </a>
              </p>
            </div>

            {/* Note about role selection */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
              <p className="font-medium mb-1">Note about Tutor Applicant:</p>
              <p>Everyone starts as a student. After signing up, you can apply to become a tutor from your dashboard.</p>
            </div>
          </div>

          {/* Right Side - Info Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRole}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 240 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className={`w-60 h-full relative overflow-hidden bg-gradient-to-br ${currentRole.gradient}`}>
                {/* Abstract Background */}
                <div className="absolute inset-0 opacity-15">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className={`absolute top-4 left-4 w-12 h-12 rounded-full ${
                      currentRole.color === 'blue' ? 'bg-blue-300' : 'bg-purple-300'
                    } blur-md`}
                  />
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                    className={`absolute bottom-6 right-6 w-10 h-10 rounded-full ${
                      currentRole.color === 'blue' ? 'bg-blue-400' : 'bg-purple-400'
                    } blur-sm`}
                  />
                </div>

                {/* Content */}
                <div className="relative z-10 p-4 h-full flex flex-col">
                  {/* Icon */}
                  <div className="text-center mb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex p-2 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30"
                    >
                      <IconComponent className={`w-6 h-6 ${
                        currentRole.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                    </motion.div>
                  </div>

                  {/* Title & Description */}
                  <div className="text-center mb-4">
                    <h2 className={`text-sm font-bold ${
                      currentRole.color === 'blue' ? 'text-blue-900' : 'text-purple-900'
                    } mb-1`}>
                      {currentRole.title}
                    </h2>
                    <p className={`${
                      currentRole.color === 'blue' ? 'text-blue-800' : 'text-purple-800'
                    } text-xs leading-relaxed`}>
                      {currentRole.description}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-2 mb-3">
                    {currentRole.features.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <CheckCircle className={`w-3 h-3 ${
                          currentRole.color === 'blue' ? 'text-blue-500' : 'text-purple-500'
                        } mt-0.5 flex-shrink-0`} />
                        <span className={`${
                          currentRole.color === 'blue' ? 'text-blue-800' : 'text-purple-800'
                        } text-xs leading-tight`}>
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Bottom Note */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-2 rounded-lg bg-white/30 backdrop-blur-sm border border-white/40`}
                  >
                    <p className={`${
                      currentRole.color === 'blue' ? 'text-blue-800' : 'text-purple-800'
                    } text-xs text-center`}>
                      {selectedRole === 'student' 
                        ? 'Sign up → Login → Access dashboard'
                        : 'Sign up → Login → Apply to tutor'
                      }
                    </p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}