import { Sparkles } from 'lucide-react';

interface ActionCardProps {
  action: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    badge?: string;
    premium?: boolean;
  };
  onClick: () => void;
}

export default function ActionCard({ action, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative bg-white/10 backdrop-blur-lg p-6 rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-500 text-left group hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
    >
      <div className={`${action.gradient} w-14 h-14 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 shadow-lg`}>
        {action.icon}
      </div>
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-white text-lg">{action.title}</h3>
            {action.premium && <Sparkles size={16} className="text-yellow-400" />}
          </div>
          <p className="text-purple-200 text-sm">{action.description}</p>
        </div>
        {action.badge && (
          <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full backdrop-blur-sm">
            {action.badge}
          </span>
        )}
      </div>
    </button>
  );
}