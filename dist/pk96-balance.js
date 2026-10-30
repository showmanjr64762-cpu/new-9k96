// PK96 Global Shared Balance System
(function() {
  // Global Safe JSON.stringify guard against circular structures
  if (typeof JSON !== 'undefined' && JSON.stringify) {
    const _originalStringify = JSON.stringify;
    JSON.stringify = function(value, replacer, space) {
      try {
        return _originalStringify(value, replacer, space);
      } catch (e) {
        if (e && e.message && (e.message.includes('circular') || e.message.includes('Converting circular structure'))) {
          try {
            const seen = new WeakSet();
            return _originalStringify(value, function(k, v) {
              if (typeof replacer === 'function') {
                v = replacer(k, v);
              }
              if (typeof v === 'object' && v !== null) {
                if (typeof Element !== 'undefined' && (v instanceof Element || v instanceof Node)) {
                  return undefined;
                }
                if (v.constructor && (v.constructor.name === 'HTMLImageElement' || v.constructor.name === 'Image')) {
                  return undefined;
                }
                if (seen.has(v)) return undefined;
                seen.add(v);
              }
              return v;
            }, space);
          } catch (e2) {
            return '{}';
          }
        }
        throw e;
      }
    };
  }

  const BALANCE_KEYS = [
    'pk96_balance',
    'pk96_guest_balance',
    'desertaxebalance',
    'desert_axe_balance',
    'playerbalance',
    'roulette_balance',
    'glass_roulette_balance',
    'neon_spins_balance',
    'rocket_mines_balance',
    'mines_balance',
    'aviator_balance',
    'chicken_road_balance',
    'desert_fortune_balance',
    'flappy_balance',
    'ladders_balance',
    'snakes_balance',
    'snakes2_balance',
    'tiktakwin_balance',
    'tiktak_balance',
    'fortune_jem3_jems_v3',
    'casino_balance',
    'astro_crash_balance',
    'ace_vs_joker_balance',
    'dwarves_mine_balance',
    'dwarvesmine_balance',
    'final_survival_balance',
    'finalsurvival_balance',
    'football_bet_balance',
    'footballbet_balance',
    'mk_donuts_bl_amount',
    '10000_bc_balance',
    '10000bc_balance',
    'mayan_temple_balance',
    'mayantemple_balance'
  ];

  function isBalanceKey(key) {
    if (typeof key !== 'string') return false;
    const lKey = key.toLowerCase();
    if (lKey === 'desertaxehighbalance' || lKey.includes('stats_v') || lKey.includes('history') || lKey.includes('sound')) return false;
    if (BALANCE_KEYS.includes(lKey)) return true;
    if (lKey === 'mk_donuts_bl_amount' || lKey.includes('donuts_bl')) return true;
    if (lKey === 'balance' || lKey.endsWith('balance') || lKey.includes('userbalance') || lKey.includes('playerbalance')) return true;
    return false;
  }

  const origGetItem = Storage.prototype.getItem;
  const origSetItem = Storage.prototype.setItem;
  const origRemoveItem = Storage.prototype.removeItem;
  let isProcessingBalance = false;
  let lastRecordedBalance = null;

  function isAccessibleWindow(win) {
    if (!win || win === window) return false;
    // Only permit parent/top if this window is nested in an iframe
    if (win !== window.parent && win !== window.top) return false;
    try {
      // Reading win.location or origin will throw DOMException if cross-origin
      return !!(win.location && win.location.origin === window.location.origin);
    } catch(e) {
      return false;
    }
  }

  function isUserLoggedIn() {
    // 1. Check explicit logout flag
    try {
      if (origGetItem.call(localStorage, 'pk96_explicit_logout') === 'true') {
        return false;
      }
    } catch(e) {}

    // 2. Direct local storage check
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u && (u.email || u.uid) && !String(u.uid || '').startsWith('guest_') && u.uid !== 'guest' && u.email !== 'guest@pk96.com' && !u.isGuest) {
          return true;
        }
      }
    } catch(e) {}

    // 3. Safe same-origin parent check
    try {
      if (isAccessibleWindow(window.parent) && window.parent !== window) {
        if (typeof window.parent.isUserLoggedIn === 'function') {
          return window.parent.isUserLoggedIn();
        }
        if (window.parent.PK96 && typeof window.parent.PK96.getUser === 'function') {
          const pu = window.parent.PK96.getUser();
          if (pu && (pu.email || pu.uid) && !String(pu.uid || '').startsWith('guest_') && pu.uid !== 'guest' && pu.email !== 'guest@pk96.com' && !pu.isGuest) {
            return true;
          }
        }
      }
    } catch(e) {}

    return false;
  }

  let hasConsumedUrlBal = false;

  
  
    try {
      if (!document.getElementById('hide-top-balance-labels-style')) {
        var st = document.createElement('style');
        st.id = 'hide-top-balance-labels-style';
        st.textContent = '.desktop-balance-val, .mobile-balance-val, .balance-container, #balance-card, #balance-display, #balance-value, .balance-label, .balance-badge { display: none !important; }';
        document.head.appendChild(st);
      }
    } catch(e) {}
  
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

  function getPK96Balance() {
    if (isInsideGameFrame()) return 0;
    const loggedIn = isUserLoggedIn();

    if (!loggedIn) {
      // Guest mode: completely isolated balance, strictly defaults to 0.
      // Under NO circumstances inherit or fall back to pk96_balance, parent real user balance, or any user profile!
      let guestBal = 0;
      try {
        const guestBalStr = origGetItem.call(localStorage, 'pk96_guest_balance');
        if (guestBalStr !== null && guestBalStr !== undefined && !isNaN(Number(guestBalStr))) {
          guestBal = Number(guestBalStr);
        } else {
          guestBal = 0;
          origSetItem.call(localStorage, 'pk96_guest_balance', '0');
        }
      } catch(e) {
        guestBal = 0;
      }
      const validGuest = Math.max(0, Math.round(guestBal * 100) / 100);
      lastRecordedBalance = validGuest;
      return validGuest;
    }

    // 1. Direct local storage check for real user (priority over launch URL so wins/losses persist!)
    let currentBal = null;
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u && typeof u.balance === 'number' && !isNaN(u.balance)) {
          currentBal = u.balance;
        }
      }
      if (currentBal === null) {
        const directBal = origGetItem.call(localStorage, 'pk96_balance');
        if (directBal !== null && directBal !== undefined && !isNaN(Number(directBal))) {
          currentBal = Number(directBal);
        }
      }
    } catch (e) {}

    // 2. Try direct parent PK96 if running in iframe / child window
    if (currentBal === null) {
      try {
        if (isAccessibleWindow(window.parent) && window.parent.PK96 && typeof window.parent.PK96.getBalance === 'function') {
          const pBal = window.parent.PK96.getBalance();
          if (typeof pBal === 'number' && !isNaN(pBal)) {
            currentBal = pBal;
          }
        }
      } catch(e) {}
    }

    // 3. Fallback to URL parameter ONLY on cold initialization when no balance is saved
    if (currentBal === null && !hasConsumedUrlBal) {
      try {
        const uP = new URLSearchParams(window.location.search);
        const isGuestLaunch = uP.get('pk96_guest');
        if (isGuestLaunch !== 'true') {
          const pB = uP.get('pk96_bal');
          if (pB !== null && !isNaN(Number(pB))) {
            currentBal = Number(pB);
            hasConsumedUrlBal = true;
          }
        }
      } catch(e) {}
    }

    if (currentBal === null) {
      if (lastRecordedBalance !== null && typeof lastRecordedBalance === 'number' && !isNaN(lastRecordedBalance)) {
        currentBal = lastRecordedBalance;
      } else {
        currentBal = 0;
      }
    }

    const valid = Math.max(0, Math.round(currentBal * 100) / 100);
    lastRecordedBalance = valid;

    // Sync valid balance back into storage
    try {
      if (origGetItem.call(localStorage, 'pk96_balance') !== valid.toString()) {
        origSetItem.call(localStorage, 'pk96_balance', valid.toString());
      }
    } catch(e) {}

    return valid;
  }

  function getPK96TotalBet() {
    const loggedIn = isUserLoggedIn();
    if (!loggedIn) {
      let guestBets = 0;
      try {
        const g = Number(origGetItem.call(localStorage, 'pk96_guest_bets'));
        if (!isNaN(g)) guestBets = g;
      } catch(e) {}
      return guestBets;
    }

    let maxBets = 0;
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          const uBets = Number(u.totalBets);
          const uTurnover = Number(u.turnover);
          const uVip = Number(u.vipBetPoints);
          if (!isNaN(uBets) && uBets > maxBets) maxBets = uBets;
          if (!isNaN(uTurnover) && uTurnover > maxBets) maxBets = uTurnover;
          if (!isNaN(uVip) && uVip > maxBets) maxBets = uVip;
        }
      }
      const directBets = Number(origGetItem.call(localStorage, 'pk96_user_bets'));
      if (!isNaN(directBets) && directBets > maxBets) maxBets = directBets;
    } catch(e) {}
    return maxBets;
  }

  function getPK96TotalDeposit() {
    const loggedIn = isUserLoggedIn();
    try {
      if (loggedIn) {
        const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
        if (loggedStr) {
          const u = JSON.parse(loggedStr);
          if (u && (u.email || u.uid)) {
            const val = Number(u.totalDeposit || u.totalDeposited || u.totalDeposits || u.depositAmount);
            if (!isNaN(val) && val >= 0) return val;
          }
        }
        const directDep = Number(origGetItem.call(localStorage, 'pk96_user_deposits'));
        if (!isNaN(directDep) && directDep >= 0) return directDep;
      } else {
        const guestDep = Number(origGetItem.call(localStorage, 'pk96_guest_deposits'));
        if (!isNaN(guestDep) && guestDep >= 0) return guestDep;
      }
    } catch(e) {}
    return 0;
  }

  function getPK96Wager() {
    const loggedIn = isUserLoggedIn();
    if (!loggedIn) {
      return 0;
    }
    let maxWager = 0;
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          const val1 = Number(u.wagerRequirement);
          const val2 = Number(u.wagerAmount);
          if (!isNaN(val1) && val1 > maxWager) maxWager = val1;
          if (!isNaN(val2) && val2 > maxWager) maxWager = val2;
        }
      }
      const directWager = Number(origGetItem.call(localStorage, 'pk96_wager_required'));
      if (!isNaN(directWager) && directWager > maxWager) {
        maxWager = directWager;
      }
    } catch(e) {}
    return Math.max(0, Math.round(maxWager * 100) / 100);
  }

  function setPK96Wager(amount, syncRemote = true) {
    const num = Number(amount);
    const validWager = (isNaN(num) || num < 0) ? 0 : Math.max(0, Math.round(num * 100) / 100);

    try {
      origSetItem.call(localStorage, 'pk96_wager_required', validWager.toString());
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          u.wagerRequirement = validWager;
          u.wagerAmount = validWager;
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));

          if (u.email) {
            try {
              const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
              if (regUsersStr) {
                const regUsers = JSON.parse(regUsersStr);
                const cleanEmail = u.email.toLowerCase().trim();
                const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
                if (regUsers[cleanEmail]) {
                  regUsers[cleanEmail].wagerRequirement = validWager;
                  regUsers[cleanEmail].wagerAmount = validWager;
                }
                if (regUsers[emailKey]) {
                  regUsers[emailKey].wagerRequirement = validWager;
                  regUsers[emailKey].wagerAmount = validWager;
                }
                origSetItem.call(localStorage, 'pk96_registered_users', JSON.stringify(regUsers));
              }
            } catch(e) {}
          }

          if (syncRemote && u.uid) {
            try {
              const dbObj = window.db || window.firebaseDb || (isAccessibleWindow(window.parent) && (window.parent.db || window.parent.firebaseDb));
              const docFn = window.doc || (window.firebaseFirestore && window.firebaseFirestore.doc) || (isAccessibleWindow(window.parent) && window.parent.firebaseFirestore && window.parent.firebaseFirestore.doc);
              const setDocFn = window.setDoc || (window.firebaseFirestore && window.firebaseFirestore.setDoc) || (isAccessibleWindow(window.parent) && window.parent.firebaseFirestore && window.parent.firebaseFirestore.setDoc);
              if (dbObj && docFn && setDocFn) {
                const payload = { wagerRequirement: validWager, wagerAmount: validWager };
                setDocFn(docFn(dbObj, "users", u.uid), payload, { merge: true }).catch(() => {});
                if (u.email) {
                  const emailKey = u.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
                  setDocFn(docFn(dbObj, "users", "email_" + emailKey), payload, { merge: true }).catch(() => {});
                }
              }
            } catch(e) {}
          }
        }
      }
    } catch(e) {}

    try {
      window.dispatchEvent(new CustomEvent('pk96_wager_changed', { detail: { wagerRequirement: validWager } }));
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'PK96_WAGER_UPDATE', wagerRequirement: validWager }, '*');
      }
    } catch(e) {}

    return validWager;
  }

  function addPK96Wager(amount) {
    const addAmt = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
    if (addAmt <= 0) return getPK96Wager();
    const currentWager = getPK96Wager();
    const newWager = Math.round((currentWager + addAmt) * 100) / 100;
    return setPK96Wager(newWager, true);
  }

  function deductPK96Wager(amount) {
    const betAmt = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
    if (betAmt <= 0) return getPK96Wager();
    const currentWager = getPK96Wager();
    if (currentWager <= 0) return 0;
    const newWager = Math.max(0, Math.round((currentWager - betAmt) * 100) / 100);
    return setPK96Wager(newWager, true);
  }

  function checkAndUpdateReferralValidity(userUid, userEmail, referCode, totalDep, totalBet) {
    const depVal = Number(totalDep) || 0;
    const betVal = Number(totalBet) || 0;
    const isValid = (depVal >= 500 && betVal >= 5000);
    let cleanRefCode = referCode ? String(referCode).trim() : '';

    // Auto-resolve referrer code if not explicitly passed
    if (!cleanRefCode) {
      try {
        const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
        if (regUsersStr) {
          const regUsers = JSON.parse(regUsersStr);
          const cleanEmail = (userEmail || '').toLowerCase().trim();
          const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          if (regUsers[cleanEmail] && regUsers[cleanEmail].referredBy) {
            cleanRefCode = String(regUsers[cleanEmail].referredBy).trim();
          } else if (regUsers[emailKey] && regUsers[emailKey].referredBy) {
            cleanRefCode = String(regUsers[emailKey].referredBy).trim();
          } else {
            for (const k in regUsers) {
              const u = regUsers[k];
              if (u && (u.uid === userUid || (u.email && u.email.toLowerCase() === cleanEmail)) && u.referredBy) {
                cleanRefCode = String(u.referredBy).trim();
                break;
              }
            }
          }
        }
      } catch(e) {}
    }

    if (!cleanRefCode) {
      try {
        const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
        if (loggedStr) {
          const u = JSON.parse(loggedStr);
          if (u && u.referredBy) {
            cleanRefCode = String(u.referredBy).trim();
          }
        }
      } catch(e) {}
    }

    if (!cleanRefCode) {
      try {
        const pendingRef = origGetItem.call(localStorage, 'pk96_pending_referral') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('pk96_pending_referral') : '');
        if (pendingRef) cleanRefCode = String(pendingRef).trim();
      } catch(e) {}
    }

    try {
      const localRefs = JSON.parse(origGetItem.call(localStorage, 'pk96_referral_tracking') || '{}');
      let changed = false;

      // Update in existing referral tracking buckets
      for (const code in localRefs) {
        if (Array.isArray(localRefs[code])) {
          localRefs[code].forEach(ref => {
            if ((ref.uid && userUid && ref.uid === userUid) || (ref.email && userEmail && ref.email.toLowerCase() === userEmail.toLowerCase())) {
              ref.totalDeposit = depVal;
              ref.totalBets = betVal;
              ref.isValid = isValid;
              changed = true;
            }
          });
        }
      }

      // If user had a specific referCode, ensure tracked there
      if (cleanRefCode) {
        if (!localRefs[cleanRefCode]) localRefs[cleanRefCode] = [];
        let existing = localRefs[cleanRefCode].find(r => (userUid && r.uid === userUid) || (userEmail && r.email && r.email.toLowerCase() === userEmail.toLowerCase()));
        if (existing) {
          existing.totalDeposit = depVal;
          existing.totalBets = betVal;
          existing.isValid = isValid;
        } else {
          localRefs[cleanRefCode].push({
            uid: userUid || '',
            email: userEmail || '',
            totalDeposit: depVal,
            totalBets: betVal,
            isValid: isValid,
            date: new Date().toISOString()
          });
        }
        changed = true;
      }

      if (changed) {
        origSetItem.call(localStorage, 'pk96_referral_tracking', JSON.stringify(localRefs));
      }

      // Also update in pk96_registered_users
      if (userEmail) {
        const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
        if (regUsersStr) {
          const regUsers = JSON.parse(regUsersStr);
          const cleanEmail = userEmail.toLowerCase().trim();
          const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
          if (regUsers[cleanEmail]) {
            regUsers[cleanEmail].totalDeposit = depVal;
            regUsers[cleanEmail].totalDeposited = depVal;
            regUsers[cleanEmail].totalBets = betVal;
            regUsers[cleanEmail].turnover = betVal;
            regUsers[cleanEmail].isValid = isValid;
            if (cleanRefCode && !regUsers[cleanEmail].referredBy) regUsers[cleanEmail].referredBy = cleanRefCode;
          }
          if (regUsers[emailKey]) {
            regUsers[emailKey].totalDeposit = depVal;
            regUsers[emailKey].totalDeposited = depVal;
            regUsers[emailKey].totalBets = betVal;
            regUsers[emailKey].turnover = betVal;
            regUsers[emailKey].isValid = isValid;
            if (cleanRefCode && !regUsers[emailKey].referredBy) regUsers[emailKey].referredBy = cleanRefCode;
          }
          origSetItem.call(localStorage, 'pk96_registered_users', JSON.stringify(regUsers));
        }
      }

      // Also update in pk96_logged_user
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u && ((u.uid && u.uid === userUid) || (u.email && userEmail && u.email.toLowerCase() === userEmail.toLowerCase()))) {
          u.isValid = isValid;
          u.totalDeposit = depVal;
          u.totalDeposited = depVal;
          u.totalBets = betVal;
          u.turnover = betVal;
          if (cleanRefCode && !u.referredBy) u.referredBy = cleanRefCode;
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));
        }
      }

      if (typeof window.updateReferralUI === 'function') {
        window.updateReferralUI();
      }
      if (typeof window.generateInviteRewards === 'function') {
        window.generateInviteRewards();
      }
    } catch(e) {}

    // Sync to Firestore
    try {
      const dbObj = window.db || window.firebaseDb || (isAccessibleWindow(window.parent) && (window.parent.db || window.parent.firebaseDb));
      const docFn = window.doc || (window.firebaseFirestore && window.firebaseFirestore.doc) || (isAccessibleWindow(window.parent) && window.parent.firebaseFirestore && window.parent.firebaseFirestore.doc);
      const setDocFn = window.setDoc || (window.firebaseFirestore && window.firebaseFirestore.setDoc) || (isAccessibleWindow(window.parent) && window.parent.firebaseFirestore && window.parent.firebaseFirestore.setDoc);

      if (dbObj && docFn && setDocFn && userUid) {
        const nowIso = new Date().toISOString();
        const payload = {
          referredUid: userUid,
          referredEmail: userEmail || '',
          referCode: cleanRefCode,
          totalDeposit: depVal,
          totalDeposited: depVal,
          totalBets: betVal,
          turnover: betVal,
          isValid: isValid,
          lastUpdated: nowIso
        };

        setDocFn(docFn(dbObj, "referrals", userUid), payload, { merge: true }).catch(() => {});
        setDocFn(docFn(dbObj, "users", userUid), { totalDeposit: depVal, totalDeposited: depVal, totalBets: betVal, turnover: betVal, isValid: isValid }, { merge: true }).catch(() => {});

          if (cleanRefCode) {
          setDocFn(docFn(dbObj, "referral_stats", cleanRefCode, "referred_users", userUid), {
            uid: userUid,
            email: userEmail || '',
            totalDeposit: depVal,
            totalBets: betVal,
            isValid: isValid,
            lastUpdated: nowIso
          }, { merge: true }).catch(() => {});
        }
      }
    } catch(e) {}

    // Sync to backend server
    try {
      fetch('/api/referrals/update-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referredUid: userUid,
          referredEmail: userEmail,
          deposit: depVal,
          bets: betVal
        })
      }).catch(() => {});
    } catch(e) {}
  }

  function recordDeposit(amount) {
    const depAmt = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
    if (depAmt <= 0) return getPK96TotalDeposit();

    const currentDep = getPK96TotalDeposit();
    const newTotal = Math.round((currentDep + depAmt) * 100) / 100;
    const currentBets = getPK96TotalBet();

    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          u.totalDeposit = newTotal;
          u.totalDeposited = newTotal;
          u.totalDeposits = newTotal;
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));
          if (u.email) {
            try {
              const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
              if (regUsersStr) {
                const regUsers = JSON.parse(regUsersStr);
                if (regUsers[u.email]) {
                  regUsers[u.email].totalDeposit = newTotal;
                  regUsers[u.email].totalDeposited = newTotal;
                  regUsers[u.email].totalDeposits = newTotal;
                }
                const emailKey = u.email.replace(/[^a-zA-Z0-9]/g, '_');
                if (regUsers[emailKey]) {
                  regUsers[emailKey].totalDeposit = newTotal;
                  regUsers[emailKey].totalDeposited = newTotal;
                  regUsers[emailKey].totalDeposits = newTotal;
                }
                origSetItem.call(localStorage, 'pk96_registered_users', JSON.stringify(regUsers));
              }
            } catch(e) {}
          }
          if (u.uid) {
            try {
              const dbObj = window.db || window.firebaseDb;
              const docFn = window.doc || (window.firebaseFirestore && window.firebaseFirestore.doc);
              const setDocFn = window.setDoc || (window.firebaseFirestore && window.firebaseFirestore.setDoc);
              if (dbObj && docFn && setDocFn) {
                const fsPayload = {
                  totalDeposit: newTotal,
                  totalDeposited: newTotal,
                  totalDeposits: newTotal,
                  balance: typeof u.balance === 'number' ? u.balance : getPK96Balance()
                };
                setDocFn(docFn(dbObj, "users", u.uid), fsPayload, { merge: true }).catch(() => {});
                if (u.email) {
                  const emailKey = u.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
                  setDocFn(docFn(dbObj, "users", "email_" + emailKey), fsPayload, { merge: true }).catch(() => {});
                  setDocFn(docFn(dbObj, "users", u.email.toLowerCase().trim()), fsPayload, { merge: true }).catch(() => {});
                }
              }
            } catch(e) {}
          }

          checkAndUpdateReferralValidity(u.uid, u.email, u.referredBy || '', newTotal, currentBets);
        }
      }
      origSetItem.call(localStorage, 'pk96_user_deposits', newTotal.toString());
      origSetItem.call(localStorage, 'pk96_guest_deposits', newTotal.toString());
    } catch(e) {
      origSetItem.call(localStorage, 'pk96_guest_deposits', newTotal.toString());
      origSetItem.call(localStorage, 'pk96_user_deposits', newTotal.toString());
    }

    // Automatically increase the wager turnover requirement for the deposit
    try {
      addPK96Wager(depAmt);
    } catch(e) {}

    try {
      logStep('DEPOSIT_RECORDED', { amount: depAmt, newTotalDeposit: newTotal });
    } catch(e) {}

    try {
      window.dispatchEvent(new CustomEvent('pk96_deposit_changed', { detail: { totalDeposits: newTotal, amount: depAmt } }));
      window.dispatchEvent(new CustomEvent('pk96_balance_changed', { detail: { balance: getPK96Balance() } }));
    } catch(e) {}

    // Send authoritative deposit transaction to backend
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      let userUid = '';
      let userEmail = '';
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          userUid = u.uid || '';
          userEmail = u.email || '';
        }
      }
      if (userUid || userEmail) {
        const txnId = 'txn_dep_' + (userUid || 'usr') + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        fetch('/api/transactions/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: txnId,
            user_id: userUid,
            user_email: userEmail,
            amount: depAmt,
            status: 'COMPLETED'
          })
        }).then(r => r.json()).then(data => {
          if (data && data.qualification) {
            window.postMessage({ type: 'PK96_REFERRAL_QUALIFICATION_UPDATE', qualification: data.qualification }, '*');
          }
        }).catch(() => {});
      }
    } catch(e) {}

    return newTotal;
  }

  const VIP_BET_THRESHOLDS = [
    30000, 60000, 90000, 120000, 150000,
    170000, 200000, 230000, 250000, 280000,
    300000, 320000, 350000, 390000, 410000,
    450000, 490000, 520000, 550000, 600000
  ];

  function getPK96VipLevel(totalBets) {
    const bets = typeof totalBets === 'number' ? totalBets : getPK96TotalBet();
    if (!bets || bets <= 0) return 0;
    let level = 0;
    for (let i = 0; i < VIP_BET_THRESHOLDS.length; i++) {
      if (bets >= VIP_BET_THRESHOLDS[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    return Math.min(20, level);
  }

  let lastRecordedBetTime = 0;
  let lastRecordedBetAmt = 0;

  function recordBet(amount) {
    const betAmt = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
    if (betAmt <= 0) return getPK96TotalBet();

    const now = Date.now();
    
    // Cross-context and cross-iframe deduplication check (ignore identical calls within 1200ms)
    try {
      const lastTxStr = origGetItem.call(localStorage, 'pk96_last_bet_tx');
      if (lastTxStr) {
        const lastTx = JSON.parse(lastTxStr);
        if (lastTx && (now - Number(lastTx.time || 0) < 1200) && Math.abs(Number(lastTx.amount || 0) - betAmt) < 0.001) {
          return getPK96TotalBet();
        }
      }
    } catch(e) {}

    if (now - lastRecordedBetTime < 1200 && Math.abs(lastRecordedBetAmt - betAmt) < 0.001) {
      return getPK96TotalBet();
    }

    lastRecordedBetTime = now;
    lastRecordedBetAmt = betAmt;

    const currentBets = getPK96TotalBet();
    const newTotal = Math.round((currentBets + betAmt) * 100) / 100;

    try {
      origSetItem.call(localStorage, 'pk96_last_bet_tx', JSON.stringify({ amount: betAmt, time: now, total: newTotal }));
    } catch(e) {}

    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          u.totalBets = newTotal;
          u.turnover = newTotal;
          u.vipBetPoints = newTotal;
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));
          if (u.email) {
            try {
              const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
              if (regUsersStr) {
                const regUsers = JSON.parse(regUsersStr);
                if (regUsers[u.email]) {
                  regUsers[u.email].totalBets = newTotal;
                  regUsers[u.email].turnover = newTotal;
                  regUsers[u.email].vipBetPoints = newTotal;
                }
                const emailKey = u.email.replace(/[^a-zA-Z0-9]/g, '_');
                if (regUsers[emailKey]) {
                  regUsers[emailKey].totalBets = newTotal;
                  regUsers[emailKey].turnover = newTotal;
                  regUsers[emailKey].vipBetPoints = newTotal;
                }
                origSetItem.call(localStorage, 'pk96_registered_users', JSON.stringify(regUsers));
              }
            } catch(e) {}
          }
          if (u.uid) {
            try {
              const dbObj = window.db || window.firebaseDb;
              const docFn = window.doc || (window.firebaseFirestore && window.firebaseFirestore.doc);
              const setDocFn = window.setDoc || (window.firebaseFirestore && window.firebaseFirestore.setDoc);
              if (dbObj && docFn && setDocFn) {
                const fsPayload = {
                  totalBets: newTotal,
                  turnover: newTotal,
                  balance: typeof u.balance === 'number' ? u.balance : getPK96Balance(),
                  avatar: u.avatar || '',
                  username: u.username || u.displayName || '',
                  displayName: u.displayName || u.username || '',
                  referCode: u.referCode || '',
                  referredBy: u.referredBy || ''
                };
                setDocFn(docFn(dbObj, "users", u.uid), fsPayload, { merge: true }).catch(() => {});
                if (u.email) {
                  const emailKey = u.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
                  setDocFn(docFn(dbObj, "users", "email_" + emailKey), fsPayload, { merge: true }).catch(() => {});
                  setDocFn(docFn(dbObj, "users", u.email.toLowerCase().trim()), fsPayload, { merge: true }).catch(() => {});
                }
              }
            } catch(e) {}
          }

          checkAndUpdateReferralValidity(u.uid, u.email, u.referredBy || '', getPK96TotalDeposit(), newTotal);
        }
      }
      origSetItem.call(localStorage, 'pk96_user_bets', newTotal.toString());
      origSetItem.call(localStorage, 'pk96_guest_bets', newTotal.toString());
    } catch(e) {
      origSetItem.call(localStorage, 'pk96_guest_bets', newTotal.toString());
      origSetItem.call(localStorage, 'pk96_user_bets', newTotal.toString());
    }

    // Automatically deduct wager turnover requirement when game bet is placed
    try {
      deductPK96Wager(betAmt);
    } catch(e) {}

    try {
      window.postMessage({ type: 'PK96_BET_UPDATE', totalBets: newTotal, addedBet: betAmt }, '*');
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'PK96_BET_UPDATE', totalBets: newTotal, addedBet: betAmt }, '*');
      }
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(f => {
        try {
          if (f.contentWindow) {
            f.contentWindow.postMessage({ type: 'PK96_BET_UPDATE', totalBets: newTotal, addedBet: betAmt }, '*');
          }
        } catch(e) {}
      });
    } catch(e) {}

    if (window.BroadcastChannel) {
      try {
        if (!window.pk96BetChannel) window.pk96BetChannel = new BroadcastChannel('pk96_bet_channel');
        window.pk96BetChannel.postMessage({ type: 'PK96_BET_UPDATE', totalBets: newTotal, addedBet: betAmt });
      } catch(e) {}
    }

    window.dispatchEvent(new CustomEvent('pk96_bet_changed', { detail: { totalBets: newTotal, addedBet: betAmt } }));
    if (typeof window.updateVipUI === 'function') {
      try { window.updateVipUI(); } catch(e) {}
    }
    if (isAccessibleWindow(window.parent) && window.parent !== window && typeof window.parent.updateVipUI === 'function') {
      try { window.parent.updateVipUI(); } catch(e) {}
    }
    if (isAccessibleWindow(window.top) && window.top !== window && typeof window.top.updateVipUI === 'function') {
      try { window.top.updateVipUI(); } catch(e) {}
    }
    try {
      logStep('BET_PLACED', { amount: betAmt, newTotalBets: newTotal });
    } catch(e) {}

    // Send authoritative bet transaction to backend
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      let userUid = '';
      let userEmail = '';
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          userUid = u.uid || '';
          userEmail = u.email || '';
        }
      }
      if (userUid || userEmail) {
        const txnId = 'txn_bet_' + (userUid || 'usr') + '_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        fetch('/api/transactions/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: txnId,
            user_id: userUid,
            user_email: userEmail,
            amount: betAmt,
            status: 'SETTLED'
          })
        }).then(r => r.json()).then(data => {
          if (data && data.qualification) {
            window.postMessage({ type: 'PK96_REFERRAL_QUALIFICATION_UPDATE', qualification: data.qualification }, '*');
          }
        }).catch(() => {});
      }
    } catch(e) {}

    return newTotal;
  }

  let isSyncingToFirestore = false;
  let firestoreSyncTimeout = null;

  function syncBalanceToFirestore(u, validBal) {
    if (!u || !u.uid) return;
    if (firestoreSyncTimeout) clearTimeout(firestoreSyncTimeout);
    firestoreSyncTimeout = setTimeout(() => {
      try {
        const dbObj = window.db || window.firebaseDb || (isAccessibleWindow(window.parent) && (window.parent.db || window.parent.firebaseDb));
        const docFn = window.doc || (window.firebaseFirestore && window.firebaseFirestore.doc) || (isAccessibleWindow(window.parent) && window.parent.firebaseFirestore && window.parent.firebaseFirestore.doc);
        const setDocFn = window.setDoc || (window.firebaseFirestore && window.firebaseFirestore.setDoc) || (isAccessibleWindow(window.parent) && window.parent.firebaseFirestore && window.parent.firebaseFirestore.setDoc);
        
        const totalDepVal = Number(u.totalDeposit || u.totalDeposited || u.totalDeposits || getPK96TotalDeposit()) || 0;
        const totalBetVal = Number(u.totalBets || u.turnover || getPK96TotalBet()) || 0;
        const isValidReferral = (totalDepVal >= 500 && totalBetVal >= 5000);
        const cleanEmail = u.email ? u.email.toLowerCase().trim() : '';
        const emailKey = cleanEmail ? cleanEmail.replace(/[^a-zA-Z0-9]/g, '_') : '';
        const wagerReq = (typeof u.wagerRequirement === 'number')
          ? u.wagerRequirement
          : (Number(origGetItem.call(localStorage, 'pk96_wager_required')) || 0);
        const vipLvl = (typeof u.vipLevel === 'number')
          ? u.vipLevel
          : getPK96VipLevel(totalBetVal);

        const fsPayload = {
          balance: validBal,
          totalDeposit: totalDepVal,
          totalDeposited: totalDepVal,
          totalBets: totalBetVal,
          turnover: totalBetVal,
          wagerRequirement: wagerReq,
          wagerAmount: wagerReq,
          vipLevel: vipLvl,
          vipBetPoints: totalBetVal,
          isValid: isValidReferral,
          avatar: u.avatar || '',
          username: u.username || u.displayName || '',
          displayName: u.displayName || u.username || '',
          referCode: u.referCode || '',
          referredBy: u.referredBy || '',
          updatedAt: Date.now(),
          lastActive: new Date().toISOString()
        };

        if (dbObj && docFn && setDocFn) {
          setDocFn(docFn(dbObj, "users", u.uid), fsPayload, { merge: true }).catch(() => {});
          if (cleanEmail) {
            setDocFn(docFn(dbObj, "users", "email_" + emailKey), fsPayload, { merge: true }).catch(() => {});
            setDocFn(docFn(dbObj, "users", cleanEmail), fsPayload, { merge: true }).catch(() => {});
          }
        }

        // Also sync to backend server
        if (cleanEmail) {
          fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: u.uid,
              email: cleanEmail,
              ...fsPayload
            })
          }).catch(() => {});
        }
      } catch(err) {}
    }, 150);
  }

  function setPK96Balance(newBal, isBet) {
    const num = Number(newBal);
    if (isNaN(num)) return getPK96Balance();

    const validBal = Math.max(0, Math.round(num * 100) / 100);

    if (lastRecordedBalance === null) {
      lastRecordedBalance = getPK96Balance();
    }

    const prevBal = (lastRecordedBalance !== null) ? lastRecordedBalance : getPK96Balance();
    const isChanged = (Math.abs(prevBal - validBal) >= 0.001);

    // Any drop in balance during gameplay is treated as a bet/stake unless explicitly set to false (e.g. system withdrawal)
    let betAmt = 0;
    if (isBet !== false && prevBal > validBal) {
      betAmt = Math.round((prevBal - validBal) * 100) / 100;
      if (betAmt > 0) {
        recordBet(betAmt);
      }
    }

    lastRecordedBalance = validBal;
    window._lastLocalBalanceUpdateTime = Date.now();
    try { origSetItem.call(localStorage, 'pk96_balance_updated_at', Date.now().toString()); } catch(e) {}

    isProcessingBalance = true;
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      let u = null;
      if (loggedStr) {
        try { u = JSON.parse(loggedStr); } catch(e) {}
      }
      if (!u && isAccessibleWindow(window.parent) && window.parent.PK96 && window.parent.PK96.getUser) {
        try { u = window.parent.PK96.getUser(); } catch(e) {}
      }

      const isRealUser = u && (u.email || u.uid) && !String(u.uid || '').startsWith('guest_') && u.uid !== 'guest' && u.email !== 'guest@pk96.com' && !u.isGuest;

      if (isRealUser) {
        u.balance = validBal;
        origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));
        if (u.email) {
          try {
            const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
            if (regUsersStr) {
              const regUsers = JSON.parse(regUsersStr);
              if (regUsers[u.email]) regUsers[u.email].balance = validBal;
              const emailKey = u.email.replace(/[^a-zA-Z0-9]/g, '_');
              if (regUsers[emailKey]) regUsers[emailKey].balance = validBal;
              origSetItem.call(localStorage, 'pk96_registered_users', JSON.stringify(regUsers));
            }
          } catch(err) {}
        }
        if (u.uid && (isBet || isChanged)) {
          syncBalanceToFirestore(u, validBal);
        }
      } else {
        origSetItem.call(localStorage, 'pk96_guest_balance', validBal.toString());
      }
      origSetItem.call(localStorage, 'pk96_balance', validBal.toString());
    } catch(e) {} finally {
      isProcessingBalance = false;
    }

    // Direct parent sync
    try {
      if (isAccessibleWindow(window.parent) && window.parent.PK96 && typeof window.parent.PK96.setBalance === 'function' && window.parent.PK96 !== window.PK96) {
        window.parent.PK96.setBalance(validBal, false);
      }
    } catch(e) {}
    try {
      if (isAccessibleWindow(window.top) && window.top.PK96 && typeof window.top.PK96.setBalance === 'function' && window.top.PK96 !== window.PK96) {
        window.top.PK96.setBalance(validBal, false);
      }
    } catch(e) {}

    // Bet deduplication and UI sync
    if (betAmt > 0) {
      if (typeof window.updateVipUI === 'function') {
        try { window.updateVipUI(); } catch(e) {}
      }
      if (isAccessibleWindow(window.parent) && window.parent !== window && typeof window.parent.updateVipUI === 'function') {
        try { window.parent.updateVipUI(); } catch(e) {}
      }
      if (isAccessibleWindow(window.top) && window.top !== window && typeof window.top.updateVipUI === 'function') {
        try { window.top.updateVipUI(); } catch(e) {}
      }
    }

    updateDOMBalances(validBal);

    if (isChanged) {
      try {
        logStep('BALANCE_CHANGE', { newBalance: validBal });
      } catch(e) {}
      try {
        window.dispatchEvent(new CustomEvent('pk96_balance_changed', { detail: { balance: validBal } }));
      } catch(e) {}

      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'PK96_BALANCE_UPDATE', balance: validBal }, '*');
        }
        if (window.top && window.top !== window && window.top !== window.parent) {
          window.top.postMessage({ type: 'PK96_BALANCE_UPDATE', balance: validBal }, '*');
        }
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(f => {
          try {
            if (f.contentWindow) {
              f.contentWindow.postMessage({ type: 'PK96_BALANCE_UPDATE', balance: validBal }, '*');
            }
          } catch(e) {}
        });
      } catch(e) {}

      if (window.BroadcastChannel) {
        try {
          if (!window._pk96_bc) window._pk96_bc = new BroadcastChannel('pk96_balance_channel');
          window._pk96_bc.postMessage({ type: 'PK96_BALANCE_UPDATE', balance: validBal });
        } catch(e) {}
      }
    }

    return validBal;
  }

  function updateDOMBalances(bal) {
    const num = Number(bal);
    if (isNaN(num)) return;

    const isInt = Math.floor(num) === num;
    const formatted = isInt ? num.toLocaleString() : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formattedDec = num.toFixed(2);

    const targets = [
      'headerUserBalance',
      'profileUserBalance',
      'withdrawPageBalanceDisplay',
      'withdrawModalBalance',
      'balanceDisplay',
      'userBalance',
      'balanceAmount',
      'playerBalanceDisplay',
      'header-balance-value',
      'balance-badge',
      'user-balance',
      'balance',
      'current-balance',
      'player-balance',
      'game-balance',
      'gems-display',
      'coins-display',
      'creditDisplay',
      'creditsDisplay',
      'balanceEl',
      'balanceSpan'
    ];

    targets.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === 'withdrawModalBalance') {
          el.textContent = 'Rs ' + formattedDec;
        } else if (id === 'withdrawPageBalanceDisplay') {
          el.textContent = formattedDec;
        } else if (id === 'headerUserBalance' || id === 'profileUserBalance') {
          el.textContent = formatted;
        } else if (id === 'balance-badge') {
          const numSpan = el.querySelector('span') || el;
          if (numSpan && numSpan.textContent !== formattedDec) {
            numSpan.textContent = formattedDec;
          }
        } else {
          const valStr = (el.id.includes('Display') || el.id.includes('value')) && !isInt ? formattedDec : formatted;
          if (el.textContent !== valStr && !el.textContent.includes('💰')) {
            el.textContent = valStr;
          }
        }
      }
    });

    const classTargets = document.querySelectorAll('.pk96-balance-text, .user-balance-val, .balance-amount, .balance-display, .balance-val, .balance-value, .user-balance, .player-balance');
    classTargets.forEach(el => {
      if (el.textContent !== formatted && el.textContent !== formattedDec) {
        el.textContent = formatted;
      }
    });
  }

  // Intercept Storage getItem - Force all game balance queries to return 0
  Storage.prototype.getItem = function(key) {
    if (!isProcessingBalance) {
      if (isBalanceKey(key)) {
        return '0';
      }
      
      if (key === 'mines_player_stats_v1' || key === 'fortune_jem3_stats_v3' || key === 'neon_spins_stats') {
        const raw = origGetItem.apply(this, arguments);
        if (raw) {
          try {
            const obj = JSON.parse(raw);
            obj.balance = 0;
            return JSON.stringify(obj);
          } catch(e) {}
        }
        return JSON.stringify({ balance: 0, wins: 0, totalSpins: 0, gamesPlayed: 0 });
      }

      if (key === 'aviator_offline_users') {
        const raw = origGetItem.apply(this, arguments);
        if (raw) {
          try {
            const users = JSON.parse(raw);
            if (Array.isArray(users) && users.length > 0) {
              users.forEach(u => { u.balance = 0; });
              return JSON.stringify(users);
            }
          } catch(e) {}
        }
        return JSON.stringify([{ balance: 0, name: 'Player' }]);
      }
    }
    return origGetItem.apply(this, arguments);
  };

  // Intercept Storage setItem - NEVER allow game's inbuilt balance to change lobby balance!
  Storage.prototype.setItem = function(key, val) {
    if (!isProcessingBalance) {
      if (isBalanceKey(key)) {
        // Strictly prevent any game from altering the lobby balance!
        try {
          origSetItem.call(this, key, '0');
        } catch(e) {}
        return;
      }

      if (key === 'mines_player_stats_v1' || key === 'fortune_jem3_stats_v3' || key === 'neon_spins_stats') {
        try {
          const obj = JSON.parse(val);
          obj.balance = 0;
          origSetItem.call(this, key, JSON.stringify(obj));
        } catch(e) {}
        return;
      }

      if (key === 'aviator_offline_users') {
        try {
          const users = JSON.parse(val);
          if (Array.isArray(users) && users.length > 0) {
            const activeUser = users[0];
            if (activeUser && typeof activeUser.balance === 'number' && !isNaN(activeUser.balance)) {
              isProcessingBalance = true;
              try {
                const currentBal = getPK96Balance();
                setPK96Balance(activeUser.balance, currentBal > activeUser.balance);
              } finally {
                isProcessingBalance = false;
              }
            }
          }
        } catch(e) {}
      }
    }
    return origSetItem.apply(this, arguments);
  };

  // Intercept Storage removeItem
  Storage.prototype.removeItem = function(key) {
    if (key === 'pk96_logged_user' || key === 'pk96_balance') {
      lastRecordedBalance = null;
    }
    return origRemoveItem.apply(this, arguments);
  };

  function getPK96User() {
    // 1. Try local localStorage first
    try {
      const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u && (u.email || u.uid) && !String(u.uid || '').startsWith('guest_') && u.uid !== 'guest' && u.email !== 'guest@pk96.com' && !u.isGuest) {
          return {
            uid: u.uid || 'usr_real',
            email: u.email || '',
            username: u.username || u.displayName || (u.email ? u.email.split('@')[0] : 'Player'),
            displayName: u.displayName || u.username || (u.email ? u.email.split('@')[0] : 'Player'),
            avatar: u.avatar || 'https://www.zc777a.com/siteadmin/skin/lobby_asset/common/common/profile/icon_wd_mrtx.avif?manualVersion=1&version=v7.3.232',
            balance: typeof u.balance === 'number' ? u.balance : getPK96Balance(),
            totalBets: Number(u.totalBets || u.turnover) || 0,
            turnover: Number(u.totalBets || u.turnover) || 0,
            wagerRequirement: getPK96Wager(),
            wagerAmount: getPK96Wager(),
            vipLevel: getPK96VipLevel(Number(u.totalBets || u.turnover) || 0),
            referCode: u.referCode || '',
            referredBy: u.referredBy || '',
            isGuest: false
          };
        }
      }
    } catch(e) {}

    // 2. Try accessible parent PK96 (if in iframe)
    try {
      if (isAccessibleWindow(window.parent) && window.parent.PK96 && typeof window.parent.PK96.getUser === 'function' && window.parent.PK96 !== window.PK96) {
        const pu = window.parent.PK96.getUser();
        if (pu && (pu.email || pu.uid) && !String(pu.uid || '').startsWith('guest_') && pu.email !== 'guest@pk96.com' && !pu.isGuest) {
          return pu;
        }
      }
    } catch(e) {}

    // 3. Try URL search params (ONLY if real user, NEVER for guest)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const isGuestParam = urlParams.get('pk96_guest');
      const uid = urlParams.get('pk96_uid');
      const email = urlParams.get('pk96_email');
      const user = urlParams.get('pk96_user');
      const paramAvatar = urlParams.get('pk96_avatar');
      const balParam = urlParams.get('pk96_bal');
      const bal = (balParam !== null && !isNaN(Number(balParam))) ? Number(balParam) : getPK96Balance();
      const bets = Number(urlParams.get('pk96_bets')) || 0;
      const wagerParam = urlParams.get('pk96_wager');
      const wager = (wagerParam !== null && !isNaN(Number(wagerParam))) ? Number(wagerParam) : getPK96Wager();

      if (isGuestParam !== 'true' && uid && !String(uid).startsWith('guest') && uid !== 'guest' && email && email !== 'guest@pk96.com') {
        let existingUser = null;
        try {
          const exStr = origGetItem.call(localStorage, 'pk96_logged_user');
          if (exStr) existingUser = JSON.parse(exStr);
        } catch(e) {}

        const finalAvatar = (paramAvatar && decodeURIComponent(paramAvatar)) || (existingUser && existingUser.avatar) || 'https://www.zc777a.com/siteadmin/skin/lobby_asset/common/common/profile/icon_wd_mrtx.avif?manualVersion=1&version=v7.3.232';
        const finalName = user ? decodeURIComponent(user) : ((existingUser && (existingUser.username || existingUser.displayName)) || (email ? decodeURIComponent(email).split('@')[0] : 'Player'));

        const hydUser = {
          ...(existingUser || {}),
          uid: decodeURIComponent(uid),
          email: decodeURIComponent(email),
          username: finalName,
          displayName: finalName,
          avatar: finalAvatar,
          balance: bal,
          totalBets: bets,
          turnover: bets,
          wagerRequirement: wager,
          wagerAmount: wager,
          vipLevel: getPK96VipLevel(bets),
          vipBetPoints: bets,
          referCode: (existingUser && existingUser.referCode) || urlParams.get('pk96_refer') || '',
          referredBy: (existingUser && existingUser.referredBy) || '',
          isGuest: false
        };
        try {
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(hydUser));
          origSetItem.call(localStorage, 'pk96_balance', bal.toString());
          origSetItem.call(localStorage, 'pk96_user_bets', bets.toString());
          origSetItem.call(localStorage, 'pk96_wager_required', wager.toString());
        } catch(e) {}
        return hydUser;
      }
    } catch(e) {}

    // 4. Clean guest user profile fallback - completely isolated
    return {
      uid: 'guest',
      email: '',
      username: 'Guest Player',
      displayName: 'Guest Player',
      avatar: 'https://www.zc777a.com/siteadmin/skin/lobby_asset/common/common/profile/icon_wd_mrtx.avif?manualVersion=1&version=v7.3.232',
      balance: 0,
      totalBets: 0,
      turnover: 0,
      wagerRequirement: 0,
      wagerAmount: 0,
      vipLevel: 0,
      isGuest: true,
      referCode: '',
      referredBy: ''
    };
  }

  function logStep(actionType, stepData = {}) {
    try {
      const u = getPK96User();
      const uid = u ? u.uid : (window.currentUserUid || "anonymous");
      const email = u ? u.email : "";
      const username = u ? (u.username || u.displayName) : "";
      const currentBal = getPK96Balance();
      const currentBets = getPK96TotalBet();

      const timestamp = new Date().toISOString();
      const stepRecord = {
        uid,
        email,
        username,
        action: actionType || "STEP",
        balance: currentBal,
        totalBets: currentBets,
        timestamp,
        ...stepData
      };

      // Save step to Firestore collection and user doc
      const dbObj = window.db || window.firebaseDb || (window.parent && (window.parent.db || window.parent.firebaseDb));
      const collectionFn = window.collection || (window.firebaseFirestore && window.firebaseFirestore.collection) || (window.parent && window.parent.firebaseFirestore && window.parent.firebaseFirestore.collection);
      const addDocFn = window.addDoc || (window.firebaseFirestore && window.firebaseFirestore.addDoc) || (window.parent && window.parent.firebaseFirestore && window.parent.firebaseFirestore.addDoc);
      const docFn = window.doc || (window.firebaseFirestore && window.firebaseFirestore.doc) || (window.parent && window.parent.firebaseFirestore && window.parent.firebaseFirestore.doc);
      const setDocFn = window.setDoc || (window.firebaseFirestore && window.firebaseFirestore.setDoc) || (window.parent && window.parent.firebaseFirestore && window.parent.firebaseFirestore.setDoc);
      const arrayUnionFn = window.arrayUnion || (window.firebaseFirestore && window.firebaseFirestore.arrayUnion) || (window.parent && window.parent.firebaseFirestore && window.parent.firebaseFirestore.arrayUnion);

      if (dbObj) {
        if (collectionFn && addDocFn) {
          addDocFn(collectionFn(dbObj, "game_steps"), stepRecord).catch(() => {});
          if (uid && uid !== "anonymous" && !String(uid).startsWith("guest")) {
            addDocFn(collectionFn(dbObj, "user_activities"), {
              id: "act_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
              userId: uid,
              userEmail: email,
              username: username,
              type: actionType,
              action: actionType,
              title: stepData.title || actionType.replace(/_/g, ' '),
              description: stepData.description || (stepData.amount ? ("Amount: Rs " + Number(stepData.amount).toFixed(2)) : ""),
              amount: typeof stepData.amount === "number" ? stepData.amount : 0,
              balance: currentBal,
              totalBets: currentBets,
              status: "COMPLETED",
              timestamp: timestamp
            }).catch(() => {});
          }
        }
        if (uid && uid !== "anonymous" && docFn && setDocFn) {
          const updateObj = {
            lastActive: timestamp,
            lastAction: actionType,
            balance: currentBal,
            totalBets: currentBets,
            turnover: currentBets
          };
          if (arrayUnionFn) {
            updateObj.recentSteps = arrayUnionFn(stepRecord);
          }
          setDocFn(docFn(dbObj, "users", uid), updateObj, { merge: true }).catch(() => {});
          if (email) {
            const emailKey = email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
            setDocFn(docFn(dbObj, "users", "email_" + emailKey), updateObj, { merge: true }).catch(() => {});
          }
        }
      }

      // Save step locally
      if (uid && uid !== "anonymous" && !String(uid).startsWith("guest")) {
        try {
          const histKey = "pk96_user_history_" + uid;
          const existingHist = JSON.parse(origGetItem.call(localStorage, histKey) || "[]");
          existingHist.unshift(stepRecord);
          if (existingHist.length > 100) existingHist.pop();
          origSetItem.call(localStorage, histKey, JSON.stringify(existingHist));

          const actKey = "pk96_user_activities_" + uid;
          const existingAct = JSON.parse(origGetItem.call(localStorage, actKey) || "[]");
          existingAct.unshift({
            id: "act_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
            userId: uid,
            userEmail: email,
            username: username,
            type: actionType,
            action: actionType,
            title: stepData.title || actionType.replace(/_/g, ' '),
            description: stepData.description || (stepData.amount ? ("Amount: Rs " + Number(stepData.amount).toFixed(2)) : ""),
            amount: typeof stepData.amount === "number" ? stepData.amount : 0,
            balance: currentBal,
            totalBets: currentBets,
            status: "COMPLETED",
            timestamp: timestamp
          });
          if (existingAct.length > 100) existingAct.pop();
          origSetItem.call(localStorage, actKey, JSON.stringify(existingAct));
        } catch(e) {}
      }
    } catch(e) {}
  }

  function clearSession() {
    lastRecordedBalance = 0;
    try {
      origSetItem.call(localStorage, 'pk96_explicit_logout', 'true');
      origSetItem.call(localStorage, 'pk96_balance', '0');
      origSetItem.call(localStorage, 'pk96_guest_balance', '0');
      origSetItem.call(localStorage, 'pk96_guest_bets', '0');
      origSetItem.call(localStorage, 'pk96_guest_deposits', '0');
      origRemoveItem.call(localStorage, 'pk96_wager_required');
      origRemoveItem.call(localStorage, 'pk96_logged_user');
      origRemoveItem.call(localStorage, 'pk96_user_bets');
      origRemoveItem.call(localStorage, 'pk96_user_deposits');
      origRemoveItem.call(localStorage, 'pk96_user_id');
      origRemoveItem.call(localStorage, 'pk96_user_vip');
      origRemoveItem.call(localStorage, 'pk96_withdrawal_accounts');
      origRemoveItem.call(localStorage, 'pk96_withdrawal_password');
      origRemoveItem.call(localStorage, 'pk96_has_withdrawal_pin');
      origRemoveItem.call(localStorage, 'pk96_withdraw_records');
      origRemoveItem.call(localStorage, 'pk96_pending_referral');

      const allKeys = [
        'mines_player_stats_v1',
        'fortune_jem3_stats_v3',
        'neon_spins_stats',
        'aviator_offline_users',
        'desertAxeBalance',
        'desert_axe_balance',
        'desertAxeHighBalance',
        'playerBalance',
        'roulette_balance',
        'glass_roulette_balance',
        'neon_spins_balance',
        'rocket_mines_balance',
        'mines_balance',
        'aviator_balance',
        'chicken_road_balance',
        'desert_fortune_balance',
        'flappy_balance',
        'ladders_balance',
        'snakes_balance',
        'snakes2_balance',
        'tiktakwin_balance',
        'tiktak_balance',
        'fortune_jem3_jems_v3'
      ];
      allKeys.forEach(k => {
        try { origRemoveItem.call(localStorage, k); } catch(e) {}
      });

      // Clear any remaining keys that might carry user-scoped data
      try {
        const keysToPurge = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('pk96_withdrawal_accounts_') || k.startsWith('pk96_vip_claim_'))) {
            keysToPurge.push(k);
          }
        }
        keysToPurge.forEach(k => origRemoveItem.call(localStorage, k));
      } catch(e) {}
    } catch(e) {}
    updateDOMBalances(0);
    try {
      window.dispatchEvent(new CustomEvent('pk96_balance_changed', { detail: { balance: 0 } }));
      window.dispatchEvent(new CustomEvent('pk96_bet_changed', { detail: { totalBets: 0 } }));
      window.dispatchEvent(new CustomEvent('pk96_wager_changed', { detail: { wagerRequirement: 0 } }));
      window.dispatchEvent(new CustomEvent('pk96_logout', { detail: { timestamp: Date.now() } }));
    } catch(e) {}
  }

  window.PK96 = window.PK96 || {};
  window.PK96.getBalance = getPK96Balance;
  window.PK96.setBalance = setPK96Balance;
  window.PK96.getBets = getPK96TotalBet;
  window.PK96.recordBet = recordBet;
  window.PK96.getDeposits = getPK96TotalDeposit;
  window.PK96.recordDeposit = recordDeposit;
  window.PK96.getWager = getPK96Wager;
  window.PK96.setWager = setPK96Wager;
  window.PK96.addWager = addPK96Wager;
  window.PK96.deductWager = deductPK96Wager;
  window.PK96.checkReferral = checkAndUpdateReferralValidity;
  window.PK96.getVipLevel = getPK96VipLevel;
  window.PK96.updateDOM = updateDOMBalances;
  window.PK96.getUser = getPK96User;
  window.PK96.logStep = logStep;
  window.PK96.clearSession = clearSession;
  window.PK96.isLoggedIn = isUserLoggedIn;
  window.getPK96VipLevel = getPK96VipLevel;
  window.getPK96TotalDeposit = getPK96TotalDeposit;
  window.recordDeposit = recordDeposit;
  window.getPK96Wager = getPK96Wager;
  window.addPK96Wager = addPK96Wager;
  window.deductPK96Wager = deductPK96Wager;

  if (origGetItem.call(localStorage, 'pk96_guest_balance') === null) {
    origSetItem.call(localStorage, 'pk96_guest_balance', '0');
  }

  function handleIncomingBalance(newBal) {
    if (typeof newBal === 'number' && !isNaN(newBal)) {
      const validBal = Math.max(0, Math.round(newBal * 100) / 100);
      if (lastRecordedBalance === null || Math.abs(lastRecordedBalance - validBal) >= 0.001) {
        lastRecordedBalance = validBal;
        isProcessingBalance = true;
        try {
          const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
          if (loggedStr) {
            const u = JSON.parse(loggedStr);
            if (u && (u.email || u.uid)) {
              u.balance = validBal;
              origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));
              if (u.email) {
                try {
                  const regUsersStr = origGetItem.call(localStorage, 'pk96_registered_users');
                  if (regUsersStr) {
                    const regUsers = JSON.parse(regUsersStr);
                    if (regUsers[u.email]) regUsers[u.email].balance = validBal;
                    const emailKey = u.email.replace(/[^a-zA-Z0-9]/g, '_');
                    if (regUsers[emailKey]) regUsers[emailKey].balance = validBal;
                    origSetItem.call(localStorage, 'pk96_registered_users', JSON.stringify(regUsers));
                  }
                } catch(e) {}
              }
            }
          }
          origSetItem.call(localStorage, 'pk96_balance', validBal.toString());
          origSetItem.call(localStorage, 'pk96_guest_balance', validBal.toString());
        } catch(e) {} finally {
          isProcessingBalance = false;
        }
        updateDOMBalances(validBal);
        if (typeof window.refreshLobbyBalances === 'function') {
          try { window.refreshLobbyBalances(validBal); } catch(err) {}
        }
        window.dispatchEvent(new CustomEvent('pk96_balance_changed', { detail: { balance: validBal } }));
      }
    }
  }

  // Cross-window and iframe messaging synchronization
  window.addEventListener('message', function(e) {
    if (!e.data) return;

    if (e.data.type === 'PK96_REQUEST_SYNC') {
      try {
        const curBal = getPK96Balance();
        const curUser = getPK96User();
        const curBets = getPK96TotalBet();
        const curDeps = getPK96TotalDeposit();
        const curWager = getPK96Wager();
        if (e.source && typeof e.source.postMessage === 'function') {
          e.source.postMessage({
            type: 'PK96_SYNC_RESPONSE',
            balance: curBal,
            user: curUser,
            totalBets: curBets,
            totalDeposits: curDeps,
            wagerRequirement: curWager
          }, '*');
        }
      } catch(err) {}
    } else if (e.data.type === 'PK96_SYNC_RESPONSE') {
      if (e.data.user && window.parent && window.parent !== window && e.source === window.parent) {
        try {
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(e.data.user));
        } catch(err) {}
      }
      if (typeof e.data.balance === 'number') {
        handleIncomingBalance(e.data.balance);
      }
      if (typeof e.data.totalBets === 'number') {
        try {
          origSetItem.call(localStorage, 'pk96_user_bets', e.data.totalBets.toString());
        } catch(err) {}
      }
      if (typeof e.data.totalDeposits === 'number') {
        try {
          origSetItem.call(localStorage, 'pk96_user_deposits', e.data.totalDeposits.toString());
        } catch(err) {}
      }
      if (typeof e.data.wagerRequirement === 'number') {
        try {
          setPK96Wager(e.data.wagerRequirement, false);
        } catch(err) {}
      }
    } else if (e.data.type === 'PK96_BALANCE_UPDATE') {
      if (e.data.user && window.parent && window.parent !== window && e.source === window.parent) {
        try {
          origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(e.data.user));
        } catch(err) {}
      }
      if (typeof e.data.balance === 'number') {
        handleIncomingBalance(e.data.balance);
      }
      if (typeof e.data.totalBets === 'number') {
        try {
          origSetItem.call(localStorage, 'pk96_user_bets', e.data.totalBets.toString());
        } catch(err) {}
      }
      if (typeof e.data.totalDeposits === 'number') {
        try {
          origSetItem.call(localStorage, 'pk96_user_deposits', e.data.totalDeposits.toString());
        } catch(err) {}
      }
      if (typeof e.data.wagerRequirement === 'number') {
        try {
          setPK96Wager(e.data.wagerRequirement, false);
        } catch(err) {}
      }
    } else if (e.data.type === 'PK96_BET_UPDATE') {
      if (typeof e.data.totalBets === 'number') {
        try {
          const curBets = getPK96TotalBet();
          if (e.data.totalBets > curBets) {
            origSetItem.call(localStorage, 'pk96_user_bets', e.data.totalBets.toString());
            const loggedStr = origGetItem.call(localStorage, 'pk96_logged_user');
            if (loggedStr) {
              const u = JSON.parse(loggedStr);
              u.totalBets = e.data.totalBets;
              u.turnover = e.data.totalBets;
              u.vipBetPoints = e.data.totalBets;
              origSetItem.call(localStorage, 'pk96_logged_user', JSON.stringify(u));
            }
          }
        } catch(err) {}
      }
      const freshBets = getPK96TotalBet();
      window.dispatchEvent(new CustomEvent('pk96_bet_changed', { detail: { totalBets: freshBets, addedBet: e.data.addedBet || 0 } }));
      if (typeof window.updateVipUI === 'function') {
        try { window.updateVipUI(); } catch(err) {}
      }
    } else if ((e.data.type === 'PK96_RECORD_BET' || e.data.type === 'PK96_BET_PLACED') && typeof e.data.amount === 'number') {
      recordBet(e.data.amount);
    } else if (e.data.type === 'PK96_ADD_WAGER' && typeof e.data.amount === 'number') {
      addPK96Wager(e.data.amount);
    } else if (e.data.type === 'PK96_DEDUCT_WAGER' && typeof e.data.amount === 'number') {
      deductPK96Wager(e.data.amount);
    } else if (e.data.type === 'PK96_WAGER_UPDATE' && typeof e.data.wagerRequirement === 'number') {
      setPK96Wager(e.data.wagerRequirement, false);
    }
  });

  if (window.BroadcastChannel) {
    try {
      const bc = new BroadcastChannel('pk96_balance_channel');
      bc.onmessage = function(e) {
        if (e.data && e.data.type === 'PK96_BALANCE_UPDATE') {
          handleIncomingBalance(e.data.balance);
        }
      };
      window._pk96_bc = bc;
    } catch(e) {}

    try {
      const betBc = new BroadcastChannel('pk96_bet_channel');
      betBc.onmessage = function(e) {
        if (e.data && e.data.type === 'PK96_BET_UPDATE') {
          const freshBets = getPK96TotalBet();
          window.dispatchEvent(new CustomEvent('pk96_bet_changed', { detail: { totalBets: freshBets, addedBet: e.data.addedBet || 0 } }));
          if (typeof window.updateVipUI === 'function') {
            try { window.updateVipUI(); } catch(err) {}
          }
        }
      };
    } catch(e) {}
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'pk96_balance' || e.key === 'pk96_logged_user' || isBalanceKey(e.key)) {
      let freshBal = null;
      try {
        if (e.newValue !== null && !isNaN(Number(e.newValue))) {
          freshBal = Number(e.newValue);
        } else if (e.key === 'pk96_logged_user' && e.newValue) {
          const u = JSON.parse(e.newValue);
          if (u && typeof u.balance === 'number') freshBal = u.balance;
        }
      } catch(err) {}

      if (freshBal === null) {
        lastRecordedBalance = null; // reset if key deleted or unparseable
        freshBal = getPK96Balance();
      }

      if (lastRecordedBalance === null || Math.abs(lastRecordedBalance - freshBal) >= 0.001) {
        lastRecordedBalance = freshBal;
        updateDOMBalances(freshBal);
        window.dispatchEvent(new CustomEvent('pk96_balance_changed', { detail: { balance: freshBal } }));
      }
    }

    if (e.key === 'pk96_user_bets' || e.key === 'pk96_guest_bets' || e.key === 'pk96_logged_user') {
      const freshBets = getPK96TotalBet();
      window.dispatchEvent(new CustomEvent('pk96_bet_changed', { detail: { totalBets: freshBets } }));
      if (typeof window.updateVipUI === 'function') {
        try { window.updateVipUI(); } catch(err) {}
      }
    }
  });

  // Remove any legacy inside-game lobby/back buttons as requested by user
  function removeStandaloneNavigation() {
    try {
      const btn = document.getElementById('pk96_standalone_lobby_btn');
      if (btn && btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
    } catch(e) {}
  }

  // In-Game Network Freeze Handler (Locks games & prevents mutations when offline)
  let isGameFrozenOffline = false;

  function toggleInGameFreeze(frozen) {
    isGameFrozenOffline = !!frozen;
    let overlay = document.getElementById('pk96_iframe_freeze_overlay');
    
    if (isGameFrozenOffline) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pk96_iframe_freeze_overlay';
        overlay.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;background:rgba(0,0,0,0.58);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:2147483647;display:flex;align-items:center;justify-content:center;pointer-events:auto;user-select:none;cursor:wait;';
        
        // Add style for white roller if not already present
        if (!document.getElementById('pk96_white_roller_style')) {
          const style = document.createElement('style');
          style.id = 'pk96_white_roller_style';
          style.textContent = `
            @keyframes pk96IframeWhiteRollerSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .pk96-white-iframe-roller {
              width: 44px;
              height: 44px;
              border: 3.5px solid rgba(255, 255, 255, 0.22);
              border-top: 3.5px solid #ffffff;
              border-right: 3.5px solid #ffffff;
              border-radius: 50%;
              animation: pk96IframeWhiteRollerSpin 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              box-shadow: 0 0 16px rgba(255, 255, 255, 0.25);
              pointer-events: none;
            }
          `;
          document.head && document.head.appendChild(style);
        }

        overlay.innerHTML = '<div class="pk96-white-iframe-roller"></div>';
        document.body && document.body.appendChild(overlay);
      } else {
        overlay.style.display = 'flex';
      }
    } else {
      if (overlay) overlay.style.display = 'none';
    }
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'PK96_NETWORK_FREEZE') {
      toggleInGameFreeze(e.data.frozen);
    }
  });

  window.addEventListener('offline', function() {
    toggleInGameFreeze(true);
  });

  window.addEventListener('online', function() {
    toggleInGameFreeze(false);
  });

  // Capturing event blocker in standalone or iframe games when offline (Completely freezes all user interactions)
  const BLOCKED_GAME_OFFLINE_EVENTS = [
    'click', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'touchmove',
    'pointerdown', 'pointerup', 'pointermove', 'keydown', 'keypress', 'keyup',
    'submit', 'input', 'change', 'focusin', 'select', 'contextmenu', 'dblclick'
  ];

  BLOCKED_GAME_OFFLINE_EVENTS.forEach(evtType => {
    window.addEventListener(evtType, function(e) {
      if (isGameFrozenOffline) {
        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }, true);
  });

  // Request sync immediately if in iframe
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'PK96_REQUEST_SYNC' }, '*');
    } catch(e) {}
  }

  document.addEventListener('DOMContentLoaded', function() {
    updateDOMBalances(getPK96Balance());
    removeStandaloneNavigation();
  });

})();


