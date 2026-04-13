'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function SystemNotice({ status }: { status: 'ok' | 'warning' }) {
  const ok = status === 'ok';

  const borderColor = ok ? 'rgba(0,255,150,0.15)' : 'rgba(255,159,10,0.2)';

  return (
    <div
      className="panel flex items-center gap-3"
      style={{ borderRadius: 10, padding: '12px 16px', borderColor }}
    >
      {ok
        ? <CheckCircle size={14} style={{ color: '#00ff96', flexShrink: 0 }} />
        : <AlertTriangle size={14} style={{ color: '#ff9f0a', flexShrink: 0 }} />
      }
      <div>
        <p style={{ color: ok ? 'rgba(0,255,150,0.8)' : 'rgba(255,159,10,0.8)', fontSize: 12 }}>
          {ok ? 'Sentinel reports stable platform conditions.' : 'Sentinel has detected irregular activity requiring review.'}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 2, letterSpacing: '0.05em' }}>
          Continuous monitoring active // auto-refresh 30s
        </p>
      </div>
    </div>
  );
}