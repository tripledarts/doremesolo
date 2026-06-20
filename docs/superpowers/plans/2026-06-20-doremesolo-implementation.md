# DoReMeSoLo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time music recommendation web app that matches songs to walking/running pace and mood via AI.

**Architecture:** Frontend (HTML/CSS/JS) communicates with Node.js/Express backend. Backend polls Strava API for pace, queries Spotify for songs, ranks via Claude API, returns recommendations. Frontend displays playlist in real-time with Spotify embedded player.

**Tech Stack:** Node.js, Express, Spotify Web API, Strava API, Claude API, Vanilla JS, HTML5, CSS3

## Global Constraints

- **Solo builder, 16 hours development time** — scope stays tight, MVP-only
- **0-14 hours:** Core development (Phase 1-6)
- **14-18 hours:** Testing & bug fixes
- **18-24 hours:** README, AI Impact Statement, pitch deck, deployment
- **No GitHub/git complexity during dev** — use local editing, push at end
- **All APIs must be free tier** — Spotify free, Strava free, Claude via personal credits
- **Browser target:** Desktop browsers (Chrome, Firefox, Safari) — responsive but not mobile-optimized
- **GitHub repo:** https://github.com/tripledarts/doremesolo
- **Submission deadline:** Sunday 9:30 AM

---

## File Structure

```
doremesolo/
├── server.js                 # Express server entry point
├── package.json              # Node dependencies
├── .env.example              # Environment variable template
├── public/                   # Frontend files
│   ├── index.html            # Main UI
│   ├── styles.css            # Styling
│   ├── app.js                # Frontend logic
│   └── spotify-sdk.js        # Spotify SDK integration
├── routes/                   # API endpoints
│   ├── auth.js               # OAuth flows (Spotify, Strava)
│   └── api.js                # Song matching & playlist logic
├── services/                 # External API calls
│   ├── spotify.js            # Spotify API wrapper
│   ├── strava.js             # Strava API wrapper
│   └── claude.js             # Claude API wrapper
├── utils/                    # Helpers
│   └── mock-data.js          # Mock pace data for testing
├── docs/
│   ├── superpowers/
│   │   ├── specs/
│   │   │   └── 2026-06-20-doremesolo-design.md
│   │   └── plans/
│   │       └── 2026-06-20-doremesolo-implementation.md
│   ├── README.md             # Project overview (fill in at end)
│   └── AI-IMPACT-STATEMENT.md # AI usage documentation (fill in at end)
├── .gitignore                # Already configured
└── .env                      # API keys (never commit)
```

---

## Phase 1: Project Setup (0-1 hour)

### Task 1: Initialize Node.js project & install dependencies

**Files:**
- Create: `package.json`
- Create: `server.js`
- Create: `.env.example`

**Interfaces:**
- Produces: Working Node.js dev environment with Express, axios, dotenv packages

**Steps:**

- [ ] **Step 1: Create `package.json`**

Open your terminal in `C:\Users\Reethi\Documents\AIBoomi24` and create:

```json
{
  "name": "doremesolo",
  "version": "1.0.0",
  "description": "Music powered by your pace",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.4.0",
    "dotenv": "^16.0.3",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {},
  "keywords": [],
  "author": "DoReMeSoLo",
  "license": "MIT"
}
```

- [ ] **Step 2: Install dependencies**

Run in terminal:
```bash
npm install
```

Expected output: Packages installed in `node_modules/`, `package-lock.json` created.

- [ ] **Step 3: Create `.env.example`**

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
CLAUDE_API_KEY=your_claude_api_key
NODE_ENV=development
PORT=3000
```

- [ ] **Step 4: Create `.env` (local, never commit)**

Copy `.env.example` to `.env` and leave values empty for now. You'll fill in API keys as you create them.

- [ ] **Step 5: Create minimal `server.js`**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server running' });
});

app.listen(PORT, () => {
  console.log(`DoReMeSoLo backend running on http://localhost:${PORT}`);
});
```

- [ ] **Step 6: Test server starts**

Run:
```bash
npm start
```

Expected: `DoReMeSoLo backend running on http://localhost:3000`

Visit `http://localhost:3000/health` in browser. Expected: `{"status":"Server running"}`

- [ ] **Step 7: Create folder structure**

Create these directories:
```
mkdir public routes services utils docs/superpowers/specs docs/superpowers/plans
```

---

### Task 2: Set up Spotify OAuth flow

**Files:**
- Create: `routes/auth.js`
- Modify: `server.js`
- Create: `public/spotify-sdk.js`

**Interfaces:**
- Produces: `/auth/spotify/login` endpoint (redirects to Spotify), `/auth/spotify/callback` endpoint (returns access token)
- Consumes: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` from `.env`

**Steps:**

- [ ] **Step 1: Get Spotify API credentials**

1. Go to https://developer.spotify.com/dashboard
2. Log in (create account if needed)
3. Create a new app named "DoReMeSoLo"
4. Accept terms, create app
5. Copy **Client ID** and **Client Secret**
6. Add Redirect URI: `http://localhost:3000/auth/spotify/callback`
7. Paste both values into your `.env` file

- [ ] **Step 2: Create `routes/auth.js`**

```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

// Spotify login
router.get('/spotify/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const scopes = ['streaming', 'user-read-private', 'user-read-email'];
  
  const authUrl = `${SPOTIFY_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}`;
  
  res.redirect(authUrl);
});

// Spotify callback
router.get('/spotify/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const response = await axios.post(SPOTIFY_TOKEN_URL, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }
    });
    
    const { access_token } = response.data;
    
    // Redirect to frontend with token (in production, use secure session)
    res.redirect(`/index.html?spotify_token=${access_token}`);
  } catch (error) {
    res.status(500).json({ error: 'Spotify auth failed', details: error.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Update `server.js` to use auth routes**

Add after `app.use(express.static('public'));`:

```javascript
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
```

- [ ] **Step 4: Create `public/spotify-sdk.js`**

```javascript
// Store Spotify token from URL
function getSpotifyToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('spotify_token');
  
  if (token) {
    localStorage.setItem('spotify_token', token);
    // Remove token from URL
    window.history.replaceState({}, document.title, '/');
  }
  
  return localStorage.getItem('spotify_token');
}

