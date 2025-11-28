// app/dashboard/tutor/setup/components/steps/SubjectsStep.tsx
import { BookOpen } from 'lucide-react';

interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

interface SubjectsStepProps {
  subjects: Subject[];
  selectedSubjects: string[];
  onToggleSubject: (subjectId: string) => void;
}

export default function SubjectsStep({ subjects, selectedSubjects, onToggleSubject }: SubjectsStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <BookOpen className="mx-auto text-blue-600 mb-4" size={52} />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Teaching Subjects</h2>
        <p className="text-gray-600 text-lg">
          Select the subjects you're qualified to teach. Students will find you based on these.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((subject) => (
          <button
            key={subject.subject_id}
            type="button"
            onClick={() => onToggleSubject(subject.subject_id)}
            className={`p-6 rounded-xl border-2 text-left transition-all duration-200 group ${
              selectedSubjects.includes(subject.subject_id)
                ? 'bg-blue-50 border-blue-500 shadow-md scale-105'
                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg'
            }`}
          >
            <div className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
              {subject.name}
            </div>
            <div className="text-sm text-gray-500 mt-2">{subject.level}</div>
          </button>
        ))}
      </div>
      
      {selectedSubjects.length > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-800 font-medium text-center">
            ✅ Selected {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}