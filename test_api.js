const http = require('http');

// Get a fresh token by logging in first
const token = null; // Will get token dynamically

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.log('Request error details:', error.code, error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testAPI() {
  try {
    console.log('Testing health endpoint first...');
    
    const healthResponse = await makeRequest('/health');
    console.log('Health check:', healthResponse.status, healthResponse.data);
    
    console.log('\nTesting raw attendance endpoint...');
    
    const response = await makeRequest('/api/admin/attendance/raw/1');
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Test processed endpoint too
    console.log('\n\nTesting processed attendance endpoint...');
    const response2 = await makeRequest('/api/admin/attendance/processed/1');
    
    console.log('✅ Processed endpoint SUCCESS!');
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(response2.data, null, 2));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testAPI();