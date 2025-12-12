export default function SessionsPanel({ sessions }: any) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Recent Sessions</h3>
      <div className="space-y-4">
        {sessions?.map((session: any) => (
          <div 
            key={session.session_id} 
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="font-semibold text-slate-900 dark:text-white text-lg">
                  {session.student_name || `Student #${session.student_id}`}
                </p>
                <span className="text-slate-600 dark:text-slate-300 text-sm bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded-full">
                  {session.subject_name || session.subject}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span>{formatDate(session.scheduled_time)}</span>
                <span>{session.duration_minutes || 60} mins</span>
                <span>${session.price || 0}</span>
              </div>
            </div>
            <span className={`px-3 py-2 rounded-full text-sm font-medium ${
              session.status === 'completed' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : session.status === 'scheduled' || session.status === 'upcoming'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : session.status === 'cancelled'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            }`}>
              {session.status?.charAt(0).toUpperCase() + session.status?.slice(1)}
            </span>
          </div>
        ))}
        {(!sessions || sessions.length === 0) && (
          <div className="text-center py-8">
            <div className="text-slate-400 mb-2">📚</div>
            <p className="text-slate-600 dark:text-slate-400">No recent sessions</p>
            <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">Your upcoming sessions will appear here</p>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200">
          View All Sessions
        </button>
      </div>
    </div>
  );
}