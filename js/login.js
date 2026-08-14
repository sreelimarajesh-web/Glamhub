const GOOGLE_CLIENT_ID = window.GOOGLE_OAUTH_CLIENT_ID || '';
const authStatus = document.getElementById('google-auth-status');
const params = new URLSearchParams(window.location.search);
const requestedRole = ['customer', 'salon_owner'].includes(params.get('role')) ? params.get('role') : 'customer';
const returnToParam = params.get('returnTo') || '/';
const returnTo = returnToParam.startsWith('/') && !returnToParam.startsWith('//') ? returnToParam : '/';
const oauthStateKey = 'salonmate_google_oauth_state';
const sessionKey = 'salonmate_demo_session';
let googleLoginInitialized = false;

document.getElementById('selected-role').textContent = requestedRole === 'salon_owner' ? 'Salon Owner' : 'Customer';

function renderAuthStatus(message, isSuccess = false) {
    authStatus.textContent = message;
    authStatus.classList.toggle('authenticated', isSuccess);
}

function decodeGoogleProfile(token) {
    const payloadSegment = token.split('.')[1];
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')).split('').map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
    return JSON.parse(json);
}

function handleGoogleSignIn(response) {
    const token = response?.credential;

    if (!token) {
        renderAuthStatus('Google sign-in failed. Please try again.');
        return;
    }

    try {
        const payload = decodeGoogleProfile(token);
        const savedState = JSON.parse(sessionStorage.getItem(oauthStateKey) || 'null');
        const selectedRole = savedState?.selectedRole || requestedRole;

        if (!['customer', 'salon_owner'].includes(selectedRole) || selectedRole !== requestedRole) {
            renderAuthStatus('Your sign-in role could not be verified. Please return and try again.');
            return;
        }

        const session = {
            name: payload?.name || 'Google User',
            email: payload?.email || '',
            role: selectedRole === 'salon_owner' ? 'owner' : 'customer',
            selectedRole,
            provider: 'google'
        };

        sessionStorage.setItem('salonmateGoogleIdToken', token);
        sessionStorage.setItem('salonmateUserName', session.name);
        sessionStorage.setItem('salonmateUserEmail', session.email);
        sessionStorage.setItem(sessionKey, JSON.stringify(session));
        sessionStorage.removeItem(oauthStateKey);

        renderAuthStatus('Login successful. Redirecting...', true);
        window.location.replace(savedState?.returnTo || returnTo);
    } catch (error) {
        renderAuthStatus('Unable to finish login. Please try again.');
    }
}

function initializeGoogleLogin() {
    if (googleLoginInitialized) {
        return true;
    }

    renderAuthStatus('Loading Google Sign-In...');

    if (!window.google?.accounts?.id) {
        return false;
    }

    if (!GOOGLE_CLIENT_ID) {
        renderAuthStatus('Missing Google OAuth Client ID.');
        return true;
    }

    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: false
    });

    window.google.accounts.id.renderButton(document.getElementById('google-signin-button'), {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill'
    });

    googleLoginInitialized = true;
    return true;
}

function initializeGoogleLoginWithRetry(maxRetries = 20, delayMs = 250) {
    let attempts = 0;

    const tryInitialize = () => {
        attempts += 1;
        const completed = initializeGoogleLogin();

        if (completed) {
            return;
        }

        if (attempts >= maxRetries) {
            renderAuthStatus('Google Sign-In library failed to load. Please refresh.');
            return;
        }

        setTimeout(tryInitialize, delayMs);
    };

    tryInitialize();
}

initializeGoogleLoginWithRetry();

const googleScript = document.getElementById('google-gsi-client');
if (googleScript) {
    googleScript.addEventListener('load', () => initializeGoogleLoginWithRetry(2, 100));
}
