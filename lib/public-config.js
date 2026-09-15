import { googleAuthEnabled, googleOAuthClientId } from './google-oauth.js';

// This is deliberately limited to values that are safe to expose to a browser.
export function publicAppConfig() {
  return {
    googleAuthEnabled: googleAuthEnabled(),
    googleOAuthClientId: googleOAuthClientId(),
  };
}
