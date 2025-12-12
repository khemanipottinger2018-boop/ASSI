import mssql from 'mssql';

class Database {
  private static instance: Database;
  private pool: mssql.ConnectionPool | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxAttempts: number = 3;
  
  private constructor() {
    this.validateEnv();
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private validateEnv(): void {
    const required = ['DATABASE_SERVER', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length) {
      throw new Error(`Missing DB env: ${missing.join(', ')}`);
    }
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
        trustServerCertificate: process.env.DATABASE_TRUST_CERT === 'true',
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000
      },
      pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000
      }
    };
  }

  async connect(): Promise<mssql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;
    if (this.isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.connect();
    }

    this.isConnecting = true;
    
    try {
      console.log('🔌 Connecting to SQL Server...');
      this.pool = new mssql.ConnectionPool(this.getConfig());
      
      this.pool.on('error', (err) => {
        console.error('❌ Database pool error:', err.message);
        this.pool = null;
      });

      await this.pool.connect();
      this.connectionAttempts = 0;
      console.log('✅ Database connected!');
      return this.pool;
      
    } catch (error: any) {
      this.connectionAttempts++;
      this.pool = null;
      
      if (this.connectionAttempts < this.maxAttempts) {
        console.warn(`⚠️ Connection failed (attempt ${this.connectionAttempts}/${this.maxAttempts}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * this.connectionAttempts));
        return this.connect();
      }
      
      throw new Error(`Database connection failed after ${this.maxAttempts} attempts: ${error.message}`);
    } finally {
      this.isConnecting = false;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const pool = await this.connect();
      const result = await pool.request().query('SELECT 1 as status');
      return result.recordset[0]?.status === 1;
    } catch {
      return false;
    }
  }

  async query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]> {
    try {
      const pool = await this.connect();
      const request = pool.request();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            request.input(key, mssql.NVarChar, null);
          } else if (typeof value === 'string' && this.isUUID(value)) {
            request.input(key, mssql.UniqueIdentifier, value);
          } else if (typeof value === 'string' && key.toLowerCase().endsWith('id') && value.length === 36) {
            // If it looks like a UUID (36 chars), try to parse it
            try {
              request.input(key, mssql.UniqueIdentifier, value);
            } catch {
              request.input(key, mssql.NVarChar, value);
            }
          } else {
            request.input(key, this.getSqlType(value), value);
          }
        });
      }
      
      const result = await request.query<T>(sql);
      return result.recordset;
      
    } catch (error: any) {
      console.error('❌ Query failed:', error.message);
      console.error('SQL:', sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
      throw error;
    }
  }

  async queryOne<T = any>(sql: string, params?: Record<string, any>): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  async transaction<T>(callback: (transaction: mssql.Transaction) => Promise<T>): Promise<T> {
    const pool = await this.connect();
    const transaction = new mssql.Transaction(pool);
    
    try {
      await transaction.begin();
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private getSqlType(value: any): mssql.ISqlType {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return mssql.Int;
      }
      return mssql.Decimal(18, 6);
    }
    if (typeof value === 'boolean') return mssql.Bit;
    if (value instanceof Date) return mssql.DateTime;
    if (typeof value === 'string') return mssql.NVarChar;
    if (value === null) return mssql.NVarChar;
    return mssql.NVarChar;
  }

  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  newId(): string {
    return 'NEWID()';
  }

  async close(): Promise<void> {
    if (this.pool?.connected) {
      await this.pool.close();
      this.pool = null;
      console.log('🔌 Database connection closed');
    }
  }
}

export const db = Database.getInstance();
export default Database;