// OAuth client IDs identify a public browser application; they are not secrets.
// Keep the deployed Zaya client as a fallback so the browser and API use the
// same audience even when a hosting environment has not injected an override.
export const DEFAULT_GOOGLE_OAUTH_CLIENT_ID = '72416329561-c4enbj103esjlb1v7h5fbg6eb0vgi1oc.apps.googleusercontent.com';

export function googleAuthEnabled() {
  const setting = process.env.GOOGLE_AUTH_ENABLED?.trim().toLowerCase();
  if (setting) return setting === 'true';
  return Boolean(googleOAuthClientId());
}

export function googleOAuthClientId() {
  if (process.env.GOOGLE_AUTH_ENABLED?.trim().toLowerCase() === 'false') return '';
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || DEFAULT_GOOGLE_OAUTH_CLIENT_ID;
}
