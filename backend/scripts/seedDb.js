const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedDatabase() {
  console.log('🌱 Starting Database Seeding...');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'college_volunteer_db';
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      port: dbPort,
      multipleStatements: true
    });

    console.log(`✅ Connected to MySQL database "${dbName}"`);

    const seedPath = path.join(__dirname, '../../database/seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }

    const seedSql = fs.readFileSync(seedPath, 'utf8');

    await connection.query(seedSql);
    console.log('✅ Seed data inserted successfully!');
    console.log('');
    console.log('📋 Default Demo Accounts (Password for all: password123):');
    console.log('   - 🛡️  Admin:     admin@college.edu');
    console.log('   - 📅 Organizer: organizer@college.edu');
    console.log('   - 🎓 Student:   student@college.edu');
    console.log('   - 🎓 Student:   ananya@college.edu');
    console.log('');
  } catch (error) {
    console.error('❌ Database Seeding Failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seedDatabase();
