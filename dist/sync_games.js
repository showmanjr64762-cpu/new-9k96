const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Game normalization mappings
const gameCopies = {
  'aviator.html': ['avator.html'],
  'chicken_road.html': ['chicken road russhia.html'],
  'desert_fortune.html': ['desert frortune.html'],
  'rocket_mines.html': ['Rocet mines .html', 'Rocet mines.html'],
  'snakes_and_ladders_2.html': ['snack and landers 2 .html', 'snack and landers 2.html'],
  'tik_tak_win.html': ['tik tak win.html'],
  'desert_axe.html': ['Desert Axe - Premium Crash Betting Game.html'],
  'glass_roulette.html': ['Glass Roulette.html'],
  'neon_spins.html': ['Neon Spins.html'],
  'astro_crash.html': ['ace_vs_joker.html', 'astro-crash.html'],
  'dwarves_mine.html': ['dwarves_mine.html', 'dwarves-mine.html'],
  'final_survival.html': ['final_survival.html', 'final-survival.html'],
  'football_bet.html': ['football_bet.html', 'football-bet.html', 'football_bet_land.html'],
  'halloween_crash.html': ['halloween_crash.html', 'halloween-crash.html'],
  '10000_bc.html': ['10000_bc.html', '10000bc.html', '10000-bc.html', 'ice_spin.html'],
  'mayan_temple_slot.html': ['mayan_temple_slot.html', 'mayan_temple.html', 'mayan-temple-slot.html'],
  'stairway_to_wealth.html': ['stairway_to_wealth.html', 'stairway_wealth.html', 'stairway-to-wealth.html', 'night_jump.html'],
  'penalty_nations_cup.html': ['penalty_nations_cup.html', 'penalty_nations.html', 'penalty-nations-cup.html'],
  'super_soccer_slots.html': ['super_soccer_slots.html', 'super-soccer-slots.html'],
  'prehistory_slots.html': ['prehistory_slots.html', 'prehistory-slots.html', 'pre-history-slots.html'],
  'mummy_slot.html': ['mummy_slot.html', 'mummy-slot.html', 'the_mummy_slot.html']
};

// Ensure normalized files exist in root
for (const [normalized, sources] of Object.entries(gameCopies)) {
  const normPath = path.join(__dirname, normalized);
  if (!fs.existsSync(normPath)) {
    for (const src of sources) {
      const srcPath = path.join(__dirname, src);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, normPath);
        console.log(`[SYNC] Created normalized file: ${normalized} from ${src}`);
        break;
      }
    }
  }
}

// Copy all root html, js, json, css, and images to dist
const files = fs.readdirSync(__dirname);
files.forEach(file => {
  if (file === 'node_modules' || file === 'dist' || file === '.git' || file === '.aistudio') return;
  const srcPath = path.join(__dirname, file);
  try {
    const stat = fs.statSync(srcPath);
    if (stat.isFile() && (
      file.endsWith('.html') ||
      file.endsWith('.js') ||
      file.endsWith('.json') ||
      file.endsWith('.css') ||
      file.endsWith('.png') ||
      file.endsWith('.jpg') ||
      file.endsWith('.avif') ||
      file.endsWith('.svg') ||
      file.endsWith('.webp') ||
      file.endsWith('.mp3') ||
      file.endsWith('.wav') ||
      file.endsWith('.ogg')
    )) {
      fs.copyFileSync(srcPath, path.join(distDir, file));
    } else if (stat.isDirectory() && (file === 'images' || file === 'data' || file === 'sounds')) {
      fs.cpSync(srcPath, path.join(distDir, file), { recursive: true });
    }
  } catch (err) {
    console.warn(`[SYNC] Skipped ${file}:`, err.message);
  }
});

console.log('[BUILD] Games and assets synced to dist/ successfully.');

