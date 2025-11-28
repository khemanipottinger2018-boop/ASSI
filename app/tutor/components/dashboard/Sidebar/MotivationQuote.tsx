import { Coffee } from 'lucide-react';

export default function MotivationQuote() {
  return (
    <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 p-6 text-center">
      <Coffee size={32} className="mx-auto text-cyan-300 mb-3" />
      <p className="text-white font-medium italic mb-2">
        "The best teachers teach from the heart, not from the book."
      </p>
      <p className="text-cyan-300 text-sm">- Unknown</p>
    </div>
  );
}