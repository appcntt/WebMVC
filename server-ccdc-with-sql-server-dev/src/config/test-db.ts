import sql from 'mssql';

(async () => {
  try {
    const pool = await sql.connect({
      user: 'sa',
      password: 'tranlam',
      server: 'TRANLAM',
      database: 'ccdc_bvtsvg',
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });

    console.log('✅ CONNECT OK');
    await pool.close();
  } catch (err) {
    console.error('❌ CONNECT FAIL', err);
  }
})();
