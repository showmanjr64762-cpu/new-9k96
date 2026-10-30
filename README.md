# PK96 Gaming Platform & Lobby

A complete, mobile-optimized casino lobby and provably fair crash/arcade gaming suite with real-time balance synchronization, Firebase Firestore persistence, and multi-game iframe support.

## Running the Application & Backend

### 1. Install dependencies
```bash
npm install
```

### 2. Synchronize game files & aliases
```bash
npm run build
```

### 3. Start the Server
```bash
npm start
# or
npm run dev
```

The server runs on `http://0.0.0.0:3000` with full API endpoints (`/api/config`, `/api/health`, `/api/games`, `/api/balance/sync`, `/api/logs`) and full game routing.
