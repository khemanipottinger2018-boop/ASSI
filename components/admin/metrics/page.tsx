'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function AdminMetricsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/metrics/runtime`, { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ success: false, error: 'Failed to load metrics' }));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionLabel text="Metrics // Runtime" />
      <Panel>
        <pre style={preStyle}>{JSON.stringify(data, null, 2)}</pre>
      </Panel>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 3, height: 14, background: '#00b4ff', borderRadius: 2, boxShadow: '0 0 8px #00b4ff' }} />
      <p style={{ color: 'rgba(0,180,255,0.5)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
        {text}
      </p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 12,
      background: 'rgba(0,10,22,0.70)',
      border: '1px solid rgba(0,180,255,0.10)',
    }}>
      {children}
    </div>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  color: 'rgba(255,255,255,0.55)',
  fontSize: 11,
  lineHeight: 1.5,
};