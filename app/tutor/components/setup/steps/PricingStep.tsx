// app/dashboard/tutor/set./components/steps/PricingStep.tsx
import { DollarSign } from 'lucide-react';

interface PricingStepProps {
  hourlyRate: number;
  onUpdate: (updates: any) => void;
}

const PRICE_RANGES = [
  { level: 'Beginner', range: '$20 - $35/hr', color: 'blue' },
  { level: 'Experienced', range: '$35 - $60/hr', color: 'green' },
  { level: 'Expert', range: '$60 - $100+/hr', color: 'purple' },
] as const;

export default function PricingStep({ hourlyRate, onUpdate }: PricingStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <DollarSign className="mx-auto text-blue-600 mb-4" size={52} />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Set Your Rate</h2>
        <p className="text-gray-600 text-lg">
          Choose a rate that reflects your expertise and experience level.
        </p>
      </div>
      
      <div className="space-y-8">
        <div className="text-center p-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl border border-blue-200">
          <div className="text-5xl font-bold text-green-600 mb-2">${hourlyRate}</div>
          <div className="text-gray-600 text-lg">per hour</div>
          <p className="text-sm text-gray-500 mt-2">You keep 85% of your earnings</p>
        </div>

        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-6 text-center">
            Adjust your hourly rate:
          </label>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={hourlyRate}
            onChange={(e) => onUpdate({ hourlyRate: parseInt(e.target.value) })}
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-gray-600 mt-4 px-2">
            <span className="font-medium">$20/hr</span>
            <span className="text-xl font-bold text-blue-600">${hourlyRate}/hr</span>
            <span className="font-medium">$100/hr</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICE_RANGES.map(({ level, range, color }) => (
            <div key={level} className={`p-4 bg-${color}-50 border border-${color}-200 rounded-xl text-center`}>
              <div className={`text-${color}-600 font-bold mb-2`}>{level}</div>
              <div className={`text-sm text-${color}-800`}>{range}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}