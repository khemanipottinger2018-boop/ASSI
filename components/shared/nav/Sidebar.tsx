'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { useAuth }          from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useGlobalNotifications';
import { getNav, filterNavByFeatures, type NavItem } from './navConfig';
import type { UserFeatures } from '@/lib/api/user';

interface SidebarProps {
  collapsed:       boolean;
  onToggle:        () => void;
  undercoverRole?: 'student' | 'tutor' | null;
  features?:       UserFeatures;
  tier?:           string;
}

export default function Sidebar({
  collapsed, onToggle, undercoverRole,
  features, tier,
}: SidebarProps) {
  const { user }        = useAuth();
  const pathname        = usePathname();
  const router          = useRouter();
  const { unreadCount } = useNotifications();

  const effectiveRole = undercoverRole ?? user?.role;
  const rawNav        = getNav(effectiveRole);
  const isPlus        = tier === 'plus' || tier === 'assi_plus';

  // Filter nav items by feature flags when features are available
  const nav = features ? {
    items:       filterNavByFeatures(rawNav.items,       features),
    bottomItems: filterNavByFeatures(rawNav.bottomItems, features),
    mobileItems: filterNavByFeatures(rawNav.mobileItems, features),
  } : rawNav;

  const w = collapsed ? 64 : 220;

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  function getBadgeCount(item: NavItem) {
    if (item.badge === 'notifications') return unreadCount;
    return 0;
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item);
    const count  = getBadgeCount(item);
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
              : 'text-white/70 hover:text-white hover:bg-white/8'
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
              transition={{ duration: 0.18 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden flex items-center gap-2"
            >
              {item.label}
              {soon && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/8 text-white/30 border border-white/10 uppercase tracking-wide">
                  Soon
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>

        {count > 0 && !soon && (
          <span className={`
            flex-shrink-0 min-w-[18px] h-[18px] rounded-full
            bg-orange-500 text-white text-[10px] font-bold
            flex items-center justify-center px-1
            ${collapsed ? 'absolute top-1.5 right-1.5' : 'ml-auto'}
          `}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
    );
  }

  return (
    <motion.aside
      animate={{ width: w }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="hidden md:flex flex-col flex-shrink-0 h-full border-r overflow-hidden sidebar-bg"
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      {/* ── Brand + toggle ── */}
      <div className={`
        flex items-center h-14 flex-shrink-0 border-b
        ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}
      `}
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'radial-gradient(circle at 30% 30%, #ff9aa2, #b84cff)' }}>
                <Sparkles size={12} className="text-white" />
              </div>
              <span className="text-white font-semibold text-sm tracking-tight">ASSI</span>
              {/* ASSI+ tier badge */}
              {isPlus && (
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-400/15 text-orange-400 border border-orange-400/25 uppercase tracking-wide">
                  <Zap size={8} />+
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onToggle}
          className="glass-soft w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* ── Undercover indicator ── */}
      {undercoverRole && !collapsed && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
          <span className="text-amber-300 text-[10px] font-semibold uppercase tracking-wide">
            Undercover · {undercoverRole}
          </span>
        </div>
      )}

      {/* ── Main nav ── */}
      <div className={`flex-1 overflow-y-auto overflow-x-hidden py-3 ${collapsed ? 'px-2' : 'px-3'} space-y-0.5`}
        style={{ scrollbarWidth: 'none' }}>
        {nav.items.map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* ── Bottom section ── */}
      <div className={`border-t py-3 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}
        style={{ borderColor: 'var(--sidebar-border)' }}>

        {/* User identity row */}
        <AnimatePresence initial={false}>
          {!collapsed && user && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2.5 px-3 py-2 mb-1"
            >
              <div className="w-7 h-7 rounded-full glass-soft flex items-center justify-center flex-shrink-0">
                <span className="text-white/80 text-xs font-semibold">
                  {user.username[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-xs font-semibold truncate">{user.username}</p>
                  {isPlus && (
                    <Zap size={9} className="text-orange-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-white/45 text-[10px] capitalize">
                  {undercoverRole
                    ? `${user.role} · viewing as ${undercoverRole}`
                    : user.role.replace('_', ' ')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {nav.bottomItems.map(item => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* ASSI+ upsell — show for free tier users on non-collapsed sidebar */}
        {!collapsed && !isPlus && features && (
          <AnimatePresence>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => router.push('/settings?tab=upgrade')}
              className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-orange-400/15 bg-orange-400/6 hover:bg-orange-400/12 hover:border-orange-400/25 transition group"
            >
              <Zap size={13} className="text-orange-400 flex-shrink-0" />
              <div className="text-left min-w-0">
                <p className="text-orange-400 text-[11px] font-semibold">Get ASSI+</p>
                <p className="text-white/28 text-[10px]">Unlock all features</p>
              </div>
            </motion.button>
          </AnimatePresence>
        )}
      </div>
    </motion.aside>
  );
}