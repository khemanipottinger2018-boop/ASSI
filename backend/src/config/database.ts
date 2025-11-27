import mssql from 'mssql';

// Types for better type safety
interface QueryParams {
  [key: string]: { value: any; type?: any };
}

interface PoolMetrics {
  poolSize: number;
  activeConnections: number;
  connectionAttempts: number;
  isConnected: boolean;
  detailed?: {
    poolSize: number;
    available: number;
    pending: number;
    healthy: boolean;
    issues: string[];
  };
}

// Singleton pattern for database connection
class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: mssql.ConnectionPool | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private activeConnections: Set<string> = new Set();
  
  // Configuration with your specific values
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 2000;
  private readonly MAX_RETRY_DELAY = 30000;
  private readonly DEFAULT_QUERY_TIMEOUT = 30000;

  private constructor() {
    this.validateEnvironment();
    this.validatePoolConfig();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private validateEnvironment(): void {
    const required = [
      'DATABASE_SERVER',
      'DATABASE_NAME', 
      'DATABASE_USER',
      'DATABASE_PASSWORD'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`❌ Missing required database environment variables: ${missing.join(', ')}`);
    }

    // Validate port
    const port = parseInt(process.env.DATABASE_PORT || '1433');
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('DATABASE_PORT must be a valid port number (1-65535)');
    }

    console.log('✅ Environment validation passed');
  }

  private validatePoolConfig(): void {
    const poolMax = parseInt(process.env.DATABASE_POOL_MAX || '15');
    const poolMin = parseInt(process.env.DATABASE_POOL_MIN || '2');
    
    if (poolMin > poolMax) {
      throw new Error('DATABASE_POOL_MIN cannot be greater than DATABASE_POOL_MAX');
    }
    
    if (poolMax > 100) {
      console.warn('⚠️  High pool size configured. Consider connection pooling at application level.');
    }
    
    console.log('✅ Pool configuration validated');
  }

  private getConfig(): mssql.config {
    return {
      user: process.env.DATABASE_USER!,
      password: process.env.DATABASE_PASSWORD!,
      server: process.env.DATABASE_SERVER!,
      database: process.env.DATABASE_NAME!,
      port: parseInt(process.env.DATABASE_PORT || '1433'),
      options: {
        encrypt: process.env.DATABASE_ENCRYPT === 'true',
        trustServerCertificate: process.env.DATABASE_TRUST_CERT !== 'false',
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
        appName: `ASSI-${process.env.NODE_ENV || 'development'}`,
        useUTC: true
      },
      pool: {
        max: parseInt(process.env.DATABASE_POOL_MAX || '15'),
        min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      }
    };
  }

  private async initializePool(): Promise<mssql.ConnectionPool> {
    if (this.isConnecting) {
      throw new Error('Database connection already in progress');
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    const config = this.getConfig();
    
    console.log('🔄 Connecting to SQL Server...', {
      database: config.database,
      server: config.server,
      user: config.user,
      environment: process.env.NODE_ENV || 'development',
      attempt: `${this.connectionAttempts}/${this.MAX_RETRIES}`
    });

    try {
      const pool = new mssql.ConnectionPool(config);
      
      // Enhanced pool event handling
      pool.on('error', (err: Error) => {
        console.error('❌ Database Pool Error:', err.message);
        this.pool = null;
      });

      pool.on('connect', () => {
        console.log('🔗 New database connection established');
      });

      pool.on('close', () => {
        console.log('🔌 Database connection closed');
        this.pool = null;
      });

      await pool.connect();
      
      console.log('✅ Connected to SQL Server successfully!', {
        database: config.database,
        server: config.server,
        poolSize: config.pool?.max
      });

      this.connectionAttempts = 0;
      this.isConnecting = false;
      
      return pool;

    } catch (error: any) {
      this.isConnecting = false;
      await this.handleConnectionError(error);
      throw error;
    }
  }

  private async handleConnectionError(error: any): Promise<void> {
    console.error('❌ Database Connection Failed:', {
      message: error.message,
      code: error.code,
      attempt: `${this.connectionAttempts}/${this.MAX_RETRIES}`
    });

    // Enhanced troubleshooting guidance for your specific setup
    const errorHandlers: { [key: string]: () => void } = {
      'ELOGIN': () => {
        console.log('💡 Check: Database username/password might be incorrect');
        console.log('💡 Verify: DATABASE_USER=assi_app and DATABASE_PASSWORD are correct');
      },
      'ESOCKET': () => {
        console.log('💡 Check: SQL Server Express service might not be running');
        console.log('💡 Action: Open Services.msc and check "SQL Server (SQLEXPRESS)" is running');
        console.log('💡 Check: Firewall might be blocking port 1433');
      },
      'ETIMEOUT': () => console.log('💡 Check: Network connectivity or server overload'),
      'ECONNCLOSED': () => console.log('💡 Check: Connection was closed unexpectedly'),
      'EDBNAME': () => {
        console.log('💡 Check: Database ASSI_DB might not exist');
        console.log('💡 Action: Create database in SQL Server Management Studio');
      }
    };

    if (error.code && errorHandlers[error.code]) {
      errorHandlers[error.code]();
    } else if (error.message.includes('Cannot open database')) {
      console.log('💡 Check: Database "ASSI_DB" might not exist or user lacks permissions');
      console.log('💡 Action: Verify database exists and assi_app user has access');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      console.log('💡 Check: Server name might be incorrect');
      console.log('💡 Action: Verify SQL Server instance name in SQL Server Configuration Manager');
    }

    // Exponential backoff retry logic
    if (this.connectionAttempts < this.MAX_RETRIES) {
      const delay = Math.min(
        this.INITIAL_RETRY_DELAY * Math.pow(2, this.connectionAttempts - 1),
        this.MAX_RETRY_DELAY
      );
      console.log(`🔄 Retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      this.pool = await this.initializePool();
      return;
    }

    throw new Error(`Database connection failed after ${this.MAX_RETRIES} attempts: ${error.message}`);
  }

  public async getPool(): Promise<mssql.ConnectionPool> {
    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    if (!this.pool) {
      this.pool = await this.initializePool();
    }

    return this.pool;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query('SELECT 1 as health_check');
      return result.recordset[0]?.health_check === 1;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
        console.log('✅ Database connection pool closed gracefully');
      } catch (error) {
        console.error('Error closing database pool:', error);
      } finally {
        this.pool = null;
        this.activeConnections.clear();
      }
    }
  }

  // Enhanced query execution with performance monitoring
  public async executeQuery<T = any>(
    query: string, 
    params?: QueryParams,
    timeoutMs: number = this.DEFAULT_QUERY_TIMEOUT
  ): Promise<T[]> {
    const startTime = Date.now();
    const connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.activeConnections.add(connectionId);

    try {
      const pool = await this.getPool();
      const request = pool.request();

      if (params) {
        Object.entries(params).forEach(([key, { value, type }]) => {
          if (type) {
            request.input(key, type, value);
          } else {
            request.input(key, value);
          }
        });
      }

      const result = await request.query<T>(query);
      const duration = Date.now() - startTime;
      
      // Log slow queries (warning only, doesn't break flow)
      if (duration > 1000) {
        console.warn(`🐌 Slow query (${duration}ms):`, query.substring(0, 200));
      }

      return result.recordset;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('❌ Query execution failed:', {
        duration: `${duration}ms`,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        params: params ? Object.keys(params) : 'none',
        error: error.message
      });
      throw error;
    } finally {
      this.activeConnections.delete(connectionId);
    }
  }

  // Enhanced single row query
  public async executeSingle<T = any>(
    query: string, 
    params?: QueryParams,
    timeoutMs: number = this.DEFAULT_QUERY_TIMEOUT
  ): Promise<T | null> {
    const results = await this.executeQuery<T>(query, params, timeoutMs);
    return results[0] || null;
  }

  // Get pool metrics for monitoring (enhanced version)
  public async getPoolMetrics(): Promise<PoolMetrics> {
    const baseMetrics = {
      poolSize: parseInt(process.env.DATABASE_POOL_MAX || '15'),
      activeConnections: this.activeConnections.size,
      connectionAttempts: this.connectionAttempts,
      isConnected: this.pool?.connected || false
    };

    try {
      const health = await this.validatePoolHealth();
      return {
        ...baseMetrics,
        detailed: {
          poolSize: baseMetrics.poolSize,
          available: baseMetrics.poolSize - baseMetrics.activeConnections,
          pending: 0, // mssql doesn't expose this directly
          healthy: health.healthy,
          issues: health.issues
        }
      };
    } catch (error) {
      return baseMetrics;
    }
  }

  // NEW: Enhanced pool health validation
  public async validatePoolHealth(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Test basic connectivity
      const health = await this.healthCheck();
      if (!health) issues.push('Basic health check failed');

      // Check pool status
      if (!this.pool) {
        issues.push('Pool not initialized');
      } else if (!this.pool.connected) {
        issues.push('Pool not connected');
      }

      // Check for connection leaks
      const activeCount = this.activeConnections.size;
      const maxPoolSize = parseInt(process.env.DATABASE_POOL_MAX || '15');
      if (activeCount > maxPoolSize * 0.8) {
        issues.push(`High active connections: ${activeCount}/${maxPoolSize}`);
      }

      return {
        healthy: issues.length === 0,
        issues
      };
    } catch (error: any) {
      return {
        healthy: false,
        issues: [`Health check error: ${error.message}`]
      };
    }
  }

  // NEW: Retry logic for transient errors
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string = 'database operation',
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === maxRetries) break;
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`🔄 Retrying ${operationName} (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'ETIMEOUT', 
      'ESOCKET', 
      'ECONNRESET', 
      'ECONNREFUSED'
    ];
    const retryableMessages = [
      'timeout', 
      'connection', 
      'socket', 
      'temporarily'
    ];
    
    return retryableCodes.includes(error?.code) ||
           retryableMessages.some(msg => error?.message?.toLowerCase().includes(msg));
  }

  // Get active connections count
  public getActiveConnections(): number {
    return this.activeConnections.size;
  }
}

// LAZY EXPORTS - No immediate instantiation (UNCHANGED)
export const getPool = (): Promise<mssql.ConnectionPool> => {
  return DatabaseManager.getInstance().getPool();
};

export const checkDatabaseHealth = (): Promise<boolean> => {
  return DatabaseManager.getInstance().healthCheck();
};

export const closePool = (): Promise<void> => {
  return DatabaseManager.getInstance().close();
};

export const executeQuery = <T = any>(
  query: string, 
  params?: QueryParams,
  timeoutMs: number = 30000
): Promise<T[]> => {
  return DatabaseManager.getInstance().executeQuery<T>(query, params, timeoutMs);
};

export const executeSingle = <T = any>(
  query: string, 
  params?: QueryParams,
  timeoutMs: number = 30000
): Promise<T | null> => {
  return DatabaseManager.getInstance().executeSingle<T>(query, params, timeoutMs);
};

export const getPoolMetrics = (): Promise<PoolMetrics> => {
  return DatabaseManager.getInstance().getPoolMetrics();
};

export const getActiveConnections = (): number => {
  return DatabaseManager.getInstance().getActiveConnections();
};

// NEW: Enhanced exports
export const validatePoolHealth = (): Promise<{ healthy: boolean; issues: string[] }> => {
  return DatabaseManager.getInstance().validatePoolHealth();
};

export const executeWithRetry = <T>(
  operation: () => Promise<T>,
  operationName?: string,
  maxRetries?: number
): Promise<T> => {
  return DatabaseManager.getInstance().executeWithRetry(operation, operationName, maxRetries);
};

// Enhanced graceful shutdown (UNCHANGED)
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  const metrics = await getPoolMetrics();
  console.log('📊 Final connection metrics:', metrics);
  
  await closePool();
  console.log('✅ Database shutdown complete');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('beforeExit', async () => {
  await closePool();
});

// Enhanced error handling (UNCHANGED)
process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  const metrics = await getPoolMetrics();
  console.error('📊 Connection metrics at crash:', metrics);
  await closePool();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  const metrics = await getPoolMetrics();
  console.error('📊 Connection metrics at rejection:', metrics);
  await closePool();
  process.exit(1);
});

// Export types
export type { QueryParams, PoolMetrics };
export default DatabaseManager;