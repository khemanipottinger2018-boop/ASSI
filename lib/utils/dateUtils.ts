// lib/utils/dateUtils.ts - FIXED WITH PROPER TYPES

export interface DateUtils {
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  formatTrend: (trend: number) => string;
  isValidDate: (date: Date | string) => boolean;
}

export const dateUtils: DateUtils = {
  // Simple formatters only - no complex calculations
  formatDate: (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  formatTime: (date: Date | string): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  // Client doesn't calculate trends - server sends pre-calculated
  formatTrend: (trend: number): string => {
    return `${trend > 0 ? '+' : ''}${trend}%`;
  },
  
  // Simple date validation
  isValidDate: (date: Date | string): boolean => {
    return !isNaN(new Date(date).getTime());
  }
};

// Optional: Export individual functions with explicit types
export const formatDate = (date: Date | string): string => dateUtils.formatDate(date);
export const formatTime = (date: Date | string): string => dateUtils.formatTime(date);
export const formatTrend = (trend: number): string => dateUtils.formatTrend(trend);
export const isValidDate = (date: Date | string): boolean => dateUtils.isValidDate(date);

// Types for server-side calculations (if needed elsewhere)
export interface WeeklyTrendData {
  current_week: number;
  last_week: number;
  trend_percentage: number;
}