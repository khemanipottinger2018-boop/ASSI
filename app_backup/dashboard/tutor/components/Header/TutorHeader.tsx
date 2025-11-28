import { Crown, Star, Trophy, TrendingUp, Zap, Flame, Sprout, Rocket } from 'lucide-react';
import NotificationBell from './NotificationBell';

interface TutorHeaderProps {
  profile: any;
  notifications: number;
  rating?: number;
  rank?: string;
  subjectRank?: number;
}

export default function TutorHeader({ profile, notifications, rating = 4.92, rank = 'Elite Tutor', subjectRank }: TutorHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-white">
              Welcome back, {profile?.username || 'Tutor'}! 🚀
            </h1>
            <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full">
              <Crown size={16} className="text-white" />
              <span className="text-white text-sm font-medium">PRO</span>
            </div>
          </div>
          <p className="text-purple-200 text-lg">
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
      case 'Elite Tutor': return <Crown size={14} className="text-yellow-400" />;
      case 'Star Tutor': return <Star size={14} className="text-purple-400" />;
      case 'Pro Tutor': return <Zap size={14} className="text-red-400" />;
      case 'Rising Tutor': return <TrendingUp size={14} className="text-green-400" />;
      case 'Developing Tutor': return <Sprout size={14} className="text-blue-400" />;
      case 'New Tutor': return <Rocket size={14} className="text-gray-400" />;
      default: return <Star size={14} className="text-yellow-400" />;
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
              className={i < fullStars ? 'text-yellow-400 fill-current' : (i === fullStars && hasHalfStar ? 'text-yellow-400' : 'text-yellow-400 opacity-30')} 
            />
          ))}
        </div>
        <span className="text-white font-bold text-lg">{rating.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <div className="flex items-center gap-1">
          {getRankIcon(rank)}
          <p className="text-purple-300 text-sm">{rank}</p>
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