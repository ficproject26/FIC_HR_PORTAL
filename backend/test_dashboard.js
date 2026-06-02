async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hrcrm.com', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    if (!loginData.token) {
      console.log('No token received, cannot test dashboard');
      return;
    }

    const dashRes = await fetch('http://localhost:5000/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const dashData = await dashRes.json();
    console.log('\nDashboard status:', dashRes.status);
    console.log('monthlyConversions:', JSON.stringify(dashData.data?.monthlyConversions, null, 2));
    console.log('leadPipeline:', JSON.stringify(dashData.data?.leadPipeline, null, 2));
    console.log('stats:', JSON.stringify(dashData.data?.stats, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
