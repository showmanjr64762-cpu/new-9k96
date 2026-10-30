const fs = require('fs');
const path = require('path');

// Universal CSS to remove all top balance labels, badges, and headers from inside games
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

// Zero Balance & Non-Playable Engine with Construct 3 data.json zeroing & pnc_demo_balance zeroing
const masterZeroEngine = `<script>
// PK96 Master Zero Balance & Credit Lock Engine
(function() {
  'use strict';

  // 1. Storage interceptor - pnc_demo_balance, c3-localstorage, and exact balance keys
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

    // Safely zero any balances saved in Construct 3 c3-localstorage without breaking JSON structure
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

    for (var i = 0; i < zeroKeys.length; i++) {
      if (lk === zeroKeys[i]) return '0';
    }
    return origGetItem.apply(this, arguments);
  };

  Storage.prototype.setItem = function(k, v) {
    if (k && typeof k === 'string') {
      var lk = k.toLowerCase().trim();
      for (var i = 0; i < zeroKeys.length; i++) {
        if (lk === zeroKeys[i]) {
          return origSetItem.call(this, k, '0');
        }
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // Pre-seed storage
  zeroKeys.forEach(function(k) {
    try { origSetItem.call(localStorage, k, '0'); } catch(e) {}
  });

  // 2. Intercept fetch for remote.php AND Construct 3 data.json to strip demo balances
  var origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function(url, opts) {
      try {
        var urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');

        // Intercept remote.php (Dwarves Mine, 10000 BC)
        if (urlStr && urlStr.indexOf('remote.php') !== -1) {
          var fullUrl = urlStr.indexOf('http') === 0 ? urlStr : (document.baseURI ? new URL(urlStr, document.baseURI).href : urlStr);
          var proxyUrl = '/api/proxy-remote?url=' + encodeURIComponent(fullUrl);
          return origFetch.call(window, proxyUrl, opts).then(function(res) {
            return res.json().then(function(json) {
              json.userBalance = 0;
              json.userBalanceBefore = 0;
              json.userBalanceAfter = 0;
              json.winnings = 0;
              return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
            });
          });
        }

        // Intercept data.json (Construct 3 games: Final Survival, Football Bet, Super Soccer, Prehistory, Mummy)
        if (urlStr && urlStr.indexOf('data.json') !== -1) {
          return origFetch.apply(window, arguments).then(function(res) {
            return res.text().then(function(txt) {
              // Replace any initial balance/credit/Money variables in C3 data.json with 0
              txt = txt.replace(/\\[1,"balance",0,\\d+/g, '[1,"balance",0,0');
              txt = txt.replace(/\\[1,"Money",0,\\d+/g, '[1,"Money",0,0');
              txt = txt.replace(/\\[1,"SETTING_START_CREDITS",0,\\d+/g, '[1,"SETTING_START_CREDITS",0,0');
              txt = txt.replace(/\\[1,"credit",0,\\d+/g, '[1,"credit",0,0');
              txt = txt.replace(/\\[1,"credits",0,\\d+/g, '[1,"credits",0,0');
              txt = txt.replace(/\\[1,"coins",0,\\d+/g, '[1,"coins",0,0');
              return new Response(txt, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          });
        }
      } catch(e) {}
      return origFetch.apply(window, arguments);
    };
  }

  // 3. Global variables zeroing
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

  // Construct 3 hook
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
        runtime.addEventListener('tick', zeroC3);
      }
      return cb(runtime);
    };
    if (typeof origRunOnStartup === 'function') {
      return origRunOnStartup(wrapped);
    }
  };

  // 4. Continuous text enforcer for DOM and canvas text
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

  // Fix dwarves_mine base URL (hyphen instead of underscore)
  if (file === 'dwarves_mine.html') {
    c = c.replace('demos/dwarves_mine/', 'demos/dwarves-mine/');
  }

  // Remove old injected scripts and styles
  c = c.replace(/<script>\s*\/\/ PK96 Master Zero Balance[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<script>\s*\/\/ PK96 Universal Zero Balance[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<script>\s*\/\/ PK96 Zero Balance Engine[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<style>\s*\/\* Remove top labels showing balance[\s\S]*?<\/style>\s*/gi, '');

  // For penalty_nations_cup.html, inject AFTER <script type="importmap">
  if (file === 'penalty_nations_cup.html') {
    if (c.includes('</script>') && c.includes('type="importmap"')) {
      c = c.replace(/(<\/script>\s*)(?=<style|<\/head|<meta)/i, '$1\n' + masterZeroEngine + '\n' + hideBalanceLabelsCSS + '\n');
    } else {
      c = c.replace(/<head[^>]*>/i, match => match + '\n' + masterZeroEngine + '\n' + hideBalanceLabelsCSS);
    }
  } else {
    // Normal placement inside head
    c = c.replace(/<head[^>]*>/i, match => match + '\n' + masterZeroEngine + '\n' + hideBalanceLabelsCSS);
  }

  fs.writeFileSync(fp, c, 'utf8');
  console.log(`[UPDATED] ${file} updated with master zero engine and top labels removed.`);
});

// Also add hideBalanceLabelsCSS to pk96-balance.js DOM injections so games 1-12 also hide top balance labels
const pk96Path = path.join(__dirname, 'pk96-balance.js');
let pk96 = fs.readFileSync(pk96Path, 'utf8');
if (!pk96.includes('hide-top-balance-labels-style')) {
  const cssInjection = `
    try {
      if (!document.getElementById('hide-top-balance-labels-style')) {
        var st = document.createElement('style');
        st.id = 'hide-top-balance-labels-style';
        st.textContent = '.desktop-balance-val, .mobile-balance-val, .balance-container, #balance-card, #balance-display, #balance-value, .balance-label, .balance-badge { display: none !important; }';
        document.head.appendChild(st);
      }
    } catch(e) {}
  `;
  pk96 = pk96.replace('function isInsideGameFrame() {', cssInjection + '\n  function isInsideGameFrame() {');
  fs.writeFileSync(pk96Path, pk96, 'utf8');
  console.log('[UPDATED] pk96-balance.js updated to hide top balance labels inside games 1-12.');
}
