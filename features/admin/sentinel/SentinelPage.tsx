'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, AlertTriangle, Server, RefreshCw } from 'lucide-react';
import SentinelChat from '@/features/admin/sentinel/SentinelChat';
import StatCard from '@/features/admin/overview/StatCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function SentinelPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function loadData() {
    try {
      const [m, s] = await Promise.all([
        fetch(`${API_URL}/api/admin/metrics/runtime`,  { credentials: 'include' }).then((r) => r.json()),
        fetch(`${API_URL}/api/admin/sessions/live`,     { credentials: 'include' }).then((r) => r.json()),
      ]);
      if (m.success) setMetrics(m.runtime);
      if (s.success) setLiveCount(s.sessions?.length ?? 0);
      setLastRefresh(new Date());
    } catch {}
  }

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 14, background: '#00b4ff', borderRadius: 2, boxShadow: '0 0 8px #00b4ff' }} />
          <div>
            <p style={{ color: 'rgba(0,180,255,0.5)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase' }}>Sentinel Interface</p>
            <p style={{ color: 'rgba(220,240,255,0.7)', fontSize: 13, marginTop: 2 }}>AI Co-Pilot // Admin Access</p>
          </div>
        </div>

        <button onClick={loadData} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(0,180,255,0.06)', border: '1px solid rgba(0,180,255,0.15)',
          color: 'rgba(0,180,255,0.5)', fontSize: 10, letterSpacing: '0.1em',
        }}>
          <RefreshCw size={11} />
          REFRESH
        </button>
      </div>

      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatCard title="Response Time"    value={metrics ? `${metrics.responseTimeMs?.avg ?? 0}ms` : undefined} icon={Activity} accent="blue"   />
        <StatCard title="Live Sessions"    value={liveCount ?? undefined}                                          icon={Users}    accent="green"  />
        <StatCard title="Memory Heap"      value={metrics ? `${metrics.memoryHeapMb ?? 0}MB`       : undefined}   icon={Server}   accent="blue"   />
        <StatCard title="Total Requests"   value={metrics ? metrics.requests?.count ?? 0            : undefined}   icon={Activity} accent="orange" />
      </div>

      {/* Main layout — chat + side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Sentinel chat */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ minHeight: 500 }}
        >
          <SentinelChat />
        </motion.div>

        {/* Side info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Last refresh */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(0,10,22,0.7)', border: '1px solid rgba(0,180,255,0.1)',
          }}>
            <p style={{ color: 'rgba(0,180,255,0.35)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Data Feed</p>
            <p style={{ color: 'rgba(0,255,150,0.6)', fontSize: 11, marginTop: 6 }}>
              {lastRefresh.toLocaleTimeString('en-US', { hour12: false })}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 2 }}>Last sync // auto 30s</p>
          </div>

          {/* Capabilities */}
          <div style={{
            padding: '14px', borderRadius: 10,
            background: 'rgba(0,10,22,0.7)', border: '1px solid rgba(0,180,255,0.1)',
            flex: 1,
          }}>
            <p style={{ color: 'rgba(0,180,255,0.35)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Sentinel Can</p>
            {[
              'Query live user data',
              'Search + suspend accounts',
              'Review tutor applications',
              'Analyse error patterns',
              'Read runtime metrics',
              'Surface session anomalies',
            ].map((cap) => (
              <div key={cap} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00b4ff', flexShrink: 0, boxShadow: '0 0 4px #00b4ff' }} />
                <p style={{ color: 'rgba(200,230,255,0.45)', fontSize: 11 }}>{cap}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}