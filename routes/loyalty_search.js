const express = require('express');
const router = express.Router();

const LOYALTY_URL = process.env.LOYALTY_APP_URL || 'https://cluttered-collectibles-loyalty-web-production.up.railway.app';
const LOYALTY_SECRET = process.env.INTERNAL_API_SECRET || '';

async function loyaltyFetch(path) {
  const fetch = require('node-fetch');
  const r = await fetch(LOYALTY_URL + path, {
    headers: { 'x-internal-secret': LOYALTY_SECRET },
  });
  return r.json();
}

// GET /api/loyalty/scan/:id
router.get('/scan/:id', async (req, res) => {
  try {
    const data = await loyaltyFetch('/internal/customer-by-id/' + encodeURIComponent(req.params.id));
    res.json(data);
  } catch(e) {
    res.json({ found: false, error: e.message });
  }
});

// GET /api/loyalty/search?q=
router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.json({ found: false });
  try {
    const isEmail = q.includes('@');
    const param = isEmail ? 'email=' + encodeURIComponent(q) : 'phone=' + encodeURIComponent(q);
    const data = await loyaltyFetch('/internal/customer-by-contact?' + param);
    res.json(data);
  } catch(e) {
    res.json({ found: false, error: e.message });
  }
});

// GET /api/players/:id/loyalty (existing route — keep working)
router.get('/player/:id', async (req, res) => {
  try {
    const data = await loyaltyFetch('/internal/customer-by-contact?email=' + encodeURIComponent(req.params.id));
    res.json(data);
  } catch(e) {
    res.json({ found: false });
  }
});

module.exports = router;
