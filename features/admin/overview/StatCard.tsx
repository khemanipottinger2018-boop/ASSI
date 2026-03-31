'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

type Props = {
  title: string;
  value?: number | string;
  icon?: LucideIcon;
  accent?: 'blue' | 'green' | 'orange' | 'red';
  delta?: string;
};

const accents = {
  blue:   { color: '#00b4ff', glow: 'rgba(0,180,255,0.15)',   border: 'rgba(0,180,255,0.2)' },
  green:  { color: '#00ff96', glow: 'rgba(0,255,150,0.12)',   border: 'rgba(0,255,150,0.2)' },
  orange: { color: '#ff9f0a', glow: 'rgba(255,159,10,0.12)',  border: 'rgba(255,159,10,0.2)' },
  red:    { color: '#ff453a', glow: 'rgba(255,69,58,0.12)',   border: 'rgba(255,69,58,0.2)' },
};

export default function StatCard({ title, value, icon: Icon, accent = 'blue', delta }: Props) {
  const a = accents[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 12, padding: '16px 18px',
        background: 'rgba(0,10,22,0.8)',
        border: `1px solid ${a.border}`,
        boxShadow: `inset 0 0 30px ${a.glow}`,
      }}
    >
      {/* Corner notch */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 0, height: 0,
        borderStyle: 'solid',
        borderWidth: '0 20px 20px 0',
        borderColor: `transparent ${a.color.replace(')', ', 0.3)')} transparent transparent`,
      }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${a.color}50, transparent)` }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{title}</p>
        {Icon && <Icon size={13} style={{ color: a.color, opacity: 0.6 }} />}
      </div>

      {value === undefined ? (
        <div style={{ marginTop: 12, height: 28, width: 80, borderRadius: 4, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease infinite' }} />
      ) : (
        <p style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: a.color, letterSpacing: '-0.02em', lineHeight: 1, textShadow: `0 0 20px ${a.color}60` }}>
          {value}
        </p>
      )}

      {delta && (
        <p style={{ marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>{delta}</p>
      )}
    </motion.div>
  );
}