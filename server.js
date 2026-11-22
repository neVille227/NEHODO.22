/* NEHODO.22 — serveur Node/Express
   - sert le site public (public/)
   - sert l'espace admin (admin/) derrière un mot de passe (HTTP Basic) sur /admin
   - vérifie les paiements FedaPay côté serveur : GET /api/verifier-paiement?id=...
   Variables d'environnement : voir .env.example */
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET || '';

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

/* ---------- admin protégé ---------- */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function adminAuth(req, res, next) {
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    if (PROD) return res.status(503).type('text').send('Admin désactivé : définis ADMIN_USER et ADMIN_PASSWORD.');
    return next(); /* en local seulement */
  }
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  if (m) {
    const [u, ...rest] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
    if (safeEqual(u, ADMIN_USER) && safeEqual(rest.join(':'), ADMIN_PASSWORD)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="NEHODO.22 admin", charset="UTF-8"');
  res.status(401).type('text').send('Authentification requise.');
}
app.use('/admin', adminAuth, (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); next(); },
  express.static(path.join(__dirname, 'admin')));

/* ---------- API ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true }));

/* Vérifie auprès de FedaPay qu'une transaction est bien payée (la clé secrète ne quitte jamais le serveur). */
app.get('/api/verifier-paiement', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const id = String(req.query.id || '');
  if (!/^\d{1,18}$/.test(id)) return res.status(400).json({ status: 'invalid' });
  if (!FEDAPAY_SECRET) return res.status(503).json({ status: 'unconfigured' });
  const base = FEDAPAY_SECRET.startsWith('sk_live') ? 'https://api.fedapay.com/v1' : 'https://sandbox-api.fedapay.com/v1';
  try {
    const r = await fetch(base + '/transactions/' + id, { headers: { Authorization: 'Bearer ' + FEDAPAY_SECRET }, signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const t = j['v1/transaction'] || j.transaction || {};
    res.json({ status: t.status || 'unknown' });
  } catch (e) {
    res.status(502).json({ status: 'error' });
  }
});
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

/* ---------- site public ---------- */
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: PROD ? '1h' : 0 }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log('NEHODO.22 sur http://localhost:' + PORT + (ADMIN_PASSWORD ? '' : '  (admin sans mot de passe : local seulement)')));
