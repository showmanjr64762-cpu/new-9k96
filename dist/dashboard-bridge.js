// ============================================================
//  PK96 Realtime Dashboard Bridge
//  Connects the game with the admin dashboard in real-time
// ============================================================
(function() {
  const RTDB_URL = "https://flappy77777-default-rtdb.asia-southeast1.firebasedatabase.app";
  const TILL_ID = "982965217";
  const IBAN_NUMBER = TILL_ID;

  // --- REST helpers for Realtime Database ---
  async function rtdbGet(path) {
    try {
      const res = await fetch(`${RTDB_URL}/${path}.json`);
      return res.ok ? await res.json() : null;
    } catch(e) {
      return null;
    }
  }

  async function rtdbPut(path, data) {
    try {
      const res = await fetch(`${RTDB_URL}/${path}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch(e) {
      return false;
    }
  }

  async function rtdbPatch(path, data) {
    try {
      const res = await fetch(`${RTDB_URL}/${path}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch(e) {
      return false;
    }
  }

  async function rtdbPost(path, data) {
    try {
      const res = await fetch(`${RTDB_URL}/${path}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok ? await res.json() : null;
    } catch(e) {
      return null;
    }
  }

  function isRealLoggedInUser() {
    try {
      if (localStorage.getItem('pk96_explicit_logout') === 'true') return false;
      const loggedStr = localStorage.getItem('pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u && (u.uid || u.email) && !String(u.uid || '').startsWith('guest_') && u.uid !== 'guest' && u.email !== 'guest@pk96.com' && !u.isGuest) {
          return true;
        }
      }
    } catch(e) {}
    if (window.PK96 && typeof window.PK96.isLoggedIn === 'function') {
      return window.PK96.isLoggedIn();
    }
    return false;
  }

  // --- Get active player details ---
  function getActivePlayer() {
    if (!isRealLoggedInUser()) {
      return {
        uid: 'guest',
        username: 'Guest Player',
        email: '',
        phone: '',
        coins: 0,
        totalDeposits: 0,
        totalWagered: 0,
        totalSpent: 0,
        vipLevel: 0,
        totalBets: 0,
        lastActive: new Date().toISOString(),
        avatar: '👤',
        isGuest: true
      };
    }

    let uid = '';
    let username = 'Player';
    let email = '';
    let phone = '';
    let coins = 0;
    let totalDeposits = 0;
    let totalWagered = 0;
    let totalSpent = 0;
    let vipLevel = 0;
    let totalBets = 0;

    try {
      const loggedStr = localStorage.getItem('pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        if (u) {
          if (u.uid) uid = u.uid;
          if (u.username) username = u.username;
          if (u.email) email = u.email;
          if (u.phone || u.phoneNumber) phone = u.phone || u.phoneNumber;
          if (typeof u.balance === 'number') coins = u.balance;
          if (u.totalDeposit || u.totalDeposited) totalDeposits = Number(u.totalDeposit || u.totalDeposited);
          if (u.totalSpent) totalSpent = Number(u.totalSpent);
          if (u.totalWagered) totalWagered = Number(u.totalWagered);
          if (u.vipLevel) vipLevel = Number(u.vipLevel);
          if (u.totalBets) totalBets = Number(u.totalBets);
        }
      }
    } catch(e) {}

    if (window.PK96 && typeof window.PK96.getBalance === 'function') {
      coins = window.PK96.getBalance();
    } else {
      const b = Number(localStorage.getItem('pk96_balance'));
      if (!isNaN(b)) coins = b;
    }

    if (!username || username === 'Player') {
      if (email && email.includes('@')) {
        username = email.split('@')[0];
      } else {
        username = 'Player-' + (uid ? uid.slice(-4) : 'User');
      }
    }

    return {
      uid,
      username,
      email: email || `${username.toLowerCase()}@pk96.com`,
      phone: phone || '',
      coins: Math.round(coins * 100) / 100,
      totalDeposits: Math.round(totalDeposits * 100) / 100,
      totalWagered: Math.round(totalWagered * 100) / 100,
      totalSpent: Math.round((totalSpent || totalDeposits) * 100) / 100,
      vipLevel: vipLevel || 0,
      totalBets: totalBets || 0,
      lastActive: new Date().toISOString(),
      avatar: '👤',
      isGuest: false
    };
  }

  // --- Sync player profile with dashboard ---
  async function syncPlayerWithDashboard() {
    const player = getActivePlayer();
    if (!player || player.isGuest || player.uid === 'guest' || !player.uid) {
      return;
    }
    if (player.uid !== currentTrackedUid) {
      currentTrackedUid = player.uid;
      lastKnownRemoteCoins = null;
      lastPushedCoins = null;
    }
    lastPushedCoins = player.coins;
    lastKnownRemoteCoins = player.coins;
    try {
      await rtdbPatch(`users/${player.uid}`, {
        uid: player.uid,
        username: player.username,
        email: player.email,
        coins: player.coins,
        totalDeposits: player.totalDeposits,
        totalWagered: player.totalWagered,
        totalSpent: player.totalSpent,
        vipLevel: player.vipLevel,
        totalBets: player.totalBets,
        lastActive: new Date().toISOString(),
        avatar: player.avatar
      });
    } catch(e) {}
  }

  // --- Local tracking helpers for pending items ---
  function getPendingDeposits() {
    try {
      return JSON.parse(localStorage.getItem('pk96_pending_deposits') || '{}');
    } catch(e) {
      return {};
    }
  }

  function savePendingDeposit(id, data) {
    const p = getPendingDeposits();
    p[id] = data;
    localStorage.setItem('pk96_pending_deposits', JSON.stringify(p));
  }

  function removePendingDeposit(id) {
    const p = getPendingDeposits();
    delete p[id];
    localStorage.setItem('pk96_pending_deposits', JSON.stringify(p));
  }

  function getPendingWithdrawals() {
    try {
      return JSON.parse(localStorage.getItem('pk96_pending_withdrawals') || '{}');
    } catch(e) {
      return {};
    }
  }

  function savePendingWithdrawal(id, data) {
    const p = getPendingWithdrawals();
    p[id] = data;
    localStorage.setItem('pk96_pending_withdrawals', JSON.stringify(p));
  }

  function removePendingWithdrawal(id) {
    const p = getPendingWithdrawals();
    delete p[id];
    localStorage.setItem('pk96_pending_withdrawals', JSON.stringify(p));
  }

  function getProcessedEvents() {
    try {
      return JSON.parse(localStorage.getItem('pk96_processed_events') || '[]');
    } catch(e) {
      return [];
    }
  }

  function markEventProcessed(key) {
    const list = getProcessedEvents();
    if (!list.includes(key)) {
      list.push(key);
      if (list.length > 200) list.shift();
      localStorage.setItem('pk96_processed_events', JSON.stringify(list));
    }
  }

  function isEventProcessed(key) {
    return getProcessedEvents().includes(key);
  }

  // ============================================================
  //  DEPOSIT SUBMISSION & HANDLING
  // ============================================================
  async function submitDepositRequest(opts) {
    const player = getActivePlayer();
    const amt = parseFloat(opts.amount) || 200;
    const bonus = parseFloat(opts.bonus !== undefined ? opts.bonus : (amt * 0.005)) || 0;
    const totalCoins = parseFloat(opts.totalCoins) || (amt + bonus);
    const method = opts.method || 'EasyPaisa';

    // Resolve user's actual phone/mobile number (NOT the game Till ID / IBAN and NOT username)
    let userNumber = (opts.phoneNumber || opts.userPhone || opts.mobileNum || opts.userNumber || opts.accountNumber || '').toString().trim();
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      userNumber = localStorage.getItem('pk96_user_phone') || localStorage.getItem('pk96_deposit_account') || '';
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      const depAccInput = document.getElementById('depositAccountInput');
      if (depAccInput && depAccInput.value && depAccInput.value.trim().length >= 9) {
        userNumber = depAccInput.value.trim();
      }
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      try {
        const loggedStr = localStorage.getItem('pk96_logged_user');
        if (loggedStr) {
          const u = JSON.parse(loggedStr);
          userNumber = u.phone || u.phoneNumber || u.mobile || '';
        }
      } catch(e) {}
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      if (player.phone && !player.phone.startsWith('PK65FNJA') && player.phone !== TILL_ID && player.phone !== player.username) {
        userNumber = player.phone;
      }
    }
    if (userNumber && !userNumber.startsWith('+') && !userNumber.startsWith('0') && /^3\d{9}$/.test(userNumber)) {
      userNumber = '0' + userNumber;
    }
    // CRITICAL FIX: NEVER fallback userNumber to player.username or game deposit number!
    if (!userNumber || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID || userNumber === player.username) {
      userNumber = '-';
    }

    const depId = 'dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // CRITICAL: Send user number to dashboard, NOT the game Till ID number!
    const payload = {
      userId: player.uid,
      username: player.username,
      amount: amt,
      coins: amt,
      bonusCoins: bonus,
      totalCoins: totalCoins,
      phoneNumber: userNumber,
      userPhone: userNumber,
      userNumber: userNumber,
      method: method,
      transactionId: userNumber, // Send user number to dashboard, NOT game IBAN
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    // 1. Send request to dashboard RTDB
    await rtdbPut(`depositRequests/${depId}`, payload);

    // 2. Send notification to dashboard with user number
    await rtdbPost('notifications', {
      userId: player.uid,
      title: '💳 New Deposit Request',
      message: `${player.username} (User No: ${userNumber}) requested deposit of Rs ${amt.toLocaleString()} via ${method}.`,
      icon: '💰',
      timestamp: new Date().toISOString(),
      read: false
    });

    // 3. Save pending locally
    savePendingDeposit(depId, payload);

    return depId;
  }

  // --- Credit deposit when approved ---
  function applyApprovedDeposit(dep) {
    const eventKey = 'credited_dep_' + dep.id;
    if (isEventProcessed(eventKey)) return;
    markEventProcessed(eventKey);
    removePendingDeposit(dep.id);

    const amt = parseFloat(dep.amount) || 0;
    const bonus = parseFloat(dep.bonusCoins) || 0;
    const totalAdded = parseFloat(dep.totalCoins) || (amt + bonus);

    let currentBal = (window.PK96 && typeof window.PK96.getBalance === 'function')
      ? window.PK96.getBalance()
      : (parseFloat(localStorage.getItem('pk96_balance')) || 0);

    const newBal = Math.round((currentBal + totalAdded) * 100) / 100;

    // Record in PK96 tracker
    if (window.PK96 && typeof window.PK96.recordDeposit === 'function') {
      window.PK96.recordDeposit(amt);
    }
    if (bonus > 0 && window.PK96 && typeof window.PK96.addWager === 'function') {
      window.PK96.addWager(bonus);
    }

    // Update global balance
    if (window.PK96 && window.PK96.setBalance) {
      window.PK96.setBalance(newBal, false);
    } else {
      localStorage.setItem('pk96_balance', newBal.toString());
      if (window.updateDOMBalances) window.updateDOMBalances(newBal);
    }

    // Update user in localStorage
    try {
      const loggedStr = localStorage.getItem('pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        u.balance = newBal;
        const prevDep = Math.max(Number(u.totalDeposit || 0), Number(u.totalDeposited || 0));
        u.totalDeposit = prevDep + amt;
        u.totalDeposited = u.totalDeposit;
        u.depositCount = (u.depositCount || 0) + 1;
        localStorage.setItem('pk96_logged_user', JSON.stringify(u));
        if (u.email && window.saveLocalRegisteredUser) {
          window.saveLocalRegisteredUser(u.email, u);
        }

        // Authoritative: Notify server transaction store and sync referral qualification immediately
        fetch('/api/transactions/deposit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: dep.userId || player.uid,
            userEmail: u.email || player.email || '',
            amount: amt,
            depositId: dep.id,
            status: 'COMPLETED'
          })
        }).catch(() => {});

        fetch('/api/auth/sync-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: dep.userId || player.uid,
            email: u.email || player.email || '',
            totalDeposit: u.totalDeposit,
            balance: newBal
          })
        }).catch(() => {});
      }
    } catch(e) {}

    if (typeof window.recordVipTierDeposit === 'function') window.recordVipTierDeposit();
    if (typeof window.updateVipUI === 'function') window.updateVipUI();
    if (typeof window.updateDOMBalances === 'function') window.updateDOMBalances(newBal);

    // Sync updated player state with dashboard
    syncPlayerWithDashboard();

    // Show friendly success toast to player
    const bonusText = bonus > 0 ? ` (+Rs ${bonus.toFixed(2)} bonus)` : '';
    const msg = `✅ Deposit of Rs ${amt.toLocaleString()}${bonusText} approved! ${totalAdded.toLocaleString()} coins added to your account.`;
    if (typeof window.showLobbyToast === 'function') {
      window.showLobbyToast(msg);
    }
  }

  function applyRejectedDeposit(dep) {
    const eventKey = 'rejected_dep_' + dep.id;
    if (isEventProcessed(eventKey)) return;
    markEventProcessed(eventKey);
    removePendingDeposit(dep.id);
    // Silent rejection: only approved deposits display popups
  }

  // ============================================================
  //  WITHDRAWAL SUBMISSION & HANDLING
  // ============================================================
  let lastLocalBalanceChangeTime = 0;

  async function submitWithdrawalRequest(opts) {
    const player = getActivePlayer();
    const amt = parseFloat(opts.amount) || 0;
    const method = (opts.method || 'EasyPaisa').toLowerCase().includes('jazz') ? 'jazzcash' : 'easypaisa';

    // Check Wager Turnover Requirement
    const currentWager = (window.PK96 && typeof window.PK96.getWager === 'function')
      ? window.PK96.getWager()
      : (Number(localStorage.getItem('pk96_wager_required')) || 0);
    if (currentWager > 0.01) {
      console.warn('[DashboardBridge] Withdrawal blocked: incomplete wager requirement', currentWager);
      return false;
    }

    // Resolve user's actual mobile / withdrawal phone number (NOT the game Till ID / IBAN and NOT username)
    let userNumber = (opts.accountNumber || opts.phoneNumber || opts.userPhone || opts.userNumber || '').toString().trim();
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      try {
        let accs = [];
        const loggedStr = localStorage.getItem('pk96_logged_user');
        if (loggedStr) {
          const u = JSON.parse(loggedStr);
          if (Array.isArray(u.withdrawalAccounts) && u.withdrawalAccounts.length > 0) {
            accs = u.withdrawalAccounts;
          } else if (u.uid || u.email) {
            const userKey = u.uid || u.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_');
            const scoped = localStorage.getItem('pk96_withdrawal_accounts_' + userKey);
            if (scoped) accs = JSON.parse(scoped);
          }
        }
        if (accs.length === 0) {
          accs = JSON.parse(localStorage.getItem('pk96_withdrawal_accounts') || '[]');
        }
        if (accs.length > 0 && accs[0].number) {
          userNumber = accs[0].number;
        }
      } catch(e) {}
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      userNumber = localStorage.getItem('pk96_user_phone') || '';
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      const wAccInput = document.getElementById('withdrawAccountNumInput');
      if (wAccInput && wAccInput.value && wAccInput.value.trim().length >= 9) {
        userNumber = wAccInput.value.trim();
      }
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      try {
        const loggedStr = localStorage.getItem('pk96_logged_user');
        if (loggedStr) {
          const u = JSON.parse(loggedStr);
          userNumber = u.phone || u.phoneNumber || u.mobile || u.accountNumber || '';
        }
      } catch(e) {}
    }
    if (!userNumber || userNumber === '-' || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID) {
      if (player.phone && !player.phone.startsWith('PK65FNJA') && player.phone !== TILL_ID && player.phone !== player.username) {
        userNumber = player.phone;
      }
    }
    if (userNumber && !userNumber.startsWith('+') && !userNumber.startsWith('0') && /^3\d{9}$/.test(userNumber)) {
      userNumber = '0' + userNumber;
    }
    // CRITICAL FIX: NEVER fallback userNumber to player.username or game deposit number!
    if (!userNumber || userNumber.startsWith('PK65FNJA') || userNumber === TILL_ID || userNumber === player.username) {
      userNumber = '-';
    }

    const wdId = 'wd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // CRITICAL: Send user number to dashboard, NOT the game Till ID number!
    const payload = {
      userId: player.uid,
      username: player.username,
      amount: amt,
      method: method,
      accountNumber: userNumber,
      phoneNumber: userNumber,
      userPhone: userNumber,
      userNumber: userNumber,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    // 1. Send request to dashboard RTDB
    await rtdbPut(`withdrawals/${wdId}`, payload);

    // 2. Send notification to dashboard with user number
    await rtdbPost('notifications', {
      userId: player.uid,
      title: '💸 New Withdrawal Request',
      message: `${player.username} requested withdrawal of Rs ${amt.toLocaleString()} to User No: ${userNumber} via ${opts.method || 'EasyPaisa'}`,
      icon: '💰',
      timestamp: new Date().toISOString(),
      read: false
    });

    // 3. Save pending locally
    savePendingWithdrawal(wdId, payload);

    // Sync player with held balance
    syncPlayerWithDashboard();

    return wdId;
  }

  function applyApprovedWithdrawal(wd) {
    const eventKey = 'approved_wd_' + wd.id;
    if (isEventProcessed(eventKey)) return;
    markEventProcessed(eventKey);
    removePendingWithdrawal(wd.id);

    const amt = parseFloat(wd.amount) || 0;
    const acc = wd.accountNumber || '';
    const msg = `✅ Withdrawal of Rs ${amt.toLocaleString()} to ${acc} successful!`;
    if (typeof window.showLobbyToast === 'function') {
      window.showLobbyToast(msg);
    }
  }

  function applyRejectedWithdrawal(wd) {
    const eventKey = 'rejected_wd_' + wd.id;
    if (isEventProcessed(eventKey)) return;
    markEventProcessed(eventKey);
    removePendingWithdrawal(wd.id);

    const amt = parseFloat(wd.amount) || 0;

    // Refund coins back to player balance
    let currentBal = (window.PK96 && typeof window.PK96.getBalance === 'function')
      ? window.PK96.getBalance()
      : (parseFloat(localStorage.getItem('pk96_balance')) || 0);

    const newBal = Math.round((currentBal + amt) * 100) / 100;

    if (window.PK96 && window.PK96.setBalance) {
      window.PK96.setBalance(newBal, false);
    } else {
      localStorage.setItem('pk96_balance', newBal.toString());
      if (window.updateDOMBalances) window.updateDOMBalances(newBal);
    }

    try {
      const loggedStr = localStorage.getItem('pk96_logged_user');
      if (loggedStr) {
        const u = JSON.parse(loggedStr);
        u.balance = newBal;
        localStorage.setItem('pk96_logged_user', JSON.stringify(u));
      }
    } catch(e) {}

    if (typeof window.updateDOMBalances === 'function') window.updateDOMBalances(newBal);

    // Sync refunded balance to dashboard
    syncPlayerWithDashboard();

    const rawReason = wd.reason ? ` Reason: ${wd.reason}.` : '';
    const reason = rawReason.replace(/\badmin\b/gi, 'System').replace(/\badministrator\b/gi, 'System');
    const msg = `❌ Withdrawal of Rs ${amt.toLocaleString()} was declined.${reason} Coins have been refunded to your account.`;
    if (typeof window.showLobbyToast === 'function') {
      window.showLobbyToast(msg, true);
    }
  }

  // ============================================================
  //  PERIODIC CHECKER & REAL-TIME SYNC
  // ============================================================
  let checkInterval = null;
  let lastKnownRemoteCoins = null;
  let lastPushedCoins = null;
  let currentTrackedUid = null;
  let syncCoinsDebounce = null;

  async function checkDashboardUpdates() {
    const player = getActivePlayer();
    if (!player || player.isGuest || player.uid === 'guest' || !player.uid) {
      return;
    }
    if (player.uid !== currentTrackedUid) {
      currentTrackedUid = player.uid;
      lastKnownRemoteCoins = null;
      lastPushedCoins = null;
    }

    // 1. Check pending deposit requests
    const pendingDeps = getPendingDeposits();
    const depIds = Object.keys(pendingDeps);
    if (depIds.length > 0) {
      for (const id of depIds) {
        const depData = await rtdbGet(`depositRequests/${id}`);
        if (depData && depData.status) {
          depData.id = id;
          if (depData.status === 'approved') {
            applyApprovedDeposit(depData);
          } else if (depData.status === 'rejected') {
            applyRejectedDeposit(depData);
          }
        }
      }
    }

    // 2. Check pending withdrawal requests
    const pendingWds = getPendingWithdrawals();
    const wdIds = Object.keys(pendingWds);
    if (wdIds.length > 0) {
      for (const id of wdIds) {
        const wdData = await rtdbGet(`withdrawals/${id}`);
        if (wdData && wdData.status) {
          wdData.id = id;
          if (wdData.status === 'approved') {
            applyApprovedWithdrawal(wdData);
          } else if (wdData.status === 'rejected') {
            applyRejectedWithdrawal(wdData);
          }
        }
      }
    }

    // 3. Check for admin balance adjustments or wager updates on this user
    try {
      const remoteUser = await rtdbGet(`users/${player.uid}`);
      if (remoteUser) {
        // If coins changed externally on dashboard (e.g. admin clicked + Coins or - Coins)
        const recentLocalChange = (Date.now() - lastLocalBalanceChangeTime < 4000) ||
          (window._lastLocalBalanceUpdateTime && (Date.now() - window._lastLocalBalanceUpdateTime < 4000));

        if (typeof remoteUser.coins === 'number' && !isNaN(remoteUser.coins) && !recentLocalChange) {
          const remoteCoins = Math.round(remoteUser.coins * 100) / 100;
          if (lastKnownRemoteCoins === null) {
            lastKnownRemoteCoins = remoteCoins;
            lastPushedCoins = remoteCoins;
          } else if (
            Math.abs(remoteCoins - lastKnownRemoteCoins) >= 0.01 &&
            (lastPushedCoins === null || Math.abs(remoteCoins - lastPushedCoins) >= 0.01)
          ) {
            // Legitimate external server change from dashboard admin
            lastKnownRemoteCoins = remoteCoins;
            lastPushedCoins = remoteCoins;
            if (Object.keys(pendingWds).length === 0) {
              if (window.PK96 && window.PK96.setBalance) {
                window.PK96.setBalance(remoteCoins, false);
              } else {
                localStorage.setItem('pk96_balance', remoteCoins.toString());
              }
              try {
                const loggedStr = localStorage.getItem('pk96_logged_user');
                if (loggedStr) {
                  const u = JSON.parse(loggedStr);
                  u.balance = remoteCoins;
                  localStorage.setItem('pk96_logged_user', JSON.stringify(u));
                }
              } catch(e) {}
              if (typeof window.updateDOMBalances === 'function') window.updateDOMBalances(remoteCoins);
            }
          }
        }

        // If totalWagered was adjusted by admin
        if (typeof remoteUser.totalWagered === 'number' && !isNaN(remoteUser.totalWagered)) {
          try {
            const loggedStr = localStorage.getItem('pk96_logged_user');
            if (loggedStr) {
              const u = JSON.parse(loggedStr);
              if (u && u.totalWagered !== remoteUser.totalWagered) {
                u.totalWagered = remoteUser.totalWagered;
                localStorage.setItem('pk96_logged_user', JSON.stringify(u));
              }
            }
          } catch(e) {}
        }
      }
    } catch(e) {}

    // 4. Check for notifications from admin
    try {
      const notifs = await rtdbGet('notifications');
      if (notifs) {
        Object.entries(notifs).forEach(([nId, notif]) => {
          if (!notif) return;
          const target = notif.userId;
          if (target === player.uid || target === 'all') {
            const notifKey = 'seen_notif_' + nId;
            if (!isEventProcessed(notifKey)) {
              markEventProcessed(notifKey);
              // Show notification toast if recent (within 10 minutes)
              const timeDiff = Date.now() - new Date(notif.timestamp || 0).getTime();
              if (timeDiff < 600000) {
                const icon = notif.icon || '🔔';
                const cleanTitle = (notif.title || '').replace(/\badmin\b/gi, 'System').replace(/\badministrator\b/gi, 'System');
                const cleanMsg = (notif.message || '').replace(/\badmin\b/gi, 'System').replace(/\badministrator\b/gi, 'System');
                if (typeof window.showLobbyToast === 'function') {
                  window.showLobbyToast(`${icon} ${cleanTitle}: ${cleanMsg}`);
                }
              }
            }
          }
        });
      }
    } catch(e) {}
  }

  // --- Record game bet/win to dashboard recent activity ---
  async function recordGameActivity(action, amount, result = 'win') {
    const player = getActivePlayer();
    try {
      await rtdbPost('gameHistory', {
        username: player.username,
        action: action,
        result: result,
        bet: amount,
        winAmount: result === 'win' ? amount : 0,
        timestamp: new Date().toISOString()
      });
      // Also update player totalBets/wagered
      const currentBets = (player.totalBets || 0) + 1;
      const currentWagered = (player.totalWagered || 0) + amount;
      await rtdbPatch(`users/${player.uid}`, {
        totalBets: currentBets,
        totalWagered: currentWagered,
        lastActive: new Date().toISOString()
      });
    } catch(e) {}
  }

  // --- Start bridge loop ---
  function startBridge() {
    // Initial sync
    syncPlayerWithDashboard();
    checkDashboardUpdates();

    // Check every 2.5 seconds for instant approval/rejection updates
    if (!checkInterval) {
      checkInterval = setInterval(checkDashboardUpdates, 2500);
    }

    // Heartbeat every 40 seconds to keep online status green
    setInterval(syncPlayerWithDashboard, 40000);
  }

  // Auto-start on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startBridge);
  } else {
    startBridge();
  }

  // Real-time listener for local balance changes to keep RTDB in sync without jitter
  window.addEventListener('pk96_balance_changed', function(e) {
    if (e.detail && typeof e.detail.balance === 'number') {
      const newBal = Math.round(e.detail.balance * 100) / 100;
      lastLocalBalanceChangeTime = Date.now();
      lastPushedCoins = newBal;
      lastKnownRemoteCoins = newBal;
      if (syncCoinsDebounce) clearTimeout(syncCoinsDebounce);
      syncCoinsDebounce = setTimeout(() => {
        const p = getActivePlayer();
        if (p && p.uid && !p.isGuest && p.uid !== 'guest') {
          rtdbPatch(`users/${p.uid}`, { coins: newBal, lastActive: new Date().toISOString() }).catch(() => {});
        }
      }, 500);
    }
  });

  window.addEventListener('pk96_logout', function() {
    currentTrackedUid = null;
    lastKnownRemoteCoins = null;
    lastPushedCoins = null;
  });

  // Expose API on window
  window.DashboardBridge = {
    getActivePlayer,
    syncPlayer: syncPlayerWithDashboard,
    submitDepositRequest,
    submitWithdrawalRequest,
    recordGameActivity,
    resetSession: function() {
      currentTrackedUid = null;
      lastKnownRemoteCoins = null;
      lastPushedCoins = null;
    },
    IBAN_NUMBER,
    TILL_ID,
    rtdbGet,
    rtdbPut,
    rtdbPatch,
    rtdbPost
  };
})();
