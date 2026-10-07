const test = async () => {
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginData);

  const addRes = await fetch('http://127.0.0.1:3000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${loginData.token}`
    },
    body: JSON.stringify({
      name: 'Test Product',
      description: 'Test description',
      price: 19.99,
      imageUrl: ''
    })
  });

  const addTxt = await addRes.text();
  console.log('Add status:', addRes.status);
  console.log('Add response:', addTxt);
};
test();
