const express = require('express');
const router  = express.Router();
const { db }  = require('../src/database');
const { awardTournamentPoints } = require('../src/loyalty');

// ── Swiss pairing engine ──────────────────────────────────────────────────────
function generatePairings(players, existingMatches) {
  const sorted = [...players].sort((a,b) => b.points !== a.points ? b.points - a.points : Math.random() - 0.5);
  const alreadyPaired = new Set(existingMatches.map(m => [m.p1Id,m.p2Id].sort().join('|')));
  const pairings = [], used = new Set();
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].playerId)) continue;
    let found = false;
    for (let j = i+1; j < sorted.length; j++) {
      if (used.has(sorted[j].playerId)) continue;
      const key = [sorted[i].playerId, sorted[j].playerId].sort().join('|');
      if (!alreadyPaired.has(key)) {
        pairings.push({ p1Id: sorted[i].playerId, p1Name: sorted[i].name, p2Id: sorted[j].playerId, p2Name: sorted[j].name });
        used.add(sorted[i].playerId); used.add(sorted[j].playerId); found = true; break;
      }
    }
    if (!found && !used.has(sorted[i].playerId)) {
      pairings.push({ p1Id: sorted[i].playerId, p1Name: sorted[i].name, p2Id: 'BYE', p2Name: 'BYE' });
      used.add(sorted[i].playerId);
    }
  }
  return pairings;
}

function calcStandings(players, matches) {
  const s = {};
  for (const p of players) s[p.playerId] = { playerId: p.playerId, name: p.name, wins: 0, losses: 0, draws: 0, points: 0 };
  for (const m of matches) {
    if (!m.result || m.result === 'pending') continue;
    if      (m.result === 'p1win') { if(s[m.p1Id]){s[m.p1Id].wins++;s[m.p1Id].points+=3;} if(s[m.p2Id]&&m.p2Id!=='BYE')s[m.p2Id].losses++; }
    else if (m.result === 'p2win') { if(s[m.p2Id]){s[m.p2Id].wins++;s[m.p2Id].points+=3;} if(s[m.p1Id])s[m.p1Id].losses++; }
    else if (m.result === 'draw')  { if(s[m.p1Id]){s[m.p1Id].draws++;s[m.p1Id].points++;} if(s[m.p2Id]&&m.p2Id!=='BYE'){s[m.p2Id].draws++;s[m.p2Id].points++;} }
    else if (m.result === 'bye')   { if(s[m.p1Id]){s[m.p1Id].wins++;s[m.p1Id].points+=3;} }
  }
  return Object.values(s).sort((a,b) => b.points - a.points || b.wins - a.wins);
}

