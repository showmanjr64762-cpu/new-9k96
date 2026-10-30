const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global CORS & Security Headers (Permit seamless iframe embedding in deployment)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Content-Security-Policy', "frame-ancestors * 'self';");
  res.removeHeader('X-Frame-Options');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Mapping of legacy game filenames/aliases to normalized files
const gameAliasMap = {
  "desert_axe": "desert_axe.html",
  "desert_axe.html": "desert_axe.html",
  "desert-axe": "desert_axe.html",
  "Desert Axe - Premium Crash Betting Game.html": "desert_axe.html",
  "Desert Axe - Premium Crash Betting Game": "desert_axe.html",

  "glass_roulette": "glass_roulette.html",
  "glass_roulette.html": "glass_roulette.html",
  "glass-roulette": "glass_roulette.html",
  "Glass Roulette.html": "glass_roulette.html",
  "Glass Roulette": "glass_roulette.html",

  "neon_spins": "neon_spins.html",
  "neon_spins.html": "neon_spins.html",
  "neon-spins": "neon_spins.html",
  "Neon Spins.html": "neon_spins.html",
  "Neon Spins": "neon_spins.html",

  "rocket_mines": "rocket_mines.html",
  "rocket_mines.html": "rocket_mines.html",
  "rocket-mines": "rocket_mines.html",
  "Rocet mines .html": "rocket_mines.html",
  "Rocet mines.html": "rocket_mines.html",
  "Rocet mines": "rocket_mines.html",

  "avator": "aviator.html",
  "avator.html": "aviator.html",
  "aviator": "aviator.html",
  "aviator.html": "aviator.html",

  "chicken_road": "chicken_road.html",
  "chicken_road.html": "chicken_road.html",
  "chicken-road": "chicken_road.html",
  "chicken road russhia.html": "chicken_road.html",
  "chicken road russhia": "chicken_road.html",

  "desert_fortune": "desert_fortune.html",
  "desert_fortune.html": "desert_fortune.html",
  "desert-fortune": "desert_fortune.html",
  "desert frortune.html": "desert_fortune.html",
  "desert frortune": "desert_fortune.html",

  "flappy_checkpoint": "flappy_checkpoint.html",
  "flappy_checkpoint.html": "flappy_checkpoint.html",
  "flappy-checkpoint": "flappy_checkpoint.html",
  "flappy": "flappy_checkpoint.html",
  "flappycheakpoint .html": "flappy_checkpoint.html",
  "flappycheakpoint.html": "flappy_checkpoint.html",
  "flappycheakpoint": "flappy_checkpoint.html",

  "ladder_and_snakes": "ladder_and_snakes.html",
  "ladder_and_snakes.html": "ladder_and_snakes.html",
  "ladder-and-snakes": "ladder_and_snakes.html",
  "snakes": "ladder_and_snakes.html",
  "lader and snacks.html": "ladder_and_snakes.html",
  "lader and snacks": "ladder_and_snakes.html",

  "snakes_and_ladders_2": "snakes_and_ladders_2.html",
  "snakes_and_ladders_2.html": "snakes_and_ladders_2.html",
  "snakes-and-ladders-2": "snakes_and_ladders_2.html",
  "ladders_2": "snakes_and_ladders_2.html",
  "ladders_2.html": "snakes_and_ladders_2.html",
  "snack and landers 2 .html": "snakes_and_ladders_2.html",
  "snack and landers 2.html": "snakes_and_ladders_2.html",
  "snack and landers 2": "snakes_and_ladders_2.html",

  "tik_tak_win": "tik_tak_win.html",
  "tik_tak_win.html": "tik_tak_win.html",
  "tik-tak-win": "tik_tak_win.html",
  "tik tak win.html": "tik_tak_win.html",
  "tik tak win": "tik_tak_win.html",

  "astro_crash": "astro_crash.html",
  "astro_crash.html": "astro_crash.html",
  "astro-crash": "astro_crash.html",
  "astrocrash": "astro_crash.html",
  "astro crash": "astro_crash.html",
  "astro crash.html": "astro_crash.html",
  "ace_vs_joker": "astro_crash.html",
  "ace_vs_joker.html": "astro_crash.html",
  "ace-vs-joker": "astro_crash.html",
  "ace vs joker": "astro_crash.html",
  "ace vs joker.html": "astro_crash.html",

  "dwarves_mine": "dwarves_mine.html",
  "dwarves_mine.html": "dwarves_mine.html",
  "dwarves-mine": "dwarves_mine.html",
  "dwarves mine": "dwarves_mine.html",
  "dwarves mine.html": "dwarves_mine.html",

  "final_survival": "final_survival.html",
  "final_survival.html": "final_survival.html",
  "final-survival": "final_survival.html",
  "final survival": "final_survival.html",
  "final survival.html": "final_survival.html",

  "football_bet": "football_bet.html",
  "football_bet.html": "football_bet.html",
  "football-bet": "football_bet.html",
  "football bet": "football_bet.html",
  "football bet.html": "football_bet.html",
  "football_bet_land": "football_bet.html",
  "football-bet-land": "football_bet.html",
  "football bet land": "football_bet.html",

  "halloween_crash": "halloween_crash.html",
  "halloween_crash.html": "halloween_crash.html",
  "halloween-crash": "halloween_crash.html",
  "halloween crash": "halloween_crash.html",
  "halloween crash.html": "halloween_crash.html",

  "10000_bc": "10000_bc.html",
  "10000_bc.html": "10000_bc.html",
  "10000bc": "10000_bc.html",
  "10000bc.html": "10000_bc.html",
  "10000-bc": "10000_bc.html",
  "10000 bc": "10000_bc.html",
  "10000 bc.html": "10000_bc.html",
  "ice_spin": "10000_bc.html",
  "ice_spin.html": "10000_bc.html",

  "mayan_temple_slot": "mayan_temple_slot.html",
  "mayan_temple_slot.html": "mayan_temple_slot.html",
  "mayan_temple": "mayan_temple_slot.html",
  "mayan_temple.html": "mayan_temple_slot.html",
  "mayan-temple-slot": "mayan_temple_slot.html",
  "mayan temple slot": "mayan_temple_slot.html",
  "mayan temple slot.html": "mayan_temple_slot.html",

  "stairway_to_wealth": "stairway_to_wealth.html",
  "stairway_to_wealth.html": "stairway_to_wealth.html",
  "stairway_wealth": "stairway_to_wealth.html",
  "stairway_wealth.html": "stairway_to_wealth.html",
  "stairway-to-wealth": "stairway_to_wealth.html",
  "stairway to wealth": "stairway_to_wealth.html",
  "stairway to wealth.html": "stairway_to_wealth.html",
  "night_jump": "stairway_to_wealth.html",
  "night_jump.html": "stairway_to_wealth.html",

  "penalty_nations_cup": "penalty_nations_cup.html",
  "penalty_nations_cup.html": "penalty_nations_cup.html",
  "penalty_nations": "penalty_nations_cup.html",
  "penalty_nations.html": "penalty_nations_cup.html",
  "penalty-nations-cup": "penalty_nations_cup.html",
  "penalty nations cup": "penalty_nations_cup.html",
  "penalty nations cup.html": "penalty_nations_cup.html",

  "super_soccer_slots": "super_soccer_slots.html",
  "super_soccer_slots.html": "super_soccer_slots.html",
  "super-soccer-slots": "super_soccer_slots.html",
  "super soccer slots": "super_soccer_slots.html",
  "super soccer slots.html": "super_soccer_slots.html",

  "prehistory_slots": "prehistory_slots.html",
  "prehistory_slots.html": "prehistory_slots.html",
  "prehistory-slots": "prehistory_slots.html",
  "prehistory slots": "prehistory_slots.html",
  "prehistory slots.html": "prehistory_slots.html",
  "pre-history-slots": "prehistory_slots.html",

  "mummy_slot": "mummy_slot.html",
  "mummy_slot.html": "mummy_slot.html",
  "mummy-slot": "mummy_slot.html",
  "mummy slot": "mummy_slot.html",
  "mummy slot.html": "mummy_slot.html",
  "the_mummy_slot": "mummy_slot.html",
  "the mummy slot": "mummy_slot.html"
};

// Automatic game normalization and dist sync on startup for seamless deployment
try {
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }

  const gamePairs = [
    { norm: 'aviator.html', alt: 'avator.html' },
    { norm: 'chicken_road.html', alt: 'chicken road russhia.html' },
    { norm: 'desert_fortune.html', alt: 'desert frortune.html' },
    { norm: 'rocket_mines.html', alt: 'Rocet mines .html' },
    { norm: 'snakes_and_ladders_2.html', alt: 'snack and landers 2 .html' },
    { norm: 'tik_tak_win.html', alt: 'tik tak win.html' },
    { norm: 'desert_axe.html', alt: 'Desert Axe - Premium Crash Betting Game.html' },
    { norm: 'glass_roulette.html', alt: 'Glass Roulette.html' },
    { norm: 'neon_spins.html', alt: 'Neon Spins.html' },
    { norm: 'astro_crash.html', alt: 'ace_vs_joker.html' }
  ];

  for (const pair of gamePairs) {
    const normFile = path.join(__dirname, pair.norm);
    const altFile = path.join(__dirname, pair.alt);
    if (!fs.existsSync(normFile) && fs.existsSync(altFile)) {
      fs.copyFileSync(altFile, normFile);
      console.log(`[STARTUP] Auto-created ${pair.norm} from ${pair.alt}`);
    } else if (fs.existsSync(normFile) && !fs.existsSync(altFile)) {
      fs.copyFileSync(normFile, altFile);
    }
  }

  // Ensure key html and asset files exist in dist/
  const rootFiles = fs.readdirSync(__dirname);
  for (const file of rootFiles) {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === '.aistudio') continue;
    const src = path.join(__dirname, file);
    try {
      const st = fs.statSync(src);
      if (st.isFile() && (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.css') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.avif') || file.endsWith('.svg') || file.endsWith('.webp') || file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg'))) {
        const dest = path.join(distPath, file);
        if (!fs.existsSync(dest) || fs.statSync(dest).mtimeMs < st.mtimeMs) {
          fs.copyFileSync(src, dest);
        }
      } else if (st.isDirectory() && (file === 'images' || file === 'data' || file === 'sounds')) {
        if (typeof fs.cpSync === 'function') {
          fs.cpSync(src, path.join(distPath, file), { recursive: true });
        }
      }
    } catch(e) {}
  }
} catch(err) {
  console.warn("[STARTUP] Notice during game sync:", err.message);
}

// ---------------- BACKEND API ENDPOINTS ---------------- //

// File persistence helpers for user, referral, transaction, and config data
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
}
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REFERRALS_FILE = path.join(DATA_DIR, 'referrals.json');
const REFERRALS_TABLE_FILE = path.join(DATA_DIR, 'referrals_table.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'referral_config.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'activity_messages.json');
const CLAIMS_FILE = path.join(DATA_DIR, 'referral_claims.json');

function loadJsonFile(filePath, defaultVal = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`Notice loading ${filePath}:`, err.message);
  }
  return defaultVal;
}

function saveJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Notice saving ${filePath}:`, err.message);
  }
}

// In-memory data structures with file backing
const registeredUsers = loadJsonFile(USERS_FILE, {}); // key: cleanEmail
const referralStore = loadJsonFile(REFERRALS_FILE, {}); // key: referCode, val: array of referred user objects
const referralsTable = loadJsonFile(REFERRALS_TABLE_FILE, {}); // key: ref_id (or referred_user_id), val: Referral Record
const transactionsStore = loadJsonFile(TRANSACTIONS_FILE, {}); // key: transaction_id, val: Transaction Record
const depositsStore = loadJsonFile(DEPOSITS_FILE, {}); // key: deposit_id, val: Deposit Request Record
const withdrawalsStore = loadJsonFile(WITHDRAWALS_FILE, {}); // key: withdrawal_id, val: Withdrawal Request Record
const activityMessages = loadJsonFile(MESSAGES_FILE, []); // array of activity items (latest 500)
const referralConfig = loadJsonFile(CONFIG_FILE, {
  deposit_threshold: 500,
  betting_volume_threshold: 5000,
  currency: 'PKR'
});
const referralClaimsStore = loadJsonFile(CLAIMS_FILE, {}); // key: identifier (cleanEmail/uid), val: { claimedChests, claimedCommission, claimedChestBonus, lastUpdated }

// SSE (Server-Sent Events) Clients Set for Live Control Room Streaming
const sseClients = new Set();

function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// Global Activity Logger & Broadcaster
function logGameActivity(type, message, details = {}, userId = '', userEmail = '') {
  const item = {
    id: `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    type: type || 'SYSTEM',
    message: message || '',
    details: details || {},
    userId: userId || (details.userId || ''),
    userEmail: userEmail || (details.userEmail || ''),
    timestamp: new Date().toISOString()
  };

  activityMessages.unshift(item);
  if (activityMessages.length > 500) {
    activityMessages.pop();
  }
  saveJsonFile(MESSAGES_FILE, activityMessages);

  // Broadcast in real-time to admin dashboard & clients
  broadcastSSE('GAME_MESSAGE', item);
  return item;
}

const userBalances = new Map();

// Initialize in-memory user balances from stored users
for (const email in registeredUsers) {
  const u = registeredUsers[email];
  if (u && u.uid && typeof u.balance === 'number') {
    userBalances.set(u.uid, u.balance);
    if (u.email) userBalances.set(u.email.toLowerCase().trim(), u.balance);
  }
}

// Helper to calculate referral code from email
function generateReferCodeFromEmail(email) {
  if (!email) return String(100000000 + Math.floor(Math.random() * 899999999));
  const clean = email.toLowerCase().trim();
  const hash = Math.abs(clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  return String(100000000 + (hash % 899999999));
}

// Helper to calculate deterministic UID
function generateUidFromEmail(email) {
  if (!email) return 'usr_' + Date.now();
  const clean = email.toLowerCase().trim();
  const hash = Math.abs(clean.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0));
  return 'usr_' + hash.toString(16);
}

// Helper to find user strictly by email
function findUserByEmail(email) {
  if (!email) return null;
  const clean = String(email).toLowerCase().trim();
  if (registeredUsers[clean]) return registeredUsers[clean];
  for (const em in registeredUsers) {
    const u = registeredUsers[em];
    if (u && u.email && u.email.toLowerCase().trim() === clean) {
      return u;
    }
  }
  return null;
}

// Helper to find user by UID or email
function findUserByIdOrEmail(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).toLowerCase().trim();
  if (registeredUsers[clean]) return registeredUsers[clean];
  for (const em in registeredUsers) {
    const u = registeredUsers[em];
    if (u && (u.uid === identifier || (u.email && u.email.toLowerCase().trim() === clean))) {
      return u;
    }
  }
  return null;
}

// Helper to find user by referral code
function findUserByReferCode(referCode) {
  if (!referCode) return null;
  const code = String(referCode).trim();
  for (const em in registeredUsers) {
    const u = registeredUsers[em];
    if (u && (
      String(u.referCode || '').trim() === code ||
      String(u.uid || '').trim() === code ||
      String(u.email || '').toLowerCase().trim() === code.toLowerCase()
    )) {
      return u;
    }
  }
  return null;
}

