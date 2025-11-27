// app/dashboard/tutor/setup/components/ProgressHeader.tsx
import { Shield, CheckCircle } from 'lucide-react';

interface StepConfig {
  number: number;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

interface ProgressHeaderProps {
  currentStep: number;
  steps: readonly StepConfig[]; // Make sure this is readonly
}

export default function ProgressHeader({ currentStep, steps }: ProgressHeaderProps) {
  return (
    <div className="border-b border-gray-200 p-8 bg-gradient-to-r from-gray-50 to-blue-50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
        <div className="flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full">
          <Shield className="text-blue-600" size={18} />
          <span className="text-blue-700 font-medium">Tutor Setup</span>
        </div>
      </div>

      <div className="flex justify-between items-start">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          
          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full justify-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 text-white shadow-lg scale-110' 
                    : isCurrent 
                    ? 'bg-blue-600 text-white shadow-lg scale-110 border-4 border-blue-200'
                    : 'bg-gray-200 text-gray-400'
                }`}>
                  {isCompleted ? <CheckCircle size={20} /> : <Icon size={20} />}
                </div>
              </div>
              <div className="text-center mt-4">
                <span className={`text-sm font-semibold ${isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step.title}
                </span>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mt-7 -ml-4 -mr-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}