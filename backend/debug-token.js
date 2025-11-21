require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE0LCJyb2xlIjoic3R1ZGVudCIsInNjb3BlIjoidmVyaWZpY2F0aW9uLW9ubHkiLCJpc1ZlcmlmaWNhdGlvblRva2VuIjp0cnVlLCJpYXQiOjE3MzIxODU5NTUsImV4cCI6MTczMjE5MzE1NX0.x_yRNkZ8bH_5Q0VpO9jKBxU_7vDQ2oqpOJGMl4KUZbY'; // Replace with actual token

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token decoded:', decoded);
  console.log('Is verification token:', decoded.isVerificationToken);
  console.log('Scope:', decoded.scope);
} catch (error) {
  console.error('Token decode error:', error);
}