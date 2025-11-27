"use client";

interface SessionSidebarProps {
  subjectName?: string;
  availableTutors: number;
  totalTutors?: number;
  onlineTutors?: number;
  chatStatus?: 'idle' | 'requested' | 'accepted' | 'rejected';
}

export default function SessionSidebar({
  subjectName,
  availableTutors,
  totalTutors = 0,
  onlineTutors = 0,
  chatStatus = 'idle'
}: SessionSidebarProps) {
  return (
    <div className="w-80 bg-black/40 backdrop-blur-2xl border-r border-white/10 p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Subject Info */}
        <div>
          <h2 className="text-lg font-bold text-white mb-2">Live Chat Assistant</h2>
          {subjectName && (
            <p className="text-white/60 text-sm">Subject: {subjectName}</p>
          )}
        </div>

        {/* Chat Status */}
        {chatStatus !== 'idle' && (
          <div className={`rounded-xl p-4 border ${
            chatStatus === 'requested' ? 'bg-yellow-500/20 border-yellow-500/30' :
            chatStatus === 'accepted' ? 'bg-green-500/20 border-green-500/30' :
            'bg-red-500/20 border-red-500/30'
          }`}>
            <div className={`text-center ${
              chatStatus === 'requested' ? 'text-yellow-300' :
              chatStatus === 'accepted' ? 'text-green-300' : 'text-red-300'
            }`}>
              {chatStatus === 'requested' && '⏳ Request Pending...'}
              {chatStatus === 'accepted' && '✅ Chat Accepted!'}
              {chatStatus === 'rejected' && '❌ Chat Declined'}
            </div>
          </div>
        )}

        {/* Live Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl p-3 text-center border border-green-500/30">
            <div className="text-green-400 font-bold text-lg">{onlineTutors}</div>
            <div className="text-green-300 text-sm">Online Now</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-3 text-center border border-blue-500/30">
            <div className="text-blue-400 font-bold text-lg">{totalTutors}</div>
            <div className="text-blue-300 text-sm">Total Tutors</div>
          </div>
        </div>

        {/* How Live Chat Works */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <h3 className="text-white font-semibold text-sm mb-2">Instant Help</h3>
          <ul className="text-white/60 text-xs space-y-1">
            <li>• Select an online tutor</li>
            <li>• Send chat request</li>
            <li>• Tutor accepts → Live chat starts</li>
            <li>• Get instant help</li>
            <li>• Free & immediate</li>
          </ul>
        </div>

        {/* Refresh Info */}
        <div className="text-white/40 text-xs text-center">
          Availability updates every 15 seconds
        </div>
      </div>
    </div>
  );
}
