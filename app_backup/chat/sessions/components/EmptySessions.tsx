// app/dashboard/tutor/components/Sessions/EmptySessions.tsx
import { Calendar, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EmptySessions() {
  const router = useRouter();

  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-4">📚</div>
      <h3 className="text-gray-300 text-lg font-bold mb-2">No Upcoming Sessions</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
        You don't have any scheduled sessions yet. When students book sessions with you, they'll appear here.
      </p>
      <button 
        onClick={() => router.push('/dashboard/tutor/availability')}
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-6 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2 mx-auto"
      >
        <Plus size={16} />
        Set Availability
      </button>
    </div>
  );
}