import sql from 'mssql';

const dbConfig: sql.config = {
  server: process.env.DATABASE_SERVER!,
  database: process.env.DATABASE_NAME!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    integratedSecurity: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool;

export async function getDatabase(): Promise<sql.ConnectionPool> {
  if (!pool) {
    try {
      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      console.log('✅ SQL Server connected with Windows Authentication');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }
  return pool;
}

export async function executeQuery<T>(query: string, params?: Record<string, any>): Promise<T[]> {
  const pool = await getDatabase();
  const request = pool.request();
  
  if (params) {
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
  }
  
  const result = await request.query(query);
  return result.recordset as T[];
}

export async function testConnection(): Promise<boolean> {
  try {
    const pool = await getDatabase();
    const result = await pool.request().query('SELECT 1 as test');
    console.log('✅ Database test query successful');
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}