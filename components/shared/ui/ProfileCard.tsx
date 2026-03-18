'use client';

import type { UserProfileView } from '@/components/types/profile.view';
import {
  Mail,
  Calendar,
  User as UserIcon,
  GraduationCap,
  Shield,
  Award,
  DollarSign,
  Phone,
} from 'lucide-react';

interface ProfileCardProps {
  profile: UserProfileView;
  isPrivate?: boolean;
  onEdit?: () => void;
  onLogout?: () => void;
}

export default function ProfileCard({
  profile,
  isPrivate = false,
  onEdit,
  onLogout,
}: ProfileCardProps) {
  const initials = profile.username.charAt(0).toUpperCase();

  const roleMap = {
    student: { label: 'Student', icon: UserIcon },
    'tutor-applicant': { label: 'Applicant', icon: Award },
    tutor: { label: 'Tutor', icon: GraduationCap },
    admin: { label: 'Admin', icon: Shield },
  } as const;

  const RoleIcon = roleMap[profile.role].icon;

  return (
    <div className="
      max-w-4xl
      rounded-2xl
      bg-white/10
      backdrop-blur-xl
      border border-white/10
      p-8
      space-y-8
    ">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="
            w-20 h-20
            rounded-2xl
            bg-gradient-to-br from-purple-500/30 to-pink-500/20
            flex items-center justify-center
            text-2xl font-semibold text-white
          ">
            {initials}
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              {profile.username}
            </h1>

            <div className="flex items-center gap-2 text-sm text-white/70 mt-1">
              <RoleIcon size={14} />
              {roleMap[profile.role].label}
            </div>
          </div>
        </div>

        {isPrivate && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition"
              >
                Edit
              </button>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>

      {/* ABOUT */}
      <div className="space-y-3 text-white/80">
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} />
          Joined {new Date(profile.createdAt).toDateString()}
        </div>

        {profile.bio && (
          <p className="text-white/70 leading-relaxed max-w-2xl">
            {profile.bio}
          </p>
        )}
      </div>

      {/* PRIVATE INFO */}
      {isPrivate && (
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-white/80">
          {profile.email && (
            <div className="flex items-center gap-2">
              <Mail size={14} />
              {profile.email}
            </div>
          )}

          {profile.phoneNumber && (
            <div className="flex items-center gap-2">
              <Phone size={14} />
              {profile.phoneNumber}
            </div>
          )}
        </div>
      )}

      {/* TUTOR SECTION */}
      {profile.role === 'tutor' && (
        <div className="
          rounded-xl
          bg-purple-500/10
          border border-purple-500/20
          p-6
          space-y-4
        ">
          <h2 className="text-sm font-semibold text-white/90">
            Tutor Details
          </h2>

          <div className="flex flex-wrap gap-6 text-sm text-white/80">
            {profile.hourlyRate != null && (
              <div className="flex items-center gap-2">
                <DollarSign size={14} />
                ${profile.hourlyRate}/hr
              </div>
            )}

            {profile.timezone && (
              <div>Timezone: {profile.timezone}</div>
            )}
          </div>

          {profile.subjects?.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.subjects.map((s) => (
                <span
                  key={s.id}
                  className="
                    px-3 py-1
                    rounded-full
                    bg-purple-500/20
                    text-xs text-white/90
                  "
                >
                  {s.name} · {s.level}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-white/40 italic text-sm">
              No subjects listed
            </div>
          )}
        </div>
      )}
    </div>
  );
}
