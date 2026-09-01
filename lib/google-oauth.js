export function googleOAuthClientId() {
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || '';
}
