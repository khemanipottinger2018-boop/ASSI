const sql = require('mssql');

async function test() {
  const configs = [
    // Config 1: Named Pipes
    {
      server: 'DESKTOP-NRKBECC\\SQLEXPRESS',
      database: 'master',
      options: {
        trustedConnection: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        encrypt: false,
        instanceName: 'SQLEXPRESS'
      }
    },
    // Config 2: TCP/IP with port
    {
      server: 'localhost',
      port: 1433,
      database: 'master',
      options: {
        trustedConnection: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        encrypt: false
      }
    },
    // Config 3: Connection string
    {
      connectionString: 'Server=localhost\\SQLEXPRESS;Database=master;Integrated Security=true;TrustServerCertificate=true;'
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    console.log(`\n🔌 Testing Config ${i + 1}...`);
    try {
      const pool = await sql.connect(configs[i]);
      console.log('✅ SUCCESS!');
      const result = await pool.request().query('SELECT @@VERSION');
      console.log('Version:', result.recordset[0]);
      await pool.close();
      return; // Stop if successful
    } catch (err) {
      console.error(`❌ Failed:`, err.message);
    }
  }
  
  console.log('\n💥 ALL CONFIGS FAILED');
}

test();
