'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Home, Book, Users, MessageCircle, Menu, User, Bell, LogOut, LogIn, UserPlus, Settings, LayoutDashboard, Shield, CheckCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from '../ui/LoginModal';
import SignupModal from '../ui/SignupModal';

export default function Navbar() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  // State
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  // Refs
  const navRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // User helpers
  const getUserInitial = useCallback(() => user?.username?.charAt(0).toUpperCase() || 'U', [user]);
  const getUserColor = useCallback(() => {
    if (!user) return 'from-blue-400 to-cyan-400';
    switch (user.role) {
      case 'admin': return 'from-orange-400 to-amber-400';
      case 'tutor': return 'from-purple-400 to-violet-400';
      case 'tutor-applicant': return 'from-gray-500 to-gray-600';
      default: return 'from-green-400 to-emerald-400';
    }
  }, [user]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!navRef.current?.contains(target)) setNavOpen(false);
      if (!userMenuRef.current?.contains(target)) setUserMenuOpen(false);
      if (!notificationRef.current?.contains(target)) setNotificationOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unified nav click handler
  const handleNavClick = (path: string, requiresAuth = false) => {
    if (requiresAuth && !user) {
      setShowLoginModal(true);
    } else {
      router.push(path);
    }
    setNavOpen(false);
  };

  // User menu click handler
  const handleUserMenuClick = (path: string, requiresAuth = true) => {
    if (requiresAuth && !user) {
      setShowLoginModal(true);
    } else {
      router.push(path);
    }
    setUserMenuOpen(false);
  };

  if (isLoading) {
    return (
      <nav className="sticky top-0 z-50">
        <div className="relative h-14 bg-white/5 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 max-w-7xl mx-auto">
          <div className="w-6 h-6 bg-white/10 rounded animate-pulse" />
          <div className="text-2xl font-bold text-white">ASSI</div>
          <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/8 backdrop-blur-xl">
        <div className="relative h-14 max-w-7xl mx-auto px-4 flex items-center justify-between">

          {/* LEFT: Hamburger Menu */}
          <div className="relative" ref={navRef}>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95, y: 0 }}
              onClick={() => setNavOpen(!navOpen)}
              className="relative p-2 rounded-lg"
            >
              <Menu size={20} className="text-white" />
            </motion.button>

            <AnimatePresence>
              {navOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 top-full mt-2 w-56 rounded-lg shadow-2xl z-50 overflow-hidden bg-white/12 backdrop-blur-xl border border-white/15"
                >
                  <button onClick={() => handleNavClick('/')} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                    <div className="flex items-center space-x-3"><Home size={18} className="text-white" /><span className="text-white font-medium">Home</span></div>
                    <ChevronRight size={14} className="text-white/70" />
                  </button>

                  <button onClick={() => handleNavClick('/tutors')} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                    <div className="flex items-center space-x-3"><Users size={18} className="text-white" /><span className="text-white font-medium">Tutors</span></div>
                    <ChevronRight size={14} className="text-white/70" />
                  </button>

                  <button onClick={() => handleNavClick('/live-chat', true)} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                    <div className="flex items-center space-x-3"><MessageCircle size={18} className="text-white" /><span className="text-white font-medium">Live Chat</span></div>
                    <ChevronRight size={14} className="text-white/70" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CENTER: Logo */}
          <Link href="/">
            <motion.h1 whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="text-2xl font-bold text-white tracking-tight cursor-pointer">
              ASSI
            </motion.h1>
          </Link>

          {/* RIGHT: User + Notifications */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            {user && (
              <div className="relative" ref={notificationRef}>
                <motion.button onClick={() => setNotificationOpen(!notificationOpen)} className="relative p-2 rounded-lg">
                  <Bell size={18} className="text-white" />
                </motion.button>
                {/* Notification panel omitted for brevity */}
              </div>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <motion.button onClick={() => setUserMenuOpen(!userMenuOpen)} className="relative p-2 rounded-lg">
                {user ? (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getUserColor()} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm">{getUserInitial()}</span>
                  </div>
                ) : <User size={18} className="text-white" />}
              </motion.button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-2xl z-50 overflow-hidden bg-white/12 backdrop-blur-xl border border-white/15">
                    {!user ? (
                      <>
                        <button onClick={() => { setShowLoginModal(true); setUserMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                          <div className="flex items-center space-x-3"><LogIn size={18} className="text-white" /><span className="text-white font-medium">Login</span></div>
                          <ChevronRight size={14} className="text-white/70" />
                        </button>
                        <button onClick={() => { setShowSignupModal(true); setUserMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                          <div className="flex items-center space-x-3"><UserPlus size={18} className="text-white" /><span className="text-white font-medium">Sign Up</span></div>
                          <ChevronRight size={14} className="text-white/70" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Dashboard */}
                        <button onClick={() => handleUserMenuClick(user.role === 'admin' ? '/admin/dashboard' : user.role === 'tutor' ? '/dashboard/tutor' : '/dashboard/student')} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                          <div className="flex items-center space-x-3">{user.role === 'admin' ? <Shield size={18} className="text-white" /> : <LayoutDashboard size={18} className="text-white" />}<span className="text-white font-medium">Dashboard</span></div>
                          <ChevronRight size={14} className="text-white/70" />
                        </button>

                        {/* Profile */}
                        <button onClick={() => handleUserMenuClick('/profile')} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/10">
                          <div className="flex items-center space-x-3"><User size={14} className="text-white" /><span className="text-white font-medium">Profile</span></div>
                          <ChevronRight size={14} className="text-white/70" />
                        </button>

                        {/* Logout */}
                        <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center justify-between w-full px-4 py-3 text-red-600 hover:text-red-700 hover:bg-white/5">
                          <div className="flex items-center space-x-3"><LogOut size={18} className="text-red-400" /><span className="font-medium">Logout</span></div>
                          <ChevronRight size={14} className="text-red-400/70" />
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSuccess={() => setShowLoginModal(false)} switchToSignup={() => { setShowLoginModal(false); setTimeout(() => setShowSignupModal(true), 200); }} />
      <SignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} switchToLogin={() => { setShowSignupModal(false); setTimeout(() => setShowLoginModal(true), 200); }} />
    </>
  );
}
