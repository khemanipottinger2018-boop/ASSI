// app/dashboard/tutor/setup/components/steps/AvailabilityStep.tsx
import { Calendar } from 'lucide-react';

interface AvailabilityStepProps {
  preferredTeachingTimes: string;
  timezone: string;
  responseTime: number;
  onUpdate: (updates: any) => void;
}

const TEACHING_TIMES = [
  { value: 'Flexible', label: '🕒 Flexible - Various times' },
  { value: 'Weekdays', label: '📅 Weekdays only' },
  { value: 'Weekends', label: '🎉 Weekends only' },
  { value: 'Evenings', label: '🌙 Evenings only' },
  { value: 'Mornings', label: '☀️ Mornings only' },
] as const;

const TIMEZONES = [
  { value: 'America/Jamaica', label: '🇯🇲 Jamaica Time (EST)' },
  { value: 'America/New_York', label: '🇺🇸 Eastern Time (ET)' },
  { value: 'America/Chicago', label: '🇺🇸 Central Time (CT)' },
  { value: 'America/Denver', label: '🇺🇸 Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: '🇺🇸 Pacific Time (PT)' },
] as const;

const RESPONSE_TIMES = [
  { value: 4, label: '⚡ Within 4 hours' },
  { value: 12, label: '🏃 Within 12 hours' },
  { value: 24, label: '📅 Within 24 hours' },
  { value: 48, label: '🗓️ Within 2 days' },
] as const;

export default function AvailabilityStep({ 
  preferredTeachingTimes, 
  timezone, 
  responseTime,
  onUpdate 
}: AvailabilityStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Calendar className="mx-auto text-blue-600 mb-4" size={52} />
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Availability</h2>
        <p className="text-gray-600 text-lg">
          Let students know when you're available for sessions.
        </p>
      </div>
      
      <div className="space-y-6">
        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-4">
            Preferred Teaching Times
          </label>
          <select
            value={preferredTeachingTimes}
            onChange={(e) => onUpdate({ preferredTeachingTimes: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          >
            {TEACHING_TIMES.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-4">
            Typical Response Time
          </label>
          <select
            value={responseTime}
            onChange={(e) => onUpdate({ responseTime: parseInt(e.target.value) })}
            className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          >
            {RESPONSE_TIMES.map(time => (
              <option key={time.value} value={time.value}>{time.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xl font-semibold text-gray-900 mb-4">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => onUpdate({ timezone: e.target.value })}
            className="w-full border border-gray-300 rounded-xl px-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          >
            {TIMEZONES.map(tz => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}