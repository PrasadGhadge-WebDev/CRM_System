const axios = require('axios');

async function testApi() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test',
      email: 'invalid-email', // Should trigger 400
      phone: '123',
      password: '123'
    });
    console.log('Success:', response.data);
  } catch (err) {
    console.log('Status:', err.response?.status);
    console.log('Data:', JSON.stringify(err.response?.data, null, 2));
  }
}
testApi();
