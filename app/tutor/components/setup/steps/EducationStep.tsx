// app/dashboard/tutor/set./components/steps/EducationStep.tsx
import { GraduationCap } from 'lucide-react';

interface EducationStepProps {
  education: string;
  expertiseLevel: string;
  certifications: string;
  teachingPhilosophy: string;
  isStudentTutor: boolean;
  onUpdate: (updates: any) => void;
}

const EXPERTISE_LEVELS = [
  { value: 'Beginner', label: '🎓 Beginner (1-2 years)' },
  { value: 'Intermediate', label: '🎓 Intermediate (3-5 years)' },
  { value: 'Advanced', label: '🎓 Advanced (5+ years)' },
  { value: 'Expert', label: '🎓 Expert (Professional)' },
] as const;

export default function EducationStep({ 
  education, 
  expertiseLevel, 
  certifications, 
  teachingPhilosophy,
  isStudentTutor,
  onUpdate 
}: EducationStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <GraduationCap className="mx-auto text-blue-600 mb-4" size={52} />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Qualifications</h2>
        <p className="text-gray-600 text-lg">
          Show students why you're the right choice for their learning journey.
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-4">
            Education Background *
          </label>
          <input
            type="text"
            value={education}
            onChange={(e) => onUpdate({ education: e.target.value })}
            placeholder="e.g., BSc Computer Science, University of the West Indies | CAPE 6-unit award in Mathematics"
            className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            required
          />
        </div>

        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-4">
            Teaching Philosophy *
          </label>
          <textarea
            value={teachingPhilosophy}
            onChange={(e) => onUpdate({ teachingPhilosophy: e.target.value })}
            placeholder="Describe your teaching style, methods, and what students can expect from your sessions..."
            rows={4}
            className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-lg"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xl font-semibold text-gray-900 mb-4">
              Expertise Level
            </label>
            <select
              value={expertiseLevel}
              onChange={(e) => onUpdate({ expertiseLevel: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            >
              {EXPERTISE_LEVELS.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xl font-semibold text-gray-900 mb-4">
              Certifications & Awards
            </label>
            <input
              type="text"
              value={certifications}
              onChange={(e) => onUpdate({ certifications: e.target.value })}
              placeholder="e.g., Certified Teacher, CAPE Award, Teaching Diploma..."
              className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>
        </div>

        <div className="p-6 border border-blue-200 rounded-xl bg-blue-50">
          <div className="flex items-start space-x-4">
            <input 
              type="checkbox" 
              checked={isStudentTutor}
              onChange={(e) => onUpdate({ isStudentTutor: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 mt-1 transform scale-125" 
            />
            <div>
              <span className="text-gray-900 font-semibold text-lg block mb-2">
                🎓 I am a Student Tutor
              </span>
              <p className="text-gray-600">
                Check this if you're currently a student yourself. This helps match you with appropriate students.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}