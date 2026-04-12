'use strict';
const express = require('express');
const router = express.Router();

const LOYALTY_URL = process.env.LOYALTY_APP_URL || 'https://cluttered-collectibles-loyalty-web-production.up.railway.app';
const LOYALTY_SECRET = process.env.INTERNAL_API_SECRET || '';

async function loyaltyFetch(path) {
  const fetch = (await import('node-fetch')).default;
  const r = await fetch(LOYALTY_URL + path, {
    headers: { 'x-internal-secret': LOYALTY_SECRET },
  });
  if (!r.ok) return { found: false };
  return r.json();
}

// GET /api/loyalty/scan/:id — QR code scan lookup
router.get('/scan/:id', async (req, res) => {
  try {
    const data = await loyaltyFetch('/internal/customer-by-id/' + encodeURIComponent(req.params.id));
    res.json(data);
  } catch(e) {
    res.json({ found: false, error: e.message });
  }
});

// GET /api/loyalty/search?q= — manual lookup by email or phone
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ found: false, members: [] });
  try {
    const isEmail = q.includes('@');
    const param = isEmail ? 'email=' + encodeURIComponent(q) : 'phone=' + encodeURIComponent(q);
    const data = await loyaltyFetch('/internal/customer-by-contact?' + param);
    // Return in format expected by events app
    if (data.found) {
      res.json({ found: true, members: [data], ...data });
    } else {
      res.json({ found: false, members: [] });
    }
  } catch(e) {
    res.json({ found: false, members: [], error: e.message });
  }
});

module.exports = router;
