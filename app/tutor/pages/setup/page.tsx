'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';

// Components - CORRECT PATHS: from pages/setup to components/setup is ../../components/setup/
import LoadingState from '../../components/setup/LoadingState';
import ErrorState from '../../components/setup/ErrorState';
import Header from '../../components/setup/Header';
import ProgressHeader from '../../components/setup/ProgressHeader';
import NavigationButtons from '../../components/setup/NavigationButtons';
import ProgressIndicator from '../../components/setup/ProgressIndicator';

// Step Components
import SubjectsStep from '../../components/setup/steps/SubjectsStep';
import ProfileStep from '../../components/setup/steps/ProfileStep';
import EducationStep from '../../components/setup/steps/EducationStep';
import AvailabilityStep from '../../components/setup/steps/AvailabilityStep';
import PricingStep from '../../components/setup/steps/PricingStep';

// Define types locally to avoid import issues
interface UserData {
  id: string;
  email: string;
  role: string;
  profile_completed: boolean;
}

interface TutorProfile {
  bio?: string;
  subjects?: string[];
  education?: any[];
  availability?: any[];
  hourly_rate?: number;
}

export default function TutorSetup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile>({});
  
  const { user } = useAuth();

  useEffect(() => {
    // Load user data
    if (user) {
      setUserData(user as UserData);
      setIsLoading(false);
    }
  }, [user]);

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleProfileUpdate = (updates: Partial<TutorProfile>) => {
    setTutorProfile(prev => ({ ...prev, ...updates }));
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!userData) {
    return <ErrorState error="User data not available" />;
  }

  const steps = [
    { component: SubjectsStep, title: 'Subjects' },
    { component: ProfileStep, title: 'Profile' },
    { component: EducationStep, title: 'Education' },
    { component: AvailabilityStep, title: 'Availability' },
    { component: PricingStep, title: 'Pricing' }
  ];

  const CurrentStepComponent = steps[currentStep]?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressHeader currentStep={currentStep} totalSteps={steps.length} />
        <ProgressIndicator currentStep={currentStep} totalSteps={steps.length} />
        
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
          {CurrentStepComponent && (
            <CurrentStepComponent
              profile={tutorProfile}
              onUpdate={handleProfileUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          
          <NavigationButtons
            currentStep={currentStep}
            totalSteps={steps.length}
            onNext={handleNext}
            onBack={handleBack}
          />
        </div>
      </div>
    </div>
  );
}