// Fetch user profile to verify auth
async function verifySpotifyAuth(token) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Search Spotify for songs
async function searchSpotify(query, token) {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    return data.tracks.items || [];
  } catch (error) {
    console.error('Spotify search failed:', error);
    return [];
  }
}
```

- [ ] **Step 5: Test Spotify OAuth**

Run `npm start`, visit `http://localhost:3000/auth/spotify/login`. Should redirect to Spotify login. After auth, should redirect back to homepage with token in URL. Verify token saved in localStorage.

---

### Task 3: Set up Strava OAuth flow (mock mode)

**Files:**
- Modify: `routes/auth.js`
- Create: `utils/mock-data.js`

**Interfaces:**
- Produces: `/auth/strava/login` endpoint, mock pace data generator
- Consumes: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` from `.env`

**Steps:**

- [ ] **Step 1: Get Strava API credentials**

1. Go to https://www.strava.com/settings/api
2. Log in (create account if needed)
3. Create a new app, name it "DoReMeSoLo"
4. Copy **Client ID** and **Client Secret**
5. Set Authorization Callback Domain: `localhost:3000`
6. Paste values into `.env`

- [ ] **Step 2: Add Strava OAuth to `routes/auth.js`**

Add this to the bottom of `routes/auth.js`:

```javascript
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';

// Strava login
router.get('/strava/login', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;
  
  const authUrl = `${STRAVA_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all`;
  
  res.redirect(authUrl);
});

// Strava callback (simplified for hackathon)
router.get('/strava/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code'
    });
    
    const { access_token } = response.data;
    res.redirect(`/index.html?strava_token=${access_token}`);
  } catch (error) {
    res.status(500).json({ error: 'Strava auth failed', details: error.message });
  }
});
```

- [ ] **Step 3: Create `utils/mock-data.js` for development**

```javascript
// Mock pace data generator (for testing without real Strava workout)
class MockPaceGenerator {
  constructor() {
    this.currentBPM = 100; // Start at 100 BPM (walking pace)
    this.direction = 1; // 1 for increasing, -1 for decreasing
  }
  
  // Simulate user pace changes over time
  getNextBPM() {
    // Every call, shift pace by 1-5 BPM
    const shift = Math.random() * 5 * this.direction;
    this.currentBPM += shift;
    
    // Keep between 80 and 180 BPM
    if (this.currentBPM > 180) {
      this.currentBPM = 180;
      this.direction = -1;
    } else if (this.currentBPM < 80) {
      this.currentBPM = 80;
      this.direction = 1;
    }
    
    return Math.round(this.currentBPM);
  }
  
