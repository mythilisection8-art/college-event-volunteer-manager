const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  console.log('🔄 Starting Database Initialization...');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'college_volunteer_db';
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

  let connection;
  try {
    // 1. Connect without database selected first
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      port: dbPort,
      multipleStatements: true
    });

    console.log(`✅ Connected to MySQL server on ${dbHost}:${dbPort}`);

    // 2. Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ Database "${dbName}" checked/created.`);

    // 3. Switch to the target database
    await connection.changeUser({ database: dbName });

    // 4. Read schema.sql
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 5. Execute schema statements
    await connection.query(schemaSql);

    // Safe alter in case table existed previously without max_attendees
    const [existingCols] = await connection.query('SHOW COLUMNS FROM events LIKE "max_attendees"');
    if (existingCols.length === 0) {
      await connection.query(`
        ALTER TABLE events 
        ADD COLUMN max_attendees INT NOT NULL DEFAULT 100 AFTER venue;
      `);
      console.log('✅ Added "max_attendees" column to existing events table.');
    }

    // Safe alter for attendee_registrations attendance columns
    const [attCols] = await connection.query('SHOW COLUMNS FROM attendee_registrations LIKE "attendance_status"');
    if (attCols.length === 0) {
      await connection.query(`
        ALTER TABLE attendee_registrations 
        ADD COLUMN attendance_status ENUM('not_marked', 'present', 'absent') NOT NULL DEFAULT 'not_marked' AFTER status,
        ADD COLUMN checked_in_at TIMESTAMP NULL DEFAULT NULL AFTER attendance_status;
      `);
      console.log('✅ Added "attendance_status" and "checked_in_at" columns to attendee_registrations table.');
    }

    // Safe alter for registrations checked_in_at column
    const [regCols] = await connection.query('SHOW COLUMNS FROM registrations LIKE "checked_in_at"');
    if (regCols.length === 0) {
      await connection.query(`
        ALTER TABLE registrations 
        ADD COLUMN checked_in_at TIMESTAMP NULL DEFAULT NULL AFTER attendance_status;
      `);
      console.log('✅ Added "checked_in_at" column to registrations table.');
    }

    console.log('✅ Database schema tables (users, categories, events, attendee_registrations, registrations) created successfully!');

    console.log('🎉 Database initialization complete!');
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
