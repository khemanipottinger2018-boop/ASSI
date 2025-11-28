import { useRouter } from 'next/navigation';
import { 
  Users, Calendar, DollarSign, Video, BookOpen, BarChart3,
  Sparkles 
} from 'lucide-react';
import ActionCard from './ActionCard';

interface QuickActionsProps {
  upcomingSessions: any[];
}

export default function QuickActions({ upcomingSessions }: QuickActionsProps) {
  const router = useRouter();

  // Move isToday function inside the component
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const quickActions = [
    {
      icon: <Users size={20} />,
      title: 'Student Hub',
      description: 'Manage all your students',
      href: '/dashboard/tutor/students',
      gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      badge: `${upcomingSessions?.length || 0} upcoming`,
      premium: true
    },
    {
      icon: <Calendar size={20} />,
      title: 'Schedule',
      description: 'Manage your sessions',
      href: '/dashboard/tutor/schedule',
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',
      badge: `${upcomingSessions?.filter(s => isToday(new Date(s.scheduled_time))).length || 0} today`
    },
    {
      icon: <DollarSign size={20} />,
      title: 'Earnings',
      description: 'Track income & growth',
      href: '/dashboard/tutor/earnings',
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      premium: true
    },
    {
      icon: <Video size={20} />,
      title: 'Classroom',
      description: 'Live teaching tools',
      href: '/dashboard/tutor/classroom',
      gradient: 'bg-gradient-to-br from-red-500 to-pink-600',
      badge: 'NEW'
    },
    {
      icon: <BookOpen size={20} />,
      title: 'Library',
      description: 'Teaching materials',
      href: '/dashboard/tutor/library',
      gradient: 'bg-gradient-to-br from-orange-500 to-amber-600',
      badge: '45 items'
    },
    {
      icon: <BarChart3 size={20} />,
      title: 'Analytics',
      description: 'Performance insights',
      href: '/dashboard/tutor/analytics',
      gradient: 'bg-gradient-to-br from-teal-500 to-green-600',
      premium: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {quickActions.map((action, index) => (
        <ActionCard
          key={index}
          action={action}
          onClick={() => router.push(action.href)}
        />
      ))}
    </div>
  );
}