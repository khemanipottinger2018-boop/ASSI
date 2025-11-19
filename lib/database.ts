import sql from 'mssql';

const dbConfig = {
  server: process.env.DATABASE_SERVER || 'DESKTOP-NRKBECC\\SQLEXPRESS',
  database: process.env.DATABASE_NAME || 'ASSI_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    integratedSecurity: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 10000
  }
};

// Simple connection without pooling for now
export async function executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
  try {
    console.log('🔌 Connecting to database...');
    const pool = await sql.connect(dbConfig);
    
    const request = pool.request();
    
    if (params) {
      params.forEach((param, index) => {
        // Handle different parameter types
        if (typeof param === 'string' && param.length === 36) { // UUID format
          request.input(`param${index}`, sql.UniqueIdentifier, param);
        } else {
          request.input(`param${index}`, param);
        }
      });
    }
    
    console.log('📊 Executing query...');
    const result = await request.query(query);
    await pool.close();
    
    return result.recordset as T[];
  } catch (error) {
    console.error('💥 Database error:', error);
    throw error;
  }
}