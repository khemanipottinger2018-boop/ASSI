// app/dashboard/tutor/setup/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, DollarSign, User, Calendar } from 'lucide-react';

// Components
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import Header from './components/Header';
import ProgressHeader from './components/ProgressHeader';
import NavigationButtons from './components/NavigationButtons';
import ProgressIndicator from './components/ProgressIndicator';

// Step Components
import SubjectsStep from './components/steps/SubjectsStep';
import ProfileStep from './components/steps/ProfileStep';
import EducationStep from './components/steps/EducationStep';
import AvailabilityStep from './components/steps/AvailabilityStep';
import PricingStep from './components/steps/PricingStep';

// Define types locally to avoid import issues
interface UserData {
  username: string;
  email: string;
  role: string;
}

interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

interface SetupStatus {
  user: UserData;
  canSetup: boolean;
  hasProfile: boolean;
}

interface TutorFormData {
  hourlyRate: number;
  expertiseLevel: string;
  bio: string;
  education: string;
  certifications: string;
  jamaicanCurriculum: boolean;
  selectedSubjects: string[];
  teachingPhilosophy: string;
  preferredTeachingTimes: string;
  timezone: string;
  isStudentTutor: boolean;
  responseTime: number;
}

interface StepConfig {
  number: number;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

const STEPS: readonly StepConfig[] = [
  { number: 1, title: 'Subjects', icon: BookOpen, description: 'Choose your expertise' },
  { number: 2, title: 'Profile', icon: User, description: 'Introduce yourself' },
  { number: 3, title: 'Education', icon: GraduationCap, description: 'Your qualifications' },
  { number: 4, title: 'Availability', icon: Calendar, description: 'When you teach' },
  { number: 5, title: 'Pricing', icon: DollarSign, description: 'Set your rate' },
] as const;

export default function TutorSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<TutorFormData>({
    hourlyRate: 35,
    expertiseLevel: 'Intermediate',
    bio: '',
    education: '',
    certifications: '',
    jamaicanCurriculum: true,
    selectedSubjects: [],
    teachingPhilosophy: '',
    preferredTeachingTimes: 'Flexible',
    timezone: 'America/Jamaica',
    isStudentTutor: false,
    responseTime: 24,
  });

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/signin');
        return;
      }

      const [statusResponse, subjectsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/tutors/setup/status', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/subjects')
      ]);

      if (!statusResponse.ok) throw new Error('Failed to check tutor status');
      
      const statusResult = await statusResponse.json();
      if (!statusResult.success) throw new Error(statusResult.error || 'Unable to verify tutor status');

      const status = statusResult.data;
      setSetupStatus(status);

      if (status.hasProfile) {
        router.push('/dashboard/tutor');
        return;
      }

      if (!status.canSetup) {
        setError('You are not authorized to set up a tutor profile. Please apply to become a tutor first.');
        return;
      }

      if (subjectsResponse.ok) {
        const subjectsResult = await subjectsResponse.json();
        if (subjectsResult.success) setSubjects(subjectsResult.data);
      }

    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to load setup page');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateFormData = useCallback((updates: Partial<TutorFormData>) => {
    setFormData((prev: TutorFormData) => ({ ...prev, ...updates }));
  }, []);

  const toggleSubject = useCallback((subjectId: string) => {
    setFormData((prev: TutorFormData) => ({
      ...prev,
      selectedSubjects: prev.selectedSubjects.includes(subjectId)
        ? prev.selectedSubjects.filter((id: string) => id !== subjectId)
        : [...prev.selectedSubjects, subjectId]
    }));
  }, []);

  const validateStep = useCallback((step: number): boolean => {
    const validations = {
      1: formData.selectedSubjects.length > 0,
      2: formData.bio.trim().length > 0,
      3: formData.education.trim().length > 0,
      4: formData.teachingPhilosophy.trim().length > 0,
    };

    const messages = {
      1: 'Please select at least one subject',
      2: 'Please tell students about yourself',
      3: 'Please provide your education background',
      4: 'Please share your teaching philosophy',
    };

    const isValid = validations[step as keyof typeof validations] ?? true;
    
    if (!isValid) {
      alert(messages[step as keyof typeof messages]);
      return false;
    }

    return true;
  }, [formData]);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev: number) => Math.min(prev + 1, STEPS.length));
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev: number) => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const tutorData = {
        hourly_rate: formData.hourlyRate,
        expertise_level: formData.expertiseLevel,
        bio: formData.bio.trim(),
        education_background: formData.education.trim(),
        certifications: formData.certifications.trim(),
        jamaican_curriculum: formData.jamaicanCurriculum,
        is_available: true,
        teaching_philosophy: formData.teachingPhilosophy.trim(),
        preferred_teaching_times: formData.preferredTeachingTimes,
        timezone: formData.timezone,
        is_student_tutor: formData.isStudentTutor,
        response_time: formData.responseTime
      };

      console.log('Sending tutor data:', tutorData);

      // Create tutor profile first
      const tutorResponse = await fetch('http://localhost:3001/api/tutors/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tutorData),
      });

      const tutorResult = await tutorResponse.json();
      
      if (!tutorResult.success) {
        throw new Error(tutorResult.error || 'Failed to create tutor profile');
      }

      // Then add subjects
      const subjectsResponse = await fetch('http://localhost:3001/api/tutors/subjects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subjects: formData.selectedSubjects }),
      });

      const subjectsResult = await subjectsResponse.json();
      
      if (!subjectsResult.success) {
        throw new Error(subjectsResult.error || 'Failed to add subjects');
      }

      alert('🎉 Tutor profile created successfully! You can now start accepting students.');
      router.push('/dashboard/tutor');

    } catch (error: any) {
      console.error('Setup error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <SubjectsStep 
          subjects={subjects} 
          selectedSubjects={formData.selectedSubjects} 
          onToggleSubject={toggleSubject} 
        />;
      case 2:
        return <ProfileStep 
          bio={formData.bio} 
          jamaicanCurriculum={formData.jamaicanCurriculum} 
          onUpdate={updateFormData} 
        />;
      case 3:
        return <EducationStep 
          education={formData.education} 
          expertiseLevel={formData.expertiseLevel} 
          certifications={formData.certifications}
          teachingPhilosophy={formData.teachingPhilosophy}
          isStudentTutor={formData.isStudentTutor}
          onUpdate={updateFormData} 
        />;
      case 4:
        return <AvailabilityStep 
          preferredTeachingTimes={formData.preferredTeachingTimes}
          timezone={formData.timezone}
          responseTime={formData.responseTime}
          onUpdate={updateFormData}
        />;
      case 5:
        return <PricingStep 
          hourlyRate={formData.hourlyRate} 
          onUpdate={updateFormData} 
        />;
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onReturn={() => router.push('/dashboard')} />;
  }

  if (!setupStatus?.canSetup) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header setupStatus={setupStatus} />
        
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <ProgressHeader currentStep={currentStep} steps={STEPS} />
          
          <div className="p-8">
            <div className="max-w-2xl mx-auto">
              {renderStepContent()}
              
              <NavigationButtons
                currentStep={currentStep}
                totalSteps={STEPS.length}
                onPrev={prevStep}
                onNext={nextStep}
                onSubmit={handleSubmit}
                submitting={submitting}
                canSubmit={
                  formData.selectedSubjects.length > 0 && 
                  formData.bio.trim().length > 0 && 
                  formData.education.trim().length > 0 &&
                  formData.teachingPhilosophy.trim().length > 0
                }
              />
            </div>
          </div>
        </div>

        <ProgressIndicator currentStep={currentStep} totalSteps={STEPS.length} />
      </div>

      <SliderStyles />
    </div>
  );
}

const SliderStyles = () => (
  <style jsx>{`
    .slider::-webkit-slider-thumb {
      appearance: none;
      height: 24px;
      width: 24px;
      border-radius: 50%;
      background: #2563eb;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .slider::-moz-range-thumb {
      height: 24px;
      width: 24px;
      border-radius: 50%;
      background: #2563eb;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
  `}</style>
);