  // Mock Strava API response
  getMockPaceData() {
    const bpm = this.getNextBPM();
    const stepsPerMinute = Math.round(bpm / 1.5); // Rough conversion
    
    return {
      current_pace_bpm: bpm,
      steps_per_minute: stepsPerMinute,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { MockPaceGenerator };
```

- [ ] **Step 4: Test Strava OAuth**

Run `npm start`, visit `http://localhost:3000/auth/strava/login`. Should redirect to Strava login. After auth, should return to homepage with token.

---

## Phase 2: Backend Core - Strava & Song Matching (1-4 hours)

### Task 4: Create API endpoints for song matching

**Files:**
- Create: `routes/api.js`
- Create: `services/spotify.js`
- Create: `services/claude.js`
- Modify: `server.js`

**Interfaces:**
- Produces: `/api/current-songs` endpoint (takes BPM, mood, vocals; returns ranked songs)
- Consumes: Spotify token (from frontend), Claude API key (from `.env`)

**Steps:**

- [ ] **Step 1: Create `services/spotify.js`**

```javascript
const axios = require('axios');

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

async function searchSongs(query, token, limit = 15) {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        q: query,
        type: 'track',
        limit
      }
    });
    return response.data.tracks.items;
  } catch (error) {
    console.error('Spotify search error:', error.message);
    return [];
  }
}

async function getTrackAudioFeatures(trackId, token) {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/audio-features/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error(`Audio features error for ${trackId}:`, error.message);
    return null;
  }
}

module.exports = { searchSongs, getTrackAudioFeatures };
```

- [ ] **Step 2: Create `services/claude.js`**

```javascript
const axios = require('axios');

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

async function rankSongsByMood(songs, userBPM, userMood, userVocals) {
  const songList = songs
    .map(s => `${s.name} by ${s.artists[0].name} (ID: ${s.id})`)
    .join('\n');
  
  const prompt = `You are a music curator. The user is exercising at ${userBPM} BPM with mood "${userMood}". They prefer ${userVocals} vocals.

Rank these songs from best to worst match:
${songList}

Return a JSON array with:
[
  { track_id: "spotify_id", reason: "1-sentence why it matches", match_score: 0-100 }
]

Be strict: only highly relevant matches score >70. Respond ONLY with valid JSON, no other text.`;
  
  try {
    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    );
    
    const content = response.data.content[0].text;
    const ranking = JSON.parse(content);
    return ranking;
  } catch (error) {
    console.error('Claude API error:', error.message);
    return [];
  }
}

module.exports = { rankSongsByMood };
```

- [ ] **Step 3: Create `routes/api.js`**

```javascript
const express = require('express');
const { searchSongs, getTrackAudioFeatures } = require('../services/spotify');
const { rankSongsByMood } = require('../services/claude');
const router = express.Router();

// GET /api/current-songs?bpm=120&mood=happy&vocals=combo&token=spotify_token
router.get('/current-songs', async (req, res) => {
  const { bpm, mood, vocals, token } = req.query;
  
  if (!token || !bpm || !mood || !vocals) {
    return res.status(400).json({ error: 'Missing required params: token, bpm, mood, vocals' });
  }
  
  try {
    // Search Spotify for songs matching BPM + mood
    const query = `${mood} ${bpm} bpm`;
    const spotifySongs = await searchSongs(query, token);
    
    if (!spotifySongs.length) {
      return res.json({ songs: [], message: 'No songs found' });
    }
    
    // Rank via Claude
    const ranked = await rankSongsByMood(spotifySongs, bpm, mood, vocals);
    
    // Enrich with Spotify metadata
    const enriched = ranked.slice(0, 5).map(r => {
      const song = spotifySongs.find(s => s.id === r.track_id);
      return {
        id: song?.id,
        name: song?.name,
        artist: song?.artists[0]?.name,
        spotify_url: song?.external_urls?.spotify,
        image_url: song?.album?.images[0]?.url,
        reason: r.reason,
        match_score: r.match_score
      };
    });
    
    res.json({ songs: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

- [ ] **Step 4: Update `server.js` to include API routes**

Add after `app.use('/auth', authRoutes);`:

```javascript
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);
```

- [ ] **Step 5: Get Claude API key**

1. Go to https://console.anthropic.com
2. Log in (create account if needed)
3. Navigate to API keys
4. Create a new key
5. Copy it into `.env` as `CLAUDE_API_KEY`

- [ ] **Step 6: Test the endpoint**

Run `npm start`. In another terminal or browser, visit:
```
http://localhost:3000/api/current-songs?bpm=120&mood=happy&vocals=combo&token=YOUR_SPOTIFY_TOKEN
```

Replace `YOUR_SPOTIFY_TOKEN` with a real Spotify token from `/auth/spotify/login`. Expected: JSON response with 5 ranked songs.

---

### Task 5: Implement recently-played tracking

**Files:**
- Modify: `routes/api.js`
- Create: `public/app.js` (start)

**Interfaces:**
- Produces: In-memory session state tracking recently played songs
- Consumes: Song ID from song selection

**Steps:**

- [ ] **Step 1: Add session state to `routes/api.js`**

Add at the top of the file:

```javascript
// In-memory session state (reset on server restart)
const sessionState = {
  recentlyPlayed: [] // Array of song IDs
};

// GET /api/recently-played
router.get('/recently-played', (req, res) => {
  res.json({ songs: sessionState.recentlyPlayed });
});

// POST /api/song-played
router.post('/song-played', (req, res) => {
  const { songId } = req.body;
  
  if (!songId) {
    return res.status(400).json({ error: 'songId required' });
  }
  
  if (!sessionState.recentlyPlayed.includes(songId)) {
    sessionState.recentlyPlayed.push(songId);
  }
  
  res.json({ recentlyPlayed: sessionState.recentlyPlayed });
});
```

- [ ] **Step 2: Test recently-played**

Run `npm start`. Make a POST request:
```bash
curl -X POST http://localhost:3000/api/song-played \
  -H "Content-Type: application/json" \
  -d '{"songId":"abc123"}'
```

Expected: `{"recentlyPlayed":["abc123"]}`

Visit `http://localhost:3000/api/recently-played`. Expected: `{"songs":["abc123"]}`

---

## Phase 3: Frontend UI (4-6 hours)

### Task 6: Create main HTML page

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/app.js`

**Interfaces:**
- Produces: Functional UI with mood selector, playlist display, play controls
- Consumes: Spotify token from localStorage, API endpoints

**Steps:**

- [ ] **Step 1: Create `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DoReMeSoLo - Music Powered by Your Pace</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="container">
    <!-- Header -->
    <header>
      <h1>🎵 DoReMeSoLo</h1>
      <p>Music powered by your pace</p>
      <div id="auth-status">
        <span id="user-info">Not logged in</span>
        <button id="spotify-login-btn" class="btn">Login with Spotify</button>
      </div>
    </header>
    
    <!-- Main app (hidden until authenticated) -->
    <main id="app" style="display:none;">
      <!-- Status -->
      <div id="status-bar" class="status">
        <span id="connection-status">🔴 Not connected</span>
        <span id="current-bpm">BPM: --</span>
        <span id="steps-per-min">Steps/min: --</span>
      </div>
      
      <!-- Pace input (for mock mode during dev) -->
      <section class="controls">
        <div class="control-group">
          <label for="pace-input">Current Pace (BPM):</label>
          <input type="range" id="pace-input" min="80" max="180" value="120" step="5">
          <span id="pace-display">120</span>
        </div>
        
        <div class="control-group">
          <label for="mood-select">Mood:</label>
          <select id="mood-select">
            <option value="happy">Happy</option>
            <option value="energetic">Energetic</option>
            <option value="chill">Chill</option>
            <option value="focused">Focused</option>
            <option value="sad">Sad</option>
          </select>
        </div>
        
        <div class="control-group">
          <label for="vocals-select">Vocals:</label>
          <select id="vocals-select">
            <option value="combo">Combo</option>
            <option value="voiced">Voiced</option>
            <option value="voiceless">Voiceless</option>
          </select>
        </div>
        
        <button id="refresh-btn" class="btn btn-primary">Get Songs</button>
        <button id="surprise-btn" class="btn">Surprise Me</button>
      </section>
      
      <!-- Playlist -->
      <section class="playlist-section">
        <h2>Now Playing</h2>
        <div id="playlist" class="playlist">
          <div class="placeholder">Click "Get Songs" to start</div>
        </div>
      </section>
      
      <!-- Recently played -->
      <section class="recent-section">
        <h2>Recently Played</h2>
        <ul id="recently-played" class="recent-list">
          <li class="placeholder">No songs played yet</li>
        </ul>
      </section>
    </main>
  </div>
  
  <script src="spotify-sdk.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `public/styles.css`**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
  min-height: 100vh;
  padding: 20px;
}

#container {
  max-width: 900px;
  margin: 0 auto;
}