// Helper to guarantee user exists in memory and persistence
function ensureUserAccount(cleanEmail, effectiveUid, inviterCode = '', clientBal = 0) {
  const normEmail = (cleanEmail || '').toLowerCase().trim();
  const normUid = (effectiveUid || '').trim();

  let user = (normEmail ? registeredUsers[normEmail] : null) || 
    (normUid ? Object.values(registeredUsers).find(u => u.uid === normUid) : null);

  if (!user && (normEmail || normUid)) {
    const safeEmail = normEmail || `${normUid}@pk96.com`;
    const newUid = normUid || generateUidFromEmail(safeEmail);
    const myOwnReferCode = generateReferCodeFromEmail(safeEmail);
    const safeReferredBy = (inviterCode && String(inviterCode).trim() && inviterCode !== myOwnReferCode && inviterCode !== 'Loading' && inviterCode !== 'PK96-GUEST') 
      ? String(inviterCode).trim() 
      : '';
    const numBal = (typeof clientBal === 'number' && !isNaN(clientBal)) ? clientBal : 0;
    user = {
      uid: newUid,
      email: safeEmail,
      referCode: myOwnReferCode,
      referredBy: safeReferredBy,
      balance: numBal,
      claimedCommission: 0,
      unclaimedCommission: 0,
      claimedChests: [],
      claimedChestBonus: 0,
      totalDeposit: 0,
      totalDeposited: 0,
      totalBets: 0,
      turnover: 0,
      username: safeEmail.split('@')[0],
      displayName: safeEmail.split('@')[0],
      createdAt: new Date().toISOString()
    };
    registeredUsers[safeEmail] = user;
    userBalances.set(newUid, user.balance);
    userBalances.set(safeEmail, user.balance);
    saveJsonFile(USERS_FILE, registeredUsers);
  }
  return user;
}

// Authoritative Claims Store Helpers to guarantee rewards can never be re-claimed across devices/browsers
function getUserClaims(...identifiers) {
  const ids = identifiers.filter(Boolean).map(id => String(id).toLowerCase().trim());
  const chests = new Set();
  let maxCommission = 0;
  let maxBonus = 0;

  // 1. Check referralClaimsStore
  ids.forEach(id => {
    if (referralClaimsStore[id]) {
      const rec = referralClaimsStore[id];
      if (Array.isArray(rec.claimedChests)) {
        rec.claimedChests.forEach(c => chests.add(Number(c)));
      }
      if (typeof rec.claimedCommission === 'number' && !isNaN(rec.claimedCommission)) {
        maxCommission = Math.max(maxCommission, rec.claimedCommission);
      }
      if (typeof rec.claimedChestBonus === 'number' && !isNaN(rec.claimedChestBonus)) {
        maxBonus = Math.max(maxBonus, rec.claimedChestBonus);
      }
    }
  });

  // 2. Cross-check registeredUsers
  ids.forEach(id => {
    const u = findUserByIdOrEmail(id) || findUserByReferCode(id);
    if (u) {
      if (Array.isArray(u.claimedChests)) {
        u.claimedChests.forEach(c => chests.add(Number(c)));
      }
      if (typeof u.claimedCommission === 'number' && !isNaN(u.claimedCommission)) {
        maxCommission = Math.max(maxCommission, u.claimedCommission);
      }
      if (typeof u.claimedChestBonus === 'number' && !isNaN(u.claimedChestBonus)) {
        maxBonus = Math.max(maxBonus, u.claimedChestBonus);
      }
    }
  });

  return {
    claimedChests: Array.from(chests).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b),
    claimedCommission: Math.round(maxCommission * 100) / 100,
    claimedChestBonus: Math.round(maxBonus * 100) / 100
  };
}

function saveUserClaims(identifiers, { claimedChests, claimedCommission, claimedChestBonus }) {
  const allIds = new Set(identifiers.filter(Boolean).map(id => String(id).toLowerCase().trim()));
  
  // Discover and associate any related user records to ensure all keys match
  allIds.forEach(id => {
    const u = findUserByIdOrEmail(id) || findUserByReferCode(id);
    if (u) {
      if (u.email) allIds.add(String(u.email).toLowerCase().trim());
      if (u.uid) allIds.add(String(u.uid).toLowerCase().trim());
      if (u.referCode) allIds.add(String(u.referCode).toLowerCase().trim());
    }
  });

  const ids = Array.from(allIds);
  const existing = getUserClaims(...ids);

  const mergedChests = Array.from(new Set([
    ...existing.claimedChests,
    ...(Array.isArray(claimedChests) ? claimedChests.map(Number).filter(n => !isNaN(n) && n > 0) : [])
  ])).sort((a, b) => a - b);

  const mergedCommission = Math.max(
    existing.claimedCommission,
    (typeof claimedCommission === 'number' && !isNaN(claimedCommission)) ? claimedCommission : 0
  );

  const mergedBonus = Math.max(
    existing.claimedChestBonus,
    (typeof claimedChestBonus === 'number' && !isNaN(claimedChestBonus)) ? claimedChestBonus : 0
  );

  const record = {
    claimedChests: mergedChests,
    claimedCommission: Math.round(mergedCommission * 100) / 100,
    claimedChestBonus: Math.round(mergedBonus * 100) / 100,
    lastUpdated: new Date().toISOString()
  };

  ids.forEach(id => {
    referralClaimsStore[id] = record;
  });

  saveJsonFile(CLAIMS_FILE, referralClaimsStore);

  // Also hydrate registered user records if they exist
  ids.forEach(id => {
    const u = findUserByIdOrEmail(id) || findUserByReferCode(id);
    if (u) {
      u.claimedChests = mergedChests;
      u.claimedCommission = record.claimedCommission;
      u.claimedChestBonus = record.claimedChestBonus;
    }
  });
  saveJsonFile(USERS_FILE, registeredUsers);

  return record;
}

// --- Authoritative Qualification Engine ---

/**
 * Calculates verified eligible cumulative deposits for a user
 */
function calculateVerifiedUserDeposits(userId) {
  const user = findUserByIdOrEmail(userId);
  let totalFromTxns = 0;

  for (const txId in transactionsStore) {
    const tx = transactionsStore[txId];
    if (tx && (tx.user_id === userId || (user && (tx.user_id === user.uid || (tx.user_email && user.email && tx.user_email.toLowerCase() === user.email.toLowerCase())))) && tx.type === 'DEPOSIT') {
      if (tx.status === 'COMPLETED' || tx.status === 'SUCCESS' || !tx.status) {
        totalFromTxns += Number(tx.amount || 0);
      }
    }
  }

  const userStoredDep = user ? Math.max(
    Number(user.totalDeposit || 0),
    Number(user.totalDeposited || 0),
    Number(user.totalDeposits || 0),
    Number(user.depositAmount || 0)
  ) : 0;

  return Math.round(Math.max(totalFromTxns, userStoredDep) * 100) / 100;
}

/**
 * Calculates verified qualifying cumulative betting volume for a user
 */
function calculateVerifiedUserBetVolume(userId) {
  const user = findUserByIdOrEmail(userId);
  let totalFromTxns = 0;

  for (const txId in transactionsStore) {
    const tx = transactionsStore[txId];
    if (tx && (tx.user_id === userId || (user && (tx.user_id === user.uid || (tx.user_email && user.email && tx.user_email.toLowerCase() === user.email.toLowerCase())))) && tx.type === 'BET') {
      if (tx.status === 'COMPLETED' || tx.status === 'SETTLED' || tx.status === 'QUALIFIED' || !tx.status) {
        totalFromTxns += Number(tx.amount || 0);
      }
    }
  }

  const userStoredBets = user ? Math.max(
    Number(user.totalBets || 0),
    Number(user.turnover || 0),
    Number(user.bets || 0)
  ) : 0;

  return Math.round(Math.max(totalFromTxns, userStoredBets) * 100) / 100;
}

/**
 * Authoritative Server-side Qualification Function
 * Rules:
 *   REGISTERED: Joined via referral, Deposit < 500 PKR, Bets < 5,000 PKR
 *   DEPOSIT_QUALIFIED: Deposit >= 500 PKR, Bets < 5,000 PKR
 *   BETTING_QUALIFIED: Bets >= 5,000 PKR, Deposit < 500 PKR
 *   VALID: Deposit >= 500 PKR AND Bets >= 5,000 PKR
 */
function checkReferralQualification(referredUserId) {
  if (!referredUserId) return null;
  const user = findUserByIdOrEmail(referredUserId);
  const uid = user ? user.uid : referredUserId;

  // Find or construct referral record in referralsTable
  let refRecord = null;
  for (const rId in referralsTable) {
    const r = referralsTable[rId];
    if (r && (r.referred_user_id === uid || (user && r.referred_email && r.referred_email.toLowerCase() === user.email.toLowerCase()))) {
      refRecord = r;
      break;
    }
  }

  // If not found in table, search legacy referralStore or user profile
  if (!refRecord && user && user.referredBy) {
    const inviterCode = String(user.referredBy).trim();
    const inviterUser = findUserByReferCode(inviterCode);
    const recId = `ref_${inviterUser ? inviterUser.uid : inviterCode}_${uid}`;
    refRecord = {
      id: recId,
      referrer_id: inviterUser ? inviterUser.uid : `agent_${inviterCode}`,
      referrer_email: inviterUser ? inviterUser.email : '',
      referred_user_id: uid,
      referred_email: user.email,
      referral_code: inviterCode,
      status: 'REGISTERED',
      total_deposit: 0,
      qualifying_bet_volume: 0,
      created_at: user.createdAt || new Date().toISOString(),
      qualified_at: null
    };
    referralsTable[recId] = refRecord;
  }

  if (!refRecord) return null;

  // Calculate verified amounts
  const verifiedDeposit = calculateVerifiedUserDeposits(uid);
  const verifiedBetVolume = calculateVerifiedUserBetVolume(uid);

  refRecord.total_deposit = verifiedDeposit;
  refRecord.qualifying_bet_volume = verifiedBetVolume;

  const depThreshold = Number(referralConfig.deposit_threshold || 500);
  const betThreshold = Number(referralConfig.betting_volume_threshold || 5000);

  const depositMet = verifiedDeposit >= depThreshold;
  const bettingMet = verifiedBetVolume >= betThreshold;

  let newStatus = 'REGISTERED';
  if (depositMet && bettingMet) {
    newStatus = 'VALID';
    if (!refRecord.qualified_at) {
      refRecord.qualified_at = new Date().toISOString();
    }
  } else if (depositMet) {
    newStatus = 'DEPOSIT_QUALIFIED';
  } else if (bettingMet) {
    newStatus = 'BETTING_QUALIFIED';
  } else {
    newStatus = 'REGISTERED';
  }

  refRecord.status = newStatus;
  saveJsonFile(REFERRALS_TABLE_FILE, referralsTable);

  // Sync to legacy referralStore
  const refCode = refRecord.referral_code;
  if (refCode) {
    if (!referralStore[refCode]) referralStore[refCode] = [];
    const exIdx = referralStore[refCode].findIndex(r => r.uid === uid || (user && r.email === user.email));
    const storeItem = {
      id: refRecord.id,
      uid: uid,
      email: user ? user.email : (refRecord.referred_email || ''),
      totalDeposit: verifiedDeposit,
      totalBets: verifiedBetVolume,
      isValid: newStatus === 'VALID',
      status: newStatus,
      date: refRecord.created_at,
      qualified_at: refRecord.qualified_at
    };
    if (exIdx >= 0) {
      referralStore[refCode][exIdx] = { ...referralStore[refCode][exIdx], ...storeItem };
    } else {
      referralStore[refCode].push(storeItem);
    }
    saveJsonFile(REFERRALS_FILE, referralStore);
  }

  // Sync to user object
  if (user) {
    user.totalDeposit = verifiedDeposit;
    user.totalDeposited = verifiedDeposit;
    user.totalBets = verifiedBetVolume;
    user.turnover = verifiedBetVolume;
    user.isValid = (newStatus === 'VALID');
    user.referralStatus = newStatus;
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  return refRecord;
}

/**
 * Re-evaluate all referrals in the system (e.g. after config change)
 */
function checkAllReferralsQualification() {
  const results = [];
  for (const rId in referralsTable) {
    const r = referralsTable[rId];
    if (r && r.referred_user_id) {
      const updated = checkReferralQualification(r.referred_user_id);
      if (updated) results.push(updated);
    }
  }
  for (const em in registeredUsers) {
    const u = registeredUsers[em];
    if (u && u.referredBy) {
      const updated = checkReferralQualification(u.uid);
      if (updated && !results.some(res => res.id === updated.id)) results.push(updated);
    }
  }
  return results;
}

// Ensure initial qualification evaluations
try { checkAllReferralsQualification(); } catch(e) {}

// --- Auth Endpoints ---

// Check if email already exists and return full user record if available
app.get('/api/auth/check-email', (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email parameter required' });
  }
  const user = findUserByIdOrEmail(email);
  const exists = !!user;
  if (user) {
    const claims = getUserClaims(user.email, user.uid, user.referCode);
    user.claimedChests = claims.claimedChests;
    user.claimedCommission = claims.claimedCommission;
    user.claimedChestBonus = claims.claimedChestBonus;
  }
  res.json({
    exists,
    email,
    user: exists ? user : null
  });
});

// Retrieve User Profile Endpoint by Email, UID, or Username
app.get('/api/auth/user', (req, res) => {
  const identifier = (req.query.email || req.query.uid || req.query.username || req.query.id || '').toLowerCase().trim();
  if (!identifier) {
    return res.status(400).json({ error: 'Identifier parameter (email or uid) required' });
  }
  const user = findUserByIdOrEmail(identifier);
  if (!user) {
    const claims = getUserClaims(identifier);
    if (claims.claimedChests.length > 0 || claims.claimedCommission > 0) {
      return res.json({
        exists: true,
        user: {
          uid: identifier,
          email: identifier.includes('@') ? identifier : '',
          claimedChests: claims.claimedChests,
          claimedCommission: claims.claimedCommission,
          claimedChestBonus: claims.claimedChestBonus
        }
      });
    }
    return res.status(404).json({ exists: false, error: 'User not found' });
  }
  const claims = getUserClaims(user.email, user.uid, user.referCode);
  user.claimedChests = claims.claimedChests;
  user.claimedCommission = claims.claimedCommission;
  user.claimedChestBonus = claims.claimedChestBonus;
  res.json({
    exists: true,
    user
  });
});

const DEFAULT_AVATAR = 'https://www.zc777a.com/siteadmin/skin/lobby_asset/common/common/profile/icon_wd_mrtx.avif?manualVersion=1&version=v7.3.232';

function isDefaultAvatar(av) {
  if (!av || typeof av !== 'string') return true;
  return av.includes('icon_wd_mrtx.avif') || av.includes('style_2_vip_style1.avif');
}

function isDefaultUsername(un, em) {
  if (!un || typeof un !== 'string') return true;
  const clean = un.trim().toLowerCase();
  const cleanEmail = (em || '').trim().toLowerCase();
  return clean === cleanEmail || clean === cleanEmail.split('@')[0];
}