// GET /api/tournaments
router.get('/', async (req, res) => {
  try { res.json(await db.tournaments.sort({}, { createdAt: -1 })); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/tournaments/:id
router.get('/:id', async (req, res) => {
  try {
    const t = await db.tournaments.findOne({ _id: req.params.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    const matches = await db.matches.find({ tournamentId: req.params.id });
    t.matches   = matches;
    t.standings = calcStandings(t.players||[], matches);
    res.json(t);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tournaments
router.post('/', async (req, res) => {
  try {
    const { name, format, game, entryFee, date, venue, notes, eventId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const t = await db.tournaments.insert({
      name, format: format||'Swiss', game: game||'Open',
      entryFee: parseFloat(entryFee)||0,
      date: date ? new Date(date) : new Date(),
      venue: venue||'', notes: notes||'',
      eventId: eventId||null,
      status: 'registration', currentRound: 0, players: [],
      createdAt: new Date(),
    });
    res.status(201).json(t);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/tournaments/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, format, game, entryFee, date, venue, notes } = req.body;
    const $set = { updatedAt: new Date() };
    if (name     !== undefined) $set.name     = name;
    if (format   !== undefined) $set.format   = format;
    if (game     !== undefined) $set.game     = game;
    if (entryFee !== undefined) $set.entryFee = parseFloat(entryFee)||0;
    if (date     !== undefined) $set.date     = new Date(date);
    if (venue    !== undefined) $set.venue    = venue;
    if (notes    !== undefined) $set.notes    = notes;
    await db.tournaments.update({ _id: req.params.id }, { $set });
    res.json(await db.tournaments.findOne({ _id: req.params.id }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/tournaments/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.tournaments.remove({ _id: req.params.id });
    await db.matches.remove({ tournamentId: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tournaments/:id/players — register player
router.post('/:id/players', async (req, res) => {
  try {
    const { playerId } = req.body;
    const t = await db.tournaments.findOne({ _id: req.params.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    if (t.status !== 'registration') return res.status(400).json({ error: 'Registration closed' });
    const player = await db.players.findOne({ _id: playerId });
    if (!player) return res.status(404).json({ error: 'Player not found' });
    if ((t.players||[]).find(p => p.playerId === playerId)) return res.status(400).json({ error: 'Already registered' });
    t.players.push({ playerId, name: player.name, email: player.email||null, points: 0, paid: false });
    await db.tournaments.update({ _id: req.params.id }, { $set: { players: t.players } });
    res.json(t);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/tournaments/:id/players/:playerId
router.delete('/:id/players/:playerId', async (req, res) => {
  try {
    const t = await db.tournaments.findOne({ _id: req.params.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    t.players = (t.players||[]).filter(p => p.playerId !== req.params.playerId);
    await db.tournaments.update({ _id: req.params.id }, { $set: { players: t.players } });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tournaments/:id/start
router.post('/:id/start', async (req, res) => {
  try {
    const t = await db.tournaments.findOne({ _id: req.params.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    if ((t.players||[]).length < 2) return res.status(400).json({ error: 'Need at least 2 players' });
    const pairings  = generatePairings(t.players, []);
    const matchDocs = pairings.map((pair,i) => ({
      tournamentId: req.params.id, round: 1, table: i+1,
      p1Id: pair.p1Id, p1Name: pair.p1Name, p2Id: pair.p2Id, p2Name: pair.p2Name,
      result: pair.p2Id === 'BYE' ? 'bye' : 'pending', createdAt: new Date(),
    }));
    await db.matches.insert(matchDocs);
    await db.tournaments.update({ _id: req.params.id }, { $set: { status: 'active', currentRound: 1 } });
    res.json({ round: 1, pairings: matchDocs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tournaments/:id/round — advance round
router.post('/:id/round', async (req, res) => {
  try {
    const t = await db.tournaments.findOne({ _id: req.params.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    const current = await db.matches.find({ tournamentId: req.params.id, round: t.currentRound });
    if (current.filter(m => m.result === 'pending').length > 0) return res.status(400).json({ error: 'Pending matches remain' });
    const all      = await db.matches.find({ tournamentId: req.params.id });
    const standing = calcStandings(t.players, all);
    const updated  = t.players.map(p => ({ ...p, points: (standing.find(s => s.playerId===p.playerId)||{}).points||0 }));
    const nextRound = t.currentRound + 1;
    const pairings  = generatePairings(updated, all);
    const matchDocs = pairings.map((pair,i) => ({
      tournamentId: req.params.id, round: nextRound, table: i+1,
      p1Id: pair.p1Id, p1Name: pair.p1Name, p2Id: pair.p2Id, p2Name: pair.p2Name,
      result: pair.p2Id === 'BYE' ? 'bye' : 'pending', createdAt: new Date(),
    }));
    await db.matches.insert(matchDocs);
    await db.tournaments.update({ _id: req.params.id }, { $set: { currentRound: nextRound, players: updated } });
    res.json({ round: nextRound, pairings: matchDocs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/tournaments/matches/:id — record result
router.put('/matches/:id', async (req, res) => {
  try {
    const { result } = req.body;
    if (!['p1win','p2win','draw','bye'].includes(result)) return res.status(400).json({ error: 'Invalid result' });
    await db.matches.update({ _id: req.params.id }, { $set: { result, updatedAt: new Date() } });
    res.json(await db.matches.findOne({ _id: req.params.id }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tournaments/:id/finish — complete tournament + award loyalty points
router.post('/:id/finish', async (req, res) => {
  try {
    const t = await db.tournaments.findOne({ _id: req.params.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    const all       = await db.matches.find({ tournamentId: req.params.id });
    const standings = calcStandings(t.players||[], all);
    await db.tournaments.update({ _id: req.params.id }, {
      $set: { status: 'complete', winner: standings[0]?.name, finalStandings: standings }
    });

    // Award loyalty points in background — don't block the response
    awardTournamentPoints(t.players||[], t.name, standings).catch(err =>
      console.error('[loyalty] Background award error:', err.message)
    );

    res.json({ success: true, standings });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
