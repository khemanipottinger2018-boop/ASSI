'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useGlobalNotifications';
import { getNav, type NavItem } from './navConfig';

export default function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();
  const { unreadCount } = useNotifications();

  // Don't render on auth pages or live-chat (full-screen)
  const hideOn = ['/signin', '/signup', '/live-chat'];
  if (hideOn.some((p) => pathname.startsWith(p))) return null;
  if (!user) return null;

  const { mobileItems } = getNav(user.role);

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 safe-area-pb"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-stretch h-16">
        {mobileItems.map((item) => {
          const active = isActive(item);
          const count  = item.badge === 'notifications' ? unreadCount : 0;

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative"
            >
              {/* Active pill */}
              {active && (
                <motion.div
                  layoutId="mobile-active"
                  className="absolute inset-x-3 top-1 h-0.5 rounded-full bg-orange-400"
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                />
              )}

              <div className="relative">
                <item.icon
                  size={20}
                  className={active ? 'text-white' : 'text-white/40'}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>

              <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-white/35'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