// Sync / Upsert User Endpoint across sessions & devices
app.post('/api/auth/sync-user', (req, res) => {
  const body = req.body || {};
  const email = (body.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email is required for sync' });
  }

  const existing = findUserByEmail(email);
  let uid = existing ? existing.uid : null;
  if (!uid) {
    if (body.uid) {
      let isUidTaken = false;
      for (const em in registeredUsers) {
        const u = registeredUsers[em];
        if (u && u.uid === body.uid && u.email && u.email.toLowerCase().trim() !== email) {
          isUidTaken = true;
          break;
        }
      }
      if (!isUidTaken) {
        uid = body.uid;
      }
    }
    if (!uid) {
      uid = generateUidFromEmail(email);
    }
  }
  const myReferCode = body.referCode || (existing ? existing.referCode : generateReferCodeFromEmail(email));
  const referredBy = body.referredBy !== undefined ? body.referredBy : (existing ? existing.referredBy : '');
  
  const balance = (typeof body.balance === 'number' && !isNaN(body.balance)) 
    ? body.balance
    : (existing && typeof existing.balance === 'number' ? existing.balance : 0);

  const totalDeposit = (typeof body.totalDeposit === 'number' && !isNaN(body.totalDeposit))
    ? Math.max(body.totalDeposit, existing ? (existing.totalDeposit || 0) : 0)
    : (existing ? (existing.totalDeposit || 0) : 0);

  const totalBets = (typeof (body.totalBets || body.turnover) === 'number' && !isNaN(body.totalBets || body.turnover))
    ? Math.max(body.totalBets || body.turnover, existing ? (existing.totalBets || existing.turnover || 0) : 0)
    : (existing ? (existing.totalBets || existing.turnover || 0) : 0);

  // Preserve customized avatar: only use default if neither body nor existing has a custom avatar
  let avatar = DEFAULT_AVATAR;
  if (!isDefaultAvatar(body.avatar)) {
    avatar = body.avatar;
  } else if (existing && !isDefaultAvatar(existing.avatar)) {
    avatar = existing.avatar;
  } else {
    avatar = body.avatar || (existing ? existing.avatar : DEFAULT_AVATAR);
  }

  // Preserve customized username & displayName
  let username = email.split('@')[0];
  if (!isDefaultUsername(body.username, email)) {
    username = body.username;
  } else if (existing && !isDefaultUsername(existing.username, email)) {
    username = existing.username;
  } else {
    username = body.username || (existing ? existing.username : email.split('@')[0]);
  }

  let displayName = username;
  if (!isDefaultUsername(body.displayName, email)) {
    displayName = body.displayName;
  } else if (existing && !isDefaultUsername(existing.displayName, email)) {
    displayName = existing.displayName;
  } else {
    displayName = username;
  }

  // Preserve VIP claims
  const vipClaims = body.vipClaims !== undefined 
    ? (existing && existing.vipClaims ? { ...existing.vipClaims, ...body.vipClaims } : body.vipClaims)
    : (existing ? existing.vipClaims : null);

  // Preserve withdrawal accounts
  const withdrawalAccounts = body.withdrawalAccounts !== undefined
    ? body.withdrawalAccounts
    : (existing ? existing.withdrawalAccounts : []);

  // Preserve withdrawal records / history
  const withdrawRecords = body.withdrawRecords !== undefined
    ? body.withdrawRecords
    : (existing ? existing.withdrawRecords : []);

  // Preserve payment & deposit history
  const paymentHistory = body.paymentHistory !== undefined
    ? body.paymentHistory
    : (existing ? existing.paymentHistory : []);

  // Preserve favorites
  const favorites = Array.isArray(body.favorites)
    ? body.favorites
    : (existing && Array.isArray(existing.favorites) ? existing.favorites : []);

  // Preserve claimed chests (strictly union body, existing user record, and authoritative claims store)
  const syncUserIds = [email, uid, myReferCode, existing ? existing.email : null, existing ? existing.uid : null, existing ? existing.referCode : null].filter(Boolean);
  const existingClaims = getUserClaims(...syncUserIds);
  const claimedChests = Array.from(new Set([
    ...(Array.isArray(body.claimedChests) ? body.claimedChests : []),
    ...(existing && Array.isArray(existing.claimedChests) ? existing.claimedChests : []),
    ...existingClaims.claimedChests
  ])).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);

  // Preserve claimed commission (take maximum across all authoritative sources)
  const claimedCommission = Math.max(
    Number(body.claimedCommission || 0),
    existing ? Number(existing.claimedCommission || 0) : 0,
    existingClaims.claimedCommission
  );

  const claimedChestBonus = Math.max(
    Number(body.claimedChestBonus || 0),
    existing ? Number(existing.claimedChestBonus || 0) : 0,
    existingClaims.claimedChestBonus
  );

  const wagerRequirement = (typeof body.wagerRequirement === 'number' && !isNaN(body.wagerRequirement))
    ? body.wagerRequirement
    : ((typeof body.wagerAmount === 'number' && !isNaN(body.wagerAmount))
        ? body.wagerAmount
        : (existing && typeof existing.wagerRequirement === 'number' ? existing.wagerRequirement : 0));

  const vipLevel = (typeof body.vipLevel === 'number' && !isNaN(body.vipLevel))
    ? body.vipLevel
    : (existing && typeof existing.vipLevel === 'number' ? existing.vipLevel : 0);

  const vipBetPoints = totalBets;
  const updatedAt = body.updatedAt || Date.now();

  const merged = {
    ...(existing || {}),
    ...body,
    uid,
    email,
    password: body.password || (existing ? existing.password : ''),
    referCode: myReferCode,
    referredBy: referredBy || '',
    balance,
    totalDeposit,
    totalDeposited: totalDeposit,
    totalBets,
    turnover: totalBets,
    wagerRequirement,
    wagerAmount: wagerRequirement,
    vipLevel,
    vipBetPoints,
    isValid: existing ? (existing.isValid || (totalDeposit >= 500 && totalBets >= 5000)) : (totalDeposit >= 500 && totalBets >= 5000),
    referralStatus: existing ? existing.referralStatus : 'REGISTERED',
    claimedChests,
    claimedCommission,
    claimedChestBonus,
    vipClaims,
    withdrawalPassword: body.withdrawalPassword !== undefined ? body.withdrawalPassword : (existing ? existing.withdrawalPassword : ''),
    hasWithdrawalPassword: body.hasWithdrawalPassword !== undefined ? !!body.hasWithdrawalPassword : (existing ? !!existing.hasWithdrawalPassword : false),
    withdrawalAccounts,
    withdrawRecords,
    paymentHistory,
    favorites,
    avatar,
    username,
    displayName,
    updatedAt,
    createdAt: existing ? (existing.createdAt || body.createdAt || new Date().toISOString()) : (body.createdAt || new Date().toISOString()),
    lastActive: new Date().toISOString()
  };

  registeredUsers[email] = merged;
  userBalances.set(uid, balance);
  userBalances.set(email, balance);
  saveJsonFile(USERS_FILE, registeredUsers);
  saveUserClaims(syncUserIds, {
    claimedChests,
    claimedCommission,
    claimedChestBonus
  });

  // Authoritative: Refresh referral qualification and inviter referral deposits immediately
  try {
    checkReferralQualification(uid);
  } catch(e) {}

  res.json({
    success: true,
    user: merged
  });
});

// Set and persist permanent Withdrawal Password / PIN
app.post('/api/user/set-withdrawal-password', (req, res) => {
  const { email, uid, withdrawalPassword, password } = req.body || {};
  const val = String(withdrawalPassword || password || '').trim();
  if (!val || val.length < 6) {
    return res.status(400).json({ error: 'Valid 6-digit withdrawal password is required' });
  }
  const user = findUserByIdOrEmail(email || uid);
  if (user) {
    user.withdrawalPassword = val;
    user.hasWithdrawalPassword = true;
    user.lastActive = new Date().toISOString();
    registeredUsers[user.email] = user;
    saveJsonFile(USERS_FILE, registeredUsers);
    broadcastSSE('USER_UPDATED', { email: user.email, uid: user.uid, hasWithdrawalPassword: true });
    return res.json({ success: true, message: 'Withdrawal password permanently saved to account.', user });
  }
  // Create or store for future sync
  const targetEmail = (email || '').toLowerCase().trim();
  if (targetEmail) {
    const newUser = {
      uid: uid || generateUidFromEmail(targetEmail),
      email: targetEmail,
      withdrawalPassword: val,
      hasWithdrawalPassword: true,
      lastActive: new Date().toISOString()
    };
    registeredUsers[targetEmail] = newUser;
    saveJsonFile(USERS_FILE, registeredUsers);
    broadcastSSE('USER_UPDATED', { email: targetEmail, uid: newUser.uid, hasWithdrawalPassword: true });
    return res.json({ success: true, message: 'Withdrawal password saved.', user: newUser });
  }
  res.json({ success: true });
});

// Save complete account endpoint (alias with explicit full payload persistence)
app.post('/api/auth/save-account', (req, res) => {
  const body = req.body || {};
  const email = (body.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const existing = findUserByEmail(email) || {};
  let uid = existing.uid || null;
  if (!uid) {
    if (body.uid) {
      let isUidTaken = false;
      for (const em in registeredUsers) {
        const u = registeredUsers[em];
        if (u && u.uid === body.uid && u.email && u.email.toLowerCase().trim() !== email) {
          isUidTaken = true;
          break;
        }
      }
      if (!isUidTaken) {
        uid = body.uid;
      }
    }
    if (!uid) {
      uid = generateUidFromEmail(email);
    }
  }

  const merged = {
    ...existing,
    ...body,
    uid,
    email,
    lastActive: new Date().toISOString()
  };

  registeredUsers[email] = merged;
  if (typeof merged.balance === 'number') {
    userBalances.set(uid, merged.balance);
    userBalances.set(email, merged.balance);
  }
  saveJsonFile(USERS_FILE, registeredUsers);

  res.json({
    success: true,
    user: merged
  });
});

// Register User Endpoint (Strict single email check & anti-fraud)
app.post('/api/auth/register', (req, res) => {
  const { email, password, referCode, explicitUid } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid Gmail/Email is required', code: 'auth/invalid-email' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // STRICT DUPLICATE EMAIL CHECK: If email is already registered, reject registration!
  if (registeredUsers[cleanEmail]) {
    return res.status(409).json({
      error: 'This Gmail address is already registered. Please login instead.',
      code: 'auth/email-already-in-use',
      email: cleanEmail
    });
  }

  let uid = null;
  if (explicitUid) {
    let isUidTaken = false;
    for (const em in registeredUsers) {
      const u = registeredUsers[em];
      if (u && u.uid === explicitUid && u.email && u.email.toLowerCase().trim() !== cleanEmail) {
        isUidTaken = true;
        break;
      }
    }
    if (!isUidTaken) {
      uid = explicitUid;
    }
  }
  if (!uid) {
    uid = generateUidFromEmail(cleanEmail);
  }
  const myReferCode = generateReferCodeFromEmail(cleanEmail);
  let inviterCode = (referCode && String(referCode).trim()) ? String(referCode).trim() : '';

  // Anti-fraud: prevent self-referral
  if (inviterCode && (inviterCode === myReferCode || inviterCode === cleanEmail || inviterCode === uid)) {
    inviterCode = '';
  }

  // Also check if inviterCode matches self
  const potentialInviter = inviterCode ? findUserByReferCode(inviterCode) : null;
  if (potentialInviter && (potentialInviter.uid === uid || potentialInviter.email.toLowerCase() === cleanEmail)) {
    inviterCode = '';
  }

  const newUser = {
    uid,
    email: cleanEmail,
    password: password || '',
    referCode: myReferCode,
    referredBy: inviterCode,
    balance: 0,
    totalDeposit: 0,
    totalDeposited: 0,
    totalBets: 0,
    turnover: 0,
    isValid: false,
    referralStatus: 'REGISTERED',
    claimedChests: [],
    avatar: DEFAULT_AVATAR,
    username: cleanEmail.split('@')[0],
    displayName: cleanEmail.split('@')[0],
    createdAt: new Date().toISOString()
  };

  registeredUsers[cleanEmail] = newUser;
  userBalances.set(uid, 0);
  userBalances.set(cleanEmail, 0);
  saveJsonFile(USERS_FILE, registeredUsers);

  // If referred by someone, record in referrals table with REGISTERED status
  if (inviterCode) {
    const inviterUser = findUserByReferCode(inviterCode);
    const recId = `ref_${inviterUser ? inviterUser.uid : inviterCode}_${uid}`;
    
    // Immutable referral record
    if (!referralsTable[recId]) {
      referralsTable[recId] = {
        id: recId,
        referrer_id: inviterUser ? inviterUser.uid : `agent_${inviterCode}`,
        referrer_email: inviterUser ? inviterUser.email : '',
        referred_user_id: uid,
        referred_email: cleanEmail,
        referral_code: inviterCode,
        status: 'REGISTERED',
        total_deposit: 0,
        qualifying_bet_volume: 0,
        created_at: newUser.createdAt,
        qualified_at: null
      };
      saveJsonFile(REFERRALS_TABLE_FILE, referralsTable);
    }

    if (!referralStore[inviterCode]) referralStore[inviterCode] = [];
    const existingIndex = referralStore[inviterCode].findIndex(r => r.uid === uid || r.email === cleanEmail);
    const refEntry = {
      id: recId,
      uid,
      email: cleanEmail,
      totalDeposit: 0,
      totalBets: 0,
      isValid: false,
      status: 'REGISTERED',
      date: newUser.createdAt,
      qualified_at: null
    };
    if (existingIndex >= 0) {
      referralStore[inviterCode][existingIndex] = refEntry;
    } else {
      referralStore[inviterCode].push(refEntry);
    }
    saveJsonFile(REFERRALS_FILE, referralStore);
  }

  res.status(201).json({
    success: true,
    user: newUser,
    message: 'User registered successfully'
  });
});

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password, username } = req.body || {};
  const queryEmail = (email || username || '').toLowerCase().trim();
  if (!queryEmail) {
    return res.status(400).json({ error: 'Email or username is required', code: 'auth/invalid-email' });
  }

  const user = findUserByIdOrEmail(queryEmail);

  if (!user) {
    return res.status(404).json({
      error: 'No account found with this Gmail in backend. Please register first.',
      code: 'auth/user-not-found'
    });
  }

  if (!password) {
    return res.status(400).json({
      error: 'Password is required.',
      code: 'auth/missing-password'
    });
  }

  // If user has password stored, verify strictly
  if (user.password && user.password !== password) {
    return res.status(401).json({
      error: 'Incorrect password. Please try again.',
      code: 'auth/wrong-password'
    });
  }

  // Ensure balance and referral claims are synced
  const liveBal = userBalances.get(user.uid) ?? user.balance ?? 0;
  user.balance = liveBal;
  const claims = getUserClaims(user.email, user.uid, user.referCode);
  user.claimedChests = claims.claimedChests;
  user.claimedCommission = claims.claimedCommission;
  user.claimedChestBonus = claims.claimedChestBonus;

  res.json({
    success: true,
    user,
    message: 'Login successful'
  });
});

// --- Transaction-Based Tracking & Qualification Endpoints ---

