'use client';

import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{
      background: '#020408',
      fontFamily: "'DM Mono', 'Fira Code', monospace",
    }}>
      {/* Ambient HUD glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 15% 50%, rgba(0,180,255,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 40% 60% at 85% 20%, rgba(0,255,200,0.03) 0%, transparent 60%),
          radial-gradient(ellipse 30% 30% at 50% 90%, rgba(0,120,255,0.04) 0%, transparent 60%)
        `,
      }} />
      {/* Scanlines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,180,255,0.008) 3px, rgba(0,180,255,0.008) 4px)',
      }} />
      {/* Grid texture */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `
          linear-gradient(rgba(0,180,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,180,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />

      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 2 }}>
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,180,255,0.2) transparent' }}>
          {children}
        </main>
      </div>
    </div>
  );
}