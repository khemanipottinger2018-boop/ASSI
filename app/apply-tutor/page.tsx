// app/dashboard/apply-tutor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, GraduationCap, Clock, CheckCircle, AlertCircle, FileText, Calendar } from 'lucide-react';

interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

interface ApplicationStatus {
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  reviewed_at?: string;
  review_notes?: string;
  birth_date?: string;
  age?: number;
}

interface FormErrors {
  subjects?: string;
  educationBackground?: string;
  teachingExperience?: string;
  whyTutor?: string;
  qualifications?: string;
  birthDate?: string;
}

export default function ApplyTutorPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState({
    educationBackground: '',
    teachingExperience: '',
    whyTutor: '',
    qualifications: '',
    birthDate: ''
  });

  const [ageVerified, setAgeVerified] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  // Age calculation function
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Handle birth date change
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const birthDate = e.target.value;
    setFormData(prev => ({ ...prev, birthDate }));
    
    if (birthDate) {
      const age = calculateAge(birthDate);
      setCalculatedAge(age);
      setAgeVerified(age >= 18);
    } else {
      setCalculatedAge(null);
      setAgeVerified(false);
    }
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const [subjectsResponse, statusResponse] = await Promise.all([
        fetch('http://localhost:3001/api/subjects'),
        fetch('http://localhost:3001/api/tutor-applications/my-application', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (subjectsResponse.ok) {
        const subjectsResult = await subjectsResponse.json();
        if (subjectsResult.success) setSubjects(subjectsResult.data);
      }

      if (statusResponse.ok) {
        const statusResult = await statusResponse.json();
        if (statusResult.data) {
          setApplicationStatus(statusResult.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Strict validation function - UPDATED WITH AGE VERIFICATION
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Age verification
    if (!formData.birthDate) {
      newErrors.birthDate = 'Date of birth is required';
    } else if (!ageVerified) {
      newErrors.birthDate = 'You must be 18 years or older to apply';
    }

    // Subject validation
    if (selectedSubjects.length === 0) {
      newErrors.subjects = 'Please select at least one subject to teach';
    } else if (selectedSubjects.length > 5) {
      newErrors.subjects = 'Please select no more than 5 subjects';
    }

    // Education background validation
    if (formData.educationBackground.length < 50) {
      newErrors.educationBackground = 'Please provide detailed educational background (minimum 50 characters)';
    }

    // Teaching experience validation
    if (formData.teachingExperience.length < 30) {
      newErrors.teachingExperience = 'Please describe your teaching experience in detail (minimum 30 characters)';
    }

    // Why tutor validation
    if (formData.whyTutor.length < 50) {
      newErrors.whyTutor = 'Please explain your motivation for tutoring in more detail (minimum 50 characters)';
    }

    // Qualifications validation
    if (formData.qualifications && formData.qualifications.length < 20) {
      newErrors.qualifications = 'Please provide more details about your qualifications (minimum 20 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    if (!validateForm()) {
      setSubmitting(false);
      alert('Please fix the validation errors before submitting.');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch('http://localhost:3001/api/tutor-applications/apply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjects: selectedSubjects,
          education_background: formData.educationBackground,
          teaching_experience: formData.teachingExperience,
          why_tutor: formData.whyTutor,
          qualifications: formData.qualifications,
          birth_date: formData.birthDate  // NEW: Added birth date
        }),
      });

      // Check content type first
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server error. Please try again later.');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Application submitted successfully! Our team will review your qualifications carefully.');
        router.push('/dashboard');
      } else {
        alert(`Application failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Character count component
  const CharacterCount = ({ text, minLength }: { text: string; minLength: number }) => (
    <div className={`text-sm mt-1 ${text.length < minLength ? 'text-red-600' : 'text-green-600'}`}>
      {text.length}/{minLength} characters (minimum)
    </div>
  );

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (applicationStatus) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {/* Existing status display - you can add age info here if needed */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              applicationStatus.status === 'approved' ? 'bg-green-100' : 
              applicationStatus.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              {applicationStatus.status === 'approved' ? (
                <CheckCircle className="text-green-600" size={40} />
              ) : applicationStatus.status === 'rejected' ? (
                <AlertCircle className="text-red-600" size={40} />
              ) : (
                <Clock className="text-yellow-600" size={40} />
              )}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {applicationStatus.status === 'approved' ? 'Application Approved!' :
               applicationStatus.status === 'rejected' ? 'Application Review Complete' :
               'Application Under Review'}
            </h1>
            
            <p className="text-gray-600 mb-4">
              {applicationStatus.status === 'approved' ? 
                'Congratulations! Your tutor application has been approved after thorough review.' :
               applicationStatus.status === 'rejected' ? 
                'Thank you for your application. After careful review, we are unable to approve it at this time.' :
                'Your application is undergoing our verification process. This typically takes 2-3 business days.'}
            </p>

            {applicationStatus.review_notes && (
              <div className="bg-gray-50 p-4 rounded-lg text-left mb-6">
                <strong>Review Notes:</strong>
                <p className="mt-1">{applicationStatus.review_notes}</p>
              </div>
            )}

            {applicationStatus.status === 'approved' && (
              <button
                onClick={() => router.push('/dashboard/tutor/setup')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Complete Tutor Profile Setup
              </button>
            )}

            {applicationStatus.status === 'rejected' && (
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Review Application Requirements
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Tutor Application</h1>
            <p className="text-gray-600 mb-4">
              We carefully verify all tutors to maintain quality standards. Please provide detailed, accurate information.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <div className="flex items-start">
                <FileText className="text-blue-600 mt-1 mr-3 flex-shrink-0" size={20} />
                <div>
                  <strong className="text-blue-900">Verification Process:</strong>
                  <ul className="text-blue-800 text-sm mt-1 list-disc list-inside">
                    <li>All applications are manually reviewed</li>
                    <li>Education and experience are verified</li>
                    <li>Age verification required (18+)</li>
                    <li>Typical review time: 2-3 business days</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* AGE VERIFICATION SECTION - ADD THIS */}
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="mr-2" size={20} />
                Age Verification (Required)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={handleBirthDateChange}
                    max={new Date().toISOString().split('T')[0]} // No future dates
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {errors.birthDate && (
                    <p className="text-red-600 text-sm mt-2 flex items-center">
                      <AlertCircle size={16} className="mr-1" />
                      {errors.birthDate}
                    </p>
                  )}
                </div>

                {formData.birthDate && (
                  <div className={`p-3 rounded-lg ${
                    ageVerified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {ageVerified ? (
                        <>
                          <CheckCircle className="text-green-500 mr-2" size={20} />
                          <span className="text-green-700 font-medium">
                            Age verified: {calculatedAge} years old
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="text-red-500 mr-2" size={20} />
                          <span className="text-red-700 font-medium">
                            Must be 18 or older. Current age: {calculatedAge}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Why we verify age:</strong> For safety and legal compliance, all tutors must be 18 years or older. 
                    Your date of birth will be kept confidential and secure.
                  </p>
                </div>
              </div>
            </div>

            {/* Existing form sections remain the same */}
            {/* Subjects Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                <BookOpen className="inline mr-2" size={20} />
                Subjects You Want to Teach (Select 1-5)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subjects.map((subject) => (
                  <button
                    key={subject.subject_id}
                    type="button"
                    onClick={() => setSelectedSubjects(prev => 
                      prev.includes(subject.subject_id)
                        ? prev.filter(id => id !== subject.subject_id)
                        : prev.length < 5 ? [...prev, subject.subject_id] : prev
                    )}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedSubjects.includes(subject.subject_id)
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    } ${selectedSubjects.length >= 5 && !selectedSubjects.includes(subject.subject_id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={selectedSubjects.length >= 5 && !selectedSubjects.includes(subject.subject_id)}
                  >
                    <div className="font-semibold text-gray-900">{subject.name}</div>
                    <div className="text-sm text-gray-500">{subject.level}</div>
                  </button>
                ))}
              </div>
              {errors.subjects && (
                <p className="text-red-600 text-sm mt-2 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.subjects}
                </p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                Selected: {selectedSubjects.length}/5 subjects
              </p>
            </div>

            {/* Education Background */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                <GraduationCap className="inline mr-2" size={20} />
                Education Background *
              </label>
              <textarea
                value={formData.educationBackground}
                onChange={(e) => setFormData(prev => ({ ...prev, educationBackground: e.target.value }))}
                placeholder="Please provide detailed information about your education: degrees, institutions, graduation years, relevant coursework, academic achievements..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <CharacterCount text={formData.educationBackground} minLength={50} />
              {errors.educationBackground && (
                <p className="text-red-600 text-sm mt-2 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.educationBackground}
                </p>
              )}
            </div>

            {/* Teaching Experience */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Teaching Experience *
              </label>
              <textarea
                value={formData.teachingExperience}
                onChange={(e) => setFormData(prev => ({ ...prev, teachingExperience: e.target.value }))}
                placeholder="Describe your teaching/tutoring experience in detail: years of experience, age groups taught, subjects, teaching methods, student outcomes, references if available..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <CharacterCount text={formData.teachingExperience} minLength={30} />
              {errors.teachingExperience && (
                <p className="text-red-600 text-sm mt-2 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.teachingExperience}
                </p>
              )}
            </div>

            {/* Why Tutor */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Why Do You Want to Be a Tutor? *
              </label>
              <textarea
                value={formData.whyTutor}
                onChange={(e) => setFormData(prev => ({ ...prev, whyTutor: e.target.value }))}
                placeholder="Explain your motivation for tutoring: teaching philosophy, why you enjoy teaching, what makes you a good tutor, your goals as an educator..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <CharacterCount text={formData.whyTutor} minLength={50} />
              {errors.whyTutor && (
                <p className="text-red-600 text-sm mt-2 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.whyTutor}
                </p>
              )}
            </div>

            {/* Qualifications */}
            <div>
              <label className="block text-lg font-semibold text-gray-900 mb-4">
                Additional Qualifications & Certifications
              </label>
              <textarea
                value={formData.qualifications}
                onChange={(e) => setFormData(prev => ({ ...prev, qualifications: e.target.value }))}
                placeholder="List any relevant certifications, awards, publications, special training, or other qualifications that support your application..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.qualifications && (
                <CharacterCount text={formData.qualifications} minLength={20} />
              )}
              {errors.qualifications && (
                <p className="text-red-600 text-sm mt-2 flex items-center">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.qualifications}
                </p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="text-yellow-600 mt-1 mr-3 flex-shrink-0" size={20} />
                <div>
                  <strong className="text-yellow-900">Verification Notice</strong>
                  <p className="text-yellow-800 text-sm mt-1">
                    By submitting this application, you confirm that all information provided is accurate and truthful. 
                    False information may result in immediate termination of your tutor account.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !ageVerified || selectedSubjects.length === 0}
              className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              {submitting ? 'Submitting Application...' : 'Submit Application for Verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}