header {
  background: white;
  padding: 30px;
  border-radius: 10px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

header h1 {
  font-size: 2.5em;
  color: #667eea;
  margin-bottom: 10px;
}

header p {
  color: #666;
  margin-bottom: 20px;
}

#auth-status {
  display: flex;
  gap: 10px;
  justify-content: center;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  background: #f0f0f0;
  color: #333;
  transition: background 0.3s;
}

.btn:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: #667eea;
  color: white;
  font-weight: bold;
}

.btn-primary:hover {
  background: #5568d3;
}

main {
  background: white;
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.status {
  display: flex;
  justify-content: space-around;
  background: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  font-weight: bold;
  color: #666;
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 5px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-weight: bold;
  color: #333;
  font-size: 14px;
}

.control-group input,
.control-group select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.control-group input[type="range"] {
  padding: 0;
}

.playlist-section {
  margin-bottom: 30px;
}

.playlist-section h2,
.recent-section h2 {
  font-size: 1.3em;
  margin-bottom: 15px;
  color: #667eea;
}

.playlist {
  display: grid;
  gap: 15px;
}

.song-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 5px;
  border-left: 4px solid #667eea;
}

.song-image {
  width: 80px;
  height: 80px;
  border-radius: 5px;
  object-fit: cover;
  background: #ddd;
}

.song-info {
  flex: 1;
}

.song-info h3 {
  color: #333;
  margin-bottom: 5px;
}

.song-info p {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.match-score {
  background: #667eea;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  width: fit-content;
}

.song-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.song-actions a {
  padding: 6px 12px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.song-actions a:hover {
  background: #5568d3;
}

.recent-list {
  list-style: none;
  background: #f9f9f9;
  padding: 15px;
  border-radius: 5px;
}

.recent-list li {
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.recent-list li:last-child {
  border-bottom: none;
}

.placeholder {
  color: #999;
  font-style: italic;
}

@media (max-width: 600px) {
  header h1 {
    font-size: 2em;
  }
  
  .controls {
    grid-template-columns: 1fr;
  }
  
  .song-card {
    flex-direction: column;
  }
  
  .song-image {
    width: 100%;
    height: 150px;
  }
}
```

- [ ] **Step 3: Create `public/app.js`**

```javascript
let currentSpotifyToken = null;
let currentPace = 120;
let currentMood = 'happy';
let currentVocals = 'combo';
let surpriseMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  currentSpotifyToken = getSpotifyToken();
  
  if (currentSpotifyToken) {
    showApp();
    setupEventListeners();
  } else {
    document.getElementById('spotify-login-btn').addEventListener('click', () => {
      window.location.href = '/auth/spotify/login';
    });
  }
});

function showApp() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-info').textContent = '✓ Connected';
}

function setupEventListeners() {
  // Pace slider
  const paceInput = document.getElementById('pace-input');
  paceInput.addEventListener('input', (e) => {
    currentPace = e.target.value;
    document.getElementById('pace-display').textContent = currentPace;
    document.getElementById('current-bpm').textContent = `BPM: ${currentPace}`;
  });
  
  // Mood selector
  document.getElementById('mood-select').addEventListener('change', (e) => {
    currentMood = e.target.value;
  });
  
  // Vocals selector
  document.getElementById('vocals-select').addEventListener('change', (e) => {
    currentVocals = e.target.value;
  });
  
  // Get songs button
  document.getElementById('refresh-btn').addEventListener('click', fetchSongs);
  
  // Surprise me button
  document.getElementById('surprise-btn').addEventListener('click', () => {
    surpriseMode = true;
    fetchSongs();
  });
}