// Record and process a deposit transaction (Authoritative & Idempotent)
app.post('/api/transactions/deposit', (req, res) => {
  const { transaction_id, transactionId, depositId, user_id, userId, uid: rawUid, user_email, userEmail, email: rawEmail, amount, status } = req.body || {};
  const amt = Number(amount || 0);

  if (amt <= 0) {
    return res.status(400).json({ error: 'Valid deposit amount required (> 0)' });
  }

  const rawUserId = user_id || userId || rawUid || '';
  const cleanEmail = (user_email || userEmail || rawEmail || '').toLowerCase().trim();
  const user = findUserByIdOrEmail(rawUserId || cleanEmail);
  const uid = user ? user.uid : (rawUserId || `usr_${Date.now()}`);

  const txnId = transaction_id || transactionId || depositId || `txn_dep_${uid}_${Date.now()}_${Math.floor(Math.random()*1000)}`;

  // Idempotency check
  if (transactionsStore[txnId]) {
    const existing = transactionsStore[txnId];
    return res.json({
      success: true,
      idempotent: true,
      transaction: existing,
      qualification: checkReferralQualification(uid)
    });
  }

  const txnRecord = {
    transaction_id: txnId,
    user_id: uid,
    user_email: user ? user.email : cleanEmail,
    type: 'DEPOSIT',
    amount: amt,
    status: status || 'COMPLETED',
    created_at: new Date().toISOString()
  };

  transactionsStore[txnId] = txnRecord;
  saveJsonFile(TRANSACTIONS_FILE, transactionsStore);

  // Recompute user totals
  const newTotalDeposit = calculateVerifiedUserDeposits(uid);
  if (user) {
    user.totalDeposit = newTotalDeposit;
    user.totalDeposited = newTotalDeposit;
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  // Authoritative qualification re-check
  const qualResult = checkReferralQualification(uid);

  res.json({
    success: true,
    transaction: txnRecord,
    total_deposit: newTotalDeposit,
    qualification: qualResult
  });
});

// Record and process a betting transaction (Authoritative & Idempotent)
app.post('/api/transactions/bet', (req, res) => {
  const { transaction_id, user_id, userId, uid: rawUid, user_email, userEmail, email: rawEmail, amount, game_id, status } = req.body || {};
  const amt = Number(amount || 0);

  if (amt <= 0) {
    return res.status(400).json({ error: 'Valid bet amount required (> 0)' });
  }

  const cleanEmail = (user_email || userEmail || rawEmail || '').toLowerCase().trim();
  const rawUserId = user_id || userId || rawUid || '';
  const user = findUserByIdOrEmail(rawUserId || cleanEmail);
  const uid = user ? user.uid : (rawUserId || `usr_${Date.now()}`);

  const txnId = transaction_id || `txn_bet_${uid}_${Date.now()}_${Math.floor(Math.random()*1000)}`;

  // Idempotency check
  if (transactionsStore[txnId]) {
    const existing = transactionsStore[txnId];
    return res.json({
      success: true,
      idempotent: true,
      transaction: existing,
      qualification: checkReferralQualification(uid)
    });
  }

  // Deduplication check: if a bet of the exact same amount for this user occurred within 1200ms, treat as duplicate
  const nowMs = Date.now();
  const recentBet = Object.values(transactionsStore).find(t => 
    t && t.user_id === uid && 
    t.type === 'BET' && 
    Math.abs(Number(t.amount || 0) - amt) < 0.001 && 
    (nowMs - new Date(t.created_at).getTime()) < 1200
  );
  if (recentBet) {
    return res.json({
      success: true,
      idempotent: true,
      transaction: recentBet,
      qualifying_bet_volume: calculateVerifiedUserBetVolume(uid),
      qualification: checkReferralQualification(uid)
    });
  }

  const txnRecord = {
    transaction_id: txnId,
    user_id: uid,
    user_email: user ? user.email : cleanEmail,
    game_id: game_id || 'casino_game',
    type: 'BET',
    amount: amt,
    status: status || 'SETTLED',
    created_at: new Date().toISOString()
  };

  transactionsStore[txnId] = txnRecord;
  saveJsonFile(TRANSACTIONS_FILE, transactionsStore);

  // Recompute user totals
  const newBetVolume = calculateVerifiedUserBetVolume(uid);
  if (user) {
    user.totalBets = newBetVolume;
    user.turnover = newBetVolume;
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  // Authoritative qualification re-check
  const qualResult = checkReferralQualification(uid);

  res.json({
    success: true,
    transaction: txnRecord,
    qualifying_bet_volume: newBetVolume,
    qualification: qualResult
  });
});

// Reverse/Void a transaction (Anti-Fraud Edge Case)
app.post('/api/transactions/reverse', (req, res) => {
  const { transaction_id, reason } = req.body || {};
  if (!transaction_id || !transactionsStore[transaction_id]) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const txn = transactionsStore[transaction_id];
  txn.status = 'REVERSED';
  txn.reversed_at = new Date().toISOString();
  txn.reverse_reason = reason || 'Admin / Security Reversal';
  saveJsonFile(TRANSACTIONS_FILE, transactionsStore);

  // Re-evaluate qualification
  const qualResult = checkReferralQualification(txn.user_id);

  res.json({
    success: true,
    transaction: txn,
    qualification: qualResult
  });
});

// Update deposit or bet activity of a referred user (Sync helper)
app.post('/api/referrals/update-activity', (req, res) => {
  const { referredUid, referredEmail, deposit, bets } = req.body || {};
  const cleanEmail = (referredEmail || '').toLowerCase().trim();
  const user = findUserByIdOrEmail(referredUid || cleanEmail);
  const uid = user ? user.uid : (referredUid || cleanEmail);

  if (typeof deposit === 'number' && deposit > 0) {
    const txnId = `txn_dep_sync_${uid}_${Date.now()}`;
    transactionsStore[txnId] = {
      transaction_id: txnId,
      user_id: uid,
      user_email: user ? user.email : cleanEmail,
      type: 'DEPOSIT',
      amount: deposit,
      status: 'COMPLETED',
      created_at: new Date().toISOString()
    };
  }

  if (typeof bets === 'number' && bets > 0) {
    const txnId = `txn_bet_sync_${uid}_${Date.now()}`;
    transactionsStore[txnId] = {
      transaction_id: txnId,
      user_id: uid,
      user_email: user ? user.email : cleanEmail,
      type: 'BET',
      amount: bets,
      status: 'SETTLED',
      created_at: new Date().toISOString()
    };
  }

  saveJsonFile(TRANSACTIONS_FILE, transactionsStore);

  if (user) {
    if (typeof deposit === 'number') {
      user.totalDeposit = deposit;
      user.totalDeposited = deposit;
    }
    if (typeof bets === 'number') {
      user.totalBets = bets;
      user.turnover = bets;
    }
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  const qualResult = checkReferralQualification(uid);

  res.json({
    success: true,
    qualification: qualResult
  });
});

// Explicit Referral Track Route
app.post('/api/referrals/track', (req, res) => {
  const { referrerCode, referredUid, referredEmail, totalDeposit, totalBets, isValid } = req.body || {};
  const cleanRefCode = String(referrerCode || '').trim();
  const cleanEmail = String(referredEmail || '').toLowerCase().trim();
  const user = findUserByIdOrEmail(referredUid || cleanEmail);
  const uid = user ? user.uid : (referredUid || (cleanEmail ? generateUidFromEmail(cleanEmail) : `usr_${Date.now()}`));

  if (!cleanRefCode) {
    return res.status(400).json({ error: 'Referrer code is required' });
  }

  const inviterUser = findUserByReferCode(cleanRefCode);
  const recId = `ref_${inviterUser ? inviterUser.uid : cleanRefCode}_${uid}`;

  let refRecord = referralsTable[recId];
  if (!refRecord) {
    refRecord = {
      id: recId,
      referrer_id: inviterUser ? inviterUser.uid : `agent_${cleanRefCode}`,
      referrer_email: inviterUser ? inviterUser.email : '',
      referred_user_id: uid,
      referred_email: cleanEmail,
      referral_code: cleanRefCode,
      status: (isValid || (Number(totalDeposit || 0) >= 500 && Number(totalBets || 0) >= 5000)) ? 'VALID' : 'REGISTERED',
      total_deposit: Number(totalDeposit || 0),
      qualifying_bet_volume: Number(totalBets || 0),
      created_at: new Date().toISOString(),
      qualified_at: (isValid || (Number(totalDeposit || 0) >= 500 && Number(totalBets || 0) >= 5000)) ? new Date().toISOString() : null
    };
    referralsTable[recId] = refRecord;
    saveJsonFile(REFERRALS_TABLE_FILE, referralsTable);
  }

  if (cleanEmail && registeredUsers[cleanEmail]) {
    if (!registeredUsers[cleanEmail].referredBy) {
      registeredUsers[cleanEmail].referredBy = cleanRefCode;
      saveJsonFile(USERS_FILE, registeredUsers);
    }
  }

  // Also sync to referralStore
  if (!referralStore[cleanRefCode]) referralStore[cleanRefCode] = [];
  const exIdx = referralStore[cleanRefCode].findIndex(r => r.uid === uid || (cleanEmail && r.email === cleanEmail));
  const storeItem = {
    uid: uid,
    email: cleanEmail,
    totalDeposit: Number(totalDeposit || 0),
    totalBets: Number(totalBets || 0),
    isValid: (isValid === true) || (Number(totalDeposit || 0) >= 500 && Number(totalBets || 0) >= 5000),
    date: new Date().toISOString()
  };
  if (exIdx >= 0) referralStore[cleanRefCode][exIdx] = storeItem;
  else referralStore[cleanRefCode].push(storeItem);
  saveJsonFile(REFERRALS_FILE, referralStore);

  const qualResult = checkReferralQualification(uid);

  res.json({
    success: true,
    qualification: qualResult
  });
});

// Robust referral collection helper that strictly deduplicates referrals across referralsTable, registeredUsers, and referralStore
function getReferralRecordsForInviter(checkCodes, excludeUserIds = []) {
  const normalizedCodes = (Array.isArray(checkCodes) ? checkCodes : [checkCodes])
    .map(c => String(c || '').trim().toLowerCase())
    .filter(Boolean);

  const matchedRecords = [];
  const seenIdentifiers = new Set();

  const excludeSet = new Set(
    (Array.isArray(excludeUserIds) ? excludeUserIds : [excludeUserIds])
      .map(id => String(id || '').trim().toLowerCase())
      .filter(Boolean)
  );

  // Find all identifiers for the inviter to prevent self-referral
  const inviterUids = new Set();
  const inviterEmails = new Set();
  const inviterCodes = new Set();

  normalizedCodes.forEach(c => {
    if (excludeSet.has(c)) return;
    inviterCodes.add(c);
    const u = findUserByIdOrEmail(c) || findUserByReferCode(c);
    if (u) {
      if (u.uid && !excludeSet.has(String(u.uid).toLowerCase().trim())) {
        inviterUids.add(String(u.uid).toLowerCase().trim());
      }
      if (u.email && !excludeSet.has(String(u.email).toLowerCase().trim())) {
        inviterEmails.add(String(u.email).toLowerCase().trim());
      }
      if (u.referCode && !excludeSet.has(String(u.referCode).toLowerCase().trim())) {
        inviterCodes.add(String(u.referCode).toLowerCase().trim());
      }
    }
  });

  function recordMatches(codeOrId) {
    if (!codeOrId) return false;
    const clean = String(codeOrId).trim().toLowerCase();
    if (excludeSet.has(clean)) return false;
    return inviterCodes.has(clean) || inviterUids.has(clean) || inviterEmails.has(clean);
  }

  function addMatchedUser(referredUserId, referredEmail, fallbackRecord = null) {
    const user = findUserByIdOrEmail(referredUserId) || findUserByIdOrEmail(referredEmail);
    const uid = user ? user.uid : (referredUserId ? String(referredUserId).trim() : '');
    const email = user && user.email ? user.email.toLowerCase().trim() : (referredEmail ? String(referredEmail).toLowerCase().trim() : '');

    const canonKey = uid || email;
    if (!canonKey) return;

    // Strictly exclude the inviter themselves and any excluded user IDs
    if ((uid && (inviterUids.has(uid.toLowerCase()) || excludeSet.has(uid.toLowerCase()))) || 
        (email && (inviterEmails.has(email.toLowerCase()) || excludeSet.has(email.toLowerCase())))) {
      return;
    }

    // Skip synthetic or lookup documents (e.g. email_... or lookup_...)
    if (referredUserId && (String(referredUserId).startsWith('email_') || String(referredUserId).startsWith('lookup_'))) {
      return;
    }
    if (user && user.isLookupDoc) {
      return;
    }

    if ((uid && seenIdentifiers.has(uid.toLowerCase())) || (email && seenIdentifiers.has(email.toLowerCase()))) {
      return;
    }
    if (uid) seenIdentifiers.add(uid.toLowerCase());
    if (email) seenIdentifiers.add(email.toLowerCase());

    const updated = checkReferralQualification(uid || email) || fallbackRecord;
    if (updated) {
      const recCopy = { ...updated };
      if (!recCopy.referred_email && email) recCopy.referred_email = email;
      if (!recCopy.referred_user_id && uid) recCopy.referred_user_id = uid;
      matchedRecords.push(recCopy);
    }
  }

  // 1. Collect from referralsTable
  for (const rId in referralsTable) {
    const r = referralsTable[rId];
    if (r && (recordMatches(r.referral_code) || recordMatches(r.referrer_id) || recordMatches(r.referrer_email))) {
      addMatchedUser(r.referred_user_id, r.referred_email, r);
    }
  }

  // 2. Collect from registeredUsers
  for (const em in registeredUsers) {
    const u = registeredUsers[em];
    if (u && u.referredBy && recordMatches(u.referredBy)) {
      addMatchedUser(u.uid, u.email, null);
    }
  }

  // 3. Collect from referralStore
  inviterCodes.forEach(c => {
    if (c && referralStore[c] && Array.isArray(referralStore[c])) {
      referralStore[c].forEach(sub => {
        if (!sub) return;
        addMatchedUser(sub.uid, sub.email, null);
      });
    }
  });

  return matchedRecords;
}

// Get Referral Stats & Detailed User Breakdown for a code
app.get(['/api/referrals/stats', '/api/referrals/stats/:code'], (req, res) => {
  const code = String(req.params.code || req.query.code || req.query.referCode || '').trim();
  const queryUid = String(req.query.uid || req.query.userId || '').trim();
  const queryEmail = String(req.query.email || '').toLowerCase().trim();

  // If empty, guest, or uninitialized code, return empty clean state immediately
  if (!code || code === 'Loading' || code === 'PK96-GUEST' || code === 'undefined' || code === 'null' || code === 'guest') {
    return res.json({
      success: true,
      totalCount: 0,
      validCount: 0,
      registeredCount: 0,
      depQualifiedCount: 0,
      betQualifiedCount: 0,
      conversionRate: 0,
      totalRefereeDeposits: 0,
      earnedCommission: 0,
      claimedCommission: 0,
      unclaimedCommission: 0,
      claimedChests: [],
      claimedChestBonus: 0,
      referredUsers: []
    });
  }

  const depThreshold = Number(referralConfig.deposit_threshold || 500);
  const betThreshold = Number(referralConfig.betting_volume_threshold || 5000);

  // Identify the caller: strictly prioritize queryEmail / queryUid to ensure caller's isolated scope
  const callerUser = (queryEmail ? registeredUsers[queryEmail] : null) || 
    (queryUid ? Object.values(registeredUsers).find(u => u.uid === queryUid) : null);

  let checkCodes = [];
  let excludeUserIds = [];

  if (callerUser) {
    // Authenticated caller: strictly inspect caller's OWN referral records
    if (callerUser.referCode) checkCodes.push(String(callerUser.referCode).trim());
    if (callerUser.uid) checkCodes.push(String(callerUser.uid).trim());
    if (callerUser.email) checkCodes.push(String(callerUser.email).toLowerCase().trim());
    const cleanReferredBy = callerUser.referredBy ? String(callerUser.referredBy).trim().toLowerCase() : '';
    excludeUserIds = [callerUser.uid, callerUser.email, cleanReferredBy].filter(Boolean);
  } else {
    // Anonymous check by referCode
    const targetUser = findUserByReferCode(code);
    if (targetUser) {
      if (targetUser.referCode) checkCodes.push(String(targetUser.referCode).trim());
      if (targetUser.uid) checkCodes.push(String(targetUser.uid).trim());
      if (targetUser.email) checkCodes.push(String(targetUser.email).toLowerCase().trim());
      excludeUserIds = [targetUser.uid, targetUser.email].filter(Boolean);
    } else {
      checkCodes = [code];
    }
  }

  // Deduplicated authoritative matched referrals for inviter
  const matchedRecords = getReferralRecordsForInviter(checkCodes, excludeUserIds);

  // Build client-safe referred users list with progress information
  const referredUsers = matchedRecords.map((rec, idx) => {
    const dep = Number(rec.total_deposit || 0);
    const bet = Number(rec.qualifying_bet_volume || 0);
    const status = rec.status || ((dep >= depThreshold && bet >= betThreshold) ? 'VALID' : 'REGISTERED');
    const isValid = (status === 'VALID') || (dep >= depThreshold && bet >= betThreshold);

    // Create a safe, anonymous display tag (e.g. User #1042 or Masked UID)
    const rawId = rec.referred_user_id || String(idx + 1001);
    const numPart = rawId.replace(/[^0-9]/g, '') || String(1000 + idx + 1);
    const maskedTag = `User #${numPart.slice(-4) || (1040 + idx)}`;

    return {
      id: rec.id || `ref_${rawId}`,
      uid: rec.referred_user_id || rawId,
      email: rec.referred_email || '',
      userTag: maskedTag,
      status: status,
      isValid: isValid,
      totalDeposit: dep,
      totalBets: bet,
      depositProgress: `${Math.min(dep, depThreshold)} / ${depThreshold} PKR`,
      bettingProgress: `${Math.min(bet, betThreshold).toLocaleString()} / ${betThreshold.toLocaleString()} PKR`,
      depositProgressPercent: Math.min(100, Math.round((dep / depThreshold) * 100)),
      bettingProgressPercent: Math.min(100, Math.round((bet / betThreshold) * 100)),
      depositMet: dep >= depThreshold,
      bettingMet: bet >= betThreshold,
      createdAt: rec.created_at,
      qualifiedAt: rec.qualified_at
    };
  });

  const totalCount = referredUsers.length;
  const validCount = referredUsers.filter(r => r.isValid).length;
  const registeredCount = referredUsers.filter(r => r.status === 'REGISTERED').length;
  const depQualifiedCount = referredUsers.filter(r => r.status === 'DEPOSIT_QUALIFIED').length;
  const betQualifiedCount = referredUsers.filter(r => r.status === 'BETTING_QUALIFIED').length;
  const pendingCount = totalCount - validCount;
  const conversionRate = totalCount > 0 ? Math.round((validCount / totalCount) * 10000) / 100 : 0;

  // Exact 1.5% referral deposit commission calculation: STRICTLY 0 if total referee deposits are 0
  const totalRefereeDeposits = referredUsers.reduce((sum, r) => sum + Number(r.totalDeposit || 0), 0);
  const earnedCommission = totalRefereeDeposits > 0 ? Math.round((totalRefereeDeposits * 0.015) * 100) / 100 : 0;

  // Authoritative Claims Store integration
  const claimsIds = checkCodes;
  const userClaims = getUserClaims(...claimsIds);
  const totalClaimedCommission = Math.max(
    userClaims.claimedCommission,
    callerUser ? Number(callerUser.claimedCommission || 0) : 0
  );
  const totalClaimedChests = Array.from(new Set([
    ...userClaims.claimedChests,
    ...(callerUser && Array.isArray(callerUser.claimedChests) ? callerUser.claimedChests : [])
  ])).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
  
  const availableCommission = totalRefereeDeposits > 0 
    ? Math.max(0, Math.round((earnedCommission - totalClaimedCommission) * 100) / 100)
    : 0;

  res.json({
    success: true,
    code: callerUser && callerUser.referCode ? callerUser.referCode : code,
    config: {
      deposit_threshold: depThreshold,
      betting_volume_threshold: betThreshold,
      currency: referralConfig.currency || 'PKR'
    },
    totalCount,
    validCount,
    pendingCount,
    registeredCount,
    depQualifiedCount,
    betQualifiedCount,
    conversionRate,
    totalRefereeDeposits,
    earnedCommission: earnedCommission,
    claimedCommission: totalClaimedCommission,
    claimedChests: totalClaimedChests,
    claimedChestBonus: userClaims.claimedChestBonus,
    availableCommission,
    unclaimedCommission: availableCommission,
    referredUsers
  });
});

// Admin Referral Overview & Dashboard Endpoint
app.get('/api/admin/referrals/overview', (req, res) => {
  const depThreshold = Number(referralConfig.deposit_threshold || 500);
  const betThreshold = Number(referralConfig.betting_volume_threshold || 5000);

  // Re-check all records
  checkAllReferralsQualification();

  const allRecords = Object.values(referralsTable);

  let totalDeposited = 0;
  let totalBetVolume = 0;
  let validCount = 0;
  let registeredCount = 0;
  let depQualifiedCount = 0;
  let betQualifiedCount = 0;

  const enrichedRecords = allRecords.map(r => {
    const dep = Number(r.total_deposit || 0);
    const bet = Number(r.qualifying_bet_volume || 0);
    totalDeposited += dep;
    totalBetVolume += bet;

    if (r.status === 'VALID') validCount++;
    else if (r.status === 'DEPOSIT_QUALIFIED') depQualifiedCount++;
    else if (r.status === 'BETTING_QUALIFIED') betQualifiedCount++;
    else registeredCount++;

    return {
      ...r,
      deposit_met: dep >= depThreshold,
      betting_met: bet >= betThreshold,
      deposit_threshold: depThreshold,
      betting_threshold: betThreshold
    };
  });

  const totalReferrals = enrichedRecords.length;
  const conversionRate = totalReferrals > 0 ? Math.round((validCount / totalReferrals) * 10000) / 100 : 0;

  res.json({
    success: true,
    stats: {
      total_referrals: totalReferrals,
      registered_referrals: registeredCount,
      deposit_qualified_referrals: depQualifiedCount,
      betting_qualified_referrals: betQualifiedCount,
      valid_referrals: validCount,
      total_deposited_pkr: Math.round(totalDeposited * 100) / 100,
      total_qualifying_bet_volume_pkr: Math.round(totalBetVolume * 100) / 100,
      conversion_rate: conversionRate
    },
    config: referralConfig,
    records: enrichedRecords
  });
});

// Admin Update Config Thresholds Endpoint
app.post('/api/admin/referrals/config', (req, res) => {
  const { deposit_threshold, betting_volume_threshold } = req.body || {};

  if (typeof deposit_threshold === 'number' && deposit_threshold > 0) {
    referralConfig.deposit_threshold = Math.round(deposit_threshold);
  }
  if (typeof betting_volume_threshold === 'number' && betting_volume_threshold > 0) {
    referralConfig.betting_volume_threshold = Math.round(betting_volume_threshold);
  }

  saveJsonFile(CONFIG_FILE, referralConfig);

  // Recalculate all referrals with new thresholds
  const updatedRecords = checkAllReferralsQualification();

  res.json({
    success: true,
    config: referralConfig,
    updatedCount: updatedRecords.length,
    message: 'Referral qualification thresholds updated and all records re-evaluated.'
  });
});

// Claim Milestone Chest & Commission Endpoints

// Dedicated User Claims Lookup Endpoint (Used by client to instantly get claims across browsers)
app.get('/api/referrals/claims', (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  const uid = (req.query.uid || '').trim();
  const referCode = (req.query.referCode || req.query.code || '').trim();

  const user = (email && registeredUsers[email]) || 
    (uid ? Object.values(registeredUsers).find(u => u.uid === uid) : null) || 
    (referCode ? findUserByReferCode(referCode) : null);

  const allIds = [email, uid, referCode, user?.email, user?.uid, user?.referCode].filter(Boolean);
  const claims = getUserClaims(...allIds);

  const claimedChests = Array.from(new Set([
    ...claims.claimedChests,
    ...(user && Array.isArray(user.claimedChests) ? user.claimedChests : [])
  ])).map(Number).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);

  const claimedCommission = Math.max(
    claims.claimedCommission,
    user ? Number(user.claimedCommission || 0) : 0
  );

  const claimedChestBonus = Math.max(
    claims.claimedChestBonus,
    user ? Number(user.claimedChestBonus || 0) : 0
  );

  res.json({
    success: true,
    claimedChests,
    claimedCommission,
    claimedChestBonus,
    lastCommissionClaimDate: user ? user.lastCommissionClaimDate : null
  });
});

// Claim Referral Deposit Commission Endpoint (1.5% of referrers' / referees' deposit amount)
app.post('/api/referrals/claim-commission', (req, res) => {
  const { userEmail, userUid, amount, currentBalance, email, userId } = req.body || {};

  const cleanEmail = (userEmail || email || '').toLowerCase().trim();
  const effectiveUid = userUid || userId || '';
  const clientBal = (typeof currentBalance === 'number' && !isNaN(currentBalance)) ? currentBalance : 0;
  const user = ensureUserAccount(cleanEmail, effectiveUid, '', clientBal);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'You must be logged in to claim commission.'
    });
  }

  // Strictly use user's authentic identity from database, NEVER client-supplied referCode
  const userReferCode = user.referCode ? String(user.referCode).trim() : '';
  const cleanReferredBy = user.referredBy ? String(user.referredBy).trim().toLowerCase() : '';

  const checkCodes = [
    userReferCode || null,
    user.uid ? String(user.uid).trim() : null,
    user.email ? String(user.email).toLowerCase().trim() : null
  ].filter(Boolean);

  const excludeUserIds = [user.uid, user.email, cleanReferredBy].filter(Boolean);

  const allIds = Array.from(new Set([cleanEmail, effectiveUid, user.email, user.uid, userReferCode].filter(Boolean)));
  const existingClaims = getUserClaims(...allIds);

  // Authoritative matched referrals invited BY this user
  const matchedRecords = getReferralRecordsForInviter(checkCodes, excludeUserIds);
  const serverRefDeposits = matchedRecords.reduce((sum, r) => sum + Number(r.total_deposit || 0), 0);
  const requestedClaimAmount = Math.max(0, Number(amount || 0));

  const currentClaimed = Math.max(
    existingClaims.claimedCommission,
    Number(user.claimedCommission || 0)
  );

  // Calculate earned commission from referee deposits (1.5%)
  const totalEarnedCommission = Math.round((serverRefDeposits * 0.015) * 100) / 100;
  const availableToClaim = Math.max(0, Math.round((totalEarnedCommission - currentClaimed) * 100) / 100);

  if (availableToClaim <= 0) {
    return res.status(400).json({
      error: 'No unclaimed commission available to claim. You earn 1.5% commission when your referred users deposit!',
      availableCommission: 0,
      claimedCommission: currentClaimed
    });
  }

  let claimAmt = availableToClaim;
  if (requestedClaimAmount > 0 && requestedClaimAmount <= availableToClaim) {
    claimAmt = requestedClaimAmount;
  }

  claimAmt = Math.max(0, Math.round(Number(claimAmt || 0) * 100) / 100);
  const newClaimedCommission = Math.round((currentClaimed + claimAmt) * 100) / 100;

  // Derive authoritative base balance before claim
  const baseBal = (typeof clientBal === 'number' && !isNaN(clientBal) && clientBal >= 0)
    ? clientBal
    : Math.max(userBalances.get(user.uid) ?? 0, user.balance ?? 0, 0);

  user.claimedCommission = newClaimedCommission;
  user.unclaimedCommission = 0;
  user.balance = Math.round((baseBal + claimAmt) * 100) / 100;
  user.lastCommissionClaimDate = new Date().toISOString();
  userBalances.set(user.uid, user.balance);
  if (user.email) userBalances.set(user.email.toLowerCase().trim(), user.balance);
  saveJsonFile(USERS_FILE, registeredUsers);
  const calculatedNewBalance = user.balance;

  // Persist authoritatively across all user identifiers
  saveUserClaims(allIds, {
    claimedChests: existingClaims.claimedChests,
    claimedChestBonus: existingClaims.claimedChestBonus,
    claimedCommission: newClaimedCommission
  });

  res.json({
    success: true,
    claimedAmount: claimAmt,
    amount: claimAmt,
    newBalance: calculatedNewBalance,
    claimedCommission: newClaimedCommission,
    isClaimWindow: true
  });
});

