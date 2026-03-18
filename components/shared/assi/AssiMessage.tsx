'use client';

import { motion } from 'framer-motion';

type AssiMessageProps = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AssiMessage({ role, content }: AssiMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      {isAssistant && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5 mr-2 flex items-center justify-center"
          style={{ background: 'radial-gradient(circle at top left, #ff9aa2, #b84cff)' }}>
          <span className="text-white text-[9px] font-bold">A</span>
        </div>
      )}

      <div
        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isAssistant
            ? 'rounded-tl-sm text-white/85'
            : 'rounded-tr-sm text-white/90'
        }`}
        style={
          isAssistant
            ? { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }
            : { background: 'linear-gradient(135deg, rgba(255,122,156,0.25), rgba(184,76,255,0.25))', border: '1px solid rgba(255,122,156,0.2)' }
        }
      >
        {content}
      </div>
    </motion.div>
  );
}