// app/dashboard/adm./components/ApplicationsPanel.tsx
import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, User, Calendar, Mail, BookOpen, GraduationCap, Award } from 'lucide-react';

interface TutorApplication {
  application_id: string;
  user_id: string;
  username: string;
  email: string;
  education_background: string;
  teaching_experience: string;
  why_tutor: string;
  qualifications: string;
  birth_date: string;
  age: number;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
  subjects: Array<{ name: string; level: string }>;
}

export default function ApplicationsPanel() {
  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<TutorApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      // Use the admin endpoint to get pending applications
      const response = await fetch('http://localhost:3001/api/admin/applications/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setApplications(result.data || []);
      } else {
        console.error('Failed to fetch applications:', response.status);
        // Fallback to the regular endpoint if admin endpoint doesn't exist
        const fallbackResponse = await fetch('http://localhost:3001/api/tutor-applications/pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          setApplications(fallbackResult.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, status: 'approved' | 'rejected') => {
    setActionLoading(applicationId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/tutor-applications/${applicationId}/review`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status, 
          review_notes: reviewNotes || `${status === 'approved' ? 'Application approved' : 'Application rejected'} by administrator` 
        })
      });

      if (response.ok) {
        // Remove from pending list
        setApplications(prev => prev.filter(app => app.application_id !== applicationId));
        setSelectedApp(null);
        setReviewNotes('');
        console.log(`Application ${status} successfully`);
        
        // Show success message
        alert(`Application ${status} successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to ${status} application: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error reviewing application:', error);
      alert('Error processing application. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateApplicationAge = (appliedAt: string) => {
    const applied = new Date(appliedAt);
    const now = new Date();
    const diffMs = now.getTime() - applied.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tutor Applications</h2>
            <p className="text-gray-600 mt-1">
              {applications.length} pending application{applications.length !== 1 ? 's' : ''} requiring review
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200">
            <Clock className="text-yellow-600" size={20} />
            <span className="text-yellow-800 text-sm font-medium">Awaiting Review</span>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="mx-auto text-gray-400" size={64} />
          <h3 className="text-gray-500 text-lg mt-4">No Pending Applications</h3>
          <p className="text-gray-400 mt-2">All tutor applications have been reviewed and processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Applications List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Pending Review ({applications.length})</h3>
              <span className="text-sm text-gray-500">Sorted by newest</span>
            </div>
            {applications.map((application) => (
              <div
                key={application.application_id}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                  selectedApp?.application_id === application.application_id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedApp(application);
                  setReviewNotes('');
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {application.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{application.username}</div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Mail size={14} className="mr-1" />
                        {application.email}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 flex items-center justify-end">
                      <Calendar size={12} className="mr-1" />
                      {calculateApplicationAge(application.applied_at)}
                    </div>
                    <div className="text-xs font-medium text-blue-600 mt-1">
                      Age: {application.age}
                    </div>
                  </div>
                </div>
                
                {/* Subjects */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {application.subjects?.slice(0, 3).map((subject, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200"
                    >
                      {subject.name} ({subject.level})
                    </span>
                  ))}
                  {application.subjects && application.subjects.length > 3 && (
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                      +{application.subjects.length - 3} more
                    </span>
                  )}
                </div>

                {/* Application Preview */}
                <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                  {application.why_tutor.substring(0, 100)}...
                </div>
              </div>
            ))}
          </div>

          {/* Application Details */}
          <div className="bg-gray-50 rounded-xl p-6 sticky top-6">
            {selectedApp ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Application Review</h3>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedApp.age >= 18 ? 'bg-green-400' : 'bg-red-400'
                    }`}></div>
                    <span className="text-sm text-gray-600">
                      {selectedApp.age >= 18 ? 'Age Verified' : 'Under 18'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Applicant Info */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <User size={16} className="mr-2" />
                      Applicant Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-gray-600">Name</label>
                        <p className="text-gray-900 font-medium">{selectedApp.username}</p>
                      </div>
                      <div>
                        <label className="text-gray-600">Age</label>
                        <p className="text-gray-900 font-medium">{selectedApp.age} years</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-gray-600">Email</label>
                        <p className="text-gray-900">{selectedApp.email}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-gray-600">Applied</label>
                        <p className="text-gray-900">{formatDate(selectedApp.applied_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Subjects */}
                  {selectedApp.subjects && selectedApp.subjects.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <BookOpen size={16} className="mr-2" />
                        Subjects to Teach
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.subjects.map((subject, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-3 py-1.5 rounded-full font-medium"
                          >
                            {subject.name} ({subject.level})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <GraduationCap size={16} className="mr-2" />
                      Education Background
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{selectedApp.education_background}</p>
                  </div>

                  {/* Experience */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Teaching Experience</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{selectedApp.teaching_experience}</p>
                  </div>

                  {/* Motivation */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Why Become a Tutor?</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{selectedApp.why_tutor}</p>
                  </div>

                  {/* Qualifications */}
                  {selectedApp.qualifications && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Award size={16} className="mr-2" />
                        Additional Qualifications
                      </h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedApp.qualifications}</p>
                    </div>
                  )}

                  {/* Review Notes */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Review Notes (Optional)</h4>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => handleApplicationAction(selectedApp.application_id, 'approved')}
                      disabled={actionLoading === selectedApp.application_id}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold"
                    >
                      {actionLoading === selectedApp.application_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      <span>Approve Application</span>
                    </button>
                    <button
                      onClick={() => handleApplicationAction(selectedApp.application_id, 'rejected')}
                      disabled={actionLoading === selectedApp.application_id}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 font-semibold"
                    >
                      {actionLoading === selectedApp.application_id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <XCircle size={18} />
                      )}
                      <span>Reject Application</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                <p className="text-gray-400">Select an application to review details</p>
                <p className="text-gray-300 text-sm mt-1">
                  Click on any application from the list to start review
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}