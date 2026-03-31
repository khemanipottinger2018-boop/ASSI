'use client';

import { motion } from 'framer-motion';

export default function AssiTypingDots() {
  return (
    <div className="flex justify-start">
      <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 mr-2 flex items-center justify-center"
        style={{ background: 'radial-gradient(circle at top left, #ff9aa2, #b84cff)' }}>
        <span className="text-white text-[9px] font-bold">A</span>
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'rgba(255,154,162,0.7)' }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
}
