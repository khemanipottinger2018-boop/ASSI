'use client';

export default function AnimatedGradient({ theme = 'default' }) {
  const themeGradients = {
    // Mathematics - Cool, logical blues
    math: `
      radial-gradient(circle at 20% 80%, rgba(41, 128, 185, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(52, 152, 219, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(93, 173, 226, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(41, 128, 185, 0.8), rgba(52, 152, 219, 0.8), rgba(93, 173, 226, 0.8))
    `,
    // English/Literature - Rich, creative purples
    english: `
      radial-gradient(circle at 20% 80%, rgba(142, 68, 173, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(155, 89, 182, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(185, 120, 216, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(142, 68, 173, 0.8), rgba(155, 89, 182, 0.8), rgba(185, 120, 216, 0.8))
    `,
    // Science - Fresh, natural greens
    science: `
      radial-gradient(circle at 20% 80%, rgba(39, 174, 96, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(46, 204, 113, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(82, 218, 136, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(39, 174, 96, 0.8), rgba(46, 204, 113, 0.8), rgba(82, 218, 136, 0.8))
    `,
    // Business - Professional, trustworthy teals
    business: `
      radial-gradient(circle at 20% 80%, rgba(22, 160, 133, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(26, 188, 156, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(72, 201, 176, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(22, 160, 133, 0.8), rgba(26, 188, 156, 0.8), rgba(72, 201, 176, 0.8))
    `,
    // Accounts/Finance - Stable, reliable blues
    accounts: `
      radial-gradient(circle at 20% 80%, rgba(44, 62, 80, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(52, 73, 94, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(127, 140, 141, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(44, 62, 80, 0.8), rgba(52, 73, 94, 0.8), rgba(127, 140, 141, 0.8))
    `,
    // IT/Technology - Modern, tech purples
    it: `
      radial-gradient(circle at 20% 80%, rgba(103, 65, 114, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(125, 102, 168, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(162, 155, 254, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(103, 65, 114, 0.8), rgba(125, 102, 168, 0.8), rgba(162, 155, 254, 0.8))
    `,
    // Physics - Deep, cosmic blues
    physics: `
      radial-gradient(circle at 20% 80%, rgba(30, 55, 153, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(56, 103, 214, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(86, 204, 242, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(30, 55, 153, 0.8), rgba(56, 103, 214, 0.8), rgba(86, 204, 242, 0.8))
    `,
    // Chemistry - Energetic, reactive oranges
    chemistry: `
      radial-gradient(circle at 20% 80%, rgba(230, 126, 34, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(243, 156, 18, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(248, 196, 113, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(230, 126, 34, 0.8), rgba(243, 156, 18, 0.8), rgba(248, 196, 113, 0.8))
    `,
    // Social Studies - Earthy, historical browns
    'social-studies': `
      radial-gradient(circle at 20% 80%, rgba(141, 110, 99, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(170, 142, 131, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(199, 178, 169, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(141, 110, 99, 0.8), rgba(170, 142, 131, 0.8), rgba(199, 178, 169, 0.8))
    `,
    // Default - Original Caribbean vibe
    default: `
      radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.9) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 77, 77, 0.9) 0%, transparent 50%), 
      radial-gradient(circle at 40% 40%, rgba(255, 209, 102, 0.9) 0%, transparent 50%),
      linear-gradient(135deg, rgba(255, 107, 53, 0.8), rgba(255, 77, 77, 0.8), rgba(255, 209, 102, 0.8))
    `,
  };

  const currentGradient = themeGradients[theme as keyof typeof themeGradients] || themeGradients.default;

  return (
    <div 
      className="fixed inset-0 animate-gradient-shift"
      style={{
        background: currentGradient,
        backgroundSize: '400% 400%',
      }}
    >
      <style jsx>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>
    </div>
  );
}
