const express = require('express');
const path    = require('path');
const session = require('express-session');
const app     = express();

// Railway requires PORT env var; default 8080 matches Railway's expected port
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cc-events-v2',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// CORS headers for Shopify app proxy / embedded app
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('myshopify.com') || origin.includes('shopify.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-internal-secret');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

app.use('/api/players',     require('../routes/players'));
app.use('/api/tournaments', require('../routes/tournaments'));
app.use('/api/events',      require('../routes/events'));

// Dashboard stats
app.get('/api/dashboard', async (req, res) => {
  try {
    const { db } = require('./database');
    const now    = new Date();
    const today  = new Date(now.setHours(0,0,0,0));

    const [playerCount, allEvents, allTourneys] = await Promise.all([
      db.players.count({}),
      db.events.sort({}, { date: 1 }),
      db.tournaments.sort({}, { createdAt: -1 }),
    ]);

    const upcoming  = allEvents.filter(e => new Date(e.date) >= today && e.status !== 'cancelled');
    const active    = allTourneys.filter(t => t.status === 'active');
    const nextEvent = upcoming[0] || null;

    res.json({
      playerCount,
      upcoming: upcoming.slice(0, 5),
      active,
      nextEvent,
      totalEvents:   allEvents.length,
      totalTourneys: allTourneys.length,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Health check for Railway
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'cc-events', ts: new Date().toISOString() }));

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n========================================`);
  console.log(`  Cluttered Collectibles & Comics`);
  console.log(`  Events & Tournament Manager v2.0`);
  console.log(`========================================`);
  console.log(`  Port:    ${PORT}`);
  console.log(`  Data:    ${process.env.DATA_DIR || './data'}`);
  console.log(`  Loyalty: ${process.env.LOYALTY_API_URL || '(not configured)'}`);
  console.log(`========================================\n`);
});

module.exports = app;
