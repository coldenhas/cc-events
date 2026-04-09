// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  try {
    const d = await api.get('/api/dashboard');
    const next = d.nextEvent;
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Dashboard</div><div class="page-sub">Cluttered Collectibles & Comics LLC — Ignacio, CO / Southern Ute Region</div></div>
        <div class="flex gap-8">
          <button class="btn btn-primary" onclick="navigate('players');setTimeout(openAddPlayer,80)">+ Player</button>
          <button class="btn btn-ghost"   onclick="navigate('events');setTimeout(openAddEvent,80)">+ Event</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card gold">  <div class="stat-label">Players</div>      <div class="stat-value">${d.playerCount}</div>    <div class="stat-sub">In database</div></div>
        <div class="stat-card blue">  <div class="stat-label">Events Planned</div><div class="stat-value">${d.upcoming.length}</div><div class="stat-sub">Upcoming</div></div>
        <div class="stat-card red">   <div class="stat-label">Active Tournaments</div><div class="stat-value">${d.active.length}</div><div class="stat-sub">Running now</div></div>
        <div class="stat-card green"> <div class="stat-label">Total Events Run</div><div class="stat-value">${d.totalEvents}</div>  <div class="stat-sub">All time</div></div>
      </div>

      ${next ? `
      <div class="card mb-16" style="border-left:4px solid var(--gold)">
        <div class="flex-between">
          <div>
            <div class="card-title">NEXT EVENT</div>
            <div style="font-size:20px;font-weight:800;color:var(--white)">${next.name}</div>
            <div class="text-muted mt-8">${fmtDay(next.date)} ${next.startTime ? '· '+next.startTime : ''} ${next.venue ? '· '+next.venue : ''}</div>
            <div class="mt-8">${statusBadge(next.status)} ${gameBadge(next.game)} ${daysTag(next.date)}</div>
          </div>
          <button class="btn btn-primary" onclick="navigate('events')">View →</button>
        </div>
      </div>` : `<div class="card mb-16" style="border-left:4px solid var(--border)"><div class="text-muted">No upcoming events — <a href="#" onclick="navigate('events');setTimeout(openAddEvent,80)" style="color:var(--gold)">schedule one</a></div></div>`}

      <div class="two-col">
        <div class="card">
          <div class="card-title">Upcoming Events</div>
          ${d.upcoming.length === 0 ? '<div class="text-muted">None scheduled</div>' :
            d.upcoming.map(e => `
            <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:600">${e.name}</div>
                <div class="text-muted">${fmtDay(e.date)} ${e.startTime ? '· '+e.startTime : ''}</div>
              </div>
              <div class="flex gap-8">${daysTag(e.date)} ${statusBadge(e.status)}</div>
            </div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title">Active Tournaments</div>
          ${d.active.length === 0 ? '<div class="text-muted">None running</div>' :
            d.active.map(t => `
            <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:600">${t.name}</div>
                <div class="text-muted">Round ${t.currentRound} · ${t.players?.length||0} players · ${t.game}</div>
              </div>
              <button class="btn btn-sm btn-primary" onclick="navigate('tournaments')">Manage →</button>
            </div>`).join('')}
        </div>
      </div>`;
  } catch(e) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div>${e.message}</div></div>`; }
}

// ════════════════════════════════════════════════════════════════════════════
// PLAYERS
// ════════════════════════════════════════════════════════════════════════════
async function renderPlayersResults(search='', gameFilter='') {
  const params = new URLSearchParams();
  if (search)     params.set('search', search);
  if (gameFilter) params.set('game', gameFilter);
  const resultsEl = document.getElementById('pl-results');
  if (!resultsEl) return;
  try {
    const players = await api.get('/api/players?' + params);
    const sub = document.querySelector('.page-sub');
    if (sub) sub.textContent = players.length + ' in database';
    resultsEl.innerHTML = players.length === 0
      ? `<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No players found</div><div class="empty-sub">Add your first player to get started</div></div>`
      : `<div class="table-wrap"><table>
          <thead><tr><th>Player</th><th>Games</th><th>City</th><th>Phone</th><th>Events</th><th>Joined</th><th></th></tr></thead>
          <tbody>${players.map(p=>`
            <tr>
              <td><div class="player-name-cell">
                <div class="player-avatar">${initials(p.name)}</div>
                <div><div style="font-weight:600">${p.name}</div><div class="text-muted">${p.email||''}</div></div>
              </div></td>
              <td>${(p.games||[]).map(gameBadge).join(' ')||'—'}</td>
              <td class="text-muted">${p.city||'—'}</td>
              <td class="text-muted">${p.phone||'—'}</td>
              <td><span class="badge badge-blue">${p.tournamentCount||0}</span></td>
              <td class="text-muted">${fmtDate(p.createdAt)}</td>
              <td><div class="td-actions">
                <button class="btn btn-sm btn-ghost btn-icon" onclick="openPlayerProfile('${p._id}')" title="View">👁</button>
                <button class="btn btn-sm btn-ghost btn-icon" onclick="openEditPlayer('${p._id}')" title="Edit">✏️</button>
                <button class="btn btn-sm btn-danger btn-icon" onclick="deletePlayer('${p._id}','${p.name}')" title="Delete">🗑</button>
              </div></td>
            </tr>`).join('')}
          </tbody></table></div>`;
  } catch(e) { resultsEl.innerHTML = `<div class="empty-state"><div>${e.message}</div></div>`; }
}

async function loadPlayers(search='', gameFilter='') {
  const el = document.getElementById('page-players');

  if (!document.getElementById('pl-search')) {
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Players</div><div class="page-sub">Loading...</div></div>
        <button class="btn btn-primary" onclick="openAddPlayer()">+ Add Player</button>
      </div>
      <div class="search-bar">
        <input type="text" id="pl-search" placeholder="Search by name, email, or phone..." autocomplete="off">
        <select id="pl-game">
          <option value="">All Games</option>
          ${GAMES.map(g=>`<option value="${g}">${g}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="pl-search-btn">Search</button>
        <button class="btn btn-ghost" id="pl-clear-btn">Clear</button>
      </div>
      <div id="pl-results"></div>`;

    const input  = document.getElementById('pl-search');
    const select = document.getElementById('pl-game');
    const btn    = document.getElementById('pl-search-btn');
    const clear  = document.getElementById('pl-clear-btn');

    // Search on button click
    btn.addEventListener('click', () => renderPlayersResults(input.value, select.value));

    // Search on Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') renderPlayersResults(input.value, select.value);
    });

    // Clear resets and reloads all
    clear.addEventListener('click', () => {
      input.value = '';
      select.value = '';
      renderPlayersResults('', '');
    });

    // Game filter applies immediately on change
    select.addEventListener('change', () => renderPlayersResults(input.value, select.value));
  }

  if (search     && document.getElementById('pl-search')) document.getElementById('pl-search').value = search;
  if (gameFilter && document.getElementById('pl-game'))   document.getElementById('pl-game').value   = gameFilter;

  await renderPlayersResults(search, gameFilter);
}

function playerForm(p={}) {
  return `<form onsubmit="savePlayer(event,'${p._id||''}')">
    <div class="form-grid">
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input name="name" value="${p.name||''}" required placeholder="Player name"></div>
        <div class="form-group"><label>Email</label><input name="email" type="email" value="${p.email||''}" placeholder="email@example.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Phone</label><input name="phone" value="${p.phone||''}" placeholder="(970) 555-5555"></div>
        <div class="form-group"><label>City</label><input name="city" value="${p.city||''}" placeholder="Ignacio, Bayfield, Durango..."></div>
      </div>
      <div class="form-group"><label>Games Played</label>
        <div class="checkbox-group">
          ${GAMES.map(g=>`<label class="checkbox-item"><input type="checkbox" name="games" value="${g}" ${(p.games||[]).includes(g)?'checked':''}> ${g}</label>`).join('')}
        </div>
      </div>
      <div class="form-group"><label>Notes</label><textarea name="notes" placeholder="Any notes...">${p.notes||''}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${p._id ? 'Save Changes' : 'Add Player'}</button>
      </div>
    </div>
  </form>`;
}

function openAddPlayer() { openModal('Add Player', playerForm()); }
async function openEditPlayer(id) { const p=await api.get(`/api/players/${id}`); openModal('Edit Player', playerForm(p)); }

async function savePlayer(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = { name:fd.get('name'), email:fd.get('email'), phone:fd.get('phone'), city:fd.get('city'), notes:fd.get('notes'), games:fd.getAll('games') };
  try {
    id ? await api.put(`/api/players/${id}`,data) : await api.post('/api/players',data);
    closeModal(); toast(id?'Player updated':'Player added'); loadPlayers();
  } catch(e) { toast(e.message,'error'); }
}

async function deletePlayer(id, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  try { await api.delete(`/api/players/${id}`); toast('Player deleted'); loadPlayers(); }
  catch(e) { toast(e.message,'error'); }
}

async function openPlayerProfile(id) {
  const [p, loyalty] = await Promise.all([
    api.get(`/api/players/${id}`),
    api.get(`/api/players/${id}/loyalty`).catch(() => ({ found: false })),
  ]);

  const loyaltyHTML = loyalty.found
    ? `<div class="card mb-16" style="border-left:3px solid ${loyalty.tier?.color||'#f5c518'}">
        <div class="flex-between">
          <div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Loyalty Member</div>
            <div style="font-size:22px;font-weight:800;color:#f5c518">${loyalty.balance?.toLocaleString()} pts</div>
            <div style="font-size:12px;margin-top:2px">${loyalty.tier?.icon||''} <strong>${loyalty.tier?.name||''}</strong> · ${loyalty.tier?.pointsPerDollar||0} pts/$1</div>
          </div>
          <div style="text-align:right;font-size:12px;color:var(--text-muted)">
            ${loyalty.tier?.nextTier ? `<div>${loyalty.tier.pointsToNext?.toLocaleString()} pts to ${loyalty.tier.nextTier.icon} ${loyalty.tier.nextTier.name}</div>` : '<div style="color:#f5c518">Top tier! 👑</div>'}
          </div>
        </div>
      </div>`
    : `<div class="card mb-16" style="border-left:3px solid var(--border)">
        <div style="font-size:12px;color:var(--text-muted)">
          ${p.email ? '⚠ Not a loyalty member — ask them to sign up at clutteredcollectibles.com' : '⚠ No email on file — add email to enable loyalty lookup'}
        </div>
      </div>`;

  openModal(p.name, `
    <div class="flex-between mb-16">
      <div class="flex-center">
        <div class="player-avatar" style="width:48px;height:48px;font-size:18px">${initials(p.name)}</div>
        <div><div style="font-size:18px;font-weight:700">${p.name}</div><div class="text-muted">${p.email||'No email'}</div></div>
      </div>
    </div>
    ${loyaltyHTML}
    <div class="two-col mb-16">
      <div><div class="text-muted">Phone</div><div>${p.phone||'—'}</div></div>
      <div><div class="text-muted">City</div><div>${p.city||'—'}</div></div>
      <div><div class="text-muted">Joined</div><div>${fmtDate(p.createdAt)}</div></div>
      <div><div class="text-muted">Tournaments</div><div>${p.tournamentHistory?.length||0}</div></div>
    </div>
    <div class="text-muted mb-16">Games: ${(p.games||[]).map(gameBadge).join(' ')||'—'}</div>
    ${p.notes ? `<div class="card mb-16"><div class="card-title">Notes</div><div style="font-size:13px">${p.notes}</div></div>` : ''}
    <div class="section-title">Tournament History</div>
    ${(p.tournamentHistory||[]).length===0 ? '<div class="text-muted">No tournaments yet</div>' :
      p.tournamentHistory.map(t=>`
        <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div><div style="font-weight:600">${t.name}</div><div class="text-muted">${gameBadge(t.game)} ${fmtDate(t.date)}</div></div>
          ${statusBadge(t.status)}
        </div>`).join('')}
    <div class="form-actions mt-16">
      <button class="btn btn-ghost" onclick="openEditPlayer('${id}');closeModal()">Edit Player</button>
    </div>`);
}

// ════════════════════════════════════════════════════════════════════════════
// TOURNAMENTS
// ════════════════════════════════════════════════════════════════════════════
async function loadTournaments() {
  const el = document.getElementById('page-tournaments');
  try {
    const all = await api.get('/api/tournaments');
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Tournaments</div><div class="page-sub">${all.length} total</div></div>
        <button class="btn btn-primary" onclick="openAddTournament()">+ New Tournament</button>
      </div>
      ${all.length===0 ? `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No tournaments yet</div><div class="empty-sub">Create your first event tournament</div></div>` : `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Game</th><th>Format</th><th>Players</th><th>Round</th><th>Entry</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>${all.map(t=>`
            <tr>
              <td style="font-weight:600">${t.name}</td>
              <td>${gameBadge(t.game)}</td>
              <td class="text-muted">${t.format}</td>
              <td>${t.players?.length||0}</td>
              <td>${t.currentRound||0}</td>
              <td>${fmt$(t.entryFee)}</td>
              <td class="text-muted">${fmtDate(t.date)}</td>
              <td>${statusBadge(t.status)}</td>
              <td><div class="td-actions">
                <button class="btn btn-sm btn-primary" onclick="openTournamentManager('${t._id}')">Manage →</button>
                <button class="btn btn-sm btn-danger btn-icon" onclick="deleteTournament('${t._id}','${t.name}')">🗑</button>
              </div></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;
  } catch(e) { el.innerHTML=`<div class="empty-state"><div>${e.message}</div></div>`; }
}

function tournamentForm(t={}) {
  const today = new Date().toISOString().split('T')[0];
  return `<form onsubmit="saveTournament(event,'${t._id||''}')">
    <div class="form-grid">
      <div class="form-group"><label>Tournament Name *</label><input name="name" value="${t.name||''}" required placeholder="e.g. Weekly Pokémon Standard"></div>
      <div class="form-row">
        <div class="form-group"><label>Game</label><select name="game">${['Pokemon','Magic: The Gathering','One Piece','Yu-Gi-Oh','Warhammer','Open Format'].map(g=>`<option ${t.game===g?'selected':''}>${g}</option>`).join('')}</select></div>
        <div class="form-group"><label>Format</label><select name="format">${['Swiss','Swiss + Top 4','Swiss + Top 8','Round Robin','Single Elimination'].map(f=>`<option ${t.format===f?'selected':''}>${f}</option>`).join('')}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Entry Fee ($)</label><input name="entryFee" type="number" min="0" step="0.01" value="${t.entryFee||0}"></div>
        <div class="form-group"><label>Date</label><input name="date" type="date" value="${t.date?new Date(t.date).toISOString().split('T')[0]:today}"></div>
      </div>
      <div class="form-group"><label>Venue</label><input name="venue" value="${t.venue||''}" placeholder="Southern Ute Rec Center..."></div>
      <div class="form-group"><label>Notes</label><textarea name="notes">${t.notes||''}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${t._id?'Save Changes':'Create Tournament'}</button>
      </div>
    </div>
  </form>`;
}

function openAddTournament()       { openModal('New Tournament', tournamentForm()); }
async function openEditTournament(id) { const t=await api.get(`/api/tournaments/${id}`); openModal('Edit Tournament', tournamentForm(t)); }

async function saveTournament(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    id ? await api.put(`/api/tournaments/${id}`,data) : await api.post('/api/tournaments',data);
    closeModal(); toast(id?'Tournament updated':'Tournament created'); loadTournaments();
  } catch(e) { toast(e.message,'error'); }
}

async function deleteTournament(id, name) {
  if (!confirm(`Delete ${name} and all its match data?`)) return;
  try { await api.delete(`/api/tournaments/${id}`); toast('Tournament deleted'); loadTournaments(); }
  catch(e) { toast(e.message,'error'); }
}

async function openTournamentManager(id) {
  const t = await api.get(`/api/tournaments/${id}`);
  const currentMatches = (t.matches||[]).filter(m => m.round===t.currentRound);
  const pending = currentMatches.filter(m => m.result==='pending').length;

  openModal(t.name, `
    <div class="flex-between mb-16">
      <div class="flex gap-8">${statusBadge(t.status)} ${gameBadge(t.game)}</div>
      <div class="text-muted">Round ${t.currentRound} · ${t.players?.length||0} players</div>
    </div>

    ${t.status==='registration' ? `
      <div class="section-title">Register Players</div>
      <div class="input-group mb-8">
        <input type="text" id="ts-search" placeholder="Search player to add..." autocomplete="off">
        <button class="btn btn-primary" id="ts-search-btn">Search</button>
      </div>
      <div id="ts-results" class="mb-16"></div>
      <div class="section-title">Registered (${t.players?.length||0})</div>
      <div id="ts-registered-list">
      ${(t.players||[]).map(p=>`
        <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <span style="font-weight:600">${p.name}</span>
            ${p.email ? `<span class="loyalty-badge-inline" id="loy-${p.playerId}" style="font-size:11px;color:#888;margin-left:8px">loading...</span>` : ''}
          </div>
          <button class="btn btn-sm btn-danger" onclick="removeTourneyPlayer('${id}','${p.playerId}')">Remove</button>
        </div>`).join('')||'<div class="text-muted">None yet</div>'}
      </div>
      <div class="form-actions mt-16">
        <button class="btn btn-ghost" onclick="openEditTournament('${id}')">Edit Details</button>
        <button class="btn btn-success" onclick="startTournament('${id}')" ${(t.players?.length||0)<2?'disabled title="Need 2+ players"':''}>Start Tournament →</button>
      </div>` : ''}

    ${t.status==='active' ? `
      <div class="section-title">Round ${t.currentRound} — ${pending>0?`<span class="badge badge-red">${pending} pending</span>`:'<span class="badge badge-green">All done</span>'}</div>
      ${currentMatches.map(m=>`
        <div class="match-card">
          <div class="match-table-num">Table ${m.table}</div>
          <div class="match-vs">
            <div class="match-player ${m.result==='p1win'?'winner':m.result==='p2win'?'loser':''}" onclick="recordResult('${m._id}','p1win','${id}')">${m.p1Name}</div>
            <div class="match-vs-label">vs</div>
            <div class="match-player ${m.result==='p2win'?'winner':m.result==='p1win'?'loser':''}${m.p2Id==='BYE'?' bye-player':''}" onclick="${m.p2Id!=='BYE'?`recordResult('${m._id}','p2win','${id}')`:''}">${m.p2Name}</div>
          </div>
          ${m.result!=='pending'?`<div style="text-align:center;font-size:12px;color:var(--green);margin-top:6px">✓ ${m.result==='p1win'?m.p1Name:m.result==='p2win'?m.p2Name:m.result==='bye'?'BYE':'Draw'}</div>`:''}
        </div>`).join('')}
      <div class="form-actions mt-8">
        <button class="btn btn-primary" onclick="nextRound('${id}')" ${pending>0?'disabled':''}>Next Round →</button>
        <button class="btn btn-success" onclick="finishTournament('${id}')" ${pending>0?'disabled':''}>Finish & Record</button>
      </div>` : ''}

    <div class="section-title mt-16">Standings</div>
    ${(t.standings||[]).length===0 ? '<div class="text-muted">No results yet</div>' :
      t.standings.map((s,i)=>`
        <div class="flex-between" style="padding:8px 0;border-bottom:1px solid var(--border)">
          <div class="flex-center">
            <div class="standings-rank ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-other'}">${i+1}</div>
            <strong>${s.name}</strong>
          </div>
          <div class="text-muted">${s.wins}W/${s.losses}L/${s.draws}D = <strong style="color:var(--gold)">${s.points}pts</strong></div>
        </div>`).join('')}`);

  // Load loyalty balances for registered players after modal renders
  if (t.status === 'registration' && t.players?.length) {
    setTimeout(() => loadTourneyLoyalty(t.players), 80);
  }

  // Attach search input listener after modal renders
  if (t.status === 'registration') {
    setTimeout(() => {
      const input = document.getElementById('ts-search');
      const btn   = document.getElementById('ts-search-btn');
      if (!input) return;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchForTourney(id, input.value);
      });
      if (btn) btn.addEventListener('click', () => searchForTourney(id, input.value));
      input.focus();
    }, 50);
  }
}

async function searchForTourney(id, search) {
  if (!search || search.length < 2) return;
  const el = document.getElementById('ts-results');
  el.innerHTML = '<div class="text-muted">Searching...</div>';

  const members = await api.get(`/api/loyalty/search?q=${encodeURIComponent(search)}`);

  if (!members.length) {
    el.innerHTML = '<div class="text-muted">No loyalty members found</div>';
    return;
  }

  el.innerHTML = members.slice(0, 8).map(m => {
    const loyBadge = m.tier
      ? `<span style="font-size:11px;color:#f5c518;margin-left:6px">${m.tier.icon||''} ${m.balance?.toLocaleString()} pts · ${m.tier.name}</span>`
      : '';
    return `
    <div class="flex-between" style="padding:6px 8px;background:var(--bg3);border-radius:6px;margin-bottom:4px">
      <div>
        <span style="font-weight:600">${m.name}</span>
        <span class="text-muted" style="font-size:12px;margin-left:6px">${m.email||''}</span>
        ${loyBadge}
      </div>
      <button class="btn btn-sm btn-primary" onclick="addLoyaltyMemberToTourney('${id}','${m._id}','${m.name.replace(/'/g,"\\'")}','${m.email||''}')">Add</button>
    </div>`;
  }).join('');
}

async function loadTourneyLoyalty(players) {
  for (const p of players) {
    if (!p.email) continue;
    // Don't run if user is typing in the search box
    if (document.activeElement && document.activeElement.id === 'ts-search') continue;
    const el = document.getElementById(`loy-${p.playerId}`);
    if (!el) continue;
    try {
      const loy = await api.get(`/api/players/${p.playerId}/loyalty`).catch(() => ({ found: false }));
      // Re-check focus after async call returns
      if (document.activeElement && document.activeElement.id === 'ts-search') continue;
      if (loy.found) {
        el.innerHTML = `${loy.tier?.icon||''} <strong style="color:#f5c518">${loy.balance?.toLocaleString()} pts</strong> · ${loy.tier?.name||''}`;
      } else {
        el.innerHTML = '<span style="color:#555">no loyalty account</span>';
      }
    } catch(e) { el.innerHTML = ''; }
  }
}

async function addLoyaltyMemberToTourney(tid, loyaltyId, name, email) {
  try {
    // Register directly using loyalty member data
    await api.post(`/api/tournaments/${tid}/players`, { loyaltyId, name, email });
    toast(`${name} added`);
    document.getElementById('ts-results').innerHTML = '';
    document.getElementById('ts-search').value = '';
    openTournamentManager(tid);
  } catch(e) { toast(e.message, 'error'); }
}

async function addTourneyPlayer(tid, pid)    { try { await api.post(`/api/tournaments/${tid}/players`,{playerId:pid}); toast('Player added'); openTournamentManager(tid); } catch(e) { toast(e.message,'error'); } }
async function removeTourneyPlayer(tid, pid) { try { await api.delete(`/api/tournaments/${tid}/players/${pid}`);      openTournamentManager(tid); } catch(e) { toast(e.message,'error'); } }
async function startTournament(id)  { try { await api.post(`/api/tournaments/${id}/start`);  toast('Tournament started!'); openTournamentManager(id); } catch(e) { toast(e.message,'error'); } }
async function recordResult(mid, result, tid) { try { await api.put(`/api/tournaments/matches/${mid}`,{result}); openTournamentManager(tid); } catch(e) { toast(e.message,'error'); } }
async function nextRound(id)        { try { await api.post(`/api/tournaments/${id}/round`);  toast('Next round started'); openTournamentManager(id); } catch(e) { toast(e.message,'error'); } }
async function finishTournament(id) {
  if (!confirm('Finish tournament and record final standings?')) return;
  try { const r=await api.post(`/api/tournaments/${id}/finish`); toast(`Complete! Winner: ${r.standings[0]?.name}`); closeModal(); loadTournaments(); }
  catch(e) { toast(e.message,'error'); }
}

// ════════════════════════════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════════════════════════════
const EVENT_STATUSES = ['planning','confirmed','active','complete','cancelled'];
const VENUES = ['Southern Ute Rec Center','Bayfield Community Center','Other'];

async function loadEvents() {
  const el = document.getElementById('page-events');
  try {
    const all = await api.get('/api/events');
    const upcoming = all.filter(e => daysUntil(e.date) >= 0 && e.status !== 'cancelled');
    const past     = all.filter(e => daysUntil(e.date) < 0 || e.status === 'complete');

    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">Events</div><div class="page-sub">${upcoming.length} upcoming · ${past.length} past</div></div>
        <button class="btn btn-primary" onclick="openAddEvent()">+ Schedule Event</button>
      </div>

      ${upcoming.length===0&&past.length===0 ? `<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-title">No events yet</div><div class="empty-sub">Schedule your first pop-up event</div></div>` : ''}

      ${upcoming.length > 0 ? `
        <div class="section-title">Upcoming Events</div>
        <div class="events-grid">${upcoming.map(e => eventCard(e)).join('')}</div>` : ''}

      ${past.length > 0 ? `
        <div class="section-title mt-24">Past Events</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Event</th><th>Game</th><th>Date</th><th>Venue</th><th>Status</th><th></th></tr></thead>
            <tbody>${past.map(e=>`
              <tr>
                <td style="font-weight:600">${e.name}</td>
                <td>${gameBadge(e.game)}</td>
                <td class="text-muted">${fmtDate(e.date)}</td>
                <td class="text-muted">${e.venue||'—'}</td>
                <td>${statusBadge(e.status)}</td>
                <td><div class="td-actions">
                  <button class="btn btn-sm btn-ghost btn-icon" onclick="openEditEvent('${e._id}')">✏️</button>
                  <button class="btn btn-sm btn-danger btn-icon" onclick="deleteEvent('${e._id}','${e.name}')">🗑</button>
                </div></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : ''}`;
  } catch(e) { el.innerHTML=`<div class="empty-state"><div>${e.message}</div></div>`; }
}

function eventCard(e) {
  const days = daysUntil(e.date);
  return `<div class="event-card">
    <div class="event-card-header">
      <div>${daysTag(e.date)} ${statusBadge(e.status)}</div>
      <div class="td-actions">
        <button class="btn btn-sm btn-ghost btn-icon" onclick="openEditEvent('${e._id}')">✏️</button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteEvent('${e._id}','${e.name}')">🗑</button>
      </div>
    </div>
    <div class="event-card-title">${e.name}</div>
    <div class="event-card-date">${fmtDay(e.date)}${e.startTime?' · '+e.startTime:''}${e.endTime?' – '+e.endTime:''}</div>
    ${e.venue ? `<div class="event-card-venue">📍 ${e.venue}</div>` : ''}
    <div class="event-card-meta">
      ${gameBadge(e.game)}
      ${e.format ? `<span class="text-muted">· ${e.format}</span>` : ''}
      ${e.expectedAttendance ? `<span class="text-muted">· ~${e.expectedAttendance} expected</span>` : ''}
      ${e.entryFee ? `<span class="text-muted">· ${fmt$(e.entryFee)} entry</span>` : ''}
    </div>
    ${e.notes ? `<div class="event-card-notes">${e.notes}</div>` : ''}
    ${e.tournamentCount > 0 ? `<div class="mt-8"><span class="badge badge-gold">🏆 ${e.tournamentCount} tournament(s)</span></div>` : ''}
  </div>`;
}

function eventForm(e={}) {
  const today = new Date().toISOString().split('T')[0];
  const isOther = e.venue && !VENUES.slice(0,-1).includes(e.venue);
  return `<form onsubmit="saveEvent(event,'${e._id||''}')">
    <div class="form-grid">
      <div class="form-group"><label>Event Name *</label><input name="name" value="${e.name||''}" required placeholder="e.g. Monthly Pokémon Pop-Up"></div>
      <div class="form-row">
        <div class="form-group"><label>Date *</label><input name="date" type="date" value="${e.date?new Date(e.date).toISOString().split('T')[0]:today}" required></div>
        <div class="form-group"><label>Status</label>
          <select name="status">${EVENT_STATUSES.map(s=>`<option value="${s}" ${e.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Start Time</label><input name="startTime" type="time" value="${e.startTime||''}"></div>
        <div class="form-group"><label>End Time</label><input name="endTime" type="time" value="${e.endTime||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Game System</label>
          <select name="game">${['Pokemon','Magic: The Gathering','One Piece','Yu-Gi-Oh','Warhammer','Comics','Board Games','Multi-Game','Other'].map(g=>`<option ${(e.game||'Pokemon')===g?'selected':''}>${g}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Format</label><input name="format" value="${e.format||''}" placeholder="Standard, Draft, Casual..."></div>
      </div>
      <div class="form-group"><label>Venue</label>
        <select name="venue" onchange="this.nextElementSibling.style.display=this.value==='Other'?'block':'none'">
          ${VENUES.map(v=>`<option value="${v}" ${(!isOther&&e.venue===v)||(!e.venue&&v==='Southern Ute Rec Center')?'selected':''}>${v}</option>`).join('')}
          ${isOther?`<option value="${e.venue}" selected>${e.venue}</option>`:''}
        </select>
        <input name="venueCustom" placeholder="Enter venue name..." value="${isOther?e.venue:''}" style="margin-top:6px;display:${isOther?'block':'none'}">
      </div>
      <div class="form-row">
        <div class="form-group"><label>Expected Attendance</label><input name="expectedAttendance" type="number" min="0" value="${e.expectedAttendance||''}"></div>
        <div class="form-group"><label>Entry Fee ($)</label><input name="entryFee" type="number" min="0" step="0.01" value="${e.entryFee||''}"></div>
      </div>
      <div class="form-group"><label>Notes</label><textarea name="notes" placeholder="Anything to remember for this event...">${e.notes||''}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${e._id?'Save Changes':'Schedule Event'}</button>
      </div>
    </div>
  </form>`;
}

function openAddEvent()          { openModal('Schedule Event', eventForm()); }
async function openEditEvent(id) { const e=await api.get(`/api/events/${id}`); openModal('Edit Event', eventForm(e)); }

async function saveEvent(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    id ? await api.put(`/api/events/${id}`,data) : await api.post('/api/events',data);
    closeModal(); toast(id?'Event updated':'Event scheduled'); loadEvents();
  } catch(e) { toast(e.message,'error'); }
}

async function deleteEvent(id, name) {
  if (!confirm(`Delete "${name}"?`)) return;
  try { await api.delete(`/api/events/${id}`); toast('Event deleted'); loadEvents(); }
  catch(e) { toast(e.message,'error'); }
}

// ════════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════════════════════════
const loaders = { dashboard:loadDashboard, players:loadPlayers, tournaments:loadTournaments, events:loadEvents };

function navigate(page) {
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.page===page));
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id===`page-${page}`));
  if (loaders[page]) loaders[page]();
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => { e.preventDefault(); navigate(link.dataset.page); });
});

function initApp() {
  navigate('dashboard');
}
// initApp() is called by index.html after auth check — do not call here