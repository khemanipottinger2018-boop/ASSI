import { Crown, Star, Trophy, TrendingUp, Zap, Sprout, Rocket } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface TutorHeaderProps {
  user: any;
  notifications: number;
  rating?: number;
  rank?: string;
  subjectRank?: number;
}

export default function TutorHeader({ user, notifications, rating = 4.92, rank = 'Elite Tutor', subjectRank }: TutorHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Welcome back, {user?.username || 'Tutor'}! 🚀
            </h1>
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full">
              <Crown size={16} className="text-white" />
              <span className="text-white text-sm font-medium">PRO</span>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Ready to inspire the next generation? Your teaching empire awaits.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <NotificationBell count={notifications} />
          <RatingDisplay rating={rating} rank={rank} subjectRank={subjectRank} />
        </div>
      </div>
    </div>
  );
}

interface RatingDisplayProps {
  rating: number;
  rank: string;
  subjectRank?: number;
}

function RatingDisplay({ rating, rank, subjectRank }: RatingDisplayProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  const getRankIcon = (rankName: string) => {
    switch(rankName) {
      case 'Elite Tutor': return <Crown size={14} className="text-yellow-500" />;
      case 'Star Tutor': return <Star size={14} className="text-purple-500" />;
      case 'Pro Tutor': return <Zap size={14} className="text-red-500" />;
      case 'Rising Tutor': return <TrendingUp size={14} className="text-green-500" />;
      case 'Developing Tutor': return <Sprout size={14} className="text-blue-500" />;
      case 'New Tutor': return <Rocket size={14} className="text-gray-500" />;
      default: return <Star size={14} className="text-yellow-500" />;
    }
  };

  return (
    <div className="text-right">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              size={16} 
              className={i < fullStars ? 'text-yellow-500 fill-current' : (i === fullStars && hasHalfStar ? 'text-yellow-500' : 'text-yellow-500 opacity-30')} 
            />
          ))}
        </div>
        <span className="text-slate-900 dark:text-white font-bold text-lg">{rating.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <div className="flex items-center gap-1">
          {getRankIcon(rank)}
          <p className="text-slate-600 dark:text-slate-400 text-sm">{rank}</p>
        </div>
        {subjectRank && subjectRank <= 3 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
            <Trophy size={12} className="text-white" />
            <span className="text-white text-xs font-medium">#{subjectRank}</span>
          </div>
        )}
      </div>
    </div>
  );
}