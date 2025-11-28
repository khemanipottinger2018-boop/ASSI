#!/bin/bash

echo "🔄 Updating Navbar with Notification Bell..."

# Backup the original navbar
cp frontend/components/Navbar.tsx frontend/components/Navbar.tsx.backup

# Create the updated navbar with notification bell
cat > frontend/components/Navbar.tsx << 'NAVBAR_EOF'
'use client';
import { useState, useRef, useEffect } from 'react';
import { 
  Home, Book, Users, MessageCircle, Menu, 
  User, Settings, Bell, LogOut, LogIn, UserPlus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import LoginModal from '../ui/LoginModal';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  profile_completed: boolean;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const navRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    // Simulate notification count - replace with actual socket/data
    setNotificationCount(3);
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user');

      if (userData) {
        setUser(JSON.parse(userData));
      }

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.user) {
          setUser(result.user);
          localStorage.setItem('user', JSON.stringify(result.user));
        }
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    checkAuth();
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setUser(null);
    setUserMenuOpen(false);
    router.push('/');
  };

  const handleNotificationsClick = () => {
    // TODO: Implement notification panel or redirect
    console.log('Notifications clicked');
  };

  // Navigation items for left dropdown
  const navItems: NavItem[] = [
    { icon: <Home size={18} />, label: 'Home', href: '/' },
    { icon: <Book size={18} />, label: 'Browse Tutors', href: '/tutors/browse' },
    { icon: <Users size={18} />, label: 'Live Chat', href: user ? '/tutors/browse' : '#', 
      onClick: user ? undefined : () => setLoginModalOpen(true) },
    { icon: <MessageCircle size={18} />, label: 'My Sessions', href: user ? `/dashboard/${user.role}` : '#',
      onClick: user ? undefined : () => setLoginModalOpen(true) },
  ];

  // User menu items for right dropdown
  const userMenuItems: NavItem[] = user ? [
    { icon: <User size={18} />, label: 'Profile', href: `/dashboard/${user.role}/profile` },
    { icon: <Settings size={18} />, label: 'Settings', href: `/dashboard/${user.role}/profile/edit` },
    { icon: <Bell size={18} />, label: 'Notifications', href: '#' },
    { icon: <LogOut size={18} />, label: 'Logout', onClick: handleLogout },
  ] : [
    { icon: <LogIn size={18} />, label: 'Login', onClick: () => setLoginModalOpen(true) },
    { icon: <UserPlus size={18} />, label: 'Sign Up', href: '/signup' },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setNavOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (item: NavItem) => {
    if (item.onClick) item.onClick();
    else if (item.href) router.push(item.href);
    setNavOpen(false);
  };

  const handleUserMenuClick = (item: NavItem) => {
    if (item.onClick) item.onClick();
    else if (item.href) router.push(item.href);
    setUserMenuOpen(false);
  };

  // Smart background and text color detection
  const isLightBackground = () => {
    // Pages with light backgrounds
    const lightBackgroundPages = [
      '/tutors', '/tutors/browse', '/dashboard', '/signin', '/signup'
    ];
    return lightBackgroundPages.some(page => pathname.startsWith(page));
  };

  const getNavbarStyle = () => {
    if (isLightBackground()) {
      return {
        background: 'bg-white/95 backdrop-blur-md',
        text: 'text-gray-900',
        border: 'border-b border-gray-200',
        hover: 'hover:bg-gray-100 hover:text-gray-900'
      };
    } else {
      return {
        background: 'bg-black/20 backdrop-blur-md',
        text: 'text-white',
        border: 'border-b border-white/20',
        hover: 'hover:bg-white/20 hover:text-white'
      };
    }
  };

  const style = getNavbarStyle();

  return (
    <>
      <nav className={`${style.background} ${style.border} sticky top-0 z-40 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            
            {/* Left Navigation Dropdown */}
            <div className="relative" ref={navRef}>
              <button
                onClick={() => setNavOpen(!navOpen)}
                className={`p-2 rounded-lg transition-colors duration-200 ${style.text} ${style.hover}`}
              >
                <Menu size={20} />
              </button>

              <AnimatePresence>
                {navOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, x: -10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -10, x: -10 }}
                    className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {navItems.map((item, index) => (
                      <button
                        key={item.label}
                        onClick={() => handleNavClick(item)}
                        className="flex items-center space-x-3 w-full px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 text-sm"
                      >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Center Logo - ASSI */}
            <Link href="/" className="flex items-center">
              <span className={`text-xl font-semibold ${style.text} tracking-tight`}>
                ASSI
              </span>
            </Link>

            {/* Right User Menu */}
            <div className="relative" ref={userMenuRef}>
              {loading ? (
                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
              ) : user ? (
                <div className="flex items-center space-x-2">
                  {/* Notification Bell */}
                  <button 
                    onClick={handleNotificationsClick}
                    className={`p-1.5 rounded-lg transition-colors duration-200 ${style.text} ${style.hover} relative`}
                  >
                    <Bell size={18} />
                    {/* Notification Badge */}
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                  
                  {/* User Avatar */}
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center space-x-2 p-1.5 rounded-lg transition-colors duration-200 ${style.text} ${style.hover}`}
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                      <User size={14} className="text-white" />
                    </div>
                    <span className={`font-medium text-sm hidden sm:block ${style.text}`}>
                      {user.username}
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`p-1.5 rounded-lg transition-colors duration-200 ${style.text} ${style.hover}`}
                >
                  <User size={20} />
                </button>
              )}

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, x: 10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -10, x: 10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {userMenuItems.map((item, index) => (
                      <button
                        key={item.label}
                        onClick={() => handleUserMenuClick(item)}
                        className="flex items-center space-x-3 w-full px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 text-sm"
                      >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      <LoginModal 
        isOpen={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
NAVBAR_EOF

echo "✅ Navbar updated with notification bell!"
echo "📁 Backup created: frontend/components/Navbar.tsx.backup"
