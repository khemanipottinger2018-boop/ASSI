// app/dashboard/tutor/set./components/Header.tsx
import { CheckCircle, Shield, Clock, Star } from 'lucide-react';

interface UserData {
  username: string;
  email: string;
  role: string;
}

interface SetupStatus {
  user: UserData;
  canSetup: boolean;
  hasProfile: boolean;
}

interface HeaderProps {
  setupStatus: SetupStatus;
}

export default function Header({ setupStatus }: HeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-8 mb-8 text-center">
      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
        <CheckCircle className="text-white" size={40} />
      </div>
      
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome, <span className="text-blue-600">{setupStatus.user.username}</span>!
      </h1>
      
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center mb-3">
          <Shield className="text-green-600 mr-3" size={24} />
          <span className="text-green-800 font-semibold text-lg">Tutor Application Approved!</span>
        </div>
        <p className="text-green-700 text-lg leading-relaxed">
          Complete your profile to start connecting with students and build your tutoring business.
        </p>
      </div>

      <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center">
          <Clock className="mr-2 text-blue-500" size={16} />
          <span>5-10 minutes</span>
        </div>
        <div className="flex items-center">
          <Star className="mr-2 text-yellow-500" size={16} />
          <span>Verified Badge</span>
        </div>
      </div>
    </div>
  );
}