app.post('/api/referrals/claim-chest', (req, res) => {
  const { userEmail, userUid, chestIndex, currentBalance, email, userId } = req.body || {};
  const idx = parseInt(chestIndex, 10);
  if (isNaN(idx) || idx < 1 || idx > 100) {
    return res.status(400).json({ error: 'Valid chestIndex (1-100) is required' });
  }

  const cleanEmail = (userEmail || email || '').toLowerCase().trim();
  const effectiveUid = userUid || userId || '';
  const clientBal = (typeof currentBalance === 'number' && !isNaN(currentBalance)) ? currentBalance : 0;
  const user = ensureUserAccount(cleanEmail, effectiveUid, '', clientBal);

  if (!user) {
    return res.status(401).json({ error: 'You must be logged in to claim chest rewards.' });
  }

  // Strictly derive check codes from authenticated user's own identity, NEVER request body
  const userReferCode = user.referCode ? String(user.referCode).trim() : '';
  const cleanReferredBy = user.referredBy ? String(user.referredBy).trim().toLowerCase() : '';

  const checkCodes = [
    userReferCode || null,
    user.uid ? String(user.uid).trim() : null,
    user.email ? String(user.email).toLowerCase().trim() : null
  ].filter(Boolean);

  const excludeUserIds = [user.uid, user.email, cleanReferredBy].filter(Boolean);

  const allIds = Array.from(new Set([cleanEmail, effectiveUid, user.email, user.uid, userReferCode].filter(Boolean)));
  const existingClaims = getUserClaims(...allIds);

  // Authoritatively calculate valid referrals invited BY this user
  const matchedRecords = getReferralRecordsForInviter(checkCodes, excludeUserIds);
  let validCount = 0;
  matchedRecords.forEach(qual => {
    const dep = Number(qual.total_deposit || 0);
    const bet = Number(qual.qualifying_bet_volume || 0);
    if (qual.status === 'VALID' || (dep >= 500 && bet >= 5000)) {
      validCount++;
    }
  });

  // Strict milestone unlock requirement: chest #idx requires at least idx valid referrals!
  if (idx > validCount) {
    return res.status(400).json({
      error: `Chest #${idx} is locked! You need ${idx - validCount} more valid referral(s) (Deposit ≥ 500 PKR & Bets ≥ 5,000 PKR) to unlock it.`,
      validCount,
      requiredValid: idx
    });
  }

  // Strict check against already claimed chests: NEVER allow re-claim
  if (existingClaims.claimedChests.includes(idx) || (Array.isArray(user.claimedChests) && user.claimedChests.map(Number).includes(idx))) {
    return res.status(400).json({
      error: `Chest #${idx} is already claimed!`,
      alreadyClaimed: true,
      claimedChests: existingClaims.claimedChests
    });
  }

  // Consistent, deterministic bonus: 500 base + (idx - 1) * 100, up to 5,000 max (never random!)
  const bonus = Math.min(5000, 500 + (idx - 1) * 100);

  const newChests = Array.from(new Set([...existingClaims.claimedChests, idx])).sort((a, b) => a - b);
  const newBonus = Math.round((existingClaims.claimedChestBonus + bonus) * 100) / 100;

  user.claimedChests = newChests;
  user.claimedChestBonus = newBonus;
  const curBal = Math.max(
    userBalances.get(user.uid) ?? 0,
    user.balance ?? 0,
    clientBal
  );
  const newBalance = Math.round((curBal + bonus) * 100) / 100;
  user.balance = newBalance;
  userBalances.set(user.uid, newBalance);
  userBalances.set(cleanEmail, newBalance);
  saveJsonFile(USERS_FILE, registeredUsers);

  // Persist authoritatively across all user identifiers
  saveUserClaims(allIds, {
    claimedChests: newChests,
    claimedChestBonus: newBonus,
    claimedCommission: existingClaims.claimedCommission
  });

  res.json({
    success: true,
    chestIndex: idx,
    bonus,
    newBalance: user.balance,
    claimedChests: newChests,
    claimedChestBonus: newBonus
  });
});

