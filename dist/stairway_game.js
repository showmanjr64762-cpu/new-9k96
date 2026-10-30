(function() {
  // -------------------- CONSTANTS (1:1 from constants.ts) --------------------
  const PLATFORM_GAP = 400;
  const STAIR_HEIGHT = 0;
  const PLATFORM_WIDTH = 180;
  const PLATFORM_HEIGHT = 24;
  const PLAYER_SIZE = 280;
  const PLAYER_Y_OFFSET = 0;
  const JUMP_ARC_HEIGHT = 100;
  const JUMP_SPEED = 0.025;
  const INITIAL_BALANCE = 0.00;
  const HOUSE_EDGE = 0.05;

  // -------------------- GAME STATES --------------------
  const GameState = { BETTING: 'BETTING', PLAYING: 'PLAYING', CRASHED: 'CRASHED', CASHED_OUT: 'CASHED_OUT' };

  // -------------------- HELPER: multiplier per step --------------------
  function getMultiplierForStep(step) {
    if (step === 0) return 1.0;
    return parseFloat(Math.pow(1.2, step).toFixed(2));
  }

  // -------------------- PROVIDABLY FAIR --------------------
  const ProvablyFair = {
    async sha256(message) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    generateServerSeed() {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    },
    async calculateCrashPoint(serverSeed, clientSeed, nonce, houseEdge = HOUSE_EDGE) {
      const combined = `${serverSeed}:${clientSeed}:${nonce}`;
      const hash = await this.sha256(combined);
      const hex = hash.substring(0, 8);
      const intValue = parseInt(hex, 16);
      const r = intValue / 4294967295;
      const multiplier = (1 - houseEdge) / (1 - r);
      return { multiplier: Math.max(1.0, parseFloat(multiplier.toFixed(2))), hash };
    }
  };

  // -------------------- SOUND SERVICE --------------------
  const SoundService = {
    sounds: {},
    enabled: true,
    loadSound(name, url) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds[name] = audio;
    },
    play(name) {
      if (!this.enabled) return;
      const sound = this.sounds[name];
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.warn("audio error:", e));
      }
    },
    toggle(enabled) {
      this.enabled = enabled;
    },
    isEnabled() { return this.enabled; }
  };

  // preload sounds
  SoundService.loadSound('jump', 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
  SoundService.loadSound('crash', 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3');
  SoundService.loadSound('cashout', 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3');
  SoundService.loadSound('click', 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');

  // Add anti-flicker CSS
  const style = document.createElement('style');
  style.textContent = `
    .no-flicker {
      -webkit-backface-visibility: hidden;
      -webkit-transform-style: preserve-3d;
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
    }
    [data-scale] {
      will-change: transform;
      transform-origin: center;
    }
    #game-canvas {
      will-change: transform;
      pointer-events: none;
    }
    .ui-container {
      transition: none !important;
    }
  `;
  document.head.appendChild(style);

  // -------------------- ROOT ELEMENT & UI SCALE --------------------
  const root = document.getElementById('root');
  let uiScale = 1;
  function updateUiScale() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const baseWidth = 450, baseHeight = 800;
    const widthScale = screenWidth / baseWidth;
    const heightScale = screenHeight / baseHeight;
    const scale = Math.min(widthScale, heightScale, 1.1);
    uiScale = Math.max(0.8, scale);
    document.querySelectorAll('[data-scale]').forEach(el => {
      el.style.transform = `scale(${uiScale})`;
    });
  }
  window.addEventListener('resize', updateUiScale);

  // -------------------- MAIN APP STATE --------------------
  const AppState = {
    balance: INITIAL_BALANCE,
    betAmount: 10,
    gameState: GameState.BETTING,
    showResults: false,
    currentStep: 0,
    crashPoint: 0,
    platforms: [],
    player: {
      x: 100, y: 0, size: PLAYER_SIZE, jumping: false, progress: 0,
      startX: 0, startY: 0, targetX: 0, targetY: 0, velocity: 0
    },
    serverSeed: ProvablyFair.generateServerSeed(),
    clientSeed: 'stairway-to-wealth-default',
    nonce: 0,
    currentHash: '',
    soundEnabled: true,
    showTutorial: false,
  };

  // -------------------- UI ELEMENTS CACHE --------------------
  const ui = {
    header: null,
    bottomControls: null,
    results: null,
    tutorial: null,
    balanceDisplay: null,
    multiplierDisplay: null,
    multiplierContainer: null,
    soundIcon: null,
    betInput: null
  };

  // -------------------- CANVAS & GAME LOGIC --------------------
  const IDLE_SPRITE_URL = "assets/Idle.png";
  const HAPPY_SPRITE_URL = "assets/Happy.png";
  const JUMP_SPRITE_SHEET_URL = "assets/Jump.png";
  const PARALLAX_LAYERS = [
    "assets/1.png",
    "assets/2.png",
    "assets/3.png",
    "assets/4.png"
  ];

  let assetsLoaded = false;
  const images = {
    idle: null, happy: null, jump: null, parallax: []
  };
  let loadedCount = 0;
  const totalAssets = 3 + PARALLAX_LAYERS.length;

  function onAssetLoad() {
    loadedCount++;
    if (loadedCount === totalAssets) {
      assetsLoaded = true;
      updateUI();
    }
  }

  // load images
  (function loadAssets() {
    images.idle = new Image(); images.idle.src = IDLE_SPRITE_URL; images.idle.onload = onAssetLoad; images.idle.onerror = onAssetLoad;
    images.happy = new Image(); images.happy.src = HAPPY_SPRITE_URL; images.happy.onload = onAssetLoad; images.happy.onerror = onAssetLoad;
    images.jump = new Image(); images.jump.src = JUMP_SPRITE_SHEET_URL; images.jump.onload = onAssetLoad; images.jump.onerror = onAssetLoad;
    PARALLAX_LAYERS.forEach((url, i) => {
      const img = new Image(); img.src = url; img.onload = onAssetLoad; img.onerror = onAssetLoad;
      images.parallax[i] = img;
    });
  })();

  // Canvas drawing references
  const camera = { x: 0, y: 0 };
  const visualPlayer = { x: 100, y: 0, progress: 0, jumpStartY: 0, jumpTargetY: 0, jumpStartX: 0, jumpTargetX: 0, currentFrame: 0, rotation: 0 };
  let crackLines = [];
  let fragments = [];
  let platformShakes = {};

  // sync visual player
  function syncVisualPlayer() {
    if (!AppState.player.jumping && AppState.gameState !== GameState.CRASHED) {
      visualPlayer.x = AppState.player.x;
      visualPlayer.y = AppState.player.y;
      visualPlayer.progress = 0;
      visualPlayer.currentFrame = 0;
    }
  }

  // Jump animation
  function triggerJump() {
    if (!AppState.player.jumping || visualPlayer.progress !== 0) return;
    visualPlayer.jumpStartX = AppState.player.startX;
    visualPlayer.jumpStartY = AppState.player.startY;
    visualPlayer.jumpTargetX = AppState.player.targetX;
    visualPlayer.jumpTargetY = AppState.player.targetY;

    gsap.to(visualPlayer, {
      progress: 1,
      duration: 0.5,
      ease: "power1.inOut",
      onUpdate: function() {
        const p = visualPlayer.progress;
        visualPlayer.x = visualPlayer.jumpStartX + (visualPlayer.jumpTargetX - visualPlayer.jumpStartX) * p;
        const arc = -JUMP_ARC_HEIGHT * Math.sin(Math.PI * p);
        visualPlayer.y = visualPlayer.jumpStartY + (visualPlayer.jumpTargetY - visualPlayer.jumpStartY) * p + arc;
        visualPlayer.currentFrame = Math.min(10, Math.floor(p * 11));
      },
      onComplete: () => {
        visualPlayer.progress = 0;
        handleFinishJump();
      }
    });
  }

  // Crash animation
  function startCrashAnimation(step) {
    const lines = [];
    const numPoints = 14;
    const centerX = PLATFORM_WIDTH/2, centerY = PLATFORM_HEIGHT/2;
    for (let i=0; i<numPoints; i++) {
      let curX = centerX, curY = centerY;
      const angle = (Math.PI*2*i)/numPoints + (Math.random()*0.4-0.2);
      const segs = 3;
      for (let j=0; j<segs; j++) {
        const segLen = (PLATFORM_WIDTH/2/segs)*(0.8+Math.random()*0.5);
        const nextX = curX + Math.cos(angle)*segLen;
        const nextY = curY + Math.sin(angle)*segLen;
        lines.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
        curX = nextX; curY = nextY;
      }
    }
    crackLines = lines;

    const frags = [];
    const rows = 4, cols = 6;
    const fragW = PLATFORM_WIDTH/cols, fragH = PLATFORM_HEIGHT/rows;
    const currentPlatform = AppState.platforms[step];
    for (let r=0; r<rows; r++) {
      for (let c=0; c<cols; c++) {
        frags.push({
          x: currentPlatform.x + c*fragW, y: currentPlatform.y + r*fragH,
          vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15 - 8,
          rotation: 0, vRotation: (Math.random()-0.5)*0.4,
          width: fragW, height: fragH, color: '#ef4444'
        });
      }
    }
    fragments = frags;

    const crashTl = gsap.timeline();
    crashTl.to({}, {
      duration: 2.5,
      onUpdate: function() {
        const prog = this.progress();
        if (prog < 0.25) {
          const intensity = 20 * (1 - prog*4);
          platformShakes[step] = (Math.random()-0.5)*intensity;
        } else {
          platformShakes[step] = 0;
          fragments.forEach(f => {
            f.x += f.vx;
            f.y += f.vy;
            f.vy += 0.6;
            f.rotation += f.vRotation;
            f.vx *= 0.98;
          });
        }
      },
      onComplete: () => { platformShakes[step] = 0; }
    });
    crashTl.to(visualPlayer, {
      y: visualPlayer.y + 2000,
      rotation: Math.PI * 6 * (Math.random() > 0.5 ? 1 : -1),
      duration: 1.8,
      ease: "power2.in"
    }, 0.6);
  }

  // -------------------- CORE GAME ACTIONS --------------------
  function setupGame() {
    const startY = window.innerHeight / 2;
    const startX = 200;
    const newPlatforms = [];
    for (let i=0; i<100; i++) {
      newPlatforms.push({
        id: i,
        x: startX + i * PLATFORM_GAP,
        y: startY - i * STAIR_HEIGHT,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        multiplier: getMultiplierForStep(i)
      });
    }
    AppState.platforms = newPlatforms;
    AppState.player.x = newPlatforms[0].x + PLATFORM_WIDTH/2 - PLAYER_SIZE/2;
    AppState.player.y = newPlatforms[0].y - PLAYER_SIZE + PLAYER_Y_OFFSET;
    AppState.player.jumping = false;
    AppState.player.progress = 0;
    AppState.currentStep = 0;
    AppState.showResults = false;
    visualPlayer.x = AppState.player.x; visualPlayer.y = AppState.player.y;
    syncVisualPlayer();
  }

  async function handleStartGame() {
    if (AppState.betAmount <= 0 || AppState.betAmount > AppState.balance) return;
    SoundService.play('click');
    AppState.balance -= AppState.betAmount;
    const { multiplier, hash } = await ProvablyFair.calculateCrashPoint(AppState.serverSeed, AppState.clientSeed, AppState.nonce);
    AppState.currentHash = hash;
    AppState.crashPoint = multiplier;
    AppState.nonce++;
    setupGame();
    AppState.gameState = GameState.PLAYING;
    AppState.showResults = false;
    updateUI();
  }

  function handleJump() {
    if (AppState.gameState !== GameState.PLAYING || AppState.player.jumping) return;
    SoundService.play('click');
    const nextStep = AppState.currentStep + 1;
    const nextPlatform = AppState.platforms[nextStep];
    AppState.player.jumping = true;
    AppState.player.startX = AppState.player.x;
    AppState.player.startY = AppState.player.y;
    AppState.player.targetX = nextPlatform.x + PLATFORM_WIDTH/2 - PLAYER_SIZE/2;
    AppState.player.targetY = nextPlatform.y - PLAYER_SIZE + PLAYER_Y_OFFSET;
    visualPlayer.progress = 0;
    triggerJump();
    updateUI();
  }

  function handleFinishJump() {
    const newStep = AppState.currentStep + 1;
    const currentMultiplier = AppState.platforms[newStep].multiplier;
    if (currentMultiplier > AppState.crashPoint) {
      SoundService.play('crash');
      AppState.gameState = GameState.CRASHED;
      AppState.player.x = AppState.player.targetX;
      AppState.player.y = AppState.player.targetY;
      AppState.player.jumping = false;
      AppState.currentStep = newStep;
      syncVisualPlayer();
      startCrashAnimation(newStep);
      setTimeout(() => { AppState.showResults = true; updateUI(); }, 1800);
    } else {
      SoundService.play('jump');
      AppState.currentStep = newStep;
      AppState.player.x = AppState.player.targetX;
      AppState.player.y = AppState.player.targetY;
      AppState.player.jumping = false;
      syncVisualPlayer();
    }
    updateUI();
  }

  function handleTakeProfit() {
    if (AppState.gameState !== GameState.PLAYING || AppState.player.jumping) return;
    SoundService.play('cashout');
    const currentMultiplier = AppState.platforms[AppState.currentStep].multiplier;
    const winAmount = AppState.betAmount * currentMultiplier;
    AppState.balance += winAmount;
    AppState.gameState = GameState.CASHED_OUT;
    setTimeout(() => { AppState.showResults = true; updateUI(); }, 500);
    updateUI();
  }

  function resetGame() {
    SoundService.play('click');
    AppState.gameState = GameState.BETTING;
    AppState.showResults = false;
    crackLines = []; fragments = []; platformShakes = {};
    visualPlayer.rotation = 0;
    updateUI();
  }

  function toggleSound() {
    AppState.soundEnabled = !AppState.soundEnabled;
    SoundService.toggle(AppState.soundEnabled);
    if (AppState.soundEnabled) SoundService.play('click');
    updateUI();
  }

  // -------------------- INITIAL UI BUILD --------------------
  function buildInitialUI() {
    const html = `
      <div class="relative w-full h-full">
        <canvas id="game-canvas" class="fixed inset-0 z-0" style="pointer-events: none;"></canvas>
        
        <div class="relative z-10 w-full h-full flex flex-col pointer-events-none">
          <!-- Header -->
          <div class="p-4 md:p-6 flex justify-center items-center w-full origin-top" data-scale style="transform: scale(${uiScale});">
            <div class="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-1 rounded-2xl shadow-2xl flex items-center gap-1 pointer-events-auto" id="header-container">
              <div class="px-6 py-2 flex items-center gap-4" style="display:none !important;">
                <div>
                  <h1 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Balance</h1>
                  <p class="text-xl font-black text-emerald-400 tabular-nums" id="balance-display">$${AppState.balance.toFixed(2)}</p>
                </div>
                <button id="reset-balance" class="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-emerald-400 transition-all" title="Reset Balance">
                  <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
              </div>
              
              <div class="w-px h-8 bg-slate-700 mx-2"></div>
              
              <div class="px-6 py-2" id="multiplier-container" style="display: ${AppState.gameState === GameState.PLAYING || AppState.gameState === GameState.CASHED_OUT || AppState.gameState === GameState.CRASHED ? 'block' : 'none'};">
                <h1 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Multiplier</h1>
                <p class="text-xl font-black text-white tabular-nums" id="multiplier-display">1.00x</p>
              </div>
              
              <div class="w-px h-8 bg-slate-700 mx-2"></div>
              
              <button id="toggle-sound" class="p-3 rounded-xl hover:bg-slate-800 transition-colors group">
                <i data-lucide="volume-2" class="w-5 h-5 text-slate-500 group-hover:text-white" id="sound-on-icon"></i>
                <i data-lucide="volume-x" class="w-5 h-5 text-rose-500" id="sound-off-icon" style="display: none;"></i>
              </button>
              
              <div class="w-px h-8 bg-slate-700 mx-2"></div>
              
              <button id="show-tutorial" class="p-3 rounded-xl hover:bg-slate-800 transition-colors group">
                <i data-lucide="help-circle" class="w-5 h-5 text-slate-500 group-hover:text-white"></i>
              </button>
            </div>
          </div>

          <!-- Center Results -->
          <div class="flex-1 flex items-center justify-center p-4" id="results-container">
            <!-- Results will be dynamically updated -->
          </div>

          <!-- Bottom Controls -->
          <div class="w-full flex justify-center p-6 md:p-10 pointer-events-none" id="bottom-controls-container">
            <!-- Controls will be dynamically updated -->
          </div>
        </div>

        <!-- Tutorial Overlay -->
        <div id="tutorial-container" style="display: none;"></div>
      </div>
    `;

    root.innerHTML = html;
    lucide.createIcons();

    // Cache UI elements
    ui.header = document.getElementById('header-container');
    ui.balanceDisplay = document.getElementById('balance-display');
    ui.multiplierContainer = document.getElementById('multiplier-container');
    ui.multiplierDisplay = document.getElementById('multiplier-display');
    ui.soundOnIcon = document.getElementById('sound-on-icon');
    ui.soundOffIcon = document.getElementById('sound-off-icon');
    ui.results = document.getElementById('results-container');
    ui.bottomControls = document.getElementById('bottom-controls-container');
    ui.tutorial = document.getElementById('tutorial-container');

    // Attach persistent event listeners
    document.getElementById('reset-balance')?.addEventListener('click', () => { 
      AppState.balance = INITIAL_BALANCE; 
      SoundService.play('click'); 
      updateUI(); 
    });
    
    document.getElementById('toggle-sound')?.addEventListener('click', toggleSound);
    
    document.getElementById('show-tutorial')?.addEventListener('click', () => { 
      AppState.showTutorial = true; 
      updateUI(); 
    });

    // Initialize canvas
    initCanvas();
    
    // Initial UI update
    updateUI();
  }

  // -------------------- DYNAMIC UI UPDATE (no flicker) --------------------
  function updateUI() {
    if (!ui.balanceDisplay) return;

    // Update balance
    ui.balanceDisplay.textContent = `$${AppState.balance.toFixed(2)}`;

    // Update multiplier
    const currentMultiplier = AppState.platforms[AppState.currentStep]?.multiplier || 1.0;
    if (ui.multiplierDisplay) {
      ui.multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
    }

    // Show/hide multiplier based on game state
    if (ui.multiplierContainer) {
      ui.multiplierContainer.style.display = 
        (AppState.gameState === GameState.PLAYING || 
         AppState.gameState === GameState.CASHED_OUT || 
         AppState.gameState === GameState.CRASHED) ? 'block' : 'none';
    }

    // Update sound icons
    if (ui.soundOnIcon && ui.soundOffIcon) {
      ui.soundOnIcon.style.display = AppState.soundEnabled ? 'inline-block' : 'none';
      ui.soundOffIcon.style.display = AppState.soundEnabled ? 'none' : 'inline-block';
    }

    // Update results panel
    updateResults();

    // Update bottom controls
    updateBottomControls();

    // Update tutorial
    updateTutorial();

    // Recreate icons for new content only
    lucide.createIcons();
  }

  function updateResults() {
    if (!ui.results) return;
    
    if (AppState.showResults) {
      const currentMultiplier = AppState.platforms[AppState.currentStep]?.multiplier || 1.0;
      const isCrashed = AppState.gameState === GameState.CRASHED;
      
      // Check if results panel already exists
      let resultsPanel = document.getElementById('results-panel');
      
      if (!resultsPanel) {
        // Create panel if it doesn't exist
        ui.results.innerHTML = `
          <div id="results-panel" class="bg-slate-900/95 backdrop-blur-2xl p-8 rounded-[2rem] border border-slate-700 shadow-2xl flex flex-col w-full max-w-md pointer-events-auto transition-all animate-in fade-in zoom-in duration-300 no-flicker" data-scale style="transform: scale(${uiScale});">
            <div id="results-status" class="text-sm font-black uppercase tracking-[0.3em] mb-6 px-4 py-1 rounded-full"></div>
            <div class="grid grid-cols-2 gap-4 w-full mb-8">
              <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Bet</p>
                <p id="results-bet" class="text-lg font-black text-white"></p>
              </div>
              <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Multiplier</p>
                <p id="results-multiplier" class="text-lg font-black text-white"></p>
              </div>
              <div class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 col-span-2">
                <p class="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Payout</p>
                <p id="results-payout" class="text-3xl font-black"></p>
              </div>
            </div>
            <button id="reset-after-result" class="w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95"></button>
            <div id="results-crash-info" class="mt-6 space-y-2" style="display: none;"></div>
          </div>
        `;
        resultsPanel = document.getElementById('results-panel');
      }
      
      // Update only the content
      const statusEl = document.getElementById('results-status');
      const betEl = document.getElementById('results-bet');
      const multiplierEl = document.getElementById('results-multiplier');
      const payoutEl = document.getElementById('results-payout');
      const resetBtn = document.getElementById('reset-after-result');
      const crashInfo = document.getElementById('results-crash-info');
      
      if (statusEl) {
        statusEl.className = `text-sm font-black uppercase tracking-[0.3em] mb-6 px-4 py-1 rounded-full ${isCrashed ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`;
        statusEl.textContent = isCrashed ? 'Better Luck Next Time' : 'Victory';
      }
      
      if (betEl) betEl.textContent = `$${AppState.betAmount.toFixed(2)}`;
      if (multiplierEl) multiplierEl.textContent = `${currentMultiplier.toFixed(2)}x`;
      
      if (payoutEl) {
        payoutEl.className = `text-3xl font-black ${isCrashed ? 'text-slate-400' : 'text-emerald-400'}`;
        payoutEl.textContent = `$${isCrashed ? '0.00' : (AppState.betAmount * currentMultiplier).toFixed(2)}`;
      }
      
      if (resetBtn) {
        resetBtn.className = `w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-95 ${isCrashed ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_6px_0_#9f1239]' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_6px_0_#065f46]'}`;
        resetBtn.textContent = isCrashed ? 'BET AGAIN' : 'CONTINUE';
        // Remove old listener and add new one
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        document.getElementById('reset-after-result')?.addEventListener('click', resetGame);
      }
      
      if (crashInfo) {
        if (isCrashed) {
          crashInfo.style.display = 'block';
          crashInfo.innerHTML = `<p class="text-xs font-bold text-rose-400/60 uppercase">Crashed at ${AppState.crashPoint.toFixed(2)}x</p>`;
        } else {
          crashInfo.style.display = 'none';
        }
      }
    } else {
      ui.results.innerHTML = '';
    }
  }

  function updateBottomControls() {
    if (!ui.bottomControls) return;
    
    const currentMultiplier = AppState.platforms[AppState.currentStep]?.multiplier || 1.0;
    
    if (AppState.gameState === GameState.BETTING) {
      // Check if betting controls already exist
      let bettingControls = document.getElementById('betting-controls');
      
      if (!bettingControls) {
        ui.bottomControls.innerHTML = `
          <div id="betting-controls" class="bg-slate-900/90 backdrop-blur-2xl border border-slate-700/50 p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-lg pointer-events-auto animate-in slide-in-from-bottom-10 duration-500 no-flicker" data-scale style="transform: scale(${uiScale});">
            <div class="flex flex-col gap-6">
              <div>
                <label class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Bet Amount</label>
                <div class="flex gap-2 mb-4">
                  <button id="bet-half" class="flex-1 bg-slate-800/60 hover:bg-slate-700 p-2 rounded-xl text-xs font-bold border border-white/5">1/2</button>
                  <button id="bet-double" class="flex-1 bg-slate-800/60 hover:bg-slate-700 p-2 rounded-xl text-xs font-bold border border-white/5">2x</button>
                  <button id="bet-max" class="flex-1 bg-slate-800/60 hover:bg-slate-700 p-2 rounded-xl text-xs font-bold border border-white/5">Max</button>
                </div>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">$</span>
                  <input type="number" id="bet-input" value="${AppState.betAmount}" class="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl p-4 pl-8 text-2xl font-black outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <button id="start-game-btn" class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-2xl py-6 rounded-2xl shadow-[0_8px_0_#059669] active:translate-y-1 transition-all uppercase">Start Game</button>
            </div>
          </div>
        `;
        bettingControls = document.getElementById('betting-controls');
        
        // Attach event listeners only once
        document.getElementById('bet-half')?.addEventListener('click', () => { 
          AppState.betAmount = Math.max(1, AppState.betAmount / 2); 
          updateUI(); 
        });
        
        document.getElementById('bet-double')?.addEventListener('click', () => { 
          AppState.betAmount = Math.min(AppState.balance, AppState.betAmount * 2); 
          updateUI(); 
        });
        
        document.getElementById('bet-max')?.addEventListener('click', () => { 
          AppState.betAmount = AppState.balance; 
          updateUI(); 
        });
        
        document.getElementById('bet-input')?.addEventListener('input', (e) => { 
          AppState.betAmount = Number(e.target.value) || 0; 
        });
        
        document.getElementById('start-game-btn')?.addEventListener('click', handleStartGame);
      } else {
        // Just update the input value
        const betInput = document.getElementById('bet-input');
        if (betInput) betInput.value = AppState.betAmount;
      }
      
    } else if (AppState.gameState === GameState.PLAYING) {
      // Check if playing controls already exist
      let playingControls = document.getElementById('playing-controls');
      
      if (!playingControls) {
        ui.bottomControls.innerHTML = `
          <div id="playing-controls" class="flex gap-4 w-full max-w-lg pointer-events-auto animate-in slide-in-from-bottom-10 duration-500 no-flicker" data-scale style="transform: scale(${uiScale});">
            <button id="jump-btn" class="flex-1 bg-blue-500 hover:bg-blue-400 text-white font-black text-xl py-5 rounded-2xl shadow-[0_6px_0_#2563eb] active:translate-y-1 uppercase">
              Jump
            </button>
            <button id="cashout-btn" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl py-5 rounded-2xl shadow-[0_6px_0_#059669] active:translate-y-1 transition-all flex flex-col items-center gap-1 leading-tight">
              <span class="uppercase text-[10px] tracking-widest opacity-70">Cash Out</span>
              <span id="cashout-amount" class="text-2xl">$${(AppState.betAmount * currentMultiplier).toFixed(2)}</span>
            </button>
          </div>
        `;
        playingControls = document.getElementById('playing-controls');
        
        // Attach event listeners only once
        document.getElementById('jump-btn')?.addEventListener('click', handleJump);
        document.getElementById('cashout-btn')?.addEventListener('click', handleTakeProfit);
      } else {
        // Update button states and cashout amount
        const jumpBtn = document.getElementById('jump-btn');
        const cashoutAmount = document.getElementById('cashout-amount');
        
        if (jumpBtn) {
          jumpBtn.disabled = AppState.player.jumping;
          jumpBtn.textContent = AppState.player.jumping ? '...' : 'Jump';
        }
        
        if (cashoutAmount) {
          cashoutAmount.textContent = `$${(AppState.betAmount * currentMultiplier).toFixed(2)}`;
        }
      }
    } else {
      ui.bottomControls.innerHTML = '';
    }
  }

  function updateTutorial() {
    if (!ui.tutorial) return;
    
    if (AppState.showTutorial) {
      ui.tutorial.style.display = 'block';
      
      // Check if tutorial content already exists
      let tutorialContent = document.getElementById('tutorial-content');
      
      if (!tutorialContent) {
        ui.tutorial.innerHTML = `
          <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md pointer-events-auto" id="tutorial-bg">
            <div class="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col" onclick="event.stopPropagation()">
              <div class="p-8 overflow-y-auto" id="tutorial-content">
                <div class="flex justify-between items-center mb-8">
                  <div class="flex items-center gap-3">
                    <div class="bg-emerald-500/20 p-2 rounded-xl"><i data-lucide="info" class="w-6 h-6 text-emerald-400"></i></div>
                    <h2 class="text-2xl font-black uppercase tracking-tight">How to Play</h2>
                  </div>
                  <button class="p-2 hover:bg-slate-800 rounded-full" id="close-tutorial"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="space-y-6">
                  <div class="flex gap-5">
                    <div class="flex-shrink-0 w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center"><i data-lucide="wallet" class="w-6 h-6 text-emerald-400"></i></div>
                    <div><h3 class="font-bold text-lg mb-1">1. Place Your Bet</h3><p class="text-slate-400 text-sm">Choose an amount to bet.</p></div>
                  </div>
                  <div class="flex gap-5">
                    <div class="flex-shrink-0 w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center"><i data-lucide="mouse-pointer-2" class="w-6 h-6 text-blue-400"></i></div>
                    <div><h3 class="font-bold text-lg mb-1">2. Jump to Climb</h3><p class="text-slate-400 text-sm">Click Jump to increase multiplier.</p></div>
                  </div>
                  <div class="flex gap-5">
                    <div class="flex-shrink-0 w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center"><i data-lucide="trending-up" class="w-6 h-6 text-amber-400"></i></div>
                    <div><h3 class="font-bold text-lg mb-1">3. Cash Out or Crash</h3><p class="text-slate-400 text-sm">Cash out anytime. stairs collapse randomly.</p></div>
                  </div>
                </div>
                <button id="tutorial-gotit" class="w-full mt-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xl rounded-2xl shadow-[0_6px_0_#059669] active:translate-y-1 transition-all uppercase">Got it!</button>
              </div>
            </div>
          </div>
        `;
        
        // Attach tutorial event listeners
        document.getElementById('close-tutorial')?.addEventListener('click', () => { 
          AppState.showTutorial = false; 
          updateUI(); 
        });
        
        document.getElementById('tutorial-gotit')?.addEventListener('click', () => { 
          AppState.showTutorial = false; 
          updateUI(); 
        });
        
        document.getElementById('tutorial-bg')?.addEventListener('click', () => { 
          AppState.showTutorial = false; 
          updateUI(); 
        });
      }
      
      lucide.createIcons();
    } else {
      ui.tutorial.style.display = 'none';
      ui.tutorial.innerHTML = '';
    }
  }

  // -------------------- CANVAS SETUP --------------------
  let canvasCtx = null, canvasElement = null, animFrame;
  
  function initCanvas() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    
    canvasElement = canvas;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    canvasCtx = ctx;
    
    if (animFrame) cancelAnimationFrame(animFrame);
    drawLoop();
  }

  function drawLoop() {
    if (!canvasCtx || !canvasElement) return;
    
    const ctx = canvasCtx;
    const canvas = canvasElement;

    const baseWorldWidth = 1000, baseWorldHeight = 600;
    const scaleX = window.innerWidth / baseWorldWidth;
    const scaleY = window.innerHeight / baseWorldHeight;
    const worldScale = Math.max(0.4, Math.min(scaleX, scaleY, 1.5));

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Parallax
    images.parallax.forEach((img, idx) => {
      if (!img || !img.complete) return;
      const parallaxFactor = (idx + 1) * 0.15;
      const scale = window.innerHeight / img.height;
      const scaledWidth = img.width * scale;
      let offsetX = (-camera.x * parallaxFactor) % scaledWidth;
      if (offsetX > 0) offsetX -= scaledWidth;
      for (let x = offsetX; x < window.innerWidth; x += scaledWidth) {
        ctx.drawImage(img, x, 0, scaledWidth, window.innerHeight);
      }
    });

    // Camera follow
    const viewWidth = window.innerWidth / worldScale;
    const viewHeight = window.innerHeight / worldScale;
    const targetCamX = visualPlayer.x - (viewWidth/2) + PLAYER_SIZE/2;
    const platformBaseY = AppState.platforms[0]?.y || 0;
    const targetCamY = platformBaseY - (viewHeight/2) + PLATFORM_HEIGHT/2;
    camera.x += (targetCamX - camera.x) * 0.15;
    camera.y += (targetCamY - camera.y) * 0.1;

    ctx.save();
    ctx.scale(worldScale, worldScale);
    ctx.translate(-camera.x, -camera.y);

    // Platforms
    AppState.platforms.forEach((p, idx) => {
      const isCurrent = idx === AppState.currentStep;
      const isPast = idx < AppState.currentStep;
      const shake = platformShakes[idx] || 0;
      
      ctx.save();
      ctx.translate(shake, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(p.x+10, p.y+10, p.width, p.height);

      if (AppState.gameState === GameState.CRASHED && isCurrent) {
        if (fragments.length && !platformShakes[idx]) {
          fragments.forEach(f => {
            ctx.save(); 
            ctx.translate(f.x+f.width/2, f.y+f.height/2); 
            ctx.rotate(f.rotation);
            ctx.fillStyle = f.color; 
            ctx.shadowBlur=10; 
            ctx.shadowColor=f.color;
            ctx.fillRect(-f.width/2, -f.height/2, f.width, f.height);
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; 
            ctx.fillRect(-f.width/2, -f.height/2, f.width, 2);
            ctx.restore();
          });
        } else {
          ctx.fillStyle = '#ff4444'; 
          ctx.shadowBlur=30; 
          ctx.shadowColor='#f00';
          ctx.fillRect(p.x, p.y, p.width, p.height);
          ctx.save(); 
          ctx.translate(p.x, p.y); 
          ctx.strokeStyle='#fff'; 
          ctx.lineWidth=3; 
          ctx.beginPath();
          crackLines.forEach(line => { ctx.moveTo(line.x1, line.y1); ctx.lineTo(line.x2, line.y2); });
          ctx.stroke(); 
          ctx.restore();
        }
      } else {
        const gradient = ctx.createLinearGradient(p.x, p.y, p.x, p.y+p.height);
        if (isCurrent) gradient.addColorStop(0, '#10b981'), gradient.addColorStop(1,'#059669');
        else if (isPast) gradient.addColorStop(0,'#475569'), gradient.addColorStop(1,'#1e293b');
        else gradient.addColorStop(0,'#64748b'), gradient.addColorStop(1,'#334155');
        ctx.fillStyle = gradient; 
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
        ctx.fillRect(p.x, p.y, p.width, 4);
      }
      
      if (isCurrent && AppState.gameState !== GameState.CRASHED) {
        ctx.strokeStyle = '#6ee7b7'; 
        ctx.lineWidth = 4; 
        ctx.strokeRect(p.x-2, p.y-2, p.width+4, p.height+4);
      }
      
      ctx.fillStyle = isPast ? '#64748b' : '#f8fafc'; 
      ctx.font = 'bold 16px Inter'; 
      ctx.textAlign = 'center';
      ctx.fillText(p.multiplier.toFixed(2)+'x', p.x+p.width/2, p.y+45);
      ctx.restore();
    });

    // Player
    const { x: px, y: py, currentFrame, rotation } = visualPlayer;
    const ps = PLAYER_SIZE;
    
    ctx.save();
    ctx.translate(px+ps/2, py+ps/2);
    ctx.rotate(rotation);
    ctx.translate(-(px+ps/2), -(py+ps/2));

    const usingJump = AppState.player.jumping;
    if (usingJump && images.jump && images.jump.complete) {
      const frameW = images.jump.width / 11;
      ctx.drawImage(images.jump, currentFrame*frameW, 0, frameW, images.jump.height, px, py, ps, ps);
    } else {
      const frameRate = 250;
      const totalFrames = 4;
      const cycle = Math.floor((Date.now() / frameRate) % totalFrames);
      const isHappy = cycle >= 2;
      const sheet = isHappy ? images.happy : images.idle;
      if (sheet && sheet.complete) {
        const fw = sheet.width / 2;
        ctx.drawImage(sheet, (cycle%2)*fw, 0, fw, sheet.height, px, py, ps, ps);
      }
    }
    ctx.restore();
    ctx.restore();

    animFrame = requestAnimationFrame(drawLoop);
  }

  // -------------------- INITIALIZATION --------------------
  updateUiScale();
  buildInitialUI();
  
  window.addEventListener('resize', () => { 
    updateUiScale(); 
    initCanvas(); 
    updateUI(); // Update UI scaling
  });
})();
