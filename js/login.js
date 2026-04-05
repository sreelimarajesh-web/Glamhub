const GOOGLE_CLIENT_ID = window.GOOGLE_OAUTH_CLIENT_ID || '';
const authStatus = document.getElementById('google-auth-status');
let googleLoginInitialized = false;

function renderAuthStatus(message, isSuccess = false) {
    authStatus.textContent = message;
    authStatus.classList.toggle('authenticated', isSuccess);
}

function handleGoogleSignIn(response) {
    const token = response?.credential;

    if (!token) {
        renderAuthStatus('Google sign-in failed. Please try again.');
        return;
    }

    try {
        const [, payloadSegment] = token.split('.');
        const payload = JSON.parse(atob(payloadSegment));

        sessionStorage.setItem('glamhubGoogleIdToken', token);
        sessionStorage.setItem('glamhubUserName', payload?.name || '');
        sessionStorage.setItem('glamhubUserEmail', payload?.email || '');

        renderAuthStatus('Login successful. Redirecting...', true);
        window.location.href = 'user.html';
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
        text: 'signin_with',
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
