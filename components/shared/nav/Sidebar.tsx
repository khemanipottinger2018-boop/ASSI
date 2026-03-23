'use client';

import { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Sparkles, Zap,
  Home, Search, MessageCircle, Calendar, Inbox, Bell,
  PenTool, BookMarked, MessageSquare, TrendingUp,
  Trophy, GraduationCap, User, Settings, HelpCircle,
  LayoutDashboard, Users, DollarSign, Star, BarChart2,
  BookOpen, Radio,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useGlobalNotifications';
import { usePresenceDisplay } from '@/lib/presence/usePresenceDisplay';
import PresenceBadge from '@/components/shared/presence/PresenceBadge';

import type { UserFeatures } from '@/lib/api/user';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: 'notifications' | 'messages';
  soon?: boolean;
  feature?: keyof UserFeatures;
};

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  undercoverRole?: 'student' | 'tutor' | null;
  features?: UserFeatures;
  tier?: string;
  onOpenAvailability?: () => void;
}

// ─────────────────────────────────────────────────────────
// Categories (ENHANCED — nothing removed)
// ─────────────────────────────────────────────────────────

const STUDENT_CATEGORIES: Category[] = [
  {
    id: 'core',
    label: 'Home',
    icon: Home,
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Browse Tutors', href: '/browse', icon: Search },
      { label: 'Live Chat', href: '/live-chat', icon: MessageCircle },
      { label: 'Sessions', href: '/sessions', icon: Calendar },
      { label: 'Inbox', href: '/inbox', icon: Inbox, badge: 'messages' },
      { label: 'Notifications', href: '/notifications', icon: Bell, badge: 'notifications' },
    ],
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: Sparkles,
    items: [
      { label: 'ASSI', href: '/assi', icon: Sparkles, feature: 'ai_bundles' },
      { label: 'Assignments', href: '/assignments', icon: PenTool },
      { label: 'AI Planner', href: '/planner', icon: Sparkles, soon: true },
      { label: 'Quiz Mode', href: '/quiz', icon: Trophy, soon: true },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    icon: Users,
    items: [
      { label: 'Forums', href: '/forums', icon: MessageSquare, soon: true },
      { label: 'Saved Tutors', href: '/saved-tutors', icon: Star, soon: true },
      { label: 'Leaderboard', href: '/leaderboard', icon: Trophy, soon: true },
      { label: 'Become Tutor', href: '/apply', icon: GraduationCap },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: Zap,
    items: [
      { label: 'Command Center', href: '/command', icon: Zap, soon: true },
      { label: 'Bookmarks', href: '/bookmarks', icon: BookMarked, soon: true },
      { label: 'Activity', href: '/activity', icon: TrendingUp, soon: true },
    ],
  },
];

const TUTOR_CATEGORIES: Category[] = [
  {
    id: 'core',
    label: 'Home',
    icon: Home,
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Dashboard', href: '/dashboard/tutor', icon: LayoutDashboard },
      { label: 'Sessions', href: '/sessions', icon: Calendar },
      { label: 'Inbox', href: '/inbox', icon: Inbox, badge: 'messages' },
      { label: 'Notifications', href: '/notifications', icon: Bell, badge: 'notifications' },
    ],
  },
  {
    id: 'live',
    label: 'Live',
    icon: Radio,
    items: [
      { label: 'Live Sessions', href: '/live-chat', icon: Radio },
      { label: 'Group Study', href: '/live-chat?mode=group', icon: Users },
      { label: 'Session Queue', href: '/queue', icon: Users, soon: true },
    ],
  },
  {
    id: 'teaching',
    label: 'Teaching',
    icon: BookOpen,
    items: [
      { label: 'Assignments', href: '/assignments', icon: PenTool },
      { label: 'Content Library', href: '/content', icon: BookMarked, soon: true },
      { label: 'Students', href: '/students', icon: Users, soon: true },
    ],
  },
  {
    id: 'management',
    label: 'Manage',
    icon: Settings,
    items: [
      { label: 'Availability', href: '/availability', icon: Calendar },
      { label: 'Activity', href: '/activity', icon: TrendingUp, soon: true },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export default function Sidebar({
  collapsed,
  onToggle,
  undercoverRole,
  features,
  tier,
  onOpenAvailability,
}: SidebarProps) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  // ✅ CORRECT usage (no args)
  const presenceDisplay = usePresenceDisplay();

  const pathname = usePathname();
  const router = useRouter();

  const role = undercoverRole ?? user?.role;
  const categories =
    role === 'student'
      ? STUDENT_CATEGORIES
      : role === 'tutor'
      ? TUTOR_CATEGORIES
      : null;

  const [catIndex, setCatIndex] = useState(0);

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]);
  }

  function getBadge(item: NavItem) {
    if (item.badge === 'notifications') return unreadCount;
    return 0;
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    const count = getBadge(item);

    return (
      <button
        onClick={() => !item.soon && router.push(item.href)}
        disabled={item.soon}
        className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
          item.soon
            ? 'opacity-30 cursor-not-allowed'
            : active
            ? 'bg-white/15 text-white'
            : 'text-white/65 hover:text-white hover:bg-white/8'
        }`}
      >
        <item.icon size={17} />

        {!collapsed && (
          <span className="text-sm font-medium flex items-center gap-2">
            {item.label}
            {item.soon && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">
                Soon
              </span>
            )}
          </span>
        )}

        {count > 0 && !item.soon && (
          <span className="ml-auto text-[10px] bg-orange-500 text-white px-1.5 rounded-full">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    );
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      className="hidden md:flex flex-col h-full border-r sidebar-bg"
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-14 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Sparkles size={14} />
            <span className="text-sm font-semibold">ASSI</span>
          </div>
        )}
        <button onClick={onToggle}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {categories?.[catIndex]?.items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Bottom */}
      <div className="border-t p-3 space-y-3">
        {/* ✅ Presence (fixed + upgraded) */}
        {onOpenAvailability && (
          <div className="flex flex-col items-center gap-1">
            <button onClick={onOpenAvailability}>
              <PresenceBadge display={presenceDisplay} />
            </button>

            {!collapsed && (
              <span className="text-[10px] text-white/40 text-center">
                {presenceDisplay.subtitle}
              </span>
            )}
          </div>
        )}

        {/* User */}
        {!collapsed && user && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              {user.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white truncate">{user.username}</p>
              <p className="text-[10px] text-white/40 capitalize">
                {user.role}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}