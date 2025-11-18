// Simple Node.js script to create test stall - Run with: node create-stall-simple.js
const http = require('http');

console.log('🚀 Creating test stall with owner credentials...\n');

const stallData = JSON.stringify({
    stallNumber: 'TEST-001',
    stallName: 'Test Electronics Stall',
    category: 'Electronics', 
    description: 'Test stall for electronics items',
    location: 'Ground Floor, Section A',
    ownerName: 'John Doe',
    ownerEmail: 'john.doe@test.com',
    ownerPhone: '9876543210',
    ownerDepartment: 'Computer Science',
    ownerDesignation: 'Professor'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/stalls',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(stallData)
    }
};

console.log('📝 Sending request to create stall...');

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            
            if (response.success) {
                const { stall, ownerCredentials } = response.data;
                
                console.log('\n✅ Stall created successfully!');
                console.log('\n📋 Stall Details:');
                console.log(`- Stall ID: ${stall.id}`);
                console.log(`- Stall Number: ${stall.stallNumber}`);
                console.log(`- Stall Name: ${stall.stallName}`);
                
                console.log('\n🔑 Owner Credentials:');
                console.log(`- Email: ${ownerCredentials.email}`);
                console.log(`- Password: ${ownerCredentials.password}`);
                console.log(`- Login URL: http://localhost:3000/stall-owner-login`);
                
                console.log('\n📧 Email Status:');
                console.log(`- Email sent: ${response.data.emailSent ? 'Yes' : 'No'}`);
                
                console.log('\n🎯 Test the Owner Dashboard:');
                console.log('1. Visit: http://localhost:3000/stall-owner-login');
                console.log(`2. Email: ${ownerCredentials.email}`);
                console.log(`3. Password: ${ownerCredentials.password}`);
                
            } else {
                console.error('❌ Failed to create stall:', response.message);
            }
        } catch (error) {
            console.error('❌ Error parsing response:', error.message);
            console.error('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. Backend server is running: cd backend && npm run dev');
    console.log('2. Server is accessible on http://localhost:5000');
    console.log('3. PostgreSQL database is connected');
});

req.write(stallData);
req.end();