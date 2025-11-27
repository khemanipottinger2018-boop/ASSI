"use client";

import { Map, BookOpen } from 'lucide-react';

interface Subject {
  subject_id: string;
  name: string;
  level: string;
}

interface DiscoverySidebarProps {
  tutors: any[];
  subjects: Subject[];
  selectedSubject: string;
  onSubjectSelect: (subjectId: string) => void;
  showOnlineOnly: boolean;
  onShowOnlineOnly: (show: boolean) => void;
}

export default function DiscoverySidebar({ 
  tutors, 
  subjects, 
  selectedSubject, 
  onSubjectSelect, 
  showOnlineOnly, 
  onShowOnlineOnly 
}: DiscoverySidebarProps) {
  return (
    <div className="h-full space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center space-x-2 mb-1">
          <Map size={20} />
          <span>Discover</span>
        </h2>
        <p className="text-white/60 text-sm">Find tutors by subject</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm rounded-xl p-3 text-center border border-green-500/30">
          <div className="text-green-400 font-bold text-lg">{tutors.filter(t => t.is_available).length}</div>
          <div className="text-green-300 text-sm">Online Now</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-xl p-3 text-center border border-blue-500/30">
          <div className="text-blue-400 font-bold text-lg">{tutors.length}</div>
          <div className="text-blue-300 text-sm">Total Tutors</div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/80 flex items-center space-x-2">
          <BookOpen size={16} />
          <span>Popular Subjects</span>
        </h3>
        <div className="space-y-2">
          {subjects.slice(0, 5).map((subject) => (
            <button
              key={subject.subject_id}
              onClick={() => onSubjectSelect(subject.subject_id)}
              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                selectedSubject === subject.subject_id
                  ? 'bg-white/20 border-white/30 text-white shadow-lg'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              <span className="text-sm font-medium">{subject.name}</span>
              <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/60">
                {subject.level}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/80">Quick Actions</h3>
        <button
          onClick={() => onSubjectSelect('all')}
          className="w-full bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-blue-300 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 text-center shadow-lg hover:shadow-xl"
        >
          View All Subjects
        </button>
        <button
          onClick={() => onShowOnlineOnly(!showOnlineOnly)}
          className={`w-full backdrop-blur-sm border py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 text-center shadow-lg hover:shadow-xl ${
            showOnlineOnly
              ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30 text-green-300'
              : 'bg-gradient-to-r from-white/10 to-white/5 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          {showOnlineOnly ? '✓ Online Only' : 'Show Online Only'}
        </button>
      </div>
    </div>
  );
}
