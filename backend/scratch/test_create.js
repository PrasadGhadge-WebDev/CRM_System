const makeReq = async () => {
  try {
    // 1. login 
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@crm.com', password: 'Admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token && !loginData.data?.token) {
      console.log('Login failed', loginData);
      return;
    }
    const token = loginData.token || loginData.data?.token;

    // 2. create user
    const createRes = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
       },
      body: JSON.stringify({
        role: "Employee",
        email: "test400@example.com",
        phone: "+919999999999",
        password: "Password12",
        status: "active",
        date_of_birth: "",
        joining_date: "",
        name: "Test User",
        tags: []
      })
    });
    const createData = await createRes.json();
    console.log('Create Status:', createRes.status);
    console.log('Create Response:', createData);
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
makeReq();