// Batch Claim Referral Chests Endpoint (Atomically claims all unlocked unclaimed chests)
app.post('/api/referrals/claim-chests-batch', (req, res) => {
  const { userEmail, userUid, email, userId, currentBalance } = req.body || {};
  const cleanEmail = (userEmail || email || '').toLowerCase().trim();
  const effectiveUid = userUid || userId || '';
  const clientBal = (typeof currentBalance === 'number' && !isNaN(currentBalance)) ? currentBalance : 0;
  const user = ensureUserAccount(cleanEmail, effectiveUid, '', clientBal);

  if (!user) {
    return res.status(401).json({ error: 'You must be logged in to claim chest rewards.' });
  }

  // Strictly derive check codes from authenticated user's own identity, NEVER request body
  const userReferCode = user.referCode ? String(user.referCode).trim() : '';
  const cleanReferredBy = user.referredBy ? String(user.referredBy).trim().toLowerCase() : '';

  const checkCodes = [
    userReferCode || null,
    user.uid ? String(user.uid).trim() : null,
    user.email ? String(user.email).toLowerCase().trim() : null
  ].filter(Boolean);

  const excludeUserIds = [user.uid, user.email, cleanReferredBy].filter(Boolean);

  const allIds = Array.from(new Set([cleanEmail, effectiveUid, user.email, user.uid, userReferCode].filter(Boolean)));
  const existingClaims = getUserClaims(...allIds);

  // Authoritatively calculate valid referrals invited BY this user
  const matchedRecords = getReferralRecordsForInviter(checkCodes, excludeUserIds);
  let validCount = 0;
  matchedRecords.forEach(qual => {
    const dep = Number(qual.total_deposit || 0);
    const bet = Number(qual.qualifying_bet_volume || 0);
    if (qual.status === 'VALID' || (dep >= 500 && bet >= 5000)) {
      validCount++;
    }
  });

  const alreadyClaimedSet = new Set([
    ...existingClaims.claimedChests,
    ...(Array.isArray(user.claimedChests) ? user.claimedChests.map(Number) : [])
  ]);

  const newlyClaimedChests = [];
  let totalBonus = 0;

  // Claim all unlocked unclaimed chests strictly up to validCount
  for (let i = 1; i <= validCount; i++) {
    if (!alreadyClaimedSet.has(i)) {
      newlyClaimedChests.push(i);
      const chestBonus = Math.min(5000, 500 + (i - 1) * 100);
      totalBonus += chestBonus;
    }
  }

  if (newlyClaimedChests.length === 0) {
    if (validCount === 0) {
      return res.status(400).json({
        error: 'You have 0 valid referrals. Invite friends to deposit ≥ 500 PKR & bet ≥ 5,000 PKR to unlock milestone chests!',
        validCount: 0,
        alreadyClaimed: false
      });
    }
    return res.status(400).json({
      error: 'All unlocked chests have already been claimed!',
      alreadyClaimed: true,
      claimedChests: Array.from(alreadyClaimedSet).sort((a, b) => a - b),
      validCount: validCount
    });
  }

  const mergedChests = Array.from(new Set([...alreadyClaimedSet, ...newlyClaimedChests])).sort((a, b) => a - b);
  const newBonusTotal = Math.round((existingClaims.claimedChestBonus + totalBonus) * 100) / 100;
  let newBalance = 0;

  if (user) {
    user.claimedChests = mergedChests;
    user.claimedChestBonus = newBonusTotal;
    const curBal = Math.max(
      userBalances.get(user.uid) ?? 0,
      user.balance ?? 0,
      clientBal
    );
    newBalance = Math.round((curBal + totalBonus) * 100) / 100;
    user.balance = newBalance;
    userBalances.set(user.uid, newBalance);
    userBalances.set(cleanEmail, newBalance);
    saveJsonFile(USERS_FILE, registeredUsers);
  } else {
    newBalance = Math.round((clientBal + totalBonus) * 100) / 100;
  }

  saveUserClaims(allIds, {
    claimedChests: mergedChests,
    claimedChestBonus: newBonusTotal,
    claimedCommission: existingClaims.claimedCommission
  });

  res.json({
    success: true,
    claimedCount: newlyClaimedChests.length,
    claimedChests: mergedChests,
    newlyClaimedChests,
    totalBonus,
    newBalance: user ? user.balance : newBalance,
    claimedChestBonus: newBonusTotal
  });
});

// Environment Detection Helper
function getEnvironmentInfo() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true' || !!process.env.FIRESTORE_EMULATOR_HOST;

  return {
    environment: isProduction ? 'production' : 'development',
    platform: isLocal ? 'localhost' : 'cloud_run',
    isLocal,
    isProduction,
    useEmulator,
    emulators: {
      firestore: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
      auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099'
    }
  };
}

// Healthcheck
app.get('/api/health', (req, res) => {
  const envInfo = getEnvironmentInfo();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    gamesCount: 11,
    ...envInfo
  });
});