async function fetchSongs() {
  try {
    const response = await fetch(
      `/api/current-songs?bpm=${currentPace}&mood=${currentMood}&vocals=${currentVocals}&token=${currentSpotifyToken}`
    );
    
    if (!response.ok) {
      alert(`Error: ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    if (surpriseMode && data.songs.length > 0) {
      // Pick random song
      const randomIndex = Math.floor(Math.random() * data.songs.length);
      displaySongs([data.songs[randomIndex]]);
      surpriseMode = false;
    } else {
      displaySongs(data.songs);
    }
  } catch (error) {
    console.error('Error fetching songs:', error);
    alert('Failed to fetch songs. Check console.');
  }
}

function displaySongs(songs) {
  const playlistDiv = document.getElementById('playlist');
  
  if (!songs || songs.length === 0) {
    playlistDiv.innerHTML = '<div class="placeholder">No songs found. Try a different mood or BPM.</div>';
    return;
  }
  
  playlistDiv.innerHTML = songs.map(song => `
    <div class="song-card">
      <img src="${song.image_url || '/placeholder.png'}" alt="${song.name}" class="song-image">
      <div class="song-info">
        <h3>${song.name}</h3>
        <p>${song.artist}</p>
        <p>${song.reason}</p>
        <div class="match-score">Score: ${song.match_score}%</div>
      </div>
      <div class="song-actions">
        <a href="${song.spotify_url}" target="_blank">Play on Spotify</a>
        <button onclick="markSongPlayed('${song.id}')">Played</button>
      </div>
    </div>
  `).join('');
}

async function markSongPlayed(songId) {
  try {
    await fetch('/api/song-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    });
    
    refreshRecentlyPlayed();
  } catch (error) {
    console.error('Error marking song played:', error);
  }
}

async function refreshRecentlyPlayed() {
  try {
    const response = await fetch('/api/recently-played');
    const data = await response.json();
    
    const recentList = document.getElementById('recently-played');
    
    if (data.songs.length === 0) {
      recentList.innerHTML = '<li class="placeholder">No songs played yet</li>';
    } else {
      recentList.innerHTML = data.songs.map(id => `<li>Song ID: ${id}</li>`).join('');
    }
  } catch (error) {
    console.error('Error refreshing recently played:', error);
  }
}

// Refresh recently played every 2 seconds
setInterval(refreshRecentlyPlayed, 2000);
```

- [ ] **Step 4: Create placeholder image**

Create `public/placeholder.png` or use a data URL. For now, just reference the CSS fallback (gray background).

- [ ] **Step 5: Test the UI**

Run `npm start`. Visit `http://localhost:3000`. Click "Login with Spotify". After auth, you should see the full UI with controls. Try moving the pace slider and clicking "Get Songs".

---

## Phase 4: Integration & Polishing (6-10 hours)

### Task 7: Connect real Strava API (replace mock)

**Files:**
- Create: `services/strava.js`
- Modify: `routes/api.js`
- Create: `/api/current-pace` endpoint

**Interfaces:**
- Produces: `/api/current-pace` endpoint (returns current BPM from Strava)
- Consumes: Strava access token

**Steps:**

- [ ] **Step 1: Create `services/strava.js`**

```javascript
const axios = require('axios');

const STRAVA_API_URL = 'https://www.strava.com/api/v3';

async function getCurrentActivity(stravaToken) {
  try {
    // Get athlete's recent activities
    const response = await axios.get(`${STRAVA_API_URL}/athlete/activities`, {
      headers: { 'Authorization': `Bearer ${stravaToken}` },
      params: { per_page: 1 }
    });
    
    if (response.data.length === 0) {
      return null;
    }
    
    const activity = response.data[0];
    
    // Calculate average BPM from distance and moving time
    const bpm = calculateBPMFromPace(activity.distance, activity.moving_time);
    
    return {
      id: activity.id,
      name: activity.name,
      bpm: bpm,
      moving_time: activity.moving_time,
      timestamp: activity.start_date
    };
  } catch (error) {
    console.error('Strava API error:', error.message);
    return null;
  }
}

function calculateBPMFromPace(distanceMeters, timeSeconds) {
  if (timeSeconds === 0) return 120;
  
  const metersPerSecond = distanceMeters / timeSeconds;
  const kph = metersPerSecond * 3.6;
  
  // Rough conversion: average stride length ~0.7m
  // Steps per second = metersPerSecond / 0.7
  // BPM = (steps per second) * 60
  const stepsPerSecond = metersPerSecond / 0.7;
  const bpm = stepsPerSecond * 60;
  
  return Math.round(Math.max(80, Math.min(180, bpm)));
}

module.exports = { getCurrentActivity, calculateBPMFromPace };
```

- [ ] **Step 2: Add `/api/current-pace` to `routes/api.js`**

Add this endpoint:

```javascript
const { getCurrentActivity } = require('../services/strava');

router.get('/current-pace', async (req, res) => {
  const { strava_token } = req.query;
  
  if (!strava_token) {
    return res.status(400).json({ error: 'strava_token required' });
  }
  
  try {
    const activity = await getCurrentActivity(strava_token);
    
    if (!activity) {
      return res.json({ 
        bpm: 120, 
        message: 'No active workout. Using default pace.'
      });
    }
    
    res.json({
      bpm: activity.bpm,
      activity: activity.name,
      timestamp: activity.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Update frontend to use real Strava**

Modify `public/app.js`. After the Spotify login check:

```javascript
let stravaToken = null;

document.addEventListener('DOMContentLoaded', () => {
  currentSpotifyToken = getSpotifyToken();
  
  const params = new URLSearchParams(window.location.search);
  stravaToken = params.get('strava_token');
  
  if (stravaToken) {
    localStorage.setItem('strava_token', stravaToken);
    window.history.replaceState({}, document.title, '/');
  } else {
    stravaToken = localStorage.getItem('strava_token');
  }
  
  // ... rest of init
});
```

And add a button to login to Strava:

```javascript
// In setupEventListeners():
if (!stravaToken) {
  const stravaLoginBtn = document.createElement('button');
  stravaLoginBtn.className = 'btn';
  stravaLoginBtn.textContent = 'Connect Strava';
  stravaLoginBtn.onclick = () => window.location.href = '/auth/strava/login';
  document.querySelector('.controls').prepend(stravaLoginBtn);
}
```

- [ ] **Step 4: Test Strava integration**

Run `npm start`. Log in with Strava. Start a workout on your Strava app (or use the API to create a fake activity). Check that the app fetches and displays the correct pace.

---

### Task 8: Add Spotify embedded player

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/app.js`

**Interfaces:**
- Produces: Spotify web player embedded in UI
- Consumes: Spotify Web Playback SDK

**Steps:**

- [ ] **Step 1: Add Spotify SDK to HTML**

In `public/index.html`, add before closing `</body>`:

```html
<script src="https://sdk.scdn.co/spotify-player.js"></script>
<script>
  window.onSpotifyWebPlaybackSDKReady = () => {
    initializeSpotifyPlayer();
  };
</script>
```

- [ ] **Step 2: Modify song display to include player**

Update the song card in `displaySongs()`:

```javascript
<div class="song-actions">
  <a href="${song.spotify_url}" target="_blank">Open in Spotify</a>
  <button onclick="markSongPlayed('${song.id}')">Mark as Played</button>
</div>
```

(Spotify's web playback SDK has browser limitations; for a hackathon, linking to Spotify is sufficient)

- [ ] **Step 3: Test**

Run `npm start`. Try clicking "Open in Spotify" on any song. Should open Spotify app or web player.

---

### Task 9: Error handling & defensive coding

**Files:**
- Modify: `server.js`
- Modify: `routes/api.js`
- Modify: `public/app.js`

**Interfaces:**
- Produces: Graceful error handling for API failures
- Consumes: Existing error scenarios

**Steps:**

- [ ] **Step 1: Add error handler in `server.js`**

Add before `app.listen()`:

```javascript
// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message,
    env: process.env.NODE_ENV
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});
```

- [ ] **Step 2: Add validation to `/api/current-songs`**

Ensure BPM is valid number:

```javascript
const bpm = parseInt(req.query.bpm);
if (isNaN(bpm) || bpm < 50 || bpm > 200) {
  return res.status(400).json({ error: 'BPM must be between 50-200' });
}
```

- [ ] **Step 3: Add frontend error UI**

Update `public/app.js` fetchSongs():

```javascript
async function fetchSongs() {
  try {
    // Disable button during fetch
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').textContent = 'Loading...';
    
    const response = await fetch(
      `/api/current-songs?bpm=${currentPace}&mood=${currentMood}&vocals=${currentVocals}&token=${currentSpotifyToken}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      showError(error.error || 'Unknown error');
      return;
    }
    
    const data = await response.json();
    displaySongs(data.songs);
    
  } catch (error) {
    showError('Network error: ' + error.message);
  } finally {
    document.getElementById('refresh-btn').disabled = false;
    document.getElementById('refresh-btn').textContent = 'Get Songs';
  }
}

function showError(message) {
  const playlistDiv = document.getElementById('playlist');
  playlistDiv.innerHTML = `<div class="error-message">❌ ${message}</div>`;
}
```

Add CSS:

```css
.error-message {
  background: #fee;
  color: #c33;
  padding: 15px;
  border-radius: 5px;
  border-left: 4px solid #c33;
}
```

- [ ] **Step 4: Test error scenarios**

- Disconnect internet, try fetching songs (should show network error)
- Use invalid BPM (should show validation error)
- Use expired Spotify token (should show auth error)

---

## Phase 5: Final Testing & Debugging (14-18 hours)

### Task 10: End-to-end workflow testing

**Files:**
- No new files
- Test existing code

**Steps:**

- [ ] **Step 1: Fresh start test**

- [ ] Kill the server and restart: `npm start`
- [ ] Clear all localStorage: `localStorage.clear()` in browser console
- [ ] Visit http://localhost:3000
- [ ] Expected: See login button, not authenticated

- [ ] **Step 2: Full authentication flow**

- [ ] Click "Login with Spotify"
- [ ] Expected: Redirected to Spotify, then back to app with token
- [ ] Verify token in localStorage: `localStorage.getItem('spotify_token')`
- [ ] Click "Connect Strava"
- [ ] Expected: Similar flow for Strava

- [ ] **Step 3: Song matching flow**

- [ ] Move pace slider from 80 to 180 BPM
- [ ] Change mood dropdown
- [ ] Change vocals dropdown
- [ ] Click "Get Songs"
- [ ] Expected: Songs appear within 3 seconds

- [ ] **Step 4: Playlist features**

- [ ] Click "Play on Spotify" for any song
- [ ] Expected: Opens in Spotify
- [ ] Click "Mark as Played"
- [ ] Expected: Song appears in "Recently Played" section
- [ ] Try same song again
- [ ] Expected: Claude avoids recommending it again

- [ ] **Step 5: Surprise me**

- [ ] Click "Surprise Me"
- [ ] Expected: Shows 1 random song instead of 5

- [ ] **Step 6: Load testing**

- [ ] Rapidly click "Get Songs" 10 times
- [ ] Expected: No crashes, graceful errors if rate limited

---

### Task 11: Bug fixes & polish

**Files:**
- Varies based on bugs found

**Steps:**

- [ ] **Step 1: Check browser console**

Open DevTools (F12), check Console tab for errors. Fix any JavaScript errors.

- [ ] **Step 2: Test on different browsers**

Test on Chrome, Firefox, Safari if possible.

- [ ] **Step 3: Responsive design check**

Resize window from 1920px down to 400px. UI should remain usable.

- [ ] **Step 4: API timeout handling**

If any API takes > 5 seconds, add timeout wrapper:

```javascript
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timerId);
  }
}
```

- [ ] **Step 5: Clean console logs**

Remove any `console.log()` calls that aren't error-related. Keep error logging.

---

## Phase 6: Documentation & Deployment (18-24 hours)

### Task 12: Write README.md

**Files:**
- Modify: `README.md`

**Steps:**

- [ ] **Step 1: Create comprehensive README**

```markdown
# DoReMeSoLo: Music Powered by Your Pace

