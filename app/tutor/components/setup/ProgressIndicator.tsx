// app/dashboard/tutor/set./components/ProgressIndicator.tsx
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="text-center mt-8">
      <p className="text-gray-600">
        Step {currentStep} of {totalSteps} • {Math.round((currentStep / totalSteps) * 100)}% Complete
      </p>
    </div>
  );
}