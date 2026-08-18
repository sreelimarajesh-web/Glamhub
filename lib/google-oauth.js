// OAuth client IDs are public application identifiers, not secrets. Keeping the
// deployed web client as a fallback ensures the browser and serverless verifier
// use the same audience when an environment override has not been configured.
export const DEFAULT_GOOGLE_OAUTH_CLIENT_ID = '72416329561-c4enbj103esjlb1v7h5fbg6eb0vgi1oc.apps.googleusercontent.com';

export function googleOAuthClientId() {
  return process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() || DEFAULT_GOOGLE_OAUTH_CLIENT_ID;
}
