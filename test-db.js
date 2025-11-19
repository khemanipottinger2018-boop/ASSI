const sql = require('mssql');

const config = {
  server: 'DESKTOP-NRKBE7C\\SQLEXPRESS',
  database: 'ASSI_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    integratedSecurity: true,
    enableArithAbort: true,
    connectTimeout: 30000
  }
};

async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to:', config.server);
    console.log('Database:', config.database);
    
    const pool = await sql.connect(config);
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const result = await pool.request().query('SELECT DB_NAME() as db_name, @@version as version');
    console.log('📊 Current database:', result.recordset[0].db_name);
    console.log('🔧 SQL Server version:', result.recordset[0].version.substring(0, 50) + '...');
    
    // Check if our tables exist
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
    console.log('📋 Available tables:', tables.recordset.map(t => t.TABLE_NAME));
    
    await pool.close();
    console.log('🎉 Database connection test PASSED!');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes('Login failed')) {
      console.log('\n💡 Try using SQL Server Authentication instead of Windows Auth');
    } else if (error.message.includes('Cannot open database')) {
      console.log('\n💡 Database might not exist. Check the database name.');
    } else if (error.message.includes('network-related')) {
      console.log('\n💡 Check if SQL Server is running and accessible.');
    }
  }
}

testConnection();
