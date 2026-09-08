export function googleAuthEnabled() {
  return process.env.GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === 'true';
}

export function googleOAuthClientId() {
  if (!googleAuthEnabled()) return '';
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
}
