'use client';

import { EyeOff } from 'lucide-react';
import { useViewContext } from './ViewContextProvider';

export default function ViewContextBanner() {
  const { isElevated, viewContext, exitContext, isSwitching } = useViewContext();

  if (!isElevated) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 py-1.5 text-xs font-semibold"
      style={{
        background:  'rgba(245,158,11,0.92)',
        backdropFilter: 'blur(4px)',
        color: 'rgba(0,0,0,0.85)',
      }}
    >
      <EyeOff size={12} />
      <span>Viewing as {viewContext}</span>
      <button
        onClick={exitContext}
        disabled={isSwitching}
        style={{
          marginLeft:      8,
          textDecoration:  'underline',
          cursor:          isSwitching ? 'default' : 'pointer',
          opacity:         isSwitching ? 0.5 : 1,
          background:      'none',
          border:          'none',
          color:           'inherit',
          font:            'inherit',
          fontWeight:      600,
        }}
      >
        {isSwitching ? 'Exiting…' : 'Exit'}
      </button>
    </div>
  );
}
