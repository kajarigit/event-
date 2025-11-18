const path = require('path');
const bcrypt = require('bcryptjs');

// Set up the environment
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Import the models after env is set up
const { User, Stall } = require('./src/models/index.sequelize');

// Simple password generator
function generatePassword() {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

async function createStallDirectly() {
    try {
        console.log('🚀 Creating test stall directly in database...');
        
        // First create or find admin user
        console.log('👤 Ensuring admin user exists...');
        
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        const [admin, adminCreated] = await User.findOrCreate({
            where: { email: 'test.admin@event.com' },
            defaults: {
                name: 'Test Admin',
                email: 'test.admin@event.com',
                password: adminPassword,
                regNo: 'ADMIN001',
                department: 'Administration',
                year: '2024',
                role: 'admin'
            }
        });
        
        if (adminCreated) {
            console.log('✅ Admin user created successfully!');
        } else {
            console.log('ℹ️ Admin user already exists');
        }
        
        console.log(`👤 Admin: ${admin.name} (${admin.email})`);
        
        // Create stall owner user
        console.log('\n👤 Creating stall owner...');
        
        const ownerPassword = generatePassword();
        const hashedOwnerPassword = await bcrypt.hash(ownerPassword, 10);
        
        const [owner, ownerCreated] = await User.findOrCreate({
            where: { email: 'john.owner@test.com' },
            defaults: {
                name: 'John Doe',
                email: 'john.owner@test.com',
                password: hashedOwnerPassword,
                phone: '9876543210',
                role: 'stallOwner'
            }
        });
        
        if (ownerCreated) {
            console.log('✅ Stall owner user created!');
        } else {
            console.log('ℹ️ Stall owner already exists, updating password...');
            await owner.update({ password: hashedOwnerPassword });
        }
        
        // Create the stall
        console.log('\n📝 Creating test stall...');
        
        const stallData = {
            stallName: 'Test Tech Innovation Stall',
            stallNumber: 'TI001',
            department: 'Computer Science',
            description: 'Test stall for verifying owner dashboard functionality',
            ownerName: 'John Doe',
            ownerEmail: 'john.owner@test.com',
            ownerPhone: '9876543210',
            ownerId: owner.id,
            createdBy: admin.id
        };
        
        const [stall, stallCreated] = await Stall.findOrCreate({
            where: { stallNumber: 'TI001' },
            defaults: stallData
        });
        
        if (stallCreated) {
            console.log('✅ Test stall created successfully!');
        } else {
            console.log('ℹ️ Stall already exists, updating...');
            await stall.update(stallData);
        }
        
        console.log('\n🎉 SETUP COMPLETE!');
        console.log('\n📋 Stall Information:');
        console.log(`   • Stall ID: ${stall.stallId}`);
        console.log(`   • Stall Name: ${stall.stallName}`);
        console.log(`   • Stall Number: ${stall.stallNumber}`);
        console.log(`   • Department: ${stall.department}`);
        console.log(`   • Owner: ${stall.ownerName}`);
        console.log(`   • Owner Email: ${stall.ownerEmail}`);
        
        console.log('\n🔐 STALL OWNER LOGIN CREDENTIALS:');
        console.log(`   📧 Email: ${stall.ownerEmail}`);
        console.log(`   🔑 Password: ${ownerPassword}`);
        
        console.log('\n🌐 TESTING INSTRUCTIONS:');
        console.log('1. Open your browser and go to: http://localhost:3000');
        console.log('2. Click "Login"');
        console.log(`3. Use email: ${stall.ownerEmail}`);
        console.log(`4. Use password: ${ownerPassword}`);
        console.log('5. Test the stall owner dashboard functionality');
        
        // Try to send credentials email (optional)
        try {
            console.log('\n📧 Attempting to send credentials email...');
            await sendStallOwnerCredentials(stall.ownerEmail, stall.ownerName, ownerPassword, stall);
            console.log('✅ Credentials email sent successfully!');
        } catch (emailError) {
            console.log('⚠️ Email sending failed (this is optional):', emailError.message);
        }
        
        console.log('\n✅ Script completed! You can now test the stall owner dashboard.');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

// Run the script
createStallDirectly();