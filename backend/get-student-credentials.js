require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  }
);

async function getStudentCredentials() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // First, check table names
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('Available tables:', tables.map(t => t.table_name).join(', '));
    console.log('');

    // Get all students (trying lowercase table name)
    const [students] = await sequelize.query(`
      SELECT * FROM "Users"
      WHERE role = 'student'
      ORDER BY "createdAt" ASC
    `);

    console.log('👨‍🎓 STUDENT CREDENTIALS:\n');
    console.log('='.repeat(80));
    
    students.forEach((student, index) => {
      console.log(`\nStudent ${index + 1}:`);
      console.log(`  Name: ${student.name}`);
      console.log(`  Username: ${student.username}`);
      console.log(`  Password: Student@123  (Default password for all students)`);
      console.log(`  Email: ${student.email}`);
      console.log(`  Roll Number: ${student.rollNumber}`);
      console.log(`  ID: ${student.id}`);
      console.log('-'.repeat(80));
    });

    console.log('\n📝 LOGIN INSTRUCTIONS:');
    console.log('1. Go to the student login page');
    console.log('2. Enter the username and password');
    console.log('3. Default password: Student@123');
    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

getStudentCredentials();
