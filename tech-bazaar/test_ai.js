const test = async () => {
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginData);

  const res = await fetch('http://127.0.0.1:3000/api/ai/generate-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      name: 'truke mega 9',
      currentDescription: '',
      features: '',
      imageUrl: ''
    })
  });

  const txt = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', txt);
};
test();
