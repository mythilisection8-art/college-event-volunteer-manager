const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_volunteer_db',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

// Test connection helper
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Connected to MySQL database "${process.env.DB_NAME || 'college_volunteer_db'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    connection.release();
    return true;
  } catch (error) {
    console.error(`[DB Error] Could not connect to MySQL:`, error.message);
    return false;
  }
};

module.exports = {
  pool,
  testConnection
};
