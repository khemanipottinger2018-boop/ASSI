'use client';
import { motion } from 'framer-motion';

export default function LavalampBackground({ theme = 'caribbean-vibrant' }) {
  const themeColors = {
    'caribbean-vibrant': ['#FF6B35', '#FF4D4D', '#FFD166'], // ORIGINAL Caribbean colors
    math: ['#2980b9', '#3498db', '#5dade2'],
    english: ['#8e44ad', '#9b59b6', '#bb8fce'],
    science: ['#27ae60', '#2ecc71', '#58d68d'],
    business: ['#16a085', '#1abc9c', '#48c9b0'],
    accounts: ['#2c3e50', '#34495e', '#7f8c8d'],
    it: ['#674172', '#7d66a8', '#a29bfe'],
    physics: ['#1e3799', '#3867d6', '#56ccf2'],
    chemistry: ['#e67e22', '#f39c12', '#f8c471'],
    'social-studies': ['#8d6e63', '#aa8e83', '#c7b2a9'],
  };

  const currentColors = themeColors[theme as keyof typeof themeColors] || themeColors['caribbean-vibrant'];

  const isVibrant = theme === 'caribbean-vibrant';

  const blobs = [
    { width: '400px', height: '400px', top: '-100px', left: '-100px', color: currentColors[0], delay: 0, duration: 25 },
    { width: '300px', height: '300px', top: '60%', left: '80%', color: currentColors[1], delay: 5, duration: 30 },
    { width: '350px', height: '350px', top: '70%', left: '-50px', color: currentColors[2], delay: 10, duration: 20 },
    { width: '250px', height: '250px', top: '-50px', left: '60%', color: currentColors[0], delay: 15, duration: 35 },
    { width: '320px', height: '320px', top: '30%', left: '40%', color: currentColors[1], delay: 20, duration: 28 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Black overlay only for subject themes */}
      {!isVibrant && (
        <div className="absolute inset-0 bg-black z-0" />
      )}
      
      {blobs.map((blob, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full blur-3xl"
          style={{
            width: blob.width,
            height: blob.height,
            top: blob.top,
            left: blob.left,
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            opacity: isVibrant ? 0.7 : 0.6, // Slightly less opaque for subjects on black
            zIndex: 1,
          }}
          animate={{
            x: [0, 100, -50, 80, 0],
            y: [0, -80, 120, -60, 0],
            scale: [1, 1.2, 0.8, 1.1, 1],
            rotate: [0, 45, -30, 60, 0],
          }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: blob.delay,
          }}
        />
      ))}
      
      {/* Overlay gradient - Caribbean gradient for vibrant, transparent for subjects */}
      <div 
        className="absolute inset-0"
        style={{
          background: isVibrant 
            ? 'linear-gradient(135deg, #FF6B35 0%, #FF4D4D 50%, #FFD166 100%)'
            : 'transparent',
          zIndex: 0,
        }}
      />
    </div>
  );
}
