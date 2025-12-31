import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool: sql.ConnectionPool | null = null;

export const connectDB = async (): Promise<sql.ConnectionPool> => {
  try {
    if (pool) {
      return pool;
    }
    
    pool = await sql.connect(config);
    console.log('✅ Kết nối SQL Server thành công');
    return pool;
  } catch (error) {
    console.error('❌ Lỗi kết nối SQL Server:', error);
    throw error;
  }
};

export const getPool = (): sql.ConnectionPool => {
  if (!pool) {
    throw new Error('Database chưa được khởi tạo. Gọi connectDB() trước.');
  }
  return pool;
};

export const closeDB = async (): Promise<void> => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('🔒 Đã đóng kết nối SQL Server');
    }
  } catch (error) {
    console.error('❌ Lỗi khi đóng kết nối:', error);
  }
};
