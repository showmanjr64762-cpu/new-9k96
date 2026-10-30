// PK96 Universal Game Balance Zeroer
// Enforces 0.00 balance on all games below 12, removes all inbuilt demo balances (10000, 1000, 100),
// and strictly protects lobby balance.

(function() {
  'use strict';
  
  // 1. Force Storage to always return 0 for any balance or currency key
  const zeroBalanceKeys = [
    'balance', 'credits', 'credit', 'c2balance', 'c3balance', 'coins',
    'player_balance', 'user_balance', 'demo_balance', 'initial_balance',
    'final_survival_balance', 'football_bet_balance', 'halloween_crash_balance',
    'dwarves_mine_balance', '10000_bc_balance', 'mayan_temple_balance',
    'total_coins', 'game_balance', 'pk96_balance', 'pk96_guest_balance',
    'score', 'money', 'cash', 'c3-localstorage'
  ];

  const origGetItem = Storage.prototype.getItem;
  const origSetItem = Storage.prototype.setItem;

  Storage.prototype.getItem = function(k) {
    if (!k || typeof k !== 'string') return origGetItem.apply(this, arguments);
    const lk = k.toLowerCase();
    for (let i = 0; i < zeroBalanceKeys.length; i++) {
      if (lk === zeroBalanceKeys[i] || lk.includes('balance') || lk.includes('credit') || lk.includes('coin')) {
        return '0';
      }
    }
    return origGetItem.apply(this, arguments);
  };

  Storage.prototype.setItem = function(k, v) {
    if (k && typeof k === 'string') {
      const lk = k.toLowerCase();
      for (let i = 0; i < zeroBalanceKeys.length; i++) {
        if (lk === zeroBalanceKeys[i] || lk.includes('balance') || lk.includes('credit') || lk.includes('coin')) {
          return origSetItem.call(this, k, '0');
        }
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // Pre-seed storage with 0
  zeroBalanceKeys.forEach(k => {
    try { origSetItem.call(localStorage, k, '0'); } catch(e) {}
  });

  // 2. Global variable hooks
  window.userBalance = 0;
  window.INITIAL_BALANCE = 0;
  window.defaultCoins = 0;
  window.defaultAmount = 0;

  // AppState hook for Stairway to Wealth
  window.AppState = window.AppState || {};
  Object.defineProperty(window.AppState, 'balance', {
    get: function() { return 0; },
    set: function() {},
    configurable: true
  });

  // slotConfig_3x5 for Mayan Temple
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

  // 3. Construct 3 hook
  const origRunOnStartup = window.runOnStartup;
  window.runOnStartup = function(cb) {
    const wrapped = async function(runtime) {
      window.c3_runtime = runtime;
      const zeroC3 = () => {
        if (runtime.globalVars) {
          for (const k in runtime.globalVars) {
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
  const origFetch = window.fetch;
  window.fetch = async function(url, opts) {
    const urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');
    if (urlStr.includes('remote.php')) {
      const fullUrl = urlStr.startsWith('http') ? urlStr : (document.baseURI ? new URL(urlStr, document.baseURI).href : urlStr);
      const proxyUrl = '/api/proxy-remote?url=' + encodeURIComponent(fullUrl);
      try {
        const res = await origFetch.call(this, proxyUrl, opts);
        const json = await res.json();
        json.userBalance = 0;
        json.userBalanceBefore = 0;
        json.userBalanceAfter = 0;
        return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch(e) {}
    }
    return origFetch.apply(this, arguments);
  };

  // 5. DOM & Engine Canvas text zeroer
  function enforceZeroText() {
    const selectors = [
      '.desktop-balance-val', '.mobile-balance-val', '.balance-value',
      '#balance-value', '#balance-display', '#user-balance', '#player-balance',
      '.player-balance', '.balance-text', '[data-field="balance"]',
      '#balance_text', '.balance', '#balance', '.credit', '.credits'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
      if (el.textContent !== '0.00' && el.textContent !== '0' && el.textContent !== 'Rs 0.00') {
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

  const obs = new MutationObserver(enforceZeroText);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
      enforceZeroText();
    });
  }

  // Back to lobby helper
  window.goBackToLobby = function() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage('backToLobby', '*');
        window.parent.postMessage({ type: 'PK96_CLOSE_GAME' }, '*');
        if (typeof window.parent.switchPage === 'function') window.parent.switchPage('home');
        const b = window.parent.document.getElementById('gamePageBackBtn');
        if (b) { b.click(); return; }
      }
    } catch(e) {}
    window.location.href = '/';
  };
})();
