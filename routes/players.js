const express = require('express');
const router  = express.Router();
const { db }  = require('../src/database');

// GET /api/players
router.get('/', async (req, res) => {
  try {
    const { search, game, city } = req.query;
    let query = {};
    if (search) { const re = new RegExp(search,'i'); query.$or = [{name:re},{email:re},{phone:re}]; }
    if (game)   query.games = { $regex: new RegExp(game,'i') };
    if (city)   query.city  = new RegExp(city,'i');
    const players = await db.players.sort(query, { name: 1 });
    // Attach tournament count per player
    for (const pl of players) {
      const all = await db.tournaments.find({});
      pl.tournamentCount = all.filter(t => (t.players||[]).find(p => p.playerId === pl._id)).length;
    }
    res.json(players);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/players/:id
router.get('/:id', async (req, res) => {
  try {
    const player = await db.players.findOne({ _id: req.params.id });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    const all = await db.tournaments.find({});
    player.tournamentHistory = all.filter(t => (t.players||[]).find(p => p.playerId === req.params.id));
    res.json(player);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/players
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, city, games, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const created = await db.players.insert({
      name:      name.trim(),
      email:     email ? email.trim().toLowerCase() : null,
      phone:     phone ? phone.trim() : null,
      city:      city  ? city.trim()  : null,
      games:     games || [],
      notes:     notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    res.status(201).json(created);
  } catch(e) {
    if (e.message && e.message.includes('unique')) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/players/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, city, games, notes } = req.body;
    const $set = { updatedAt: new Date() };
    if (name  !== undefined) $set.name  = name.trim();
    if (email !== undefined) $set.email = email ? email.trim().toLowerCase() : null;
    if (phone !== undefined) $set.phone = phone || null;
    if (city  !== undefined) $set.city  = city  || null;
    if (games !== undefined) $set.games = games;
    if (notes !== undefined) $set.notes = notes;
    await db.players.update({ _id: req.params.id }, { $set });
    res.json(await db.players.findOne({ _id: req.params.id }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/players/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.players.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