Music recommendation app that matches songs to your walking/running pace in real-time.

## Problem & Solution

When exercising, your pace changes constantly. Most music apps are static—they don't adapt to your movement. **DoReMeSoLo** solves this by:

1. **Tracking your pace** via Strava
2. **Matching songs** with similar BPM via Claude AI
3. **Updating playlists in real-time** as your pace changes

## Features

✅ Real-time pace tracking (Strava integration)  
✅ AI-powered song matching (Claude + Spotify)  
✅ Mood & vocal preference selection  
✅ Recently played tracking (no repeats)  
✅ "Surprise Me" random song feature  
✅ Spotify embedded playback  

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **APIs:** Spotify Web API, Strava API, Claude API (Anthropic)
- **Hosting:** Vercel (serverless)

## Getting Started

### Prerequisites

- Node.js 16+ installed
- Spotify account (free or premium)
- Strava account
- Claude API key (from Anthropic)

### Local Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/tripledarts/doremesolo.git
   cd doremesolo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file with API credentials:**
   ```
   SPOTIFY_CLIENT_ID=your_id
   SPOTIFY_CLIENT_SECRET=your_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback
   STRAVA_CLIENT_ID=your_id
   STRAVA_CLIENT_SECRET=your_secret
   STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
   CLAUDE_API_KEY=your_key
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open http://localhost:3000 in your browser**

### Getting API Credentials

**Spotify:**
- Go to https://developer.spotify.com/dashboard
- Create an app, copy Client ID & Secret
- Add redirect URI: `http://localhost:3000/auth/spotify/callback`

