// app/dashboard/tutor/setup/components/steps/ProfileStep.tsx
import { User } from 'lucide-react';

interface ProfileStepProps {
  bio: string;
  jamaicanCurriculum: boolean;
  onUpdate: (updates: any) => void;
}

export default function ProfileStep({ bio, jamaicanCurriculum, onUpdate }: ProfileStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <User className="mx-auto text-blue-600 mb-4" size={52} />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Teaching Story</h2>
        <p className="text-gray-600 text-lg">
          Help students get to know you and your teaching approach.
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-4">
            Teaching Bio *
          </label>
          <textarea
            value={bio}
            onChange={(e) => onUpdate({ bio: e.target.value })}
            placeholder="Share your teaching philosophy, experience, and what makes your approach unique. Students love hearing about real teaching experiences and success stories..."
            rows={6}
            className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-lg leading-relaxed"
            required
          />
          <p className="text-sm text-gray-500 mt-2">
            This is your chance to stand out - be authentic and specific!
          </p>
        </div>

        <div className="p-6 border border-orange-200 rounded-xl bg-orange-50">
          <div className="flex items-start space-x-4">
            <input 
              type="checkbox" 
              checked={jamaicanCurriculum}
              onChange={(e) => onUpdate({ jamaicanCurriculum: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 mt-1 transform scale-125" 
            />
            <div>
              <span className="text-gray-900 font-semibold text-lg block mb-2">
                🇯🇲 Jamaican Curriculum Specialist
              </span>
              <p className="text-gray-600">
                I'm experienced with CSEC/CAPE examinations and the Jamaican education system. 
                This helps local students find tutors who understand their specific needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}