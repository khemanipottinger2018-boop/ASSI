import {
  Home, Search, MessageCircle, Calendar,
  Bell, User, Settings, Shield, Users,
  ClipboardList, BarChart2, AlertTriangle,
  Activity, BookOpen, LayoutDashboard, GraduationCap,
} from 'lucide-react';

export type NavItem = {
  label:  string;
  href:   string;
  icon:   React.ElementType;
  badge?: 'notifications';
  exact?: boolean;
};

export type NavSection = {
  items:       NavItem[];
  bottomItems: NavItem[];
  mobileItems: NavItem[];
};

export const navByRole: Record<string, NavSection> = {
  student: {
    items: [
      { label: 'Home',           href: '/',              icon: Home,          exact: true },
      { label: 'Browse Tutors',  href: '/browse',        icon: Search },
      { label: 'Live Chat',      href: '/live-chat',     icon: MessageCircle },
      { label: 'Sessions',       href: '/sessions',      icon: Calendar },
      { label: 'Notifications',  href: '/notifications', icon: Bell,          badge: 'notifications' },
      { label: 'Become a Tutor', href: '/apply',         icon: GraduationCap },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
    mobileItems: [
      { label: 'Home',    href: '/',              icon: Home,          exact: true },
      { label: 'Browse',  href: '/browse',        icon: Search },
      { label: 'Chat',    href: '/live-chat',     icon: MessageCircle },
      { label: 'Alerts',  href: '/notifications', icon: Bell,          badge: 'notifications' },
      { label: 'Profile', href: '/profile',       icon: User },
    ],
  },

  tutor: {
    items: [
      { label: 'Home',          href: '/',                icon: Home,            exact: true },
      { label: 'Dashboard',     href: '/dashboard/tutor', icon: LayoutDashboard, exact: true },
      { label: 'Sessions',      href: '/sessions',        icon: Calendar },
      { label: 'Notifications', href: '/notifications',   icon: Bell,            badge: 'notifications' },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
    mobileItems: [
      { label: 'Home',      href: '/',                icon: Home,            exact: true },
      { label: 'Dashboard', href: '/dashboard/tutor', icon: LayoutDashboard, exact: true },
      { label: 'Sessions',  href: '/sessions',        icon: Calendar },
      { label: 'Alerts',    href: '/notifications',   icon: Bell,            badge: 'notifications' },
      { label: 'Profile',   href: '/profile',         icon: User },
    ],
  },

  // Key matches backend Role enum: tutor_applicant (underscore, not hyphen)
  tutor_applicant: {
    items: [
      { label: 'Home',             href: '/',              icon: Home,         exact: true },
      { label: 'My Application',   href: '/apply/status',  icon: ClipboardList },
      { label: 'Edit Application', href: '/apply/form',    icon: BookOpen },
      { label: 'Notifications',    href: '/notifications', icon: Bell,         badge: 'notifications' },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
    mobileItems: [
      { label: 'Home',        href: '/',              icon: Home,         exact: true },
      { label: 'Application', href: '/apply/status',  icon: ClipboardList },
      { label: 'Alerts',      href: '/notifications', icon: Bell,         badge: 'notifications' },
      { label: 'Profile',     href: '/profile',       icon: User },
    ],
  },

  admin: {
    items: [
      { label: 'Overview',      href: '/admin',                    icon: Shield,       exact: true },
      { label: 'Users',         href: '/admin/users',              icon: Users },
      { label: 'Applications',  href: '/admin/tutor-applications', icon: ClipboardList },
      { label: 'Sessions',      href: '/admin/sessions',           icon: Activity },
      { label: 'Metrics',       href: '/admin/metrics',            icon: BarChart2 },
      { label: 'Errors',        href: '/admin/errors',             icon: AlertTriangle },
      { label: 'Notifications', href: '/notifications',            icon: Bell,         badge: 'notifications' },
    ],
    bottomItems: [
      { label: 'Profile',  href: '/profile/admin', icon: User },
      { label: 'Settings', href: '/settings',      icon: Settings },
    ],
    mobileItems: [
      { label: 'Overview', href: '/admin',                    icon: Shield,       exact: true },
      { label: 'Users',    href: '/admin/users',              icon: Users },
      { label: 'Apps',     href: '/admin/tutor-applications', icon: ClipboardList },
      { label: 'Alerts',   href: '/notifications',            icon: Bell,         badge: 'notifications' },
      { label: 'Profile',  href: '/profile/admin',            icon: User },
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