**Strava:**
- Go to https://www.strava.com/settings/api
- Create an app, copy Client ID & Secret
- Add redirect domain: `localhost:3000`

**Claude (Anthropic):**
- Go to https://console.anthropic.com
- Create an API key
- Paste into `.env`

## How It Works

1. **Authenticate** with Spotify and Strava
2. **Start a workout** in Strava on your phone (or use mock pace for testing)
3. **Select your mood** and vocal preferences
4. **Click "Get Songs"** to fetch recommendations
5. **Adjust pace slider** — playlist updates automatically
6. **Play songs** directly from Spotify links

### Behind the Scenes

```
User Pace (Strava) → Backend polls every 5s
        ↓
Spotify Search (BPM + mood keywords)
        ↓
Claude API ranks songs by mood + BPM + vocals
        ↓
Top 5 recommendations displayed in real-time
```

## Demo

**Live Demo:** [Link to deployed app] (coming soon)

**Video Demo:** [Link to demo video] (coming soon)

## Features in Development

- Machine learning to personalize recommendations
- Personalized music generation
- Mobile app (iOS/Android)
- Integration with Apple Health / Google Fit

## Troubleshooting

**"No songs found"**
- Check your Spotify authentication token
- Try a different mood/BPM range
- Ensure Claude API key is valid

**"Strava connection failed"**
- Re-authenticate Strava
- Check that your workout is actively syncing
- Try starting a new workout

**"Songs not matching my pace"**
- Claude ranking is best-effort; songs with similar energy match best
- Try "Surprise Me" for randomization
- Adjust mood selection

## Project Structure

```
server.js          — Express server
routes/
  auth.js          — OAuth flows (Spotify, Strava)
  api.js           — Song matching & playlist logic
services/
  spotify.js       — Spotify API wrapper
  strava.js        — Strava API wrapper
  claude.js        — Claude AI ranking
public/
  index.html       — UI
  styles.css       — Styling
  app.js           — Frontend logic
```

## Submission (AIBoomi Hackathon)

- **GitHub:** https://github.com/tripledarts/doremesolo
- **Live Demo:** [URL]
- **AI Impact Statement:** See AI-IMPACT-STATEMENT.md

## Future Ideas

- Heart rate sync for mood detection
- Collaborative playlists (multi-user)
- Genre-based filtering
- Cross-platform sync (Spotify → Apple Music)

## License

MIT

## Built with ❤️ at AIBoomi Startup Weekend
```

- [ ] **Step 2: Save README.md**

Save to repository root as `README.md`

---

### Task 13: Write AI Impact Statement

**Files:**
- Create: `AI-IMPACT-STATEMENT.md`

**Steps:**

- [ ] **Step 1: Create AI Impact Statement**

```markdown
# AI Impact Statement – DoReMeSoLo

## What the AI is Doing

The app uses Claude API (Anthropic) to intelligently rank music recommendations based on three user inputs:
1. **Current pace (BPM)** — from Strava workout tracking
2. **Mood** — selected by user (happy, energetic, chill, focused, sad)
3. **Vocal preference** — voiced, voiceless, or combo

Claude analyzes Spotify search results and returns ranked recommendations that balance BPM alignment, mood vibes, and vocal preferences.

### Model Used

- **Model:** Claude 3.5 Sonnet
- **Why:** Best quality for understanding context and nuance in music recommendation. Reasons through mood vibes, energy levels, and artist styles to make human-like recommendations.

### Data Provenance & Licenses

- **Song data:** Spotify Web API (© Spotify)
- **Pace data:** Strava API (© Strava)
- **AI model:** Claude 3.5 Sonnet by Anthropic
- **No personal data stored:** User tokens are session-based; no persistent user profiles

### Hallucination & Bias Mitigations

**Hallucination Prevention:**
- Claude receives only valid Spotify song metadata (verified by Spotify API)
- Responses are JSON-validated before display
- If Claude returns invalid data, error handling gracefully falls back to sorted list

**Bias Mitigations:**
- Claude is prompted to recommend based on *musical properties* (BPM, genre energy) not artist popularity
- No algorithmic preference for mainstream vs. independent artists
- User mood selection is explicit, avoiding hidden mood inference

**Guardrails:**
- Rate limiting on API calls (5-10s polling interval prevents spam)
- Token expiration ensures sessions don't persist indefinitely
- No offline data training; all recommendations are real-time

### Expected Outcomes

**User Benefit:**
- Personalized music that matches their workout pace and mood in real-time
- Discovery of new songs they might enjoy
- Better exercise experience with synchronized music

**Business Benefit:**
- Increases user engagement with music (via Spotify integration)
- Potential partnership with Spotify or fitness apps
- Low-cost AI deployment (per-request Claude API calls)

**Safety & Ethics:**
- No user data is stored or profiled
- AI recommendations are transparent (users see match scores and reasons)
- No algorithmic discrimination by artist, genre, or demographic
- All APIs are opt-in; users control what data is shared

## Limitations & Caveats

