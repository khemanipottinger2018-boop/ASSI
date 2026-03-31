'use client';

import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Clock3 } from 'lucide-react';
import type { Notification, NotificationType } from '@/features/types/notification';

function formatTime(dateValue: string | Date) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

function getTypeLabel(type?: NotificationType): string {
  const labels: Partial<Record<NotificationType, string>> = {
    chat_message:       'Message',
    chat_request:       'Chat Request',
    chat_ended:         'Chat Ended',
    session_started:    'Session',
    session_ended:      'Session',
    session_request:    'Session Request',
    booking_confirmed:  'Booking',
    booking_cancelled:  'Booking',
    payment_success:    'Payment',
    payment_failed:     'Payment',
    review_received:    'Review',
    account_warning:    'Account',
    account_suspended:  'Account',
    account_restored:   'Account',
    login_alert:        'Security',
    system:             'System',
    announcement:       'Announcement',
    maintenance:        'Maintenance',
  };
  return (type && labels[type]) ?? 'Notification';
}

export default function NotificationItem({
  notification, onClick,
}: {
  notification: Notification;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className={`
        w-full text-left rounded-xl p-4
        border border-white/10 backdrop-blur-xl transition
        hover:bg-white/10
        ${notification.isRead ? 'bg-white/5' : 'bg-white/10'}
      `}
    >
      <div className="flex justify-between gap-3">
        <div className="flex gap-3 min-w-0 flex-1">
          <div className="mt-0.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center">
              <Bell size={16} className="text-white/65" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] uppercase tracking-widest text-white/35">
                {getTypeLabel(notification.type)}
              </span>
              {!notification.isRead && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-[10px] text-blue-400 font-medium">
                  New
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-white truncate">{notification.title}</div>
            {notification.body && (
              <div className="text-xs text-white/70 mt-1 whitespace-pre-wrap break-words">{notification.body}</div>
            )}
            <div className="mt-3 flex items-center gap-3 text-[11px] text-white/35">
              <span className="flex items-center gap-1">
                <Clock3 size={11} />{formatTime(notification.createdAt)}
              </span>
              {notification.isRead && (
                <span className="flex items-center gap-1 text-emerald-400/80">
                  <CheckCircle2 size={11} />Read
                </span>
              )}
            </div>
          </div>
        </div>
        {!notification.isRead && (
          <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
        )}
      </div>
    </motion.button>
  );
}
