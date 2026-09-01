const base = process.env.SMOKE_BASE_URL;
if (!base) { console.error('SMOKE_BASE_URL is required; no live deployment was tested.'); process.exit(2); }
const origin = new URL(base).origin;
async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), { ...options, headers: { Origin: origin, 'Content-Type': 'application/json', ...(options.headers || {}) }, redirect: 'manual' });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} returned ${response.status}`);
  return response;
}
await request('/'); await request('/api/health'); await request('/api/state?view=salons');
if (process.env.SMOKE_ADMIN_USERNAME && process.env.SMOKE_ADMIN_PASSWORD) {
  const login = await request('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: process.env.SMOKE_ADMIN_USERNAME, password: process.env.SMOKE_ADMIN_PASSWORD }) });
  const cookie = login.headers.get('set-cookie')?.split(';')[0]; await request('/api/admin/session', { headers: { Cookie: cookie } }); await request('/api/admin/logout', { method: 'POST', headers: { Cookie: cookie }, body: '{}' });
}
console.log('Deployment smoke checks passed. Use isolated pilot accounts to execute the documented customer/owner tenant checklist.');
