// app/dashboard/tutor/setup/components/ErrorState.tsx
import { Shield } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onReturn: () => void;
}

export default function ErrorState({ error, onReturn }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="text-red-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Required</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
        <button
          onClick={onReturn}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}