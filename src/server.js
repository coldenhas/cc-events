const express = require('express');
const path    = require('path');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const crypto  = require('crypto');
const app     = express();

const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cc-events-v2-' + crypto.randomBytes(8).toString('hex'),
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({ checkPeriod: 86400000 }), // prune expired every 24h
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-internal-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// ── Auth endpoints (public) ───────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  if (password !== adminPassword) return res.status(401).json({ error: 'Invalid password' });
  req.session.authenticated = true;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/auth-check', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
};

// ── Protected routes ──────────────────────────────────────────────────────────
app.use('/api/players',     requireAuth, require('../routes/players'));
app.use('/api/tournaments', requireAuth, require('../routes/tournaments'));
app.use('/api/events',      requireAuth, require('../routes/events'));
app.use('/api/loyalty',     requireAuth, require('../routes/loyalty_search'));

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const { db } = require('./database');
    const now   = new Date();
    const today = new Date(now.setHours(0,0,0,0));
    const [playerCount, allEvents, allTourneys] = await Promise.all([
      db.players.count({}),
      db.events.sort({}, { date: 1 }),
      db.tournaments.sort({}, { createdAt: -1 }),
    ]);
    const upcoming  = allEvents.filter(e => new Date(e.date) >= today && e.status !== 'cancelled');
    const active    = allTourneys.filter(t => t.status === 'active');
    const nextEvent = upcoming[0] || null;
    res.json({ playerCount, upcoming: upcoming.slice(0,5), active, nextEvent, totalEvents: allEvents.length, totalTourneys: allTourneys.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'cc-events', ts: new Date().toISOString() }));

app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  CC Events & Tournament Manager v2.0`);
  console.log(`  Port:    ${PORT}`);
  console.log(`  Data:    ${process.env.DATA_DIR || './data'}`);
  console.log(`  Loyalty: ${process.env.LOYALTY_API_URL || '(not configured)'}`);
  console.log(`========================================\n`);
});

module.exports = app;
