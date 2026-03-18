'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

export default function AdminHeader() {
  const { user } = useAuth();
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(0,8,18,0.95)',
      borderBottom: '1px solid rgba(0,180,255,0.1)',
      position: 'relative', flexShrink: 0,
    }}>
      {/* Left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, transparent, rgba(0,180,255,0.5), transparent)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={14} style={{ color: 'rgba(0,180,255,0.5)' }} />
        <div>
          <p style={{ color: 'rgba(0,180,255,0.4)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Sentinel Control Layer</p>
          <p style={{ color: 'rgba(0,220,255,0.7)', fontSize: 11, marginTop: 1 }}>Platform monitoring active</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Live clock */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'rgba(0,180,255,0.3)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>System Time</p>
          <p style={{ color: '#00b4ff', fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>{time}</p>
        </div>

        {/* User badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(0,180,255,0.06)',
          border: '1px solid rgba(0,180,255,0.15)',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6b35', boxShadow: '0 0 8px #ff6b35' }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.05em' }}>
            {user?.username ?? 'ADMIN'}
          </span>
          <span style={{ color: 'rgba(255,100,50,0.6)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>// ROOT</span>
        </div>
      </div>
    </header>
  );
}