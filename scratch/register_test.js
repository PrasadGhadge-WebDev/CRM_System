const axios = require('axios');

async function registerTestUser() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      fullName: 'Test Verification User',
      email: 'verify_me_' + Date.now() + '@example.com',
      phone: '9876543210',
      password: 'Password123'
    });
    console.log('Registration Response:', response.data);
  } catch (error) {
    console.error('Registration Failed:', error.response ? error.response.data : error.message);
  }
}

registerTestUser();
