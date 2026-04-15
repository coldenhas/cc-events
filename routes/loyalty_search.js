'use strict';
const express = require('express');
const router = express.Router();

const LOYALTY_URL = process.env.LOYALTY_APP_URL || 'https://cluttered-collectibles-loyalty-web-production.up.railway.app';
const LOYALTY_SECRET = process.env.INTERNAL_API_SECRET || '';

async function loyaltyFetch(path) {
  const fetch = (await import('node-fetch')).default;
  console.log('[loyalty] fetching:', LOYALTY_URL + path, 'secret set:', !!LOYALTY_SECRET);
  const r = await fetch(LOYALTY_URL + path, {
    headers: { 'x-internal-secret': LOYALTY_SECRET },
  });
  const text = await r.text();
  console.log('[loyalty] response:', r.status, text.slice(0, 200));
  try { return JSON.parse(text); } catch(e) { return { found: false, error: text }; }
}

router.get('/scan/:id', async (req, res) => {
  try {
    const data = await loyaltyFetch('/internal/customer-by-id/' + encodeURIComponent(req.params.id));
    res.json(data);
  } catch(e) {
    console.error('[loyalty/scan] error:', e.message);
    res.json({ found: false, error: e.message });
  }
});

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ found: false, members: [] });
  try {
    const isEmail = q.includes('@');
    const param = isEmail ? 'email=' + encodeURIComponent(q) : 'phone=' + encodeURIComponent(q);
    const data = await loyaltyFetch('/internal/customer-by-contact?' + param);
    if (data.found) {
      res.json({ found: true, members: [data], ...data });
    } else {
      res.json({ found: false, members: [] });
    }
  } catch(e) {
    res.json({ found: false, members: [], error: e.message });
  }
});

// POST /api/loyalty/redeem — proxies to loyalty app to generate discount code
router.post('/redeem', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const r = await fetch(LOYALTY_URL + '/internal/generate-discount', {
      method: 'POST',
      headers: { 'x-internal-secret': LOYALTY_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    try { res.json(JSON.parse(text)); } catch(e) { res.json({ success: false, error: text }); }
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// POST /api/loyalty/tier-discount — proxies to loyalty app for % tier discount code (no points deducted)
router.post('/tier-discount', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const r = await fetch(LOYALTY_URL + '/internal/generate-tier-discount', {
      method: 'POST',
      headers: { 'x-internal-secret': LOYALTY_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    try { res.json(JSON.parse(text)); } catch(e) { res.json({ success: false, error: text }); }
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

// POST /api/loyalty/combined-discount — tier % + points in one Shopify code
router.post('/combined-discount', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const r = await fetch(LOYALTY_URL + '/internal/generate-combined-discount', {
      method: 'POST',
      headers: { 'x-internal-secret': LOYALTY_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const text = await r.text();
    try { res.json(JSON.parse(text)); } catch(e) { res.json({ success: false, error: text }); }
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
