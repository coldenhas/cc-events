// ── Base URL ──────────────────────────────────────────────────────────────────
const CC_EVENTS_BASE = (() => {
  const host = window.location.hostname;
  if (host.includes('railway.app')) return '';
  return 'https://cc-events-production.up.railway.app';
})();

// ── Auth ──────────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const r = await fetch(CC_EVENTS_BASE + '/api/auth-check');
    const d = await r.json();
    return d.authenticated;
  } catch { return false; }
}

async function doLogin(password) {
  const r = await fetch(CC_EVENTS_BASE + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!r.ok) {
    const d = await r.json();
    throw new Error(d.error || 'Invalid password');
  }
  return true;
}

async function doLogout() {
  await fetch(CC_EVENTS_BASE + '/api/logout', { method: 'POST' });
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showAppShell() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

// ── API ───────────────────────────────────────────────────────────────────────
function handle401() {
  showLoginScreen();
  throw new Error('Session expired. Please log in again.');
}

const api = {
  get: async url => {
    const r = await fetch(CC_EVENTS_BASE + url);
    if (r.status === 401) return handle401();
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  post: async (url, d) => {
    const r = await fetch(CC_EVENTS_BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (r.status === 401) return handle401();
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  put: async (url, d) => {
    const r = await fetch(CC_EVENTS_BASE + url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    if (r.status === 401) return handle401();
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
  delete: async url => {
    const r = await fetch(CC_EVENTS_BASE + url, { method: 'DELETE' });
    if (r.status === 401) return handle401();
    if (!r.ok) throw new Error((await r.json()).error || r.statusText);
    return r.json();
  },
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n)    { return '$'+(parseFloat(n)||0).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'; }
function fmtDay(d)  { return d ? new Date(d).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—'; }
function initials(n){ return (n||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }
function daysUntil(d){ return Math.ceil((new Date(d)-new Date(new Date().setHours(0,0,0,0)))/(1000*60*60*24)); }

function gameBadge(game) {
  const map={'Pokemon':'pokemon','Magic: The Gathering':'mtg','MTG':'mtg','Warhammer':'warhammer','One Piece':'onepiece','Yu-Gi-Oh':'yugioh'};
  return `<span class="game-badge game-${map[game]||'other'}">${game}</span>`;
}
function statusBadge(s) {
  const map={registration:'badge-blue',active:'badge-green',complete:'badge-gray',planning:'badge-purple',confirmed:'badge-gold',cancelled:'badge-red'};
  const labels={registration:'Registration',active:'Active',complete:'Complete',planning:'Planning',confirmed:'Confirmed',cancelled:'Cancelled'};
  return `<span class="badge ${map[s]||'badge-gray'}">${labels[s]||s}</span>`;
}
function daysTag(d) {
  const n = daysUntil(d);
  if (n < 0)  return `<span class="badge badge-gray">Past</span>`;
  if (n === 0) return `<span class="badge badge-red">Today!</span>`;
  if (n <= 7)  return `<span class="badge badge-gold">${n}d away</span>`;
  return `<span class="badge badge-blue">${n} days</span>`;
}

const GAMES = ['Pokemon','Magic: The Gathering','One Piece','Yu-Gi-Oh','Warhammer','Comics','Board Games'];
