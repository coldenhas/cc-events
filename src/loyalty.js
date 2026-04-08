/**
 * Loyalty integration helper
 * Calls the cc-loyalty app's internal API to award points to players.
 *
 * Required env vars:
 *   LOYALTY_API_URL    — base URL of the loyalty app Railway service
 *                        e.g. https://cluttered-collectibles-loyalty-web-production.up.railway.app
 *   LOYALTY_API_SECRET — shared secret (set same value on both services)
 */

const fetch = require('node-fetch');

const LOYALTY_URL    = process.env.LOYALTY_API_URL    || '';
const LOYALTY_SECRET = process.env.LOYALTY_API_SECRET || '';

// Point awards
const POINTS = {
  TOURNAMENT_PARTICIPATION: 500,   // just showing up and playing
  TOURNAMENT_WIN:           250,   // finishing 1st place
  TOURNAMENT_TOP3:          100,   // finishing 2nd or 3rd
  EVENT_CHECKIN:            200,   // attending a pop-up event
};

/**
 * Award points to a loyalty member by their email address.
 * Silently fails if loyalty URL not configured (standalone mode).
 *
 * @param {string} email      — player email (used to look up loyalty member)
 * @param {number} points     — points to award (positive) or deduct (negative)
 * @param {string} reason     — description shown in loyalty history
 * @returns {Promise<{success:boolean, loyaltyId?:string, error?:string}>}
 */
async function awardPointsByEmail(email, points, reason) {
  if (!LOYALTY_URL || !LOYALTY_SECRET) {
    console.log(`[loyalty] Not configured — skipping award of ${points} pts to ${email}`);
    return { success: false, error: 'Loyalty not configured' };
  }
  if (!email) {
    return { success: false, error: 'No email address for player' };
  }

  try {
    // Step 1: look up member by email
    const searchRes = await fetch(
      `${LOYALTY_URL}/api/admin/members?search=${encodeURIComponent(email)}`,
      {
        headers: {
          'x-internal-secret': LOYALTY_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchRes.ok) {
      const body = await searchRes.text();
      console.error(`[loyalty] Member search failed for ${email}: ${searchRes.status} ${body}`);
      return { success: false, error: `Member search failed: ${searchRes.status}` };
    }

    const members = await searchRes.json();
    const member = Array.isArray(members)
      ? members.find(m => m.email && m.email.toLowerCase() === email.toLowerCase())
      : null;

    if (!member) {
      console.log(`[loyalty] No loyalty member found for ${email} — skipping`);
      return { success: false, error: 'No loyalty member found' };
    }

    // Step 2: adjust points
    const adjustRes = await fetch(
      `${LOYALTY_URL}/api/admin/members/${member._id}/adjust`,
      {
        method: 'POST',
        headers: {
          'x-internal-secret': LOYALTY_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points, reason }),
      }
    );

    if (!adjustRes.ok) {
      const body = await adjustRes.text();
      console.error(`[loyalty] Points adjust failed for ${member._id}: ${adjustRes.status} ${body}`);
      return { success: false, error: `Adjust failed: ${adjustRes.status}` };
    }

    const result = await adjustRes.json();
    console.log(`[loyalty] Awarded ${points} pts to ${email} (${member._id}) — ${reason}`);
    return { success: true, loyaltyId: member._id, newBalance: result.points };

  } catch (err) {
    console.error(`[loyalty] Error awarding points to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Award tournament completion points to all registered players.
 * Runs async in background — does not block the tournament finish response.
 *
 * @param {Array}  players   — tournament players array [{playerId, name, email?}, ...]
 * @param {string} tournamentName
 * @param {Array}  standings — final standings array, sorted by place
 */
async function awardTournamentPoints(players, tournamentName, standings) {
  if (!LOYALTY_URL || !LOYALTY_SECRET) return;

  for (const player of players) {
    if (!player.email) continue;

    const place = standings.findIndex(s => s.playerId === player.playerId) + 1;
    let pts = POINTS.TOURNAMENT_PARTICIPATION;
    let reason = `Tournament participation: ${tournamentName}`;

    if (place === 1) {
      pts += POINTS.TOURNAMENT_WIN;
      reason = `1st place finish: ${tournamentName}`;
    } else if (place <= 3) {
      pts += POINTS.TOURNAMENT_TOP3;
      reason = `Top 3 finish (#${place}): ${tournamentName}`;
    }

    await awardPointsByEmail(player.email, pts, reason);
  }
}

/**
 * Award event check-in points to a player.
 */
async function awardEventCheckin(email, eventName) {
  return awardPointsByEmail(
    email,
    POINTS.EVENT_CHECKIN,
    `Event attendance: ${eventName}`
  );
}

module.exports = { awardPointsByEmail, awardTournamentPoints, awardEventCheckin, POINTS };
