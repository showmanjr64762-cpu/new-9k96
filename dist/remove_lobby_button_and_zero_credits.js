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

const inlinedZeroScript = `<script>
// PK96 Universal Zero Balance & Credits Engine
// Strictly makes all in-game balances, credits, coins, chips, and funds 0.00
(function() {
  'use strict';

  var zeroKeys = [
    'balance', 'credits', 'credit', 'c2balance', 'c3balance', 'coins', 'coin',
    'player_balance', 'user_balance', 'demo_balance', 'initial_balance',
    'final_survival_balance', 'football_bet_balance', 'halloween_crash_balance',
    'dwarves_mine_balance', '10000_bc_balance', 'mayan_temple_balance',
    'total_coins', 'game_balance', 'pk96_balance', 'pk96_guest_balance',
    'score', 'money', 'cash', 'chips', 'chip', 'funds', 'fund', 'c3-localstorage', 'userbalance'
  ];

  var origGetItem = Storage.prototype.getItem;
  var origSetItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function(k) {
    if (!k || typeof k !== 'string') return origGetItem.apply(this, arguments);
    var lk = k.toLowerCase();
    for (var i = 0; i < zeroKeys.length; i++) {
      if (lk === zeroKeys[i] || lk.includes('balance') || lk.includes('credit') || lk.includes('coin') || lk.includes('chip')) {
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
        if (lk === zeroKeys[i] || lk.includes('balance') || lk.includes('credit') || lk.includes('coin') || lk.includes('chip')) {
          return origSetItem.call(this, k, '0');
        }
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // Pre-seed storage to 0
  zeroKeys.forEach(function(k) {
    try { origSetItem.call(localStorage, k, '0'); } catch(e) {}
  });

  // Global variables zeroing
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

  // Construct 3 hook
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

  // Remote PHP fetch hook (Dwarves Mine, 10000 BC)
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

  // DOM & Canvas balance and credits text enforcement
  function enforceZeroText() {
    var selectors = [
      '.desktop-balance-val', '.mobile-balance-val', '.balance-value',
      '#balance-value', '#balance-display', '#user-balance', '#player-balance',
      '.player-balance', '.balance-text', '[data-field="balance"]',
      '#balance_text', '.balance', '#balance', '.credit', '.credits',
      '.credit-val', '.coins-val', '#coins-display', '#credits-display',
      '.chips-value', '#chips', '.credits-amount', '.balance-amount'
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

  setInterval(enforceZeroText, 40);

  var obs = new MutationObserver(enforceZeroText);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      if (document.body) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      enforceZeroText();
    });
  }
})();
</script>`;

targetGames.forEach(filename => {
  const filepath = path.join(__dirname, filename);
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // 1. Remove all Lobby button elements
  content = content.replace(/<button[^>]*class="[^"]*lobby-back-btn[^"]*"[^>]*>[\s\S]*?<\/button>\s*/gi, '');
  content = content.replace(/<button[^>]*id="btnBackLobby"[^>]*>[\s\S]*?<\/button>\s*/gi, '');
  content = content.replace(/<button[^>]*onclick="goBackToLobby\(\)"[^>]*>[\s\S]*?<\/button>\s*/gi, '');

  // 2. Remove all lobby-back-btn CSS styles
  content = content.replace(/\.lobby-back-btn\s*\{[\s\S]*?\}/g, '');
  content = content.replace(/\.lobby-back-btn:hover\s*\{[\s\S]*?\}/g, '');

  // 3. Remove old script references
  content = content.replace(/<script src="\/pk96-balance\.js"><\/script>\s*/g, '');
  content = content.replace(/<script src="\/game-balance-bridge\.js"><\/script>\s*/g, '');
  content = content.replace(/<script>\s*\/\/ PK96 Universal Zero Balance Engine[\s\S]*?<\/script>\s*/g, '');
  content = content.replace(/<script>\s*\/\/ PK96 Universal Zero Balance & Credits Engine[\s\S]*?<\/script>\s*/g, '');

  // 4. Insert updated inlined Zero Balance & Credits engine at top of <head>
  content = content.replace(/<head[^>]*>/i, match => match + '\n' + inlinedZeroScript);

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`[UPDATED] ${filename} - Removed lobby button and enforced zero balance/credits.`);
});
