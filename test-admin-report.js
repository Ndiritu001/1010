const fetch = globalThis.fetch || require('node-fetch');
require('dotenv').config({ path: 'h.env' });

(async () => {
  const base = `http://localhost:${process.env.PORT || 5000}`;
  const results = {};

  let res = await fetch(`${base}/api/status`);
  results.status = { status: res.status, body: await res.json() };

  res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@brisamotors.co.ke', password: 'Admin@1234' }),
  });
  results.login = { status: res.status, body: await res.json() };

  if (!results.login.body.token) {
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const token = results.login.body.token;
  res = await fetch(`${base}/api/admin/reports/summary`, { headers: { Authorization: `Bearer ${token}` } });
  results.summary = { status: res.status, body: await res.json() };

  console.log(JSON.stringify(results, null, 2));
})();
