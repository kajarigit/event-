const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function createAdminAndStall() {
    try {
        console.log('🚀 Creating admin user and test stall...');
        
        // First, try to register as admin
        console.log('👤 Creating admin user...');
        
        const adminData = {
            name: 'Test Admin',
            email: 'test.admin@event.com',
            regNo: 'ADMIN001',
            department: 'Administration',
            year: '2024',
            role: 'admin',
            password: 'admin123'
        };
        
        try {
            const registerResponse = await axios.post(`${BASE_URL}/auth/register`, adminData);
            console.log('✅ Admin user created successfully!');
        } catch (error) {
            if (error.response?.data?.message?.includes('already exists')) {
                console.log('ℹ️ Admin user already exists, proceeding with login...');
            } else {
                console.log('⚠️ Admin creation failed:', error.response?.data?.message || error.message);
                console.log('Proceeding to try login...');
            }
        }
        
        // Now try to login
        console.log('🔑 Logging in as admin...');
        
        const loginCredentials = {
            email: 'test.admin@event.com',
            password: 'admin123'
        };
        
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginCredentials);
        
        if (!loginResponse.data || !loginResponse.data.token) {
            throw new Error('Login failed - no token received');
        }
        
        const authToken = loginResponse.data.token;
        console.log('✅ Admin login successful!');
        console.log('👤 Logged in as:', loginResponse.data.user?.name);
        
        // Now create the test stall
        console.log('\n📝 Creating test stall with owner credentials...');
        
        const stallData = {
            stallName: 'Test Tech Innovation Stall',
            stallNumber: 'TI001',
            department: 'Computer Science',
            ownerName: 'John Doe',
            ownerEmail: 'john.owner@test.com',
            ownerPhone: '9876543210',
            description: 'Test stall for verifying owner dashboard functionality'
        };
        
        const createResponse = await axios.post(`${BASE_URL}/admin/stalls`, stallData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (createResponse.data && createResponse.data.success) {
            const stall = createResponse.data.stall;
            console.log('\n🎉 Test stall created successfully!');
            console.log('\n📋 Stall Information:');
            console.log(`   • Stall ID: ${stall.stallId}`);
            console.log(`   • Stall Name: ${stall.stallName}`);
            console.log(`   • Stall Number: ${stall.stallNumber}`);
            console.log(`   • Department: ${stall.department}`);
            console.log(`   • Owner: ${stall.ownerName}`);
            console.log(`   • Owner Email: ${stall.ownerEmail}`);
            console.log(`   • Owner Phone: ${stall.ownerPhone}`);
            
            if (createResponse.data.ownerPassword) {
                console.log('\n🔐 STALL OWNER LOGIN CREDENTIALS:');
                console.log(`   📧 Email: ${stall.ownerEmail}`);
                console.log(`   🔑 Password: ${createResponse.data.ownerPassword}`);
                
                console.log('\n🌐 TESTING INSTRUCTIONS:');
                console.log('1. Open your browser and go to: http://localhost:3000');
                console.log('2. Click "Login" and select "Stall Owner" role');
                console.log(`3. Use email: ${stall.ownerEmail}`);
                console.log(`4. Use password: ${createResponse.data.ownerPassword}`);
                console.log('5. Check the dashboard functionality, stall details, and QR code');
                
                console.log('\n📱 QR Code Information:');
                if (stall.qrCode) {
                    console.log(`   • QR Code URL: ${stall.qrCode}`);
                }
                console.log(`   • QR Code should contain: ${stall.stallId}`);
            } else {
                console.log('\n⚠️  No owner password returned in response');
                console.log('Check the server logs or email service configuration');
            }
            
            console.log('\n✅ Script completed successfully!');
            console.log('You can now test the stall owner dashboard functionality.');
            
        } else {
            console.log('❌ Failed to create stall:', createResponse.data);
        }
        
    } catch (error) {
        console.error('\n❌ Error occurred:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Authentication failed. Check if the admin user was created properly.');
        } else if (error.response?.status === 500) {
            console.log('\n💡 Server error. Check if the backend is running and database is connected.');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Cannot connect to server. Make sure the backend is running on port 5000.');
        }
    }
}

// Run the script
createAdminAndStall();