// App / Firebase Configuration (supports environment variables and backend config)
app.get('/api/config', (req, res) => {
  let fileConfig = {};
  try {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.warn("Notice reading firebase-applet-config.json:", err.message);
  }

  const envInfo = getEnvironmentInfo();

  const rawDbId = process.env.FIRESTORE_DATABASE_ID || fileConfig.firestoreDatabaseId || "(default)";
  let sanitizedDbId = typeof rawDbId === 'string' ? rawDbId.trim().replace(/^["']|["']$/g, '') : "(default)";
  if (!sanitizedDbId || sanitizedDbId.includes('/') || sanitizedDbId.startsWith('http')) {
    sanitizedDbId = "(default)";
  }

  // Prefer environment variables over static file defaults
  const firebaseConfig = {
    apiKey: (process.env.FIREBASE_API_KEY || fileConfig.apiKey || "AIzaSyDUSi0mM3bYMEozFD3Ahh0vUZ5gBG1dNTU").replace(/^["']|["']$/g, ''),
    authDomain: (process.env.FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || "flappy77777.firebaseapp.com").replace(/^["']|["']$/g, ''),
    projectId: (process.env.FIREBASE_PROJECT_ID || fileConfig.projectId || "flappy77777").replace(/^["']|["']$/g, ''),
    storageBucket: (process.env.FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || "flappy77777.firebasestorage.app").replace(/^["']|["']$/g, ''),
    messagingSenderId: (process.env.FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || "393994889085").replace(/^["']|["']$/g, ''),
    appId: (process.env.FIREBASE_APP_ID || fileConfig.appId || "1:393994889085:web:61132fe75fe3df840e4e14").replace(/^["']|["']$/g, ''),
    firestoreDatabaseId: sanitizedDbId
  };

  res.json({
    firebaseConfig,
    ...envInfo
  });
});

// List of available games
app.get('/api/games', (req, res) => {
  res.json([
    { id: 'chicken_road', name: 'Chicken Road Russia', file: 'chicken_road.html', alias: '/chicken_road' },
    { id: 'aviator', name: 'Aviator', file: 'aviator.html', alias: '/aviator' },
    { id: 'rocket_mines', name: 'Rocket Mines', file: 'rocket_mines.html', alias: '/rocket_mines' },
    { id: 'neon_spins', name: 'Neon Spins', file: 'neon_spins.html', alias: '/neon_spins' },
    { id: 'desert_axe', name: 'Desert Axe', file: 'desert_axe.html', alias: '/desert_axe' },
    { id: 'desert_fortune', name: 'Desert Fortune', file: 'desert_fortune.html', alias: '/desert_fortune' },
    { id: 'flappy_checkpoint', name: 'Flappy Checkpoint', file: 'flappy_checkpoint.html', alias: '/flappy_checkpoint' },
    { id: 'ladder_and_snakes', name: 'Ladder and Snakes', file: 'ladder_and_snakes.html', alias: '/ladder_and_snakes' },
    { id: 'snakes_and_ladders_2', name: 'Snakes and Ladders 2', file: 'snakes_and_ladders_2.html', alias: '/snakes_and_ladders_2' },
    { id: 'tik_tak_win', name: 'Tik Tak Win', file: 'tik_tak_win.html', alias: '/tik_tak_win' },
    { id: 'glass_roulette', name: 'Glass Roulette', file: 'glass_roulette.html', alias: '/glass_roulette' },
    { id: 'astro_crash', name: 'Astro Crash', file: 'astro_crash.html', alias: '/astro_crash' },
    { id: 'dwarves_mine', name: 'Dwarves Mine Slot', file: 'dwarves_mine.html', alias: '/dwarves_mine' },
    { id: 'final_survival', name: 'Final Survival Slot', file: 'final_survival.html', alias: '/final_survival' },
    { id: 'football_bet', name: 'Football Bet Land', file: 'football_bet.html', alias: '/football_bet' },
    { id: 'halloween_crash', name: 'Halloween Crash', file: 'halloween_crash.html', alias: '/halloween_crash' },
    { id: '10000_bc', name: '10000 BC Slot', file: '10000_bc.html', alias: '/10000_bc' },
    { id: 'mayan_temple_slot', name: 'Mayan Temple Slot', file: 'mayan_temple_slot.html', alias: '/mayan_temple_slot' },
    { id: 'stairway_to_wealth', name: 'Stairway to Wealth', file: 'stairway_to_wealth.html', alias: '/stairway_to_wealth' },
    { id: 'penalty_nations_cup', name: 'Penalty Nations Cup', file: 'penalty_nations_cup.html', alias: '/penalty_nations_cup' },
    { id: 'super_soccer_slots', name: 'Super Soccer Slots', file: 'super_soccer_slots.html', alias: '/super_soccer_slots' },
    { id: 'prehistory_slots', name: 'Pre-History Slots', file: 'prehistory_slots.html', alias: '/prehistory_slots' },
    { id: 'mummy_slot', name: 'The Mummy Slot', file: 'mummy_slot.html', alias: '/mummy_slot' }
  ]);
});

// Balance state sync endpoint (backend fallback)
app.post('/api/balance/sync', (req, res) => {
  const { userId, balance, change, action } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  let currentBal = userBalances.get(userId) || 0;
  if (typeof balance === 'number' && !isNaN(balance)) {
    currentBal = Math.max(0, balance);
  } else if (typeof change === 'number' && !isNaN(change)) {
    currentBal = Math.max(0, currentBal + change);
  }

  userBalances.set(userId, currentBal);
  res.json({ success: true, userId, balance: currentBal, action: action || 'sync' });
});

app.get('/api/balance/:userId', (req, res) => {
  const userId = req.params.userId;
  const balance = userBalances.get(userId) ?? 0;
  res.json({ userId, balance });
});

// Proxy for slot remote.php and external game API requests
app.all('/api/proxy-remote', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'url parameter is required' });
  try {
    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    const data = await fetchRes.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/json');
    res.status(fetchRes.status).send(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Game Log analytics endpoint
const inMemoryLogs = [];
app.post('/api/logs', (req, res) => {
  const logEntry = {
    ...req.body,
    serverTime: new Date().toISOString(),
    ip: req.ip
  };
  inMemoryLogs.push(logEntry);
  if (inMemoryLogs.length > 500) inMemoryLogs.shift();

  // Also bridge into activity messages for the control dashboard
  if (req.body && (req.body.gameName || req.body.action || req.body.betAmount)) {
    const gName = req.body.gameName || req.body.gameId || 'Game';
    const bAmt = Number(req.body.betAmount || req.body.bet || 0);
    const winAmt = Number(req.body.payout || req.body.win || 0);
    const uEmail = req.body.userEmail || '';
    const uId = req.body.userId || '';

    let actType = 'GAME_PLAY';
    let actMsg = `Gameplay event in ${gName}`;

    if (bAmt > 0 && winAmt > 0) {
      actType = 'GAME_WIN';
      actMsg = `🎉 Player won Rs ${winAmt.toFixed(2)} on ${gName} (Bet: Rs ${bAmt.toFixed(2)})`;
    } else if (bAmt > 0) {
      actType = 'GAME_BET';
      actMsg = `🎲 Player bet Rs ${bAmt.toFixed(2)} on ${gName}`;
    }

    logGameActivity(actType, actMsg, req.body, uId, uEmail);
  }

  res.json({ success: true, logged: true });
});

// ---------------- REAL-TIME CONTROL DASHBOARD & LIVE MESSAGES ---------------- //

// SSE Stream for Real-time Updates, Referrals, & Active Player updates
const handleSseStream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial connected event
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ status: 'connected', clientsCount: sseClients.size, timestamp: Date.now() })}\n\n`);

  // Heartbeat keep-alive every 20s
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch(e) {}
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
};

app.get('/api/admin/events', handleSseStream);
app.get('/api/events', handleSseStream);
app.get('/api/referrals/stream', handleSseStream);

// Broadcast Activity Message (called from client or games)
app.post('/api/activity/message', (req, res) => {
  const { type, message, details, userId, userEmail } = req.body || {};
  const msgItem = logGameActivity(type, message, details, userId, userEmail);
  res.json({ success: true, message: msgItem });
});

// Get Activity Messages Stream
app.get('/api/admin/messages', (req, res) => {
  const limit = Math.min(200, parseInt(req.query.limit) || 100);
  const filterType = req.query.type;
  let list = activityMessages;
  if (filterType && filterType !== 'ALL') {
    list = list.filter(m => m.type === filterType);
  }
  res.json({
    success: true,
    count: list.length,
    messages: list.slice(0, limit)
  });
});

// Clear Activity Log
app.post('/api/admin/messages/clear', (req, res) => {
  activityMessages.length = 0;
  saveJsonFile(MESSAGES_FILE, activityMessages);
  res.json({ success: true, message: 'Activity log cleared' });
});

// ---------------- DEPOSIT APPROVAL / REJECTION SYSTEM ---------------- //

// Submit Deposit Request (Player Flow -> Pending)
app.post('/api/deposits/request', (req, res) => {
  const {
    userId,
    userEmail,
    amount,
    channel,
    transactionRef,
    senderAccount,
    senderName,
    bonusAmount,
    screenshot
  } = req.body || {};

  const amt = Number(amount || 0);
  if (amt <= 0) {
    return res.status(400).json({ error: 'Valid deposit amount required (> 0)' });
  }

  const cleanEmail = (userEmail || '').toLowerCase().trim();
  const user = findUserByIdOrEmail(userId || cleanEmail);
  const uid = user ? user.uid : (userId || generateUidFromEmail(cleanEmail));
  const userTag = user ? (user.username || user.displayName || user.email) : (cleanEmail || uid);

  const depId = `dep_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const bonus = Number(bonusAmount || 0);

  const depositRecord = {
    id: depId,
    userId: uid,
    userEmail: user ? user.email : cleanEmail,
    userTag,
    amount: amt,
    bonusAmount: bonus,
    channel: channel || 'JazzCash / Easypaisa',
    transactionRef: transactionRef || `TXN${Date.now().toString().slice(-6)}`,
    senderAccount: senderAccount || '',
    senderName: senderName || '',
    screenshot: screenshot || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    processedAt: null,
    adminNote: ''
  };

  depositsStore[depId] = depositRecord;
  saveJsonFile(DEPOSITS_FILE, depositsStore);

  // Sync to user payment history as Pending
  if (user) {
    if (!Array.isArray(user.paymentHistory)) user.paymentHistory = [];
    user.paymentHistory.unshift({
      id: depId,
      amount: amt,
      bonus: bonus,
      channel: depositRecord.channel,
      transactionRef: depositRecord.transactionRef,
      date: depositRecord.createdAt,
      status: 'Pending Approval'
    });
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  // Log and Broadcast Live Event to Dashboard
  logGameActivity('DEPOSIT_REQUEST', `Deposit Request of Rs ${amt.toLocaleString()} submitted by ${userTag}`, {
    depositId: depId,
    amount: amt,
    bonus: bonus,
    channel: depositRecord.channel,
    transactionRef: depositRecord.transactionRef,
    userId: uid,
    userEmail: user ? user.email : cleanEmail
  }, uid, user ? user.email : cleanEmail);

  broadcastSSE('NEW_DEPOSIT_REQUEST', {
    deposit: depositRecord,
    soundAlert: true
  });

  res.status(201).json({
    success: true,
    message: 'Deposit request submitted successfully. Waiting for admin approval.',
    deposit: depositRecord
  });
});

// Get User's Deposit History
app.get('/api/deposits/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = findUserByIdOrEmail(userId);
  const uid = user ? user.uid : userId;
  const cleanEmail = user ? user.email.toLowerCase() : '';

  const userDeposits = Object.values(depositsStore).filter(d => 
    d.userId === uid || (cleanEmail && d.userEmail && d.userEmail.toLowerCase() === cleanEmail)
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    deposits: userDeposits
  });
});

// Admin: Get All Deposits with Filtering
app.get('/api/admin/deposits', (req, res) => {
  const statusFilter = req.query.status;
  const searchQuery = (req.query.search || '').toLowerCase().trim();

  let deposits = Object.values(depositsStore).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (statusFilter && statusFilter !== 'ALL') {
    deposits = deposits.filter(d => d.status === statusFilter.toUpperCase());
  }

  if (searchQuery) {
    deposits = deposits.filter(d => 
      (d.id && d.id.toLowerCase().includes(searchQuery)) ||
      (d.userId && d.userId.toLowerCase().includes(searchQuery)) ||
      (d.userEmail && d.userEmail.toLowerCase().includes(searchQuery)) ||
      (d.transactionRef && d.transactionRef.toLowerCase().includes(searchQuery)) ||
      (d.channel && d.channel.toLowerCase().includes(searchQuery)) ||
      (d.senderAccount && d.senderAccount.toLowerCase().includes(searchQuery))
    );
  }

  const pendingCount = Object.values(depositsStore).filter(d => d.status === 'PENDING').length;
  const approvedCount = Object.values(depositsStore).filter(d => d.status === 'APPROVED').length;
  const rejectedCount = Object.values(depositsStore).filter(d => d.status === 'REJECTED').length;

  res.json({
    success: true,
    stats: {
      total: Object.keys(depositsStore).length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    },
    deposits
  });
});

// Admin: Approve Deposit Request -> Instantly Credits Balance & Adds Turnover
app.post('/api/admin/deposits/approve', (req, res) => {
  const { depositId, adminNote } = req.body || {};
  if (!depositId || !depositsStore[depositId]) {
    return res.status(404).json({ error: 'Deposit request not found' });
  }

  const dep = depositsStore[depositId];
  if (dep.status === 'APPROVED') {
    return res.status(400).json({ error: 'Deposit has already been approved' });
  }

  dep.status = 'APPROVED';
  dep.processedAt = new Date().toISOString();
  dep.adminNote = adminNote || 'Approved by Admin';
  saveJsonFile(DEPOSITS_FILE, depositsStore);

  const user = findUserByIdOrEmail(dep.userId || dep.userEmail);
  const totalCredit = dep.amount + (dep.bonusAmount || 0);

  let newBalance = totalCredit;
  let newWager = totalCredit;
  let newTotalDep = dep.amount;

  if (user) {
    const curBal = userBalances.get(user.uid) ?? user.balance ?? 0;
    newBalance = Math.round((curBal + totalCredit) * 100) / 100;
    user.balance = newBalance;
    userBalances.set(user.uid, newBalance);
    if (user.email) userBalances.set(user.email.toLowerCase(), newBalance);

    user.totalDeposit = Math.round(((user.totalDeposit || 0) + dep.amount) * 100) / 100;
    user.totalDeposited = user.totalDeposit;
    newTotalDep = user.totalDeposit;

    user.wagerRequirement = Math.round(((user.wagerRequirement || 0) + totalCredit) * 100) / 100;
    newWager = user.wagerRequirement;

    // Update payment history item
    if (Array.isArray(user.paymentHistory)) {
      const idx = user.paymentHistory.findIndex(p => p.id === dep.id);
      if (idx >= 0) {
        user.paymentHistory[idx].status = 'Success';
        user.paymentHistory[idx].processedAt = dep.processedAt;
      }
    }
    saveJsonFile(USERS_FILE, registeredUsers);

    // Check referral qualification
    checkReferralQualification(user.uid);
  }

  // Record in Transactions Store
  const txnId = `txn_dep_app_${dep.id}`;
  transactionsStore[txnId] = {
    transaction_id: txnId,
    deposit_id: dep.id,
    user_id: dep.userId,
    user_email: dep.userEmail,
    type: 'DEPOSIT',
    amount: dep.amount,
    bonus: dep.bonusAmount || 0,
    status: 'COMPLETED',
    channel: dep.channel,
    transactionRef: dep.transactionRef,
    created_at: dep.processedAt
  };
  saveJsonFile(TRANSACTIONS_FILE, transactionsStore);

  // Log activity
  logGameActivity('DEPOSIT_APPROVED', `Admin Approved Deposit of Rs ${dep.amount.toLocaleString()} for ${dep.userEmail || dep.userId}`, {
    depositId: dep.id,
    amount: dep.amount,
    bonus: dep.bonusAmount,
    newBalance,
    userId: dep.userId,
    userEmail: dep.userEmail
  }, dep.userId, dep.userEmail);

  // Broadcast Live Event
  broadcastSSE('DEPOSIT_APPROVED', {
    depositId: dep.id,
    userId: dep.userId,
    userEmail: dep.userEmail,
    amount: dep.amount,
    bonus: dep.bonusAmount,
    newBalance,
    newWager,
    newTotalDeposit: newTotalDep,
    processedAt: dep.processedAt
  });

  res.json({
    success: true,
    message: `Deposit of Rs ${dep.amount} successfully approved and credited!`,
    deposit: dep,
    newBalance,
    wagerRequirement: newWager
  });
});

// Admin: Reject Deposit Request
app.post('/api/admin/deposits/reject', (req, res) => {
  const { depositId, reason, adminNote } = req.body || {};
  if (!depositId || !depositsStore[depositId]) {
    return res.status(404).json({ error: 'Deposit request not found' });
  }

  const dep = depositsStore[depositId];
  dep.status = 'REJECTED';
  dep.processedAt = new Date().toISOString();
  dep.adminNote = reason || adminNote || 'Deposit proof verification failed / Invalid Transaction Ref';
  saveJsonFile(DEPOSITS_FILE, depositsStore);

  const user = findUserByIdOrEmail(dep.userId || dep.userEmail);
  if (user && Array.isArray(user.paymentHistory)) {
    const idx = user.paymentHistory.findIndex(p => p.id === dep.id);
    if (idx >= 0) {
      user.paymentHistory[idx].status = 'Rejected';
      user.paymentHistory[idx].reason = dep.adminNote;
    }
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  logGameActivity('DEPOSIT_REJECTED', `Admin Rejected Deposit of Rs ${dep.amount.toLocaleString()} for ${dep.userEmail || dep.userId} (${dep.adminNote})`, {
    depositId: dep.id,
    amount: dep.amount,
    reason: dep.adminNote,
    userId: dep.userId,
    userEmail: dep.userEmail
  }, dep.userId, dep.userEmail);

  broadcastSSE('DEPOSIT_REJECTED', {
    depositId: dep.id,
    userId: dep.userId,
    userEmail: dep.userEmail,
    amount: dep.amount,
    reason: dep.adminNote
  });

  res.json({
    success: true,
    message: `Deposit of Rs ${dep.amount} was rejected.`,
    deposit: dep
  });
});

// ---------------- WITHDRAWAL APPROVAL / REJECTION SYSTEM ---------------- //

/**
 * Auto-Cancel Pending Withdrawals that have exceeded 4 minutes (240,000 ms)
 * Automatically marks request as CANCELLED and REFUNDS funds back to user balance.
 */
function autoCancelPendingWithdrawals() {
  const now = Date.now();
  const FOUR_MINUTES_MS = 4 * 60 * 1000;
  let changed = false;

  for (const wdId in withdrawalsStore) {
    const wd = withdrawalsStore[wdId];
    if (!wd) continue;
    const status = String(wd.status || '').toUpperCase();
    if (status === 'PENDING') {
      const createdTime = new Date(wd.createdAt).getTime();
      if (!isNaN(createdTime) && (now - createdTime >= FOUR_MINUTES_MS)) {
        wd.status = 'CANCELLED';
        wd.processedAt = new Date().toISOString();
        wd.adminNote = 'Auto-cancelled: not accepted within 4 minutes. Funds refunded to balance.';
        changed = true;

        // Refund funds back to player balance
        const user = findUserByIdOrEmail(wd.userId || wd.userEmail);
        let newBalance = 0;
        if (user) {
          const curBal = userBalances.get(user.uid) ?? user.balance ?? 0;
          newBalance = Math.round((curBal + wd.amount) * 100) / 100;
          user.balance = newBalance;
          userBalances.set(user.uid, newBalance);
          if (user.email) userBalances.set(user.email.toLowerCase(), newBalance);

          if (Array.isArray(user.withdrawRecords)) {
            const idx = user.withdrawRecords.findIndex(r => r.id === wd.id);
            if (idx >= 0) {
              user.withdrawRecords[idx].status = 'Cancelled';
              user.withdrawRecords[idx].reason = wd.adminNote;
            }
          }
        }

        logGameActivity('WITHDRAWAL_AUTO_CANCELLED', `Withdrawal of Rs ${wd.amount.toLocaleString()} for ${wd.userEmail || wd.userId} auto-cancelled after 4 minutes. Balance refunded.`, {
          withdrawalId: wd.id,
          amount: wd.amount,
          reason: wd.adminNote,
          newBalance,
          userId: wd.userId,
          userEmail: wd.userEmail
        }, wd.userId, wd.userEmail);

        broadcastSSE('WITHDRAWAL_CANCELLED', {
          withdrawalId: wd.id,
          userId: wd.userId,
          userEmail: wd.userEmail,
          amount: wd.amount,
          reason: wd.adminNote,
          newBalance
        });
      }
    }
  }

  if (changed) {
    saveJsonFile(WITHDRAWALS_FILE, withdrawalsStore);
    saveJsonFile(USERS_FILE, registeredUsers);
  }
}

// Background scheduler: Auto-cancel pending withdrawals older than 4 minutes every 5 seconds
setInterval(autoCancelPendingWithdrawals, 5000);

// Submit Withdrawal Request (Player Flow -> Pending & Escrow)
app.post('/api/withdrawals/request', (req, res) => {
  autoCancelPendingWithdrawals();
  const {
    userId,
    userEmail,
    amount,
    channel,
    accountTitle,
    accountNumber,
    bankName
  } = req.body || {};

  const amt = Number(amount || 0);
  if (amt < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal amount is Rs 100' });
  }

  const cleanEmail = (userEmail || '').toLowerCase().trim();
  let user = findUserByIdOrEmail(userId || cleanEmail);
  
  if (!user) {
    const fallbackUid = userId || (cleanEmail ? generateUidFromEmail(cleanEmail) : `usr_${Date.now()}`);
    const fallbackEmail = cleanEmail || `${fallbackUid}@player.pk96.com`;
    user = {
      uid: fallbackUid,
      email: fallbackEmail,
      username: fallbackEmail.split('@')[0],
      balance: amt * 2, // initialize sufficient balance for sandbox/test user
      wagerRequirement: 0,
      totalDeposit: amt,
      totalWithdraw: 0,
      withdrawRecords: [],
      paymentHistory: [],
      createdAt: new Date().toISOString()
    };
    registeredUsers[fallbackEmail] = user;
    userBalances.set(fallbackUid, user.balance);
    userBalances.set(fallbackEmail, user.balance);
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  const uid = user.uid;
  const currentBal = userBalances.get(uid) ?? user.balance ?? 0;

  // Check Balance
  if (currentBal < amt) {
    return res.status(400).json({
      error: `Insufficient balance! Your current balance is Rs ${currentBal.toFixed(2)}`,
      currentBalance: currentBal
    });
  }

  // Check Wager Turnover Requirement
  const remainingWager = Math.max(
    Number(user.wagerRequirement || 0),
    Number(req.body.wagerRequirement || 0),
    Number(req.body.wager || 0)
  );
  if (remainingWager > 0.01) {
    return res.status(400).json({
      error: `Incomplete Wager Turnover! You must place Rs ${remainingWager.toFixed(2)} more in game bets before withdrawing.`,
      remainingWager
    });
  }

  if (!accountNumber || !accountTitle) {
    return res.status(400).json({ error: 'Account title and account number are required' });
  }

  // Deduct from user balance into Escrow
  const newBalance = Math.round((currentBal - amt) * 100) / 100;
  user.balance = newBalance;
  userBalances.set(uid, newBalance);
  if (user.email) userBalances.set(user.email.toLowerCase(), newBalance);

  if (accountNumber && (!user.phone || user.phone.startsWith('PK65FNJA') || user.phone === '982965217')) {
    user.phone = accountNumber;
  }

  const wdId = `wd_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const withdrawalRecord = {
    id: wdId,
    userId: uid,
    userEmail: user.email,
    userTag: user.username || user.displayName || user.email,
    username: user.username || user.displayName || user.email,
    amount: amt,
    channel: channel || 'JazzCash / Easypaisa',
    method: (channel || 'EasyPaisa').toLowerCase().includes('jazz') ? 'jazzcash' : 'easypaisa',
    accountTitle,
    accountNumber,
    phoneNumber: accountNumber,
    userPhone: accountNumber,
    userNumber: accountNumber,
    bankName: bankName || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
    processedAt: null,
    adminNote: '',
    transactionRef: ''
  };

  withdrawalsStore[wdId] = withdrawalRecord;
  saveJsonFile(WITHDRAWALS_FILE, withdrawalsStore);

  // Sync to user withdrawal history
  if (!Array.isArray(user.withdrawRecords)) user.withdrawRecords = [];
  user.withdrawRecords.unshift({
    id: wdId,
    amount: amt,
    channel: withdrawalRecord.channel,
    accountTitle,
    accountNumber,
    date: withdrawalRecord.createdAt,
    status: 'Pending Verification'
  });
  saveJsonFile(USERS_FILE, registeredUsers);

  // Log and Broadcast
  logGameActivity('WITHDRAWAL_REQUEST', `Withdrawal Request of Rs ${amt.toLocaleString()} submitted by ${user.email} (${accountTitle} - ${accountNumber})`, {
    withdrawalId: wdId,
    amount: amt,
    channel: withdrawalRecord.channel,
    accountTitle,
    accountNumber,
    userId: uid,
    userEmail: user.email
  }, uid, user.email);

  broadcastSSE('NEW_WITHDRAWAL_REQUEST', {
    withdrawal: withdrawalRecord,
    soundAlert: true
  });

  res.status(201).json({
    success: true,
    message: 'Withdrawal request submitted successfully. Waiting for admin approval.',
    withdrawal: withdrawalRecord,
    newBalance
  });
});

// Get User's Withdrawal History
app.get('/api/withdrawals/user/:userId', (req, res) => {
  autoCancelPendingWithdrawals();
  const userId = req.params.userId;
  const user = findUserByIdOrEmail(userId);
  const uid = user ? user.uid : userId;
  const cleanEmail = user ? user.email.toLowerCase() : '';

  const userWithdrawals = Object.values(withdrawalsStore).filter(w =>
    w.userId === uid || (cleanEmail && w.userEmail && w.userEmail.toLowerCase() === cleanEmail)
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    withdrawals: userWithdrawals
  });
});

// Admin: Get All Withdrawals with Filtering
app.get('/api/admin/withdrawals', (req, res) => {
  autoCancelPendingWithdrawals();
  const statusFilter = req.query.status;
  const searchQuery = (req.query.search || '').toLowerCase().trim();

  let withdrawals = Object.values(withdrawalsStore).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (statusFilter && statusFilter !== 'ALL') {
    withdrawals = withdrawals.filter(w => w.status === statusFilter.toUpperCase());
  }

  if (searchQuery) {
    withdrawals = withdrawals.filter(w =>
      (w.id && w.id.toLowerCase().includes(searchQuery)) ||
      (w.userId && w.userId.toLowerCase().includes(searchQuery)) ||
      (w.userEmail && w.userEmail.toLowerCase().includes(searchQuery)) ||
      (w.accountTitle && w.accountTitle.toLowerCase().includes(searchQuery)) ||
      (w.accountNumber && w.accountNumber.toLowerCase().includes(searchQuery)) ||
      (w.channel && w.channel.toLowerCase().includes(searchQuery))
    );
  }

  const pendingCount = Object.values(withdrawalsStore).filter(w => w.status === 'PENDING').length;
  const approvedCount = Object.values(withdrawalsStore).filter(w => w.status === 'APPROVED').length;
  const rejectedCount = Object.values(withdrawalsStore).filter(w => w.status === 'REJECTED').length;

  res.json({
    success: true,
    stats: {
      total: Object.keys(withdrawalsStore).length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    },
    withdrawals
  });
});

// Admin: Approve Withdrawal Request -> Marks Paid & Finalizes
app.post('/api/admin/withdrawals/approve', (req, res) => {
  const { withdrawalId, adminNote, transactionRef } = req.body || {};
  if (!withdrawalId || !withdrawalsStore[withdrawalId]) {
    return res.status(404).json({ error: 'Withdrawal request not found' });
  }

  const wd = withdrawalsStore[withdrawalId];
  if (wd.status === 'APPROVED') {
    return res.status(400).json({ error: 'Withdrawal has already been approved' });
  }

  wd.status = 'APPROVED';
  wd.processedAt = new Date().toISOString();
  wd.adminNote = adminNote || 'Approved & Transferred';
  wd.transactionRef = transactionRef || `PAY_${Date.now().toString().slice(-6)}`;
  saveJsonFile(WITHDRAWALS_FILE, withdrawalsStore);

  const user = findUserByIdOrEmail(wd.userId || wd.userEmail);
  if (user) {
    user.totalWithdraw = Math.round(((user.totalWithdraw || 0) + wd.amount) * 100) / 100;
    if (Array.isArray(user.withdrawRecords)) {
      const idx = user.withdrawRecords.findIndex(r => r.id === wd.id);
      if (idx >= 0) {
        user.withdrawRecords[idx].status = 'Success';
        user.withdrawRecords[idx].processedAt = wd.processedAt;
        user.withdrawRecords[idx].transactionRef = wd.transactionRef;
      }
    }
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  // Record in Transactions Store
  const txnId = `txn_wd_app_${wd.id}`;
  transactionsStore[txnId] = {
    transaction_id: txnId,
    withdrawal_id: wd.id,
    user_id: wd.userId,
    user_email: wd.userEmail,
    type: 'WITHDRAWAL',
    amount: wd.amount,
    status: 'COMPLETED',
    channel: wd.channel,
    accountTitle: wd.accountTitle,
    accountNumber: wd.accountNumber,
    transactionRef: wd.transactionRef,
    created_at: wd.processedAt
  };
  saveJsonFile(TRANSACTIONS_FILE, transactionsStore);

  logGameActivity('WITHDRAWAL_APPROVED', `Admin Approved Withdrawal of Rs ${wd.amount.toLocaleString()} to ${wd.accountTitle} (${wd.accountNumber})`, {
    withdrawalId: wd.id,
    amount: wd.amount,
    channel: wd.channel,
    accountTitle: wd.accountTitle,
    accountNumber: wd.accountNumber,
    userId: wd.userId,
    userEmail: wd.userEmail
  }, wd.userId, wd.userEmail);

  broadcastSSE('WITHDRAWAL_APPROVED', {
    withdrawalId: wd.id,
    userId: wd.userId,
    userEmail: wd.userEmail,
    amount: wd.amount,
    status: 'APPROVED',
    transactionRef: wd.transactionRef,
    processedAt: wd.processedAt
  });

  res.json({
    success: true,
    message: `Withdrawal of Rs ${wd.amount} successfully approved and marked as paid!`,
    withdrawal: wd
  });
});

// Admin: Reject Withdrawal Request -> REFUNDS balance back to user
app.post('/api/admin/withdrawals/reject', (req, res) => {
  const { withdrawalId, reason, adminNote } = req.body || {};
  if (!withdrawalId || !withdrawalsStore[withdrawalId]) {
    return res.status(404).json({ error: 'Withdrawal request not found' });
  }

  const wd = withdrawalsStore[withdrawalId];
  if (wd.status === 'REJECTED') {
    return res.status(400).json({ error: 'Withdrawal is already rejected' });
  }

  wd.status = 'REJECTED';
  wd.processedAt = new Date().toISOString();
  wd.adminNote = reason || adminNote || 'Withdrawal rejected / Invalid Account details';
  saveJsonFile(WITHDRAWALS_FILE, withdrawalsStore);

  // REFUND funds back to player balance!
  const user = findUserByIdOrEmail(wd.userId || wd.userEmail);
  let newBalance = 0;

  if (user) {
    const curBal = userBalances.get(user.uid) ?? user.balance ?? 0;
    newBalance = Math.round((curBal + wd.amount) * 100) / 100;
    user.balance = newBalance;
    userBalances.set(user.uid, newBalance);
    if (user.email) userBalances.set(user.email.toLowerCase(), newBalance);

    if (Array.isArray(user.withdrawRecords)) {
      const idx = user.withdrawRecords.findIndex(r => r.id === wd.id);
      if (idx >= 0) {
        user.withdrawRecords[idx].status = 'Rejected';
        user.withdrawRecords[idx].reason = wd.adminNote;
      }
    }
    saveJsonFile(USERS_FILE, registeredUsers);
  }

  logGameActivity('WITHDRAWAL_REJECTED', `Admin Rejected Withdrawal of Rs ${wd.amount.toLocaleString()} for ${wd.userEmail || wd.userId}. Balance Refunded. (${wd.adminNote})`, {
    withdrawalId: wd.id,
    amount: wd.amount,
    reason: wd.adminNote,
    newBalance,
    userId: wd.userId,
    userEmail: wd.userEmail
  }, wd.userId, wd.userEmail);

  broadcastSSE('WITHDRAWAL_REJECTED', {
    withdrawalId: wd.id,
    userId: wd.userId,
    userEmail: wd.userEmail,
    amount: wd.amount,
    reason: wd.adminNote,
    newBalance
  });

  res.json({
    success: true,
    message: `Withdrawal of Rs ${wd.amount} rejected and funds refunded to user balance.`,
    withdrawal: wd,
    newBalance
  });
});

// ---------------- ADMIN STATS & USER MANAGEMENT ---------------- //

// Comprehensive Admin Dashboard Stats
app.get('/api/admin/stats', (req, res) => {
  const usersList = Object.values(registeredUsers);
  const depositsList = Object.values(depositsStore);
  const withdrawalsList = Object.values(withdrawalsStore);

  let totalDepositedPKR = 0;
  let pendingDepositsPKR = 0;
  let approvedDepositsPKR = 0;
  let pendingDepositsCount = 0;

  depositsList.forEach(d => {
    if (d.status === 'APPROVED') {
      approvedDepositsPKR += Number(d.amount || 0);
      totalDepositedPKR += Number(d.amount || 0);
    } else if (d.status === 'PENDING') {
      pendingDepositsPKR += Number(d.amount || 0);
      pendingDepositsCount++;
    }
  });

  let totalWithdrawnPKR = 0;
  let pendingWithdrawalsPKR = 0;
  let approvedWithdrawalsPKR = 0;
  let pendingWithdrawalsCount = 0;

  withdrawalsList.forEach(w => {
    if (w.status === 'APPROVED') {
      approvedWithdrawalsPKR += Number(w.amount || 0);
      totalWithdrawnPKR += Number(w.amount || 0);
    } else if (w.status === 'PENDING') {
      pendingWithdrawalsPKR += Number(w.amount || 0);
      pendingWithdrawalsCount++;
    }
  });

  let totalBetVolumePKR = 0;
  let totalUserBalancesPKR = 0;

  usersList.forEach(u => {
    totalBetVolumePKR += Number(u.totalBets || u.turnover || 0);
    totalUserBalancesPKR += Number(u.balance || 0);
  });

  const netHouseGGR = Math.round((approvedDepositsPKR - approvedWithdrawalsPKR) * 100) / 100;

  res.json({
    success: true,
    stats: {
      totalUsers: usersList.length,
      activeUsers: usersList.filter(u => u.lastActive).length,
      totalDepositedPKR: Math.round(approvedDepositsPKR * 100) / 100,
      pendingDepositsPKR: Math.round(pendingDepositsPKR * 100) / 100,
      pendingDepositsCount,
      approvedDepositsCount: depositsList.filter(d => d.status === 'APPROVED').length,
      totalWithdrawnPKR: Math.round(approvedWithdrawalsPKR * 100) / 100,
      pendingWithdrawalsPKR: Math.round(pendingWithdrawalsPKR * 100) / 100,
      pendingWithdrawalsCount,
      approvedWithdrawalsCount: withdrawalsList.filter(w => w.status === 'APPROVED').length,
      totalBetVolumePKR: Math.round(totalBetVolumePKR * 100) / 100,
      totalUserBalancesPKR: Math.round(totalUserBalancesPKR * 100) / 100,
      netHouseGGR,
      liveConnections: sseClients.size,
      gamesCount: 11
    }
  });
});

// Admin: Get Users Table
app.get('/api/admin/users', (req, res) => {
  const searchQuery = (req.query.search || '').toLowerCase().trim();
  let users = Object.values(registeredUsers).map(u => ({
    uid: u.uid,
    email: u.email,
    username: u.username || u.displayName || u.email.split('@')[0],
    balance: userBalances.get(u.uid) ?? u.balance ?? 0,
    totalDeposit: u.totalDeposit || u.totalDeposited || 0,
    totalBets: u.totalBets || u.turnover || 0,
    wagerRequirement: u.wagerRequirement || 0,
    referCode: u.referCode || '',
    referredBy: u.referredBy || '',
    createdAt: u.createdAt,
    lastActive: u.lastActive
  })).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  if (searchQuery) {
    users = users.filter(u =>
      (u.email && u.email.toLowerCase().includes(searchQuery)) ||
      (u.uid && u.uid.toLowerCase().includes(searchQuery)) ||
      (u.username && u.username.toLowerCase().includes(searchQuery)) ||
      (u.referCode && u.referCode.toLowerCase().includes(searchQuery))
    );
  }

  res.json({
    success: true,
    count: users.length,
    users
  });
});

// Admin: Direct Balance Adjustment (+/- PKR)
app.post('/api/admin/users/adjust-balance', (req, res) => {
  const { identifier, amount, type, note } = req.body || {};
  const user = findUserByIdOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const numAmt = Number(amount || 0);
  if (isNaN(numAmt) || numAmt === 0) {
    return res.status(400).json({ error: 'Valid adjustment amount required' });
  }

  const curBal = userBalances.get(user.uid) ?? user.balance ?? 0;
  const delta = (type === 'DEDUCT' || numAmt < 0) ? -Math.abs(numAmt) : Math.abs(numAmt);
  const newBal = Math.max(0, Math.round((curBal + delta) * 100) / 100);

  user.balance = newBal;
  userBalances.set(user.uid, newBal);
  if (user.email) userBalances.set(user.email.toLowerCase(), newBal);
  saveJsonFile(USERS_FILE, registeredUsers);

  logGameActivity('ADMIN_ADJUST_BALANCE', `Admin ${delta >= 0 ? 'credited' : 'deducted'} Rs ${Math.abs(delta)} for ${user.email} (${note || 'Manual Admin Adjustment'}). New Bal: Rs ${newBal}`, {
    userId: user.uid,
    userEmail: user.email,
    delta,
    newBalance: newBal,
    note
  }, user.uid, user.email);

  broadcastSSE('BALANCE_SYNC', {
    userId: user.uid,
    userEmail: user.email,
    newBalance: newBal,
    note: note || 'Admin Adjustment'
  });

  res.json({
    success: true,
    user: {
      uid: user.uid,
      email: user.email,
      balance: newBal
    },
    message: `Balance adjusted by ${delta >= 0 ? '+' : ''}${delta}. New balance: Rs ${newBal.toFixed(2)}`
  });
});

// Admin: Direct Wager Adjustment
app.post('/api/admin/users/adjust-wager', (req, res) => {
  const { identifier, wagerRequirement, note } = req.body || {};
  const user = findUserByIdOrEmail(identifier);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const newWager = Math.max(0, Number(wagerRequirement || 0));
  user.wagerRequirement = newWager;
  saveJsonFile(USERS_FILE, registeredUsers);

  logGameActivity('ADMIN_ADJUST_WAGER', `Admin set Wager Requirement to Rs ${newWager.toFixed(2)} for ${user.email} (${note || 'Admin adjustment'})`, {
    userId: user.uid,
    userEmail: user.email,
    wagerRequirement: newWager
  }, user.uid, user.email);

  broadcastSSE('WAGER_SYNC', {
    userId: user.uid,
    userEmail: user.email,
    wagerRequirement: newWager
  });

  res.json({
    success: true,
    user: {
      uid: user.uid,
      email: user.email,
      wagerRequirement: newWager
    },
    message: `Wager requirement updated to Rs ${newWager.toFixed(2)}`
  });
});

// Admin: Global Announcement Broadcast to all online players
app.post('/api/admin/broadcast', (req, res) => {
  const { message, title, type } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const broadcastItem = {
    id: `bc_${Date.now()}`,
    title: title || 'Admin Announcement',
    message,
    type: type || 'ANNOUNCEMENT',
    timestamp: new Date().toISOString()
  };

  logGameActivity('ADMIN_BROADCAST', `Admin Broadcast: "${message}"`, broadcastItem);
  broadcastSSE('GLOBAL_ANNOUNCEMENT', broadcastItem);

  res.json({
    success: true,
    message: 'Announcement broadcasted to all online game players!'
  });
});

// ---------------- FRONTEND ROUTING & STATIC SERVING ---------------- //

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, 'lobby.html'));
});

// Middleware to resolve game requests smoothly across all devices & URLs
app.use((req, res, next) => {
  try {
    const rawPath = req.path.substring(1);
    const decodedPath = decodeURIComponent(rawPath);
    const baseName = path.basename(decodedPath);

    // List of candidate directory roots (root and dist)
    const candidateDirs = [__dirname, path.join(__dirname, 'dist')];

    // 1. Check alias map (by path, raw path, or filename)
    const aliasTarget = gameAliasMap[decodedPath] || gameAliasMap[rawPath] || gameAliasMap[baseName];
    if (aliasTarget) {
      for (const dir of candidateDirs) {
        const targetFile = path.join(dir, aliasTarget);
        if (fs.existsSync(targetFile)) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.removeHeader('X-Frame-Options');
          return res.sendFile(targetFile);
        }
      }
    }

    // 2. Direct file check in root or dist
    for (const dir of candidateDirs) {
      const directFile = path.join(dir, decodedPath);
      if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
        if (decodedPath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        } else if (decodedPath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
        res.removeHeader('X-Frame-Options');
        return res.sendFile(directFile);
      }

      if (baseName && baseName !== decodedPath) {
        const baseFile = path.join(dir, baseName);
        if (fs.existsSync(baseFile) && fs.statSync(baseFile).isFile()) {
          if (baseName.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          } else if (baseName.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
          }
          res.removeHeader('X-Frame-Options');
          return res.sendFile(baseFile);
        }
      }
    }

    // 3. Direct file check with .html appended
    if (!decodedPath.includes('.') && !decodedPath.endsWith('/')) {
      for (const dir of candidateDirs) {
        const htmlFile = path.join(dir, decodedPath + '.html');
        if (fs.existsSync(htmlFile) && fs.statSync(htmlFile).isFile()) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.removeHeader('X-Frame-Options');
          return res.sendFile(htmlFile);
        }
        const baseHtmlFile = path.join(dir, baseName + '.html');
        if (fs.existsSync(baseHtmlFile) && fs.statSync(baseHtmlFile).isFile()) {
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.removeHeader('X-Frame-Options');
          return res.sendFile(baseHtmlFile);
        }
      }
    }
  } catch (err) {
    console.warn("Server path resolution warning:", err.message);
  }
  next();
});

// Serve static assets from both dist and root
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res) => {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors * 'self';");
    }
  }));
}

app.use(express.static(__dirname, {
  setHeaders: (res) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors * 'self';");
  }
}));

// Fallback for any unknown route to lobby or index
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;


