// app/tutors/components/tutors/NoTutorsAvailable.tsx
'use client';

import { Users, Clock, RefreshCw } from 'lucide-react';

interface NoTutorsAvailableProps {
  subjectName: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export function NoTutorsAvailable({ 
  subjectName, 
  onBack,
  onRetry 
}: NoTutorsAvailableProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Illustration */}
      <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center mb-6">
        <Users size={40} className="text-white/60" />
      </div>
      
      {/* Message */}
      <h3 className="text-2xl font-bold text-white mb-3">
        No Tutors Available
      </h3>
      
      <p className="text-gray-400 text-lg max-w-md mb-2">
        We don't have any tutors available for <span className="text-white font-semibold">{subjectName}</span> right now.
      </p>
      
      <div className="flex items-center justify-center text-gray-500 text-sm mb-8">
        <Clock size={16} className="mr-2" />
        <span>Check back later or try another subject</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 bg-white/10 text-white rounded-xl border border-white/20 hover:bg-white/20 transition-colors font-medium"
          >
            Browse Other Subjects
          </button>
        )}
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        )}
      </div>

      {/* Helpful Tips */}
      <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 max-w-md">
        <h4 className="text-white font-semibold mb-2 text-sm">Suggestions:</h4>
        <ul className="text-gray-400 text-sm space-y-1 text-left">
          <li>• Try a broader subject category</li>
          <li>• Check back during peak hours (3 PM - 9 PM)</li>
          <li>• Contact support for tutor recommendations</li>
        </ul>
      </div>
    </div>
  );
}