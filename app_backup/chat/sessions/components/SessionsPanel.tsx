import { Clock, Filter, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SessionCard from './SessionCard';
import EmptySessions from './EmptySessions';

// Define Session locally since the import is broken
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

interface SessionsPanelProps {
  sessions: Session[];
  onStartSession?: (sessionId: string) => void;
  onCancelSession?: (sessionId: string) => void;
}

export default function SessionsPanel({ 
  sessions, 
  onStartSession, 
  onCancelSession 
}: SessionsPanelProps) {
  const router = useRouter();

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Clock size={20} />
          Upcoming Sessions
          <span className="bg-purple-500 text-white text-sm px-2 py-1 rounded-full ml-2">
            {sessions.length}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <button className="text-purple-300 hover:text-white text-sm font-medium flex items-center gap-1">
            <Filter size={14} />
            Filter
          </button>
          <button 
            onClick={() => router.push('/dashboard/tutor/schedule')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            View Schedule
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <EmptySessions />
        ) : (
          sessions.map((session) => (
            <SessionCard 
              key={session.session_id} 
              session={session} 
              onStartSession={onStartSession}
              onCancelSession={onCancelSession}
            />
          ))
        )}
      </div>
    </div>
  );
}