const MIN_SECRET_LENGTH = 32;
export class ConfigurationError extends Error { constructor(message = 'The service is not configured.') { super(message); this.name = 'ConfigurationError'; } }
const value = (name) => process.env[name]?.trim() || '';
export function rateLimitStoreConfig() {
  const candidates = [
    ['RATE_LIMIT_STORE_URL', 'RATE_LIMIT_STORE_TOKEN'],
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ];
  for (const [urlName, tokenName] of candidates) {
    const url = value(urlName);
    const token = value(tokenName);
    if (url && token) return { url, token };
  }
  return null;
}
export function sessionSecret() { const secret = value('SESSION_SECRET'); if (secret.length < MIN_SECRET_LENGTH) throw new ConfigurationError('SESSION_SECRET is missing or too short.'); return secret; }
export function adminConfig() { const username = value('ADMIN_USERNAME').toLowerCase(); const password = value('ADMIN_PASSWORD'); if (!username || password.length < MIN_SECRET_LENGTH) throw new ConfigurationError('Administrator authentication is not configured.'); if (password === value('SESSION_SECRET')) throw new ConfigurationError('Administrator and session secrets must be independent.'); return { username, password }; }
export function publicAppUrl() { const configured = value('PUBLIC_APP_URL'); if (!configured) return ''; try { return new URL(configured).origin; } catch { throw new ConfigurationError('PUBLIC_APP_URL must be an absolute URL.'); } }
export function validateProductionConfig() { if (process.env.NODE_ENV !== 'production') return; sessionSecret(); adminConfig(); publicAppUrl(); if (!value('MONGODB_URI')) throw new ConfigurationError('Database is not configured.'); if (value('GOOGLE_AUTH_ENABLED') === 'true' && !value('GOOGLE_OAUTH_CLIENT_ID')) throw new ConfigurationError('Google authentication is not configured.'); }
