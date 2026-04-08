const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');

// Railway volume is mounted at /app/data with DATA_DIR=/app/data
// Falls back to local ./data for development
const dataDir = process.env.DATA_DIR || process.env.CC_DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

console.log(`[db] Using data directory: ${dataDir}`);

const stores = {
  players:     new Datastore({ filename: path.join(dataDir, 'events_players.db'),     autoload: true }),
  tournaments: new Datastore({ filename: path.join(dataDir, 'events_tournaments.db'), autoload: true }),
  matches:     new Datastore({ filename: path.join(dataDir, 'events_matches.db'),     autoload: true }),
  events:      new Datastore({ filename: path.join(dataDir, 'events_events.db'),      autoload: true }),
};

stores.players.ensureIndex({ fieldName: 'email', unique: true, sparse: true });
stores.matches.ensureIndex({ fieldName: 'tournamentId' });
stores.events.ensureIndex({ fieldName: 'date' });

function p(store) {
  return {
    find:    (q)       => new Promise((res,rej) => store.find(q,   (e,d) => e?rej(e):res(d))),
    findOne: (q)       => new Promise((res,rej) => store.findOne(q,(e,d) => e?rej(e):res(d))),
    insert:  (doc)     => new Promise((res,rej) => store.insert(doc,(e,d) => e?rej(e):res(d))),
    update:  (q,u,opt) => new Promise((res,rej) => store.update(q,u,opt||{},(e,n) => e?rej(e):res(n))),
    remove:  (q,opt)   => new Promise((res,rej) => store.remove(q,opt||{},(e,n) => e?rej(e):res(n))),
    count:   (q)       => new Promise((res,rej) => store.count(q,(e,n) => e?rej(e):res(n))),
    sort:    (q,s,lim) => new Promise((res,rej) => { let c=store.find(q).sort(s); if(lim) c=c.limit(lim); c.exec((e,d)=>e?rej(e):res(d)); }),
  };
}

const db = {};
for (const [k,v] of Object.entries(stores)) db[k] = p(v);

module.exports = { db };
