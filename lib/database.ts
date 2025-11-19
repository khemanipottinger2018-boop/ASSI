import sql from 'mssql';

const dbConfig = {
  server: process.env.DATABASE_SERVER || 'DESKTOP-NRKBECC\\SQLEXPRESS',
  database: process.env.DATABASE_NAME || 'ASSI_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    integratedSecurity: true,
    enableArithAbort: true,
    connectTimeout: 15000, // Reduced from 30s
    requestTimeout: 10000  // Reduced from 30s
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Connection pool - reuse instead of creating new connections
let pool: sql.ConnectionPool;
let poolPromise: Promise<sql.ConnectionPool>;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;
  if (poolPromise) return poolPromise;

  poolPromise = (async () => {
    try {
      console.log('🔌 Creating database connection pool...');
      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      console.log('✅ Database pool connected');
      return pool;
    } catch (error) {
      poolPromise = undefined as any;
      throw error;
    }
  })();

  return poolPromise;
}

export async function executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
  const pool = await getPool();
  
  try {
    const request = pool.request();
    
    if (params) {
      params.forEach((param, index) => {
        request.input(`param${index}`, param);
      });
    }
    
    console.log('📊 Executing query...');
    const result = await request.query(query);
    return result.recordset as T[];
  } catch (error) {
    console.error('💥 Database query error:', error);
    throw error;
  }
}