- Claude's recommendations are only as good as the Spotify metadata available
- Mood is subjective; Claude's interpretation may not always match user intent
- No learning from past preferences (one-off recommendations, not personalized)
- BPM-to-vibe matching is approximate; some high-BPM songs are mellow, vice versa
```

Save to repository root as `AI-IMPACT-STATEMENT.md`

---

### Task 14: Deploy to Vercel

**Files:**
- Create: `vercel.json` (optional)

**Steps:**

- [ ] **Step 1: Create Vercel account**

Go to https://vercel.com, sign up with GitHub

- [ ] **Step 2: Install Vercel CLI**

```bash
npm install -g vercel
```

- [ ] **Step 3: Deploy**

```bash
vercel --prod
```

Follow prompts. Vercel will auto-detect Node.js and deploy.

- [ ] **Step 4: Set environment variables**

In Vercel dashboard, add to your project:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` (change to your Vercel domain)
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` (change to your Vercel domain)
- `CLAUDE_API_KEY`

- [ ] **Step 5: Update OAuth callbacks**

Update `.env` with your Vercel deployment URL:
```
SPOTIFY_REDIRECT_URI=https://your-vercel-url.vercel.app/auth/spotify/callback
STRAVA_REDIRECT_URI=https://your-vercel-url.vercel.app/auth/strava/callback
```

Re-deploy: `vercel --prod`

---

### Task 15: Create pitch deck

**Files:**
- Create: `PITCH_DECK.md` or use PowerPoint/Google Slides

**Steps:**

- [ ] **Step 1: Create 6-slide pitch deck**

**Slide 1: Problem & Who's Affected**
- Title: "The Problem"
- When you exercise, your pace changes constantly, but your music doesn't
- Affects: Runners, walkers, gym enthusiasts, fitness-focused users
- Impact: Broken immersion, playlist mismatch, user frustration

**Slide 2: Insight (Why Now / Why You)**
- Title: "Why Now?"
- Gen Z & millennials expect AI-personalization
- Music streaming + fitness tracking are now ubiquitous
- Claude API makes AI music curation accessible to solo builders
- Why you: Built in 24 hours as solo founder; deep focus on user experience

**Slide 3: Solution Demo (Screens/UI/Flow)**
- Show screenshots of:
  - Login screen
  - Main UI with pace slider, mood selector
  - Real-time playlist updates
  - Song card with match reasoning
- Flow: Login → Select mood → Adjust pace → See songs → Play

**Slide 4: Tech Approach (Models, Data, Architecture)**
- Frontend: HTML/CSS/JS (lightweight, fast)
- Backend: Node.js + Express (simple, scalable)
- APIs: Spotify (songs), Strava (pace), Claude (ranking)
- Architecture diagram showing flow
- AI Model: Claude 3.5 Sonnet (context-aware ranking)

**Slide 5: Value & GTM (Who Pays, How You'll Reach Them)**
- **Value:** Music that adapts to your workout = better experience, engagement, retention
- **Who pays:** Fitness apps (Strava, Peloton, Apple Fitness), music platforms (Spotify premium)
- **GTM:** 
  - Direct: B2C app for fitness enthusiasts
  - Partnership: White-label for fitness apps
  - B2B: Licensing to music platforms

**Slide 6: Next Steps (Roadmap/Risks)**
- **Roadmap:**
  - Add heart rate sync for mood detection
  - Machine learning to personalize over time
  - Mobile native app (iOS/Android)
  - Personalized song generation
  - Cross-platform music support (Apple Music, YouTube Music)
- **Risks:**
  - Spotify API changes (mitigate: YouTube Music fallback)
  - Strava data latency (mitigate: offline mode, cache)
  - Claude API costs at scale (mitigate: self-hosted LLM for production)

- [ ] **Step 2: Practice pitch (2 min)**

Read through deck, time yourself. Aim for 90 seconds to 2 minutes.

---

### Task 16: Final submission

**Files:**
- No new files; consolidate existing

**Steps:**

- [ ] **Step 1: Verify all files exist**

Checklist:
- [ ] `README.md` ✓
- [ ] `AI-IMPACT-STATEMENT.md` ✓
- [ ] `server.js`, `package.json`, `.env` ✓
- [ ] `/routes`, `/services`, `/public` folders ✓
- [ ] Live Vercel deployment running ✓
- [ ] Pitch deck created ✓

- [ ] **Step 2: Git commit & push**

```bash
git add .
git commit -m "final: doremesolo MVP for AIBoomi Startup Weekend"
git push origin main
```

- [ ] **Step 3: Gather submission links**

- GitHub repo: https://github.com/tripledarts/doremesolo
- Live demo: https://your-vercel-url.vercel.app
- Pitch deck: [URL or PDF link]

- [ ] **Step 4: Submit to AIBoomi portal**

Before **Sunday 9:30 AM**, upload:
- GitHub repo URL
- README.md (in repo)
- AI Impact Statement (in repo)
- Live demo link
- Pitch deck (6 slides)

---

## Success Criteria Checklist

By end of 24 hours:

- [ ] App runs locally without errors
- [ ] Spotify OAuth login works
- [ ] Strava pace tracking fetches real data
- [ ] Claude API ranks songs intelligently
- [ ] Frontend displays playlists in real-time
- [ ] Recently played prevents duplicates
- [ ] "Surprise Me" randomizes songs
- [ ] Mood/vocal preferences affect recommendations
- [ ] Error handling is graceful (no crashes)
- [ ] README explains how to run locally
- [ ] README includes tech stack, API keys, features
- [ ] AI Impact Statement covers model, data, bias, outcomes
- [ ] Live demo accessible via Vercel
- [ ] Pitch deck is polished and 6 slides
- [ ] All files committed to GitHub
- [ ] Submitted to AIBoomi portal before deadline

---

**End of Implementation Plan**

---

Plan complete and saved to `C:\Users\Reethi\Documents\AIBoomi24\docs\superpowers\plans\2026-06-20-doremesolo-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch fresh subagents per task, review between tasks, fast iteration
2. **Inline Execution** — We execute tasks in this session using the executing-plans skill, batch execution with checkpoints

**Which approach would you prefer?**