# Google sign-in configuration

Zaya uses Google Identity Services to obtain an ID token in the browser. The API verifies that token against the same OAuth client ID before creating a session. A Gmail password or Google client secret is **not** required and must never be added to this repository.

## 1. Configure Google Cloud

1. Open Google Cloud Console and select or create the project used by Zaya.
2. In **Google Auth Platform**, configure the branding/consent screen. Add the application name, support email, and developer contact email.
3. If the app is in **Testing**, add each Gmail address that should be allowed to log in as a test user. Publish the app when it is ready for general use.
4. Create an OAuth client with application type **Web application**.
5. Add every exact frontend origin under **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - the Vercel production origin, such as `https://zaya.example`
   - any stable preview origin used for acceptance testing
6. Copy the web **Client ID**. This flow does not use an authorized redirect URI because Google returns the credential to the JavaScript callback.

Origins are scheme-, host-, and port-sensitive. Do not add paths, trailing slashes, or `/api/auth/google` to the JavaScript origin list.

## 2. Configure local development

Create the ignored local environment file from the committed template:

```bash
cp .env.example .env
```

Set these values in `.env`:

```dotenv
GOOGLE_AUTH_ENABLED=true
GOOGLE_OAUTH_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
```

Complete the other required variables in the template, then run:

```bash
npm install
npm start
```

`npm start` loads `.env` when it exists. Open `http://localhost:3000`; do not open `index.html` directly. Select Customer or Salon Owner, choose **Continue with Google**, and complete the Google prompt.

## 3. Configure Vercel

Add `GOOGLE_AUTH_ENABLED=true` and `GOOGLE_OAUTH_CLIENT_ID=<your-web-client-id>` in **Project Settings → Environment Variables** for Production, Preview, and Development as appropriate. Redeploy after changing variables.

The checked-in `config.js` currently supplies the browser-safe client ID on static Vercel deployments. Keep its `googleAuthEnabled` and `googleOAuthClientId` values aligned with the Vercel variables until browser configuration is moved to a runtime endpoint. A Google OAuth client ID is public configuration; never put a client secret, Gmail password, access token, or refresh token in `config.js`.

## 4. Verify the setup

1. Load the app and confirm the Google button is rendered rather than “Google Sign-In is not configured.”
2. In browser developer tools, confirm `/config.js` contains `googleAuthEnabled: true` and the expected client ID.
3. Complete sign-in and confirm `POST /api/auth/google` returns `200` and sets the HTTP-only `zaya_session` cookie.
4. Refresh the page and confirm the signed-in session is restored.
5. Test both Customer and Salon Owner roles. The same normalized Google email can hold both roles.

## Troubleshooting

- **Google Sign-In is not configured:** enable the flag and provide a client ID, then restart locally or redeploy Vercel.
- **The given origin is not allowed:** add the exact browser origin to the web client's Authorized JavaScript origins, wait a few minutes for Google configuration to propagate, and retry.
- **Google identity could not be verified:** ensure the browser client ID and `GOOGLE_OAUTH_CLIENT_ID` are identical and that the credential comes from the configured Google project.
- **Only test users can sign in:** add the Gmail account as a consent-screen test user or publish the application.
- **Authentication service unavailable in production:** configure the database, session, admin, and shared rate-limit variables listed in `.env.example`; production intentionally fails closed when required services are missing.
