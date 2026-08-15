import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
app.get('/config.js', (_req, res) => {
  res.type('application/javascript').send(`window.SALONMATE_CONFIG = ${JSON.stringify({
    googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  })};`);
});
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.use(express.static(__dirname));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'SalonMate' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(port, () => console.log(`SalonMate running on ${port}`));
