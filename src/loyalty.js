const fetch = require('node-fetch');

const LOYALTY_URL    = process.env.LOYALTY_API_URL    || '';
const LOYALTY_SECRET = process.env.LOYALTY_API_SECRET || '';

const POINTS = {
  TOURNAMENT_PARTICIPATION: 500,
  TOURNAMENT_WIN:           250,
  TOURNAMENT_TOP3:          100,
  EVENT_CHECKIN:            200,
};

/**
 * Look up a loyalty member by email.
 * Returns member object with balance and tier, or null if not found.
 */
async function lookupMemberByEmail(email) {
  if (!LOYALTY_URL || !LOYALTY_SECRET || !email) return null;
  try {
    const res = await fetch(
      `${LOYALTY_URL}/api/admin/members?search=${encodeURIComponent(email)}`,
      { headers: { 'x-internal-secret': LOYALTY_SECRET } }
    );
    if (!res.ok) return null;
    const members = await res.json();
    return Array.isArray(members)
      ? (members.find(m => m.email && m.email.toLowerCase() === email.toLowerCase()) || null)
      : null;
  } catch (err) {
    console.error(`[loyalty] Lookup error for ${email}:`, err.message);
    return null;
  }
}

async function awardPointsByEmail(email, points, reason) {
  if (!LOYALTY_URL || !LOYALTY_SECRET) {
    console.log(`[loyalty] Not configured — skipping award of ${points} pts to ${email}`);
    return { success: false, error: 'Loyalty not configured' };
  }
  if (!email) return { success: false, error: 'No email address for player' };

  try {
    const member = await lookupMemberByEmail(email);
    if (!member) {
      console.log(`[loyalty] No loyalty member found for ${email} — skipping`);
      return { success: false, error: 'No loyalty member found' };
    }

    const adjustRes = await fetch(
      `${LOYALTY_URL}/api/admin/members/${member._id}/adjust`,
      {
        method: 'POST',
        headers: { 'x-internal-secret': LOYALTY_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, reason }),
      }
    );

    if (!adjustRes.ok) {
      const body = await adjustRes.text();
      console.error(`[loyalty] Adjust failed for ${member._id}: ${adjustRes.status} ${body}`);
      return { success: false, error: `Adjust failed: ${adjustRes.status}` };
    }

    const result = await adjustRes.json();
    console.log(`[loyalty] Awarded ${points} pts to ${email} (${member._id}) — ${reason}`);
    return { success: true, loyaltyId: member._id, newBalance: result.newBalance };

  } catch (err) {
    console.error(`[loyalty] Error awarding points to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function awardTournamentPoints(players, tournamentName, standings) {
  if (!LOYALTY_URL || !LOYALTY_SECRET) return;
  for (const player of players) {
    if (!player.email) continue;
    const place = standings.findIndex(s => s.playerId === player.playerId) + 1;
    let pts = POINTS.TOURNAMENT_PARTICIPATION;
    let reason = `Tournament participation: ${tournamentName}`;
    if (place === 1) { pts += POINTS.TOURNAMENT_WIN; reason = `1st place finish: ${tournamentName}`; }
    else if (place <= 3) { pts += POINTS.TOURNAMENT_TOP3; reason = `Top 3 finish (#${place}): ${tournamentName}`; }
    await awardPointsByEmail(player.email, pts, reason);
  }
}

async function awardEventCheckin(email, eventName) {
  return awardPointsByEmail(email, POINTS.EVENT_CHECKIN, `Event attendance: ${eventName}`);
}

module.exports = { lookupMemberByEmail, awardPointsByEmail, awardTournamentPoints, awardEventCheckin, POINTS };