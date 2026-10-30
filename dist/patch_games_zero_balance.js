const fs = require('fs');
const path = require('path');

const targetGames = [
  'dwarves_mine.html',
  'final_survival.html',
  'football_bet.html',
  'halloween_crash.html',
  '10000_bc.html',
  'mayan_temple_slot.html',
  'stairway_to_wealth.html',
  'penalty_nations_cup.html',
  'super_soccer_slots.html',
  'prehistory_slots.html',
  'mummy_slot.html'
];

const inlinedScript = `<script>
// PK96 Universal Zero Balance Engine (Games 13-23)
// Strictly locks in-game balance to 0.00 and eliminates all 10000/1000/100 demo balances
(function() {
  'use strict';

  // 1. Storage interceptor - always return 0 for all balance/credit/coin keys
  var zeroKeys = [
    'balance', 'credits', 'credit', 'c2balance', 'c3balance', 'coins',
    'player_balance', 'user_balance', 'demo_balance', 'initial_balance',
    'final_survival_balance', 'football_bet_balance', 'halloween_crash_balance',
    'dwarves_mine_balance', '10000_bc_balance', 'mayan_temple_balance',
    'total_coins', 'game_balance', 'pk96_balance', 'pk96_guest_balance',
    'score', 'money', 'cash', 'c3-localstorage', 'userbalance'
  ];

  var origGetItem = Storage.prototype.getItem;
  var origSetItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function(k) {
    if (!k || typeof k !== 'string') return origGetItem.apply(this, arguments);
    var lk = k.toLowerCase();
    for (var i = 0; i < zeroKeys.length; i++) {
      if (lk === zeroKeys[i] || lk.includes('balance') || lk.includes('credit') || lk.includes('coin')) {
        return '0';
      }
    }
    if (lk === 'mines_player_stats_v1' || lk === 'fortune_jem3_stats_v3' || lk === 'neon_spins_stats') {
      return JSON.stringify({ balance: 0, wins: 0, totalSpins: 0, gamesPlayed: 0 });
    }
    if (lk === 'aviator_offline_users') {
      return JSON.stringify([{ balance: 0, name: 'Player' }]);
    }
    return origGetItem.apply(this, arguments);
  };

  Storage.prototype.setItem = function(k, v) {
    if (k && typeof k === 'string') {
      var lk = k.toLowerCase();
      for (var i = 0; i < zeroKeys.length; i++) {
        if (lk === zeroKeys[i] || lk.includes('balance') || lk.includes('credit') || lk.includes('coin')) {
          return origSetItem.call(this, k, '0');
        }
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // Seed storage
  zeroKeys.forEach(function(k) {
    try { origSetItem.call(localStorage, k, '0'); } catch(e) {}
  });

  // 2. Global variables zeroing
  window.userBalance = 0;
  window.INITIAL_BALANCE = 0;
  window.defaultCoins = 0;
  window.defaultAmount = 0;
  window.currentBet = 0;

  // AppState hook for Stairway to Wealth
  window.AppState = window.AppState || {};
  try {
    Object.defineProperty(window.AppState, 'balance', {
      get: function() { return 0; },
      set: function() {},
      configurable: true
    });
  } catch(e) {}

  // slotConfig_3x5 for Mayan Temple
  try {
    Object.defineProperty(window, 'slotConfig_3x5', {
      get: function() { return this._slotConfig; },
      set: function(val) {
        if (val) {
          val.defaultCoins = 0;
          val.defaultAmount = 0;
        }
        this._slotConfig = val;
      },
      configurable: true
    });
  } catch(e) {}

  // 3. Construct 3 hook
  var origRunOnStartup = window.runOnStartup;
  window.runOnStartup = function(cb) {
    var wrapped = async function(runtime) {
      window.c3_runtime = runtime;
      var zeroC3 = function() {
        if (runtime.globalVars) {
          for (var k in runtime.globalVars) {
            if (/balance|credit|coin|cash|money|score|chip|fund/i.test(k)) {
              runtime.globalVars[k] = 0;
            }
          }
        }
      };
      zeroC3();
      runtime.addEventListener('tick', zeroC3);
      return cb(runtime);
    };
    if (typeof origRunOnStartup === 'function') {
      return origRunOnStartup(wrapped);
    }
  };

  // 4. Remote PHP fetch hook (Dwarves Mine, 10000 BC)
  var origFetch = window.fetch;
  window.fetch = async function(url, opts) {
    var urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');
    if (urlStr.includes('remote.php')) {
      var fullUrl = urlStr.startsWith('http') ? urlStr : (document.baseURI ? new URL(urlStr, document.baseURI).href : urlStr);
      var proxyUrl = '/api/proxy-remote?url=' + encodeURIComponent(fullUrl);
      try {
        var res = await origFetch.call(this, proxyUrl, opts);
        var json = await res.json();
        json.userBalance = 0;
        json.userBalanceBefore = 0;
        json.userBalanceAfter = 0;
        return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch(e) {}
    }
    return origFetch.apply(this, arguments);
  };

  // 5. DOM & Canvas balance text enforcement
  function enforceZeroText() {
    var selectors = [
      '.desktop-balance-val', '.mobile-balance-val', '.balance-value',
      '#balance-value', '#balance-display', '#user-balance', '#player-balance',
      '.player-balance', '.balance-text', '[data-field="balance"]',
      '#balance_text', '.balance', '#balance', '.credit', '.credits',
      '.credit-val', '.coins-val', '#coins-display', '#credits-display'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(function(el) {
      if (el.textContent !== '0.00' && el.textContent !== '0' && el.textContent !== 'Rs 0.00' && el.textContent !== '$0.00' && el.textContent !== '€0.00') {
        el.textContent = '0.00';
      }
    });

    try {
      if (window.app && window.app.fields && window.app.fields.balance) {
        window.app.fields.balance.text = '0.00';
      }
      if (window.slotControls && window.slotControls.creditText) {
        window.slotControls.creditText.text = '0.00';
      }
    } catch(e) {}
  }

  setInterval(enforceZeroText, 50);

  var obs = new MutationObserver(enforceZeroText);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      if (document.body) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      enforceZeroText();
    });
  }

  // 6. Back to Lobby Helper
  window.goBackToLobby = function() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage('backToLobby', '*');
        window.parent.postMessage({ type: 'PK96_CLOSE_GAME' }, '*');
        if (typeof window.parent.switchPage === 'function') window.parent.switchPage('home');
        var b = window.parent.document.getElementById('gamePageBackBtn');
        if (b) { b.click(); return; }
      }
    } catch(e) {}
    window.location.href = '/';
  };
})();
</script>`;

const lobbyBtnHtml = `<button class="lobby-back-btn" onclick="goBackToLobby()" style="position:fixed;top:12px;left:12px;z-index:99999;background:rgba(15,23,42,0.85);color:#fff;border:1.5px solid #ffd700;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,0.6);font-family:sans-serif;">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
  <span>Lobby</span>
</button>`;

targetGames.forEach(filename => {
  const filepath = path.join(__dirname, filename);
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // Remove existing bridge script tags to prevent duplicate/404 calls
  content = content.replace(/<script src="\/pk96-balance\.js"><\/script>\s*/g, '');
  content = content.replace(/<script src="\/game-balance-bridge\.js"><\/script>\s*/g, '');
  // Remove any previously inlined PK96 Zero Balance Engine
  content = content.replace(/<script>\s*\/\/ PK96 Universal Zero Balance Engine[\s\S]*?<\/script>\s*/g, '');

  // Insert inlined zero balance engine right after <head>
  content = content.replace(/<head[^>]*>/i, match => match + '\n' + inlinedScript);

  // Ensure lobby button is present right after <body>
  if (!content.includes('lobby-back-btn')) {
    content = content.replace(/<body[^>]*>/i, match => match + '\n' + lobbyBtnHtml);
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`[PATCHED] ${filename} zero balance engine inlined successfully.`);
});
