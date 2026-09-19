export function googleAuthEnabled() {
  const setting = process.env.GOOGLE_AUTH_ENABLED?.trim().toLowerCase();
  if (setting) return setting === 'true';
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID?.trim());
}

export function googleOAuthClientId() {
  if (!googleAuthEnabled()) return '';
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
}
