'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth }          from '@/features/auth';
import { useNotifications } from '@/features/notifications';
import { getNav, filterNavByFeatures, type NavItem } from './navConfig';
import type { UserFeatures } from '@/lib/api/user';

interface MobileNavProps {
  features?: UserFeatures;
}

// Routes where mobile nav is hidden
const HIDE_ON = ['/signin', '/signup', '/live-chat', '/assi'];

export default function MobileNav({ features }: MobileNavProps) {
  const { user }        = useAuth();
  const pathname        = usePathname();
  const router          = useRouter();
  const { unreadCount } = useNotifications();

  if (HIDE_ON.some(p => pathname.startsWith(p))) return null;
  if (!user) return null;

  const rawNav      = getNav(user.role);
  const mobileItems = features
    ? filterNavByFeatures(rawNav.mobileItems, features)
    : rawNav.mobileItems;

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  function getBadgeCount(item: NavItem) {
    if (item.badge === 'notifications') return unreadCount;
    return 0;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 px-6 safe-area-pb pointer-events-none">
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto flex items-stretch glass rounded-2xl overflow-hidden"
        style={{
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {mobileItems.map((item, index) => {
          const active = isActive(item);
          const count  = getBadgeCount(item);
          const isLast = index === mobileItems.length - 1;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="relative flex flex-col items-center justify-center gap-1 px-5 py-3 min-w-[60px]"
              style={{
                borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute inset-1 rounded-xl bg-white/8"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              )}

              <div className="relative z-10">
                <item.icon
                  size={19}
                  className={`transition-all duration-150 ${active ? 'text-white' : 'text-white/35'}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <AnimatePresence>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5"
                    >
                      {count > 9 ? '9+' : count}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <span className={`relative z-10 text-[10px] font-medium transition-all duration-150 leading-none ${
                active ? 'text-white' : 'text-white/30'
              }`}>
                {item.label}
              </span>

              {active && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </button>
          );
        })}
      </motion.nav>
    </div>
  );
}