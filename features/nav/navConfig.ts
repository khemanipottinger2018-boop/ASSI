import {
  Home, Search, MessageCircle, Calendar,
  Bell, User, Settings, Shield, Users,
  ClipboardList, BarChart2, AlertTriangle,
  Activity, BookOpen, LayoutDashboard, GraduationCap,
  Cpu, Inbox, FileText, Trophy, BookMarked,
  Wallet, Star, HelpCircle, PenTool, Sparkles,
  TrendingUp, UserCheck, DollarSign, MessageSquare,
  Radio,
} from 'lucide-react';
import type { UserFeatures } from '@/lib/api/user';

export type NavItem = {
  label:    string;
  href:     string;
  icon:     React.ElementType;
  badge?:   'notifications' | 'messages';
  exact?:   boolean;
  soon?:    boolean;
  feature?: keyof UserFeatures;
};

export type NavSection = {
  items:       NavItem[];
  bottomItems: NavItem[];
  mobileItems: NavItem[];
};

export const navByRole: Record<string, NavSection> = {

  /* ══════════════════════════════════════════════
     STUDENT
     ══════════════════════════════════════════════ */
  student: {
    items: [
      // ── Core
      { label: 'Home',          href: '/',              icon: Home,          exact: true },
      { label: 'Browse Tutors', href: '/browse',        icon: Search },
      { label: 'Live Chat',     href: '/live-chat',     icon: MessageCircle },
      { label: 'Sessions',      href: '/sessions',      icon: Calendar },
      { label: 'Inbox',         href: '/inbox',         icon: Inbox,         badge: 'messages' },
      // ── Learning (feature-gated)
      { label: 'ASSI',          href: '/assi',          icon: Sparkles,      feature: 'ai_bundles' },
      { label: 'Assignments',   href: '/assignments',   icon: PenTool,       feature: 'assignments' },
      { label: 'Resources',     href: '/resources',     icon: BookMarked,    feature: 'past_papers', soon: true },
      { label: 'Forums',        href: '/forums',        icon: MessageSquare, feature: 'forums', soon: true },
      // ── Progress
      { label: 'Progress',      href: '/progress',      icon: TrendingUp,    soon: true },
      // ── Community
      { label: 'Leaderboard',   href: '/leaderboard',   icon: Trophy,        soon: true },
      { label: 'Notifications', href: '/notifications', icon: Bell,          badge: 'notifications' },
      // ── Growth
      { label: 'Become a Tutor', href: '/apply',        icon: GraduationCap },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Help',     href: '/support',  icon: HelpCircle },
    ],
    mobileItems: [
      { label: 'Home',    href: '/',          icon: Home,     exact: true },
      { label: 'Browse',  href: '/browse',    icon: Search },
      { label: 'ASSI',    href: '/assi',      icon: Sparkles, feature: 'ai_bundles' },
      { label: 'Inbox',   href: '/inbox',     icon: Inbox,    badge: 'messages' },
      { label: 'Profile', href: '/profile',   icon: User },
    ],
  },

  /* ══════════════════════════════════════════════
     TUTOR
     ══════════════════════════════════════════════ */
  tutor: {
    items: [
      // ── Core
      { label: 'Home',          href: '/',                icon: Home,            exact: true },
      { label: 'Dashboard',     href: '/dashboard/tutor', icon: LayoutDashboard },
      { label: 'Sessions',      href: '/sessions',        icon: Calendar },
      { label: 'Live Sessions', href: '/live-chat',       icon: Radio },         // ← lobby: group study + conference
      { label: 'Inbox',         href: '/inbox',           icon: Inbox,           badge: 'messages' },
      { label: 'Notifications', href: '/notifications',   icon: Bell,            badge: 'notifications' },
      // ── Teaching (feature-gated)
      { label: 'Assignments',   href: '/assignments',     icon: PenTool,         feature: 'assignments' },
      { label: 'Forums',        href: '/forums',          icon: MessageSquare,   feature: 'forums', soon: true },
      { label: 'My Students',   href: '/students',        icon: Users,           soon: true },
      { label: 'Resources',     href: '/resources',       icon: BookMarked,      feature: 'past_papers', soon: true },
      // ── Growth
      { label: 'Earnings',      href: '/earnings',        icon: DollarSign,      soon: true },
      { label: 'Reviews',       href: '/reviews',         icon: Star,            soon: true },
      { label: 'Analytics',     href: '/analytics',       icon: TrendingUp,      soon: true },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Help',     href: '/support',  icon: HelpCircle },
    ],
    mobileItems: [
      { label: 'Home',      href: '/',                icon: Home,            exact: true },
      { label: 'Dashboard', href: '/dashboard/tutor', icon: LayoutDashboard },
      { label: 'Sessions',  href: '/sessions',        icon: Calendar },
      { label: 'Live',      href: '/live-chat',       icon: Radio },
      { label: 'Profile',   href: '/profile',         icon: User },
    ],
  },

  /* ══════════════════════════════════════════════
     TUTOR APPLICANT
     ══════════════════════════════════════════════ */
  tutor_applicant: {
    items: [
      { label: 'Home',             href: '/',              icon: Home,         exact: true },
      { label: 'My Application',   href: '/apply/status',  icon: ClipboardList },
      { label: 'Edit Application', href: '/apply/form',    icon: BookOpen },
      { label: 'Inbox',            href: '/inbox',         icon: Inbox,        badge: 'messages' },
      { label: 'Notifications',    href: '/notifications', icon: Bell,         badge: 'notifications' },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Help',     href: '/support',  icon: HelpCircle },
    ],
    mobileItems: [
      { label: 'Home',        href: '/',              icon: Home,         exact: true },
      { label: 'Application', href: '/apply/status',  icon: ClipboardList },
      { label: 'Inbox',       href: '/inbox',         icon: Inbox,        badge: 'messages' },
      { label: 'Alerts',      href: '/notifications', icon: Bell,         badge: 'notifications' },
      { label: 'Profile',     href: '/profile',       icon: User },
    ],
  },

  /* ══════════════════════════════════════════════
     ADMIN
     ══════════════════════════════════════════════ */
  admin: {
    items: [
      { label: 'Overview',      href: '/admin',                    icon: Shield,       exact: true },
      { label: 'Users',         href: '/admin/users',              icon: Users },
      { label: 'Applications',  href: '/admin/tutor-applications', icon: ClipboardList },
      { label: 'Sessions',      href: '/admin/sessions',           icon: Activity },
      { label: 'Messages',      href: '/admin/messages',           icon: Inbox },
      { label: 'Metrics',       href: '/admin/metrics',            icon: BarChart2 },
      { label: 'Errors',        href: '/admin/errors',             icon: AlertTriangle },
      { label: 'Sentinel',      href: '/admin/sentinel',           icon: Cpu },
      { label: 'Notifications', href: '/notifications',            icon: Bell,         badge: 'notifications' },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
    mobileItems: [
      { label: 'Overview', href: '/admin',                    icon: Shield,       exact: true },
      { label: 'Users',    href: '/admin/users',              icon: Users },
      { label: 'Apps',     href: '/admin/tutor-applications', icon: ClipboardList },
      { label: 'Alerts',   href: '/notifications',            icon: Bell,         badge: 'notifications' },
      { label: 'Profile',  href: '/profile',                  icon: User },
    ],
  },
};

export function getNav(role?: string): NavSection {
  return navByRole[role ?? ''] ?? {
    items:       [],
    bottomItems: [],
    mobileItems: [],
  };
}

export function filterNavByFeatures(
  items: NavItem[],
  features: UserFeatures,
): NavItem[] {
  return items.filter(item => {
    if (!item.feature) return true;
    if (item.soon) return true;
    return features[item.feature] === true;
  });
}