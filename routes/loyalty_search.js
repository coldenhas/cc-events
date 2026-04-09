const express = require('express');
const router  = express.Router();
const fetch   = require('node-fetch');

const LOYALTY_URL    = process.env.LOYALTY_API_URL    || '';
const LOYALTY_SECRET = process.env.LOYALTY_API_SECRET || '';

// GET /api/loyalty/search?q=searchterm
// Searches loyalty members and returns them formatted for tournament registration
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  if (!LOYALTY_URL || !LOYALTY_SECRET) return res.json([]);

  try {
    const response = await fetch(
      `${LOYALTY_URL}/api/admin/members?search=${encodeURIComponent(q)}`,
      { headers: { 'x-internal-secret': LOYALTY_SECRET } }
    );
    if (!response.ok) return res.json([]);

    const members = await response.json();
    // Return in a format usable by tournament registration
    const results = members.map(m => ({
      _id:     m._id,
      name:    [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email || 'Unknown',
      email:   m.email || null,
      balance: m.balance || 0,
      tier:    m.tier || null,
      source:  'loyalty',
    }));
    res.json(results);
  } catch (err) {
    console.error('[loyalty-search]', err.message);
    res.json([]);
  }
});

module.exports = router;
