// app/tutors/components/tutors/AvailabilityBadge.tsx
'use client';
import { UserStatus, getStatusConfig } from '../../types/tutor.types';

interface AvailabilityBadgeProps {
  status: UserStatus;
  className?: string;
}

export function AvailabilityBadge({ status, className = '' }: AvailabilityBadgeProps) {
  const config = getStatusConfig(status);
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-xs text-gray-300 font-medium">{config.label}</span>
    </div>
  );
}