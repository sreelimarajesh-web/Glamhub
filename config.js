// A safe loading state for static hosting. The app fetches browser-safe runtime
// configuration from /api/auth/config, so Vercel environment variables are the
// single source of truth. Static hosts without that endpoint keep Google off.
window.SALONMATE_CONFIG = {
    googleAuthLoading: true,
    googleAuthEnabled: false,
    googleOAuthClientId: ''
};
