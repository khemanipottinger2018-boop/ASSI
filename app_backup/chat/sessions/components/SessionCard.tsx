import { Video, MessageSquare, Calendar, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Simple local date formatting - no external dependencies needed
const formatSessionTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Define the Session type locally since the import is broken
interface Session {
  session_id: string;
  student_id: string;
  student_first_name: string;
  student_last_name: string;
  subject_name: string;
  scheduled_time: string;
  duration_minutes: number;
  price: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  topic?: string;
}

interface SessionCardProps {
  session: Session;
  onStartSession?: (sessionId: string) => void;
  onCancelSession?: (sessionId: string) => void;
}

export default function SessionCard({ 
  session, 
  onStartSession, 
  onCancelSession 
}: SessionCardProps) {
  const router = useRouter();

  const handleStartSession = () => {
    onStartSession?.(session.session_id);
    router.push(`/classroom/${session.session_id}`);
  };

  const handleMessageStudent = () => {
    router.push(`/messages?student=${session.student_id}`);
  };

  const handleCancelSession = () => {
    if (confirm(`Are you sure you want to cancel the session with ${session.student_first_name}?`)) {
      onCancelSession?.(session.session_id);
    }
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500 text-white';
      case 'confirmed': return 'bg-green-500 text-white';
      case 'in-progress': return 'bg-yellow-500 text-black';
      case 'completed': return 'bg-gray-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: Session['status']) => {
    switch (status) {
      case 'scheduled': return 'Scheduled';
      case 'confirmed': return 'Confirmed';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const canStartSession = (session: Session) => {
    const sessionTime = new Date(session.scheduled_time);
    const now = new Date();
    const timeDiff = sessionTime.getTime() - now.getTime();
    return session.status === 'confirmed' && timeDiff <= 30 * 60 * 1000; // 30 minutes before
  };

  const canCancelSession = (session: Session) => {
    return session.status !== 'completed' && session.status !== 'cancelled' && session.status !== 'in-progress';
  };

  return (
    <div className="group relative bg-gradient-to-r from-white/5 to-white/10 p-4 rounded-xl border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
      {/* Status indicator bar */}
      <div className={`absolute -left-2 top-1/2 transform -translate-y-1/2 w-1 h-16 rounded-full ${
        session.status === 'confirmed' ? 'bg-green-500' : 
        session.status === 'scheduled' ? 'bg-blue-500' :
        session.status === 'in-progress' ? 'bg-yellow-500' :
        session.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
      }`} />
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Student Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
            {session.student_first_name?.[0]}{session.student_last_name?.[0]}
          </div>
          
          {/* Session Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                {session.student_first_name} {session.student_last_name}
              </h4>
              <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(session.status)}`}>
                {getStatusText(session.status)}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-300 mb-1">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                {formatSessionTime(session.scheduled_time)}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                {session.duration_minutes} min
              </div>
            </div>
            
            <p className="text-purple-200 text-sm">{session.subject_name}</p>
            <p className="text-purple-300 text-xs mt-1">
              {session.topic || 'General Tutoring'}
            </p>
          </div>
        </div>
        
        {/* Session Time & Price */}
        <div className="text-right">
          <p className="text-white font-medium">{formatSessionTime(session.scheduled_time)}</p>
          <p className="text-purple-300 text-xs">{session.duration_minutes} minutes</p>
          <p className="text-green-400 text-sm font-bold">${session.price}</p>
        </div>
      </div>
      
      {/* Session Actions */}
      <div className="flex gap-2">
        {canStartSession(session) && (
          <button 
            onClick={handleStartSession}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-3 rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/25 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Video size={14} />
            Start Session
          </button>
        )}
        
        <button 
          onClick={handleMessageStudent}
          className="bg-white/10 text-white py-2 px-3 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-sm"
        >
          <MessageSquare size={14} />
          Message
        </button>
        
        {canCancelSession(session) && (
          <button 
            onClick={handleCancelSession}
            className="bg-red-500/20 text-red-300 py-2 px-3 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2 text-sm border border-red-500/30"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}