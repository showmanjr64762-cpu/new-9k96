const fs = require('fs');
const path = require('path');

// 1. Rock-solid, non-breaking Zero Balance Engine
// DOES NOT tamper with data.json or break fetch response.url
// Safely returns 0 for all balance queries and zeros C3 variables on startup
const cleanZeroEngine = `<script>
// PK96 Clean Zero Balance & Credit Lock
(function() {
  'use strict';

  var zeroKeys = [
    'balance', 'credits', 'credit', 'c2balance', 'c3balance', 'coins', 'coin',
    'player_balance', 'user_balance', 'demo_balance', 'initial_balance',
    'final_survival_balance', 'football_bet_balance', 'halloween_crash_balance',
    'dwarves_mine_balance', '10000_bc_balance', 'mayan_temple_balance',
    'total_coins', 'game_balance', 'pk96_balance', 'pk96_guest_balance',
    'chips', 'userbalance', 'pnc_demo_balance', 'money'
  ];

  var origGetItem = Storage.prototype.getItem;
  var origSetItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function(k) {
    if (!k || typeof k !== 'string') return origGetItem.apply(this, arguments);
    var lk = k.toLowerCase().trim();

    // Safely zero balances inside C3 localstorage without corrupting dictionary
    if (lk === 'c3-localstorage') {
      var raw = origGetItem.apply(this, arguments);
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            for (var key in parsed) {
              if (/^(balance|credits?|coins?|cash|money|setting_start_credits)$/i.test(key)) {
                parsed[key] = 0;
              }
            }
            return JSON.stringify(parsed);
          }
        } catch(e) {}
      }
      return raw;
    }

    if (zeroKeys.indexOf(lk) !== -1) return '0';
    return origGetItem.apply(this, arguments);
  };

  Storage.prototype.setItem = function(k, v) {
    if (k && typeof k === 'string') {
      var lk = k.toLowerCase().trim();
      if (zeroKeys.indexOf(lk) !== -1) {
        return origSetItem.call(this, k, '0');
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // Pre-seed storage
  zeroKeys.forEach(function(k) {
    try { origSetItem.call(localStorage, k, '0'); } catch(e) {}
  });

  // Safe remote.php handler (Dwarves Mine, 10000 BC) - NEVER touches other fetches
  var origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function(url, opts) {
      if (typeof url === 'string' && url.indexOf('remote.php') !== -1) {
        return Promise.resolve(new Response(JSON.stringify({
          userBalance: 0,
          userBalanceBefore: 0,
          userBalanceAfter: 0,
          winnings: 0
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return origFetch.apply(window, arguments);
    };
  }

  // Global variables zeroing
  window.userBalance = 0;
  window.INITIAL_BALANCE = 0;
  window.defaultCoins = 0;
  window.defaultAmount = 0;

  // AppState hook
  window.AppState = window.AppState || {};
  try {
    Object.defineProperty(window.AppState, 'balance', {
      get: function() { return 0; },
      set: function() {},
      configurable: true
    });
  } catch(e) {}

  // Construct 3 hook - safely zeros variables on tick & beforeprojectstart
  var origRunOnStartup = window.runOnStartup;
  window.runOnStartup = function(cb) {
    var wrapped = async function(runtime) {
      window.c3_runtime = runtime;
      var zeroC3 = function() {
        try {
          if (runtime && runtime.globalVars) {
            for (var k in runtime.globalVars) {
              if (/^(balance|credits?|coins?|cash|chips?|money|setting_start_credits)$/i.test(k)) {
                runtime.globalVars[k] = 0;
              }
            }
          }
        } catch(e) {}
      };
      zeroC3();
      if (runtime && runtime.addEventListener) {
        runtime.addEventListener('beforeprojectstart', zeroC3);
        runtime.addEventListener('tick', zeroC3);
      }
      return cb(runtime);
    };
    if (typeof origRunOnStartup === 'function') {
      return origRunOnStartup(wrapped);
    }
  };

  // Continuous text enforcer for DOM and canvas text
  function enforceZero() {
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

  setInterval(enforceZero, 50);
  document.addEventListener('DOMContentLoaded', enforceZero);
})();
</script>`;

const hideBalanceLabelsCSS = `
<style>
/* Remove top labels showing balance from the game */
.balance-container, #balance-card, #mobile-top-header .balance-container,
.desktop-balance-val, .mobile-balance-val, .balance-label,
#balance-display, #balance-value, #user-balance, #player-balance,
.player-balance, .balance-text, [data-field="balance"], #balance_text,
.balance-badge, .header-balance, .balance-box, .balance-chip,
header .balance, .top-bar-balance, .game-header-balance,
.balance-wrapper, .balance-holder, #top-balance, #balanceCard,
.c-balance, .c-balance-display, #pnc-balance-container {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
</style>
`;

const gamesBelow12 = [
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

gamesBelow12.forEach(file => {
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) return;
  let c = fs.readFileSync(fp, 'utf8');

  // Fix dwarves_mine base URL
  if (file === 'dwarves_mine.html') {
    c = c.replace('demos/dwarves_mine/', 'demos/dwarves-mine/');
  }

  // Remove old injected scripts and styles
  c = c.replace(/<script>\s*\/\/ PK96 Master Zero Balance[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<script>\s*\/\/ PK96 Universal Zero Balance[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<script>\s*\/\/ PK96 Zero Balance Engine[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<script>\s*\/\/ PK96 Clean Zero Balance[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<style>\s*\/\* Remove top labels showing balance[\s\S]*?<\/style>\s*/gi, '');

  if (file === 'stairway_to_wealth.html') {
    // For stairway_to_wealth, dynamically load stairway_game.js using window.location.origin
    // so it doesn't get rewritten by <base href="...">
    const stairwayLoader = `
<script>
(function() {
  var s = document.createElement('script');
  s.src = window.location.origin + '/stairway_game.js?v=' + Date.now();
  document.head.appendChild(s);
})();
</script>
`;
    c = c.replace(/<script src="[^"]*game\.js"><\/script>/i, '');
    c = c.replace(/<head[^>]*>/i, match => match + '\n' + cleanZeroEngine + '\n' + hideBalanceLabelsCSS + '\n' + stairwayLoader);
  } else if (file === 'penalty_nations_cup.html') {
    // For penalty_nations_cup.html, inject AFTER <script type="importmap">
    if (c.includes('</script>') && c.includes('type="importmap"')) {
      c = c.replace(/(<\/script>\s*)(?=<style|<\/head|<meta)/i, '$1\n' + cleanZeroEngine + '\n' + hideBalanceLabelsCSS + '\n');
    } else {
      c = c.replace(/<head[^>]*>/i, match => match + '\n' + cleanZeroEngine + '\n' + hideBalanceLabelsCSS);
    }
  } else {
    c = c.replace(/<head[^>]*>/i, match => match + '\n' + cleanZeroEngine + '\n' + hideBalanceLabelsCSS);
  }

  fs.writeFileSync(fp, c, 'utf8');
  console.log(`[FIXED CLEAN] ${file}`);
});
