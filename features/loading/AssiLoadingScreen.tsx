'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  visible: boolean;
}

/**
 * Full-screen ASSI branded loading screen.
 * Mount it unconditionally and drive it with the `visible` prop.
 * AnimatePresence handles the exit animation so the content beneath
 * can fade in while the loader fades out.
 */
export default function AssiLoadingScreen({ visible }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="assi-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position:        'fixed',
            inset:           0,
            zIndex:          99999,
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'center',
            background:      'radial-gradient(ellipse at 50% 40%, rgba(255,90,40,0.12) 0%, transparent 70%), #08080f',
            backdropFilter:  'blur(0px)',
          }}
        >
          {/* Glow ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position:     'absolute',
              width:        160,
              height:       160,
              borderRadius: '50%',
              background:   'radial-gradient(circle, rgba(255,100,50,0.18) 0%, transparent 70%)',
              filter:       'blur(24px)',
            }}
          />

          {/* Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 8 }}
            animate={{ opacity: 1, scale: 1,   y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            style={{
              width:        72,
              height:       72,
              borderRadius: '50%',
              background:   'radial-gradient(circle at 32% 28%, #ffd070, #ff5830, #e83258)',
              boxShadow:    '0 0 0 3px rgba(255,110,55,0.22), 0 0 32px rgba(255,90,40,0.35), 0 20px 48px rgba(0,0,0,0.5)',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <motion.span
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                color:         'rgba(255,255,255,0.95)',
                fontSize:      28,
                fontWeight:    700,
                letterSpacing: '0.02em',
                textShadow:    '0 1px 6px rgba(0,0,0,0.4)',
              }}
            >
              A
            </motion.span>
          </motion.div>

          {/* Wordmark */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.18 }}
            style={{
              color:         'rgba(255,255,255,0.90)',
              fontSize:      22,
              fontWeight:    700,
              letterSpacing: '0.14em',
              marginBottom:  10,
            }}
          >
            ASSI
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            style={{
              color:         'rgba(255,255,255,0.32)',
              fontSize:      11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom:  48,
            }}
          >
            Your Study Platform
          </motion.p>

          {/* Progress dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{ display: 'flex', gap: 6 }}
          >
            {[0, 1, 2].map(i => (
              <motion.span
                key={i}
                animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.85, 1.1, 0.85] }}
                transition={{
                  duration: 1.2,
                  repeat:   Infinity,
                  delay:    i * 0.18,
                  ease:     'easeInOut',
                }}
                style={{
                  display:      'block',
                  width:        5,
                  height:       5,
                  borderRadius: '50%',
                  background:   'rgba(255,110,55,0.7)',
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
