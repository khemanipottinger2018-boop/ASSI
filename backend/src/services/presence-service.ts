import { getPool } from '../config/database.js';

interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline' | 'idle' | 'busy' | 'in_session';
  lastSeen?: number;
  ts: number;
  previousStatus?: string;
}

interface UserStatusResponse {
  status: 'online' | 'idle' | 'busy' | 'in_session' | 'offline';
  lastSeen?: number;
  lastChanged: number;
}

export default class PresenceService {
  private presenceListeners: ((update: PresenceUpdate) => void)[] = [];
  private idleTimeout = 15 * 60 * 1000; // ✅ 15 MINUTE IDLE TIMEOUT
  private cleanupInterval: NodeJS.Timeout | null = null;
  private idleCheckInterval: NodeJS.Timeout | null = null;

  constructor(private autoCleanup: boolean = true) {
    if (autoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupStaleSockets().catch(console.error);
      }, 5 * 60 * 1000);

      this.idleCheckInterval = setInterval(() => {
        this.checkIdleUsers().catch(console.error);
      }, 60 * 1000);
    }
  }

  async userConnected(userId: string, socketId: string, userAgent?: string): Promise<void> {
    const pool = await getPool();
    
    try {
      await pool.request()
        .input('userId', userId)
        .input('socketId', socketId)
        .input('userAgent', userAgent || '')
        .query(`
          UPDATE user_presence 
          SET status = 'online',
              last_activity = GETDATE(),
              device_count = device_count + 1,
              manual_override = 0
          WHERE user_id = @userId
          
          IF @@ROWCOUNT = 0
          BEGIN
            INSERT INTO user_presence (user_id, status, last_activity, device_count, manual_override)
            VALUES (@userId, 'online', GETDATE(), 1, 0)
          END
        `);

      console.log(`📍 User ${userId} marked as online - Socket: ${socketId}`);

      await this.notifyPresenceUpdate({
        userId,
        status: 'online',
        ts: Date.now()
      });

    } catch (error) {
      console.error('User connected error:', error);
      throw error;
    }
  }

  async userDisconnected(userId: string, socketId: string): Promise<void> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .input('userId', userId)
        .query(`
          UPDATE user_presence 
          SET device_count = device_count - 1,
              status = CASE 
                WHEN device_count - 1 <= 0 THEN 'offline' 
                ELSE status 
              END,
              last_activity = GETDATE()
          WHERE user_id = @userId
          
          SELECT device_count FROM user_presence WHERE user_id = @userId
        `);

      const deviceCount = result.recordset[0]?.device_count || 0;
      
      if (deviceCount <= 0) {
        await pool.request()
          .input('userId', userId)
          .query(`UPDATE user_presence SET status = 'offline' WHERE user_id = @userId`);
      }

      console.log(`📍 User ${userId} disconnected - Remaining devices: ${deviceCount} - Socket: ${socketId}`);

      await this.notifyPresenceUpdate({
        userId,
        status: deviceCount <= 0 ? 'offline' : 'online',
        ts: Date.now()
      });

    } catch (error) {
      console.error('User disconnected error:', error);
      throw error;
    }
  }

  async setUserStatus(userId: string, status: 'online' | 'idle' | 'busy' | 'in_session'): Promise<void> {
    const pool = await getPool();
    
    try {
      await pool.request()
        .input('userId', userId)
        .input('status', status)
        .query(`
          UPDATE user_presence 
          SET status = @status, 
              status_set_at = GETDATE(),
              manual_override = 1
          WHERE user_id = @userId
        `);

      console.log(`📍 User ${userId} manually set status to: ${status}`);

      await this.notifyPresenceUpdate({
        userId,
        status,
        ts: Date.now()
      });

    } catch (error) {
      console.error('Set user status error:', error);
      throw error;
    }
  }

  async updateUserActivity(userId: string, socketId: string): Promise<void> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .input('userId', userId)
        .query(`
          UPDATE user_presence 
          SET last_activity = GETDATE(),
              status = CASE 
                WHEN manual_override = 1 THEN status 
                WHEN status = 'idle' THEN 'online' 
                ELSE status 
              END
          WHERE user_id = @userId
          
          SELECT status FROM user_presence WHERE user_id = @userId
        `);

      const newStatus = result.recordset[0]?.status;
      
      // If status changed from idle to online, notify
      if (newStatus === 'online') {
        await this.notifyPresenceUpdate({
          userId,
          status: 'online',
          ts: Date.now()
        });
      }

    } catch (error) {
      console.error('Update activity error:', error);
      throw error;
    }
  }

  async getUserStatus(userId: string): Promise<UserStatusResponse> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT 
            status,
            last_activity,
            status_set_at,
            device_count
          FROM user_presence 
          WHERE user_id = @userId
        `);

      if (result.recordset.length === 0) {
        return {
          status: 'offline',
          lastChanged: Date.now()
        };
      }

      const user = result.recordset[0];
      
      // If no devices connected, user is offline regardless of status
      if (user.device_count <= 0) {
        return {
          status: 'offline',
          lastSeen: new Date(user.last_activity).getTime(),
          lastChanged: new Date(user.status_set_at).getTime()
        };
      }

      return {
        status: user.status,
        lastSeen: new Date(user.last_activity).getTime(),
        lastChanged: new Date(user.status_set_at).getTime()
      };

    } catch (error) {
      console.error('Get user status error:', error);
      throw error;
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .input('userId', userId)
        .query(`
          SELECT device_count 
          FROM user_presence 
          WHERE user_id = @userId
        `);

      return result.recordset.length > 0 && result.recordset[0].device_count > 0;

    } catch (error) {
      console.error('Is online check error:', error);
      return false;
    }
  }

  async getUserOnlineStatus(userIds: string[]): Promise<Record<string, UserStatusResponse>> {
    const status: Record<string, UserStatusResponse> = {};
    
    for (const userId of userIds) {
      status[userId] = await this.getUserStatus(userId);
    }
    
    return status;
  }

  async getOnlineUsers(): Promise<string[]> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .query(`SELECT user_id FROM user_presence WHERE device_count > 0 AND status != 'offline'`);

      return result.recordset.map(row => row.user_id);

    } catch (error) {
      console.error('Get online users error:', error);
      return [];
    }
  }

  async getOnlineUsersCount(): Promise<number> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .query(`SELECT COUNT(*) as count FROM user_presence WHERE device_count > 0 AND status != 'offline'`);

      return result.recordset[0].count;

    } catch (error) {
      console.error('Get online users count error:', error);
      return 0;
    }
  }

  private async checkIdleUsers(): Promise<void> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .query(`
          UPDATE user_presence 
          SET status = 'idle'
          WHERE manual_override = 0 
            AND status = 'online' 
            AND device_count > 0
            AND last_activity < DATEADD(MINUTE, -15, GETDATE()) // ✅ 15 MINUTES
          
          SELECT user_id FROM user_presence WHERE @@ROWCOUNT > 0
        `);

      // Notify about status changes
      for (const row of result.recordset) {
        await this.notifyPresenceUpdate({
          userId: row.user_id,
          status: 'idle',
          ts: Date.now()
        });
      }

      if (result.recordset.length > 0) {
        console.log(`⏰ Marked ${result.recordset.length} users as idle`);
      }

    } catch (error) {
      console.error('Idle check error:', error);
      throw error;
    }
  }

  async cleanupStaleSockets(maxAgeHours: number = 1): Promise<void> {
    const pool = await getPool();
    
    try {
      const result = await pool.request()
        .query(`
          UPDATE user_presence 
          SET device_count = 0,
              status = 'offline'
          WHERE last_activity < DATEADD(HOUR, -${maxAgeHours}, GETDATE()) 
            AND device_count > 0
        `);

      if (result.rowsAffected[0] > 0) {
        console.log(`🧹 Cleaned ${result.rowsAffected[0]} stale user sessions`);
      }

    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  getPresenceStats(): { totalUsers: number; totalSockets: number; statusBreakdown: Record<string, number> } {
    // This would need a database call to get real stats
    // For now, return placeholder
    return {
      totalUsers: 0,
      totalSockets: 0,
      statusBreakdown: {
        online: 0,
        idle: 0,
        busy: 0,
        in_session: 0,
        offline: 0
      }
    };
  }

  onPresenceUpdate(callback: (update: PresenceUpdate) => void): void {
    this.presenceListeners.push(callback);
  }

  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.idleCheckInterval) clearInterval(this.idleCheckInterval);
  }

  private async notifyPresenceUpdate(update: PresenceUpdate): Promise<void> {
    console.log(`📢 Presence update: ${update.userId} -> ${update.status}`);
    
    for (const listener of this.presenceListeners) {
      try {
        listener(update);
      } catch (error) {
        console.error('Error in presence listener:', error);
      }
    }
  }
}

export const PRESENCE_CHANNEL = 'presence:updates';