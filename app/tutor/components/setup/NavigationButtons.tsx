// app/dashboard/tutor/setup/components/NavigationButtons.tsx
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  canSubmit: boolean;
}

export default function NavigationButtons({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onSubmit,
  submitting,
  canSubmit
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between pt-12 mt-12 border-t border-gray-200">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentStep === 1}
        className="flex items-center px-8 py-4 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-lg"
      >
        <ArrowLeft size={20} className="mr-3" />
        Previous
      </button>

      {currentStep < totalSteps ? (
        <button
          type="button"
          onClick={onNext}
          className="flex items-center px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl"
        >
          Continue
          <ArrowRight size={20} className="ml-3" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className="flex items-center px-10 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl"
        >
          {submitting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              Creating Your Profile...
            </>
          ) : (
            <>
              🚀 Launch My Tutor Profile
              <CheckCircle size={20} className="ml-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}