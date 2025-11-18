const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function createStallWithAuth() {
    try {
        console.log('🚀 Creating test stall with admin authentication...');
        
        // First, let's try to login as admin
        console.log('🔑 Attempting admin login...');
        
        // Try common admin credentials
        const adminCredentials = [
            { email: 'admin@admin.com', password: 'admin123' },
            { email: 'admin@event.com', password: 'admin123' },
            { email: 'admin@gmail.com', password: 'admin' },
            { email: 'sourav@gmail.com', password: 'admin' },
            { regNo: 'ADMIN001', password: 'admin123' }
        ];
        
        let authToken = null;
        
        for (const creds of adminCredentials) {
            try {
                console.log(`📝 Trying login with: ${JSON.stringify(creds)}`);
                const loginResponse = await axios.post(`${BASE_URL}/auth/login`, creds);
                
                if (loginResponse.data && loginResponse.data.token) {
                    authToken = loginResponse.data.token;
                    console.log('✅ Admin login successful!');
                    console.log('👤 Admin user:', loginResponse.data.user?.name || loginResponse.data.user?.email);
                    break;
                }
            } catch (error) {
                console.log(`❌ Failed with ${JSON.stringify(creds)}: ${error.response?.data?.message || error.message}`);
                continue;
            }
        }
        
        if (!authToken) {
            console.log('❌ Could not authenticate as admin with any credentials');
            console.log('\n💡 Please check your admin credentials in the database or create an admin user first');
            return;
        }
        
        // Now create the test stall
        console.log('\n📝 Creating test stall...');
        
        const stallData = {
            stallName: 'Test Tech Stall',
            stallNumber: 'TS001',
            department: 'Computer Science',
            ownerName: 'John Doe',
            ownerEmail: 'john.doe@test.com',
            ownerPhone: '9876543210',
            description: 'Test stall for dashboard verification'
        };
        
        const createResponse = await axios.post(`${BASE_URL}/admin/stalls`, stallData, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (createResponse.data && createResponse.data.success) {
            const stall = createResponse.data.stall;
            console.log('\n✅ Test stall created successfully!');
            console.log('📋 Stall Details:');
            console.log(`   • Stall ID: ${stall.stallId}`);
            console.log(`   • Stall Name: ${stall.stallName}`);
            console.log(`   • Stall Number: ${stall.stallNumber}`);
            console.log(`   • Owner: ${stall.ownerName}`);
            console.log(`   • Owner Email: ${stall.ownerEmail}`);
            
            if (createResponse.data.ownerPassword) {
                console.log(`   • Owner Password: ${createResponse.data.ownerPassword}`);
                console.log('\n🔐 Owner Login Credentials:');
                console.log(`   • Email: ${stall.ownerEmail}`);
                console.log(`   • Password: ${createResponse.data.ownerPassword}`);
                console.log('\n🌐 You can now test the owner dashboard at:');
                console.log('   • Frontend URL: http://localhost:3000');
                console.log('   • Login as stall owner and check the dashboard functionality');
            } else {
                console.log('\n⚠️  No owner password returned - check email service or logs');
            }
        } else {
            console.log('❌ Failed to create stall:', createResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Tip: Make sure you have admin credentials set up in your database');
        }
        
        if (error.response?.status === 500) {
            console.log('\n💡 Tip: Check if the backend server is running and database is connected');
        }
    }
}

// Run the script
createStallWithAuth();