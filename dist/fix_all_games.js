const fs = require('fs');
const path = require('path');

// 1. First, update index.html to always launch games with 0 balance
const indexPath = path.join(__dirname, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Ensure targetGameUrl always has pk96_bal=0
indexContent = indexContent.replace(
  /url\.searchParams\.set\('pk96_bal',\s*currentBal\.toString\(\)\);/g,
  "url.searchParams.set('pk96_bal', '0');"
);
indexContent = indexContent.replace(
  /\?pk96_bal=" \+ encodeURIComponent\(currentBal\)/g,
  '?pk96_bal=0'
);
indexContent = indexContent.replace(
  /balance:\s*bal,/g,
  'balance: 0,'
);
fs.writeFileSync(indexPath, indexContent, 'utf8');
console.log('[UPDATED] index.html updated to strictly pass 0 balance to all game launches.');

// 2. Update pk96-balance.js to return 0 when inside ANY game
const pk96BalPath = path.join(__dirname, 'pk96-balance.js');
let pk96Content = fs.readFileSync(pk96BalPath, 'utf8');

const isInsideGameHelper = `
  function isInsideGameFrame() {
    try {
      if (window.parent && window.parent !== window) return true;
      if (window.top && window.top !== window) return true;
      var p = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
      if (p.indexOf('.html') !== -1 && p.indexOf('index.html') === -1 && p.indexOf('admin.html') === -1 && p.indexOf('dashboard.html') === -1) {
        return true;
      }
    } catch(e) {}
    return false;
  }
`;

if (!pk96Content.includes('isInsideGameFrame')) {
  pk96Content = pk96Content.replace(
    'function getPK96Balance() {',
    isInsideGameHelper + '\n  function getPK96Balance() {\n    if (isInsideGameFrame()) return 0;'
  );
  fs.writeFileSync(pk96BalPath, pk96Content, 'utf8');
  console.log('[UPDATED] pk96-balance.js updated so games 1-12 always receive 0 balance.');
}

// 3. Perfect zero balance engine for games 13-23:
// Safe, does not break fetch, does not break c3-localstorage, does not break importmaps.
const safeZeroEngine = `<script>
// PK96 Zero Balance Engine
(function() {
  'use strict';

  // 1. Safe fetch interceptor for remote.php only (ALWAYS using window context)
  var origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = function(url, opts) {
      try {
        var urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');
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
      } catch(e) {}
      return origFetch.apply(window, arguments);
    };
  }

  // 2. Safe balance storage interceptor (strictly targeted keys only, NEVER touch c3-localstorage)
  var balanceExactKeys = [
    'balance', 'credits', 'credit', 'c2balance', 'c3balance', 'coins', 'coin',
    'player_balance', 'user_balance', 'demo_balance', 'initial_balance',
    'final_survival_balance', 'football_bet_balance', 'halloween_crash_balance',
    'dwarves_mine_balance', '10000_bc_balance', 'mayan_temple_balance',
    'total_coins', 'game_balance', 'pk96_balance', 'pk96_guest_balance',
    'chips', 'userbalance'
  ];

  var origGetItem = Storage.prototype.getItem;
  var origSetItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function(k) {
    if (!k || typeof k !== 'string') return origGetItem.apply(this, arguments);
    var lk = k.toLowerCase().trim();
    if (lk === 'c3-localstorage') return origGetItem.apply(this, arguments);
    for (var i = 0; i < balanceExactKeys.length; i++) {
      if (lk === balanceExactKeys[i]) return '0';
    }
    return origGetItem.apply(this, arguments);
  };

  Storage.prototype.setItem = function(k, v) {
    if (k && typeof k === 'string') {
      var lk = k.toLowerCase().trim();
      if (lk !== 'c3-localstorage') {
        for (var i = 0; i < balanceExactKeys.length; i++) {
          if (lk === balanceExactKeys[i]) {
            return origSetItem.call(this, k, '0');
          }
        }
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // 3. Global variables zeroing
  window.userBalance = 0;
  window.INITIAL_BALANCE = 0;
  window.defaultCoins = 0;
  window.defaultAmount = 0;

  // AppState hook for Stairway to Wealth
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
              if (/^(balance|credits?|coins?|cash|chips?|money)$/i.test(k)) {
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

// 4. Apply to each of games 13-23
const gameFiles = [
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

gameFiles.forEach(file => {
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) return;
  let c = fs.readFileSync(fp, 'utf8');

  // Strip all old injected scripts and lobby buttons
  c = c.replace(/<script>\s*\/\/ PK96 Universal Zero Balance[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<script>\s*\/\/ PK96 Zero Balance Engine[\s\S]*?<\/script>\s*/gi, '');
  c = c.replace(/<button[^>]*class="[^"]*lobby-back-btn[^"]*"[^>]*>[\s\S]*?<\/button>\s*/gi, '');
  c = c.replace(/<button[^>]*id="btnBackLobby"[^>]*>[\s\S]*?<\/button>\s*/gi, '');
  c = c.replace(/\.lobby-back-btn\s*\{[\s\S]*?\}/g, '');
  c = c.replace(/\.lobby-back-btn:hover\s*\{[\s\S]*?\}/g, '');
  c = c.replace(/<script src="\/pk96-balance\.js"><\/script>\s*/g, '');
  c = c.replace(/<script src="\/game-balance-bridge\.js"><\/script>\s*/g, '');

  if (file === 'penalty_nations_cup.html') {
    // In penalty_nations_cup.html, script must be AFTER <script type="importmap">...</script>
    if (c.includes('</script>') && c.includes('type="importmap"')) {
      c = c.replace(/<\/script>\s*(?=<style|<\/head)/i, '</script>\n' + safeZeroEngine + '\n');
    } else {
      c = c.replace(/<head[^>]*>/i, match => match + '\n' + safeZeroEngine);
    }
  } else {
    // Normal placement inside head
    c = c.replace(/<head[^>]*>/i, match => match + '\n' + safeZeroEngine);
  }

  fs.writeFileSync(fp, c, 'utf8');
  console.log(`[FIXED] ${file} cleaned and patched with safe zero engine.`);
});
