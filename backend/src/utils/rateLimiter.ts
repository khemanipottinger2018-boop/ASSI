// utils/rateLimiter.ts
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number | null;
  resetTime: number;
}

interface RateLimitOptions {
  tokens: number;        // Max requests
  windowSec: number;     // Window in seconds
}

interface RateLimitEntry {
  timestamps: number[];
  createdAt: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Auto-cleanup every minute to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  /**
   * Simple sliding window rate limiter
   */
  allow(keyId: string, opts: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const windowMs = opts.windowSec * 1000;
    const windowStart = now - windowMs;
    
    // Get or create request history for this key
    let entry = this.requests.get(keyId);
    
    if (!entry) {
      entry = {
        timestamps: [],
        createdAt: now
      };
      this.requests.set(keyId, entry);
    }
    
    // Remove old requests outside current window
    entry.timestamps = entry.timestamps.filter(timestamp => timestamp > windowStart);
    
    // Check if under limit
    if (entry.timestamps.length < opts.tokens) {
      // Allow request and add timestamp
      entry.timestamps.push(now);
      
      return {
        allowed: true,
        remaining: opts.tokens - entry.timestamps.length,
        retryAfter: null,
        resetTime: windowStart + windowMs
      };
    } else {
      // Calculate retry after time (when the oldest request expires)
      const oldestRequest = entry.timestamps[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        resetTime: oldestRequest + windowMs
      };
    }
  }

  /**
   * Convenience wrapper for user + action
   */
  allowForUser(
    userId: string, 
    action: string, 
    opts: RateLimitOptions
  ): RateLimitResult {
    const key = `rate:user:${userId}:${action}`;
    return this.allow(key, opts);
  }

  /**
   * Check rate limit without consuming a token
   */
  check(keyId: string, opts: RateLimitOptions): RateLimitResult {
    const now = Date.now();
    const windowMs = opts.windowSec * 1000;
    const windowStart = now - windowMs;
    
    const entry = this.requests.get(keyId);
    
    if (!entry) {
      return {
        allowed: true,
        remaining: opts.tokens,
        retryAfter: null,
        resetTime: now + windowMs
      };
    }
    
    // Count requests in current window
    const recentRequests = entry.timestamps.filter(timestamp => timestamp > windowStart);
    const remaining = Math.max(0, opts.tokens - recentRequests.length);
    
    if (remaining > 0) {
      return {
        allowed: true,
        remaining,
        retryAfter: null,
        resetTime: windowStart + windowMs
      };
    } else {
      // Calculate when the window will reset
      const oldestRequest = recentRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        resetTime: oldestRequest + windowMs
      };
    }
  }

  /**
   * Get current rate limit status without affecting the count
   */
  checkForUser(userId: string, action: string, opts: RateLimitOptions): RateLimitResult {
    const key = `rate:user:${userId}:${action}`;
    return this.check(key, opts);
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(keyId: string): boolean {
    return this.requests.delete(keyId);
  }

  /**
   * Reset rate limit for a specific user and action
   */
  resetForUser(userId: string, action: string): boolean {
    const key = `rate:user:${userId}:${action}`;
    return this.reset(key);
  }

  /**
   * Get all current rate limit keys (for debugging/admin)
   */
  getKeys(): string[] {
    return Array.from(this.requests.keys());
  }

  /**
   * Get stats for a specific key
   */
  getStats(keyId: string): { count: number; createdAt: number } | null {
    const entry = this.requests.get(keyId);
    if (!entry) return null;
    
    return {
      count: entry.timestamps.length,
      createdAt: entry.createdAt
    };
  }

  /**
   * Clean up old entries (remove entries older than 1 hour)
   */
  cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    for (const [key, entry] of this.requests.entries()) {
      // Remove entry if it's older than 1 hour and has no recent activity
      if (entry.createdAt < oneHourAgo && 
          (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < oneHourAgo)) {
        this.requests.delete(key);
      } else {
        // Clean up old timestamps (keep only last hour)
        entry.timestamps = entry.timestamps.filter(timestamp => timestamp > oneHourAgo);
      }
    }
  }

  /**
   * Get total number of tracked keys
   */
  getSize(): number {
    return this.requests.size;
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Default instance for convenience
export const defaultRateLimiter = new RateLimiter();

export default RateLimiter;