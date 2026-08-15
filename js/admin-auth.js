const loginForm = document.getElementById('admin-auth-form');
const errorMessage = document.getElementById('admin-auth-error');
const logoutButton = document.getElementById('admin-logout');
const identityLabel = document.getElementById('admin-identity');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    try {
      const form = new FormData(loginForm);
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const result = await response.json();
      if (!response.ok) {
        errorMessage.textContent = result.error || 'Unable to sign in.';
        return;
      }
      window.location.replace(result.redirectTo);
    } catch (_error) {
      errorMessage.textContent = 'Unable to reach SalonMate. Please try again.';
    }
  });
}

if (identityLabel) {
  fetch('/api/admin/session').then(async (response) => {
    if (!response.ok) {
      window.location.replace('/admin/login');
      return;
    }
    const admin = await response.json();
    identityLabel.textContent = `${admin.email} · ${admin.roles.join(', ')}`;
  });
}

if (logoutButton) {
  logoutButton.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.replace('/admin/login');
  });
}
