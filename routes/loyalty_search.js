const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const LOYALTY_URL = process.env.LOYALTY_APP_URL || 'https://cluttered-collectibles-loyalty-web-production.up.railway.app';
const LOYALTY_SECRET = process.env.INTERNAL_API_SECRET || '';

// GET /api/loyalty/scan/:id — called when QR code is scanned
// QR encodes "cc-member:<customerId>"
router.get('/scan/:id', async (req, res) => {
  try {
    const r = await fetch(`${LOYALTY_URL}/internal/customer-by-id/${encodeURIComponent(req.params.id)}`, {
      headers: { 'x-internal-secret': LOYALTY_SECRET }
    });
    const data = await r.json();
    res.json(data);
  } catch(e) { res.json({ found: false, error: e.message }); }
});

// GET /api/loyalty/search?q= — manual lookup by email or phone
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ found: false });
  try {
    const isEmail = q.includes('@');
    const params = isEmail ? `email=${encodeURIComponent(q)}` : `phone=${encodeURIComponent(q)}`;
    const r = await fetch(`${LOYALTY_URL}/internal/customer-by-contact?${params}`, {
      headers: { 'x-internal-secret': LOYALTY_SECRET }
    });
    const data = await r.json();
    res.json(data);
  } catch(e) { res.json({ found: false, error: e.message }); }
});

module.exports = router;
