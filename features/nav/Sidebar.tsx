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
import { useAuth }            from '@/features/auth';
import { useNotifications }   from '@/features/notifications';
import { usePresenceDisplay } from '@/features/presence/usePresenceDisplay';
import AvailabilityModal      from '@/features/presence/AvailabilityModal';
import type { UserFeatures }  from '@/lib/api/user';
import type { PresenceVariant } from '@/features/presence/usePresenceDisplay';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

type NavItem = {
  label:    string;
  href:     string;
  icon:     React.ElementType;
  badge?:   'notifications' | 'messages';
  soon?:    boolean;
  feature?: keyof UserFeatures;
};

type Category = {
  id:    string;
  label: string;
  icon:  React.ElementType;
  items: NavItem[];
};

// ─────────────────────────────────────────────────────────────────
// Presence helpers
// ─────────────────────────────────────────────────────────────────

function variantStyles(variant: PresenceVariant) {
  switch (variant) {
    case 'available':   return { dot: 'bg-emerald-400', text: 'text-emerald-400' };
    case 'busy':        return { dot: 'bg-orange-400',  text: 'text-orange-400'  };
    case 'unavailable': return { dot: 'bg-red-400',     text: 'text-red-400'     };
    default:            return { dot: 'bg-white/25',    text: 'text-white/35'    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Nav config
// ─────────────────────────────────────────────────────────────────

const STUDENT_CATEGORIES: Category[] = [
  {
    id: 'core', label: 'Home', icon: Home,
    items: [
      { label: 'Home',          href: '/',              icon: Home },
      { label: 'Browse Tutors', href: '/browse',        icon: Search },
      { label: 'Live Chat',     href: '/live-chat',     icon: MessageCircle },
      { label: 'Sessions',      href: '/sessions',      icon: Calendar },
      { label: 'Inbox',         href: '/inbox',         icon: Inbox,  badge: 'messages' },
      { label: 'Notifications', href: '/notifications', icon: Bell,   badge: 'notifications' },
    ],
  },
  {
    id: 'learning', label: 'Learning', icon: Sparkles,
    items: [
      { label: 'ASSI',        href: '/assi',        icon: Sparkles,   feature: 'ai_bundles' },
      { label: 'Assignments', href: '/assignments', icon: PenTool,    feature: 'assignments' },
      { label: 'Resources',   href: '/resources',   icon: BookMarked, feature: 'past_papers', soon: true },
      { label: 'Progress',    href: '/progress',    icon: TrendingUp, soon: true },
    ],
  },
  {
    id: 'social', label: 'Social', icon: Users,
    items: [
      { label: 'Forums',       href: '/forums',       icon: MessageSquare, feature: 'forums', soon: true },
      { label: 'Study Groups', href: '/study-groups', icon: Users,         soon: true },
      { label: 'Leaderboard',  href: '/leaderboard',  icon: Trophy,        soon: true },
      { label: 'Become Tutor', href: '/apply',        icon: GraduationCap },
    ],
  },
  {
    id: 'account', label: 'Account', icon: User,
    items: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Help',     href: '/support',  icon: HelpCircle },
    ],
  },
];

const TUTOR_CATEGORIES: Category[] = [
  {
    id: 'core', label: 'Home', icon: Home,
    items: [
      { label: 'Home',          href: '/',                icon: Home },
      { label: 'Dashboard',     href: '/dashboard/tutor', icon: LayoutDashboard },
      { label: 'Sessions',      href: '/sessions',        icon: Calendar },
      { label: 'Inbox',         href: '/inbox',           icon: Inbox, badge: 'messages' },
      { label: 'Notifications', href: '/notifications',   icon: Bell,  badge: 'notifications' },
    ],
  },
  {
    id: 'live', label: 'Live', icon: Radio,
    items: [
      { label: 'Live Sessions', href: '/live-chat',                  icon: Radio },
      { label: 'Group Study',   href: '/live-chat?mode=group_study', icon: Users },
      { label: 'Conference',    href: '/live-chat?mode=conference',  icon: Radio },
    ],
  },
  {
    id: 'teaching', label: 'Teaching', icon: BookOpen,
    items: [
      { label: 'Assignments', href: '/assignments', icon: PenTool,       feature: 'assignments' },
      { label: 'My Students', href: '/students',    icon: Users,         soon: true },
      { label: 'Resources',   href: '/resources',   icon: BookMarked,    feature: 'past_papers', soon: true },
      { label: 'Forums',      href: '/forums',      icon: MessageSquare, feature: 'forums', soon: true },
    ],
  },
  {
    id: 'growth', label: 'Growth', icon: TrendingUp,
    items: [
      { label: 'Earnings',  href: '/earnings',  icon: DollarSign, soon: true },
      { label: 'Reviews',   href: '/reviews',   icon: Star,       soon: true },
      { label: 'Analytics', href: '/analytics', icon: BarChart2,  soon: true },
    ],
  },
  {
    id: 'account', label: 'Account', icon: User,
    items: [
      { label: 'Profile',  href: '/profile',  icon: User },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Help',     href: '/support',  icon: HelpCircle },
    ],
  },
];

const APPLICANT_ITEMS: NavItem[] = [
  { label: 'Home',             href: '/',              icon: Home },
  { label: 'My Application',   href: '/apply/status',  icon: BookOpen },
  { label: 'Edit Application', href: '/apply/form',    icon: PenTool },
  { label: 'Inbox',            href: '/inbox',         icon: Inbox, badge: 'messages' },
  { label: 'Notifications',    href: '/notifications', icon: Bell,  badge: 'notifications' },
  { label: 'Profile',          href: '/profile',       icon: User },
  { label: 'Settings',         href: '/settings',      icon: Settings },
];

// ─────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed:       boolean;
  onToggle:        () => void;
  undercoverRole?: 'student' | 'tutor' | null;
  features?:       UserFeatures;
  tier?:           string;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  collapsed, onToggle, undercoverRole, features, tier,
}: SidebarProps) {
  const { user }        = useAuth();
  const pathname        = usePathname();
  const router          = useRouter();
  const { unreadCount } = useNotifications();

  const effectiveRole = undercoverRole ?? user?.role;
  const isTutor       = effectiveRole === 'tutor';
  const isPlus        = tier === 'early_bird' || tier === 'alpha';

  const [availOpen, setAvailOpen] = useState(false);
  const presenceDisplay           = usePresenceDisplay();
  const styles                    = variantStyles(isTutor ? presenceDisplay.variant : 'offline');

  const categories: Category[] | null =
    effectiveRole === 'student' ? STUDENT_CATEGORIES :
    isTutor                     ? TUTOR_CATEGORIES   : null;

  const [catIndex, setCatIndex] = useState(0);
  const [dir,      setDir]      = useState(1);
  const activeCat = categories?.[catIndex] ?? null;

  const prev = useCallback(() => {
    if (!categories) return;
    setDir(-1);
    setCatIndex(i => (i - 1 + categories.length) % categories.length);
  }, [categories]);

  const next = useCallback(() => {
    if (!categories) return;
    setDir(1);
    setCatIndex(i => (i + 1) % categories.length);
  }, [categories]);

  const w = collapsed ? 64 : 220;

  function isActive(item: NavItem) {
    if (item.href === '/') return pathname === '/';
    const itemPath = item.href.split('?')[0];
    return pathname.startsWith(itemPath);
  }

  function getBadge(item: NavItem) {
    if (item.badge === 'notifications') return unreadCount;
    return 0;
  }

  function isVisible(item: NavItem): boolean {
    if (!item.feature) return true;
    if (item.soon)     return true;
    return features?.[item.feature] === true;
  }

  // ── NavLink ──────────────────────────────────────────────────
  function NavLink({ item }: { item: NavItem }) {
    if (!isVisible(item)) return null;
    const active = isActive(item);
    const count  = getBadge(item);
    const soon   = item.soon;

    return (
      <button
        onClick={() => !soon && router.push(item.href)}
        title={collapsed ? item.label : undefined}
        disabled={soon}
        className={`
          relative w-full flex items-center gap-3 rounded-xl transition-all duration-150
          ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
          ${soon
            ? 'opacity-35 cursor-not-allowed'
            : active
              ? 'bg-white/15 text-white'
              : 'text-white/65 hover:text-white hover:bg-white/8'
          }
        `}
      >
        {active && !soon && (
          <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-orange-400" />
        )}
        <item.icon size={17} className="flex-shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden flex items-center gap-2"
            >
              {item.label}
              {soon && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/8 text-white/28 border border-white/10 uppercase tracking-wide">
                  Soon
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
        {count > 0 && !soon && (
          <span className={`
            flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-orange-500
            text-white text-[10px] font-bold flex items-center justify-center px-1
            ${collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'}
          `}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    );
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {isTutor && availOpen && (
        <AvailabilityModal onClose={() => setAvailOpen(false)} />
      )}

      <motion.aside
        animate={{ width: w }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex flex-col flex-shrink-0 h-full border-r overflow-hidden sidebar-bg"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {/* Brand + collapse */}
        <div
          className={`flex items-center h-14 flex-shrink-0 border-b ${
            collapsed ? 'justify-center px-0' : 'justify-between px-4'
          }`}
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}
                >
                  <Sparkles size={12} className="text-white" />
                </div>
                <span className="text-white font-semibold text-sm tracking-tight">ASSI</span>
                {isPlus && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-400/15 text-orange-400 border border-orange-400/25">
                    <Zap size={8} />+
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={onToggle}
            className="glass-soft w-7 h-7 rounded-lg flex items-center justify-center text-white/55 hover:text-white transition flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Undercover banner */}
        {undercoverRole && !collapsed && (
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-amber-300 text-[10px] font-semibold uppercase tracking-wide">
              Undercover · {undercoverRole}
            </span>
          </div>
        )}

        {/* ── Category carousel header (expanded) ── */}
        {categories && !collapsed && (
          <>
            <div
              className="flex items-center gap-1 px-2 pt-3 pb-1 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <button
                onClick={prev}
                className="w-6 h-6 rounded-md flex items-center justify-center text-white/28 hover:text-white/65 hover:bg-white/6 transition flex-shrink-0"
              >
                <ChevronLeft size={12} />
              </button>
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={catIndex}
                    initial={{ x: dir * 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: dir * -20, opacity: 0 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-center gap-1.5"
                  >
                    {activeCat && (
                      <>
                        <activeCat.icon size={11} className="text-white/45 flex-shrink-0" />
                        <span className="text-white/55 text-[10px] font-bold uppercase tracking-widest">
                          {activeCat.label}
                        </span>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                onClick={next}
                className="w-6 h-6 rounded-md flex items-center justify-center text-white/28 hover:text-white/65 hover:bg-white/6 transition flex-shrink-0"
              >
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-1.5 py-2 flex-shrink-0">
              {categories.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => { setDir(i > catIndex ? 1 : -1); setCatIndex(i); }}
                >
                  <span className={`block rounded-full transition-all duration-200 ${
                    i === catIndex
                      ? 'w-4 h-1.5 bg-orange-400'
                      : 'w-1.5 h-1.5 bg-white/18 hover:bg-white/35'
                  }`} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Category icon strip (collapsed) ── */}
        {categories && collapsed && (
          <div
            className="flex flex-col items-center gap-1 pt-2 pb-1 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => { setDir(i > catIndex ? 1 : -1); setCatIndex(i); }}
                title={cat.label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  i === catIndex
                    ? 'bg-white/15 text-white'
                    : 'text-white/28 hover:text-white/60 hover:bg-white/6'
                }`}
              >
                <cat.icon size={14} />
              </button>
            ))}
          </div>
        )}

        {/* ── Nav items ── */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 ${
            collapsed ? 'px-2' : 'px-3'
          }`}
          style={{ scrollbarWidth: 'none' }}
        >
          {categories ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`cat-${catIndex}`}
                initial={{ x: dir * 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: dir * -30, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-0.5"
              >
                {activeCat?.items.map(item => (
                  <NavLink key={item.href} item={item} />
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            APPLICANT_ITEMS.map(item => (
              <NavLink key={item.href} item={item} />
            ))
          )}
        </div>

        {/* ── Bottom: user card + upsell ── */}
        <div
          className={`border-t py-3 space-y-0.5 flex-shrink-0 ${collapsed ? 'px-2' : 'px-3'}`}
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          {/* Expanded user card */}
          <AnimatePresence initial={false}>
            {!collapsed && user && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-1"
              >
                <button
                  onClick={isTutor ? () => setAvailOpen(true) : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition text-left
                    ${isTutor ? 'hover:bg-white/6 cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {/* Avatar with presence dot */}
                  <div className="relative w-7 h-7 flex-shrink-0">
                    <div className="w-7 h-7 rounded-full glass-soft flex items-center justify-center">
                      <span className="text-white/80 text-xs font-semibold">
                        {user.username[0]?.toUpperCase()}
                      </span>
                    </div>
                    {isTutor && (
                      <span className={`
                        absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                        border-2 border-[color:var(--sidebar-bg,#111)] ${styles.dot}
                        ${presenceDisplay.pulse ? 'animate-pulse' : ''}
                      `} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-xs font-semibold truncate">{user.username}</p>
                      {isPlus && <Zap size={9} className="text-orange-400 flex-shrink-0" />}
                    </div>
                    {isTutor ? (
                      <p className={`text-[10px] truncate ${styles.text}`}>
                        {presenceDisplay.label}
                      </p>
                    ) : (
                      <p className="text-white/40 text-[10px] capitalize">
                        {undercoverRole
                          ? `${user.role} · viewing as ${undercoverRole}`
                          : user.role.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed user card — tutors get dot, others get plain avatar */}
          {collapsed && user && (
            <button
              onClick={isTutor ? () => setAvailOpen(true) : undefined}
              title={isTutor ? `Availability · ${presenceDisplay.label}` : user.username}
              className={`w-full flex items-center justify-center py-1.5 rounded-xl transition
                ${isTutor ? 'hover:bg-white/6 cursor-pointer' : 'cursor-default'}
              `}
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-full glass-soft flex items-center justify-center">
                  <span className="text-white/80 text-xs font-semibold">
                    {user.username[0]?.toUpperCase()}
                  </span>
                </div>
                {isTutor && (
                  <span className={`
                    absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                    border-2 border-[color:var(--sidebar-bg,#111)] ${styles.dot}
                    ${presenceDisplay.pulse ? 'animate-pulse' : ''}
                  `} />
                )}
              </div>
            </button>
          )}

          {/* Upsell */}
          {!collapsed && !isPlus && features && (
            <button
              onClick={() => router.push('/settings?tab=upgrade')}
              className="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-400/15 bg-orange-400/5 hover:bg-orange-400/10 hover:border-orange-400/25 transition"
            >
              <Zap size={12} className="text-orange-400 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-orange-400 text-[11px] font-semibold">Get ASSI+</p>
                <p className="text-white/28 text-[10px]">Unlock all features</p>
              </div>
            </button>
          )}
        </div>
      </motion.aside>
    </>
  );
}
