'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookOpen, Activity, AlertTriangle, BarChart2, Cpu } from 'lucide-react';

const items = [
  { label: 'Overview',      href: '/admin',                    icon: LayoutDashboard },
  { label: 'Applications',  href: '/admin/tutor-applications', icon: BookOpen },
  { label: 'Users',         href: '/admin/users',              icon: Users },
  { label: 'Sessions',      href: '/admin/sessions',           icon: Activity },
  { label: 'Errors',        href: '/admin/errors',             icon: AlertTriangle },
  { label: 'Metrics',       href: '/admin/metrics',            icon: BarChart2 },
  { label: 'Sentinel',      href: '/admin/sentinel',           icon: Cpu },
];

export default function AdminSidebar() {
  const path = usePathname();

  return (
    <aside style={{
      width: 240,
      background: 'rgba(0,10,20,0.95)',
      borderRight: '1px solid rgba(0,180,255,0.12)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(0,180,255,0.6), transparent)',
      }} />

      {/* Brand */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,180,255,0.3), rgba(0,255,200,0.15))',
            border: '1px solid rgba(0,180,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#00b4ff', fontSize: 14, fontWeight: 700 }}>S</span>
          </div>
          <div>
            <p style={{ color: 'rgba(0,180,255,0.5)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', lineHeight: 1 }}>SENTINEL</p>
            <p style={{ color: '#e0f4ff', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', marginTop: 2 }}>Admin Console</p>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          marginTop: 16, padding: '6px 10px', borderRadius: 6,
          background: 'rgba(0,255,150,0.06)', border: '1px solid rgba(0,255,150,0.15)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff96', boxShadow: '0 0 6px #00ff96', flexShrink: 0 }} />
          <span style={{ color: 'rgba(0,255,150,0.7)', fontSize: 10, letterSpacing: '0.1em' }}>ALL SYSTEMS NOMINAL</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 12px' }}>
        <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>Navigation</p>
        {items.map((item) => {
          const active = path === item.href || (item.href !== '/admin' && path.startsWith(item.href));
          const Icon = item.icon;
          const isSentinel = item.href === '/admin/sentinel';

          return (
            <Link key={item.href} href={item.href} style={{ display: 'block', marginBottom: 2, textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: active
                  ? 'rgba(0,180,255,0.1)'
                  : isSentinel ? 'rgba(0,180,255,0.04)' : 'transparent',
                border: active
                  ? '1px solid rgba(0,180,255,0.25)'
                  : isSentinel ? '1px solid rgba(0,180,255,0.1)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}>
                <Icon size={14} style={{ color: active ? '#00b4ff' : isSentinel ? 'rgba(0,180,255,0.5)' : 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <span style={{
                  fontSize: 12, letterSpacing: '0.05em',
                  color: active ? '#00d4ff' : isSentinel ? 'rgba(0,200,255,0.6)' : 'rgba(255,255,255,0.45)',
                  fontWeight: active ? 600 : 400,
                }}>
                  {item.label}
                </span>
                {active && (
                  <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#00b4ff', boxShadow: '0 0 6px #00b4ff' }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(0,180,255,0.08)' }}>
        <p style={{ color: 'rgba(0,180,255,0.2)', fontSize: 9, letterSpacing: '0.15em' }}>CLEARANCE: LEVEL A</p>
        <p style={{ color: 'rgba(0,180,255,0.15)', fontSize: 9, marginTop: 2 }}>SENTINEL v1.0 // ASSI PLATFORM</p>
      </div>
    </aside>
  );
}