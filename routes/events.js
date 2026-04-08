const express = require('express');
const router  = express.Router();
const { db }  = require('../src/database');
const { awardEventCheckin } = require('../src/loyalty');

const STATUSES = ['planning','confirmed','active','complete','cancelled'];
const VENUES   = ['Southern Ute Rec Center','Bayfield Community Center','Other'];

// GET /api/events — upcoming first
router.get('/', async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    let all = await db.events.sort({}, { date: 1 });
    if (status)   all = all.filter(e => e.status === status);
    if (upcoming === 'true') all = all.filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)));
    // Attach tournament count
    for (const ev of all) {
      const t = await db.tournaments.find({ eventId: ev._id });
      ev.tournamentCount = t.length;
    }
    res.json(all);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  try {
    const ev = await db.events.findOne({ _id: req.params.id });
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    ev.tournaments = await db.tournaments.find({ eventId: req.params.id });
    res.json(ev);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/events
router.post('/', async (req, res) => {
  try {
    const { name, date, startTime, endTime, venue, venueCustom, game, format,
            expectedAttendance, entryFee, notes, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const ev = await db.events.insert({
      name, date: new Date(date),
      startTime: startTime||'', endTime: endTime||'',
      venue: venue === 'Other' ? (venueCustom||'') : (venue||''),
      game: game||'Other', format: format||'',
      expectedAttendance: parseInt(expectedAttendance)||0,
      entryFee: parseFloat(entryFee)||0,
      notes: notes||'',
      status: status||'planning',
      checkins: [],   // array of {playerId, name, email, checkedInAt}
      createdAt: new Date(), updatedAt: new Date(),
    });
    res.status(201).json(ev);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/events/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = ['name','startTime','endTime','venue','venueCustom','game','format','expectedAttendance','entryFee','notes','status'];
    const $set = { updatedAt: new Date() };
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        if (f === 'expectedAttendance') $set[f] = parseInt(req.body[f])||0;
        else if (f === 'entryFee')      $set[f] = parseFloat(req.body[f])||0;
        else $set[f] = req.body[f];
      }
    }
    if (req.body.date) $set.date = new Date(req.body.date);
    if (req.body.venue === 'Other' && req.body.venueCustom) $set.venue = req.body.venueCustom;
    await db.events.update({ _id: req.params.id }, { $set });
    res.json(await db.events.findOne({ _id: req.params.id }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.events.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/events/:id/checkin — check a player into an event + award loyalty points
// Body: { playerId } OR { email, name }
router.post('/:id/checkin', async (req, res) => {
  try {
    const ev = await db.events.findOne({ _id: req.params.id });
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    let playerName  = req.body.name  || null;
    let playerEmail = req.body.email || null;
    let playerId    = req.body.playerId || null;

    // If playerId supplied, look up from players db
    if (playerId) {
      const player = await db.players.findOne({ _id: playerId });
      if (!player) return res.status(404).json({ error: 'Player not found' });
      playerName  = player.name;
      playerEmail = player.email || null;
    }

    if (!playerName) return res.status(400).json({ error: 'name or playerId is required' });

    // Prevent double check-in by playerId or email
    const checkins = ev.checkins || [];
    const alreadyIn = checkins.find(c =>
      (playerId    && c.playerId === playerId) ||
      (playerEmail && c.email   === playerEmail)
    );
    if (alreadyIn) return res.status(400).json({ error: 'Already checked in' });

    const entry = {
      playerId:    playerId    || null,
      name:        playerName,
      email:       playerEmail || null,
      checkedInAt: new Date(),
    };
    checkins.push(entry);
    await db.events.update({ _id: req.params.id }, { $set: { checkins, updatedAt: new Date() } });

    // Award loyalty points in background
    if (playerEmail) {
      awardEventCheckin(playerEmail, ev.name).catch(err =>
        console.error('[loyalty] Checkin award error:', err.message)
      );
    }

    res.json({ success: true, checkin: entry, totalCheckins: checkins.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/events/:id/checkins — list all check-ins for an event
router.get('/:id/checkins', async (req, res) => {
  try {
    const ev = await db.events.findOne({ _id: req.params.id });
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    res.json(ev.checkins || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/events/:id/checkin/:playerId — undo a check-in
router.delete('/:id/checkin/:playerId', async (req, res) => {
  try {
    const ev = await db.events.findOne({ _id: req.params.id });
    if (!ev) return res.status(404).json({ error: 'Event not found' });
    const checkins = (ev.checkins||[]).filter(c => c.playerId !== req.params.playerId);
    await db.events.update({ _id: req.params.id }, { $set: { checkins, updatedAt: new Date() } });
    res.json({ success: true, totalCheckins: checkins.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
