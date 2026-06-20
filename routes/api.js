const express = require('express');
const { searchSongs } = require('../services/spotify');
const { rankSongsByMood } = require('../services/gemini');
const { getCurrentPace } = require('../services/strava-mock');
const router = express.Router();

// In-memory session state
const sessionState = {
  recentlyPlayed: []
};

// GET /api/current-songs?bpm=120&mood=happy&vocals=combo&token=spotify_token
router.get('/current-songs', async (req, res) => {
  const { bpm, mood, vocals, token } = req.query;

  if (!token || !bpm || !mood || !vocals) {
    console.error('❌ Missing params:', { token: !!token, bpm, mood, vocals });
    return res.status(400).json({ error: 'Missing required params: token, bpm, mood, vocals' });
  }

  const bpmNum = parseInt(bpm);
  if (isNaN(bpmNum) || bpmNum < 60 || bpmNum > 200) {
    return res.status(400).json({ error: 'BPM must be between 60-200' });
  }

  try {
    // TEMPORARY TEST: Just search for "Who's That Chick" and return it directly
    console.log(`🧪 TEMPORARY TEST MODE: Searching for "Who's That Chick by Rihanna"`);
    const testSongs = await searchSongs('Who\'s That Chick Rihanna', token, 5);

    if (!testSongs.length) {
      return res.json({ songs: [], message: 'No songs found for test query' });
    }

    // Return first song directly without Gemini ranking
    const song = testSongs[0];
    const enriched = [{
      id: song.id,
      name: song.name,
      artist: song.artists[0]?.name,
      spotify_url: song.external_urls?.spotify,
      image_url: song.album?.images[0]?.url,
      reason: 'Test song: Who\'s That Chick by Rihanna',
      match_score: 100
    }];

    console.log(`✓ Test response: ${enriched[0].name} by ${enriched[0].artist}`);
    res.json({ songs: enriched });

    /* ORIGINAL LOGIC (HIDDEN FOR TESTING):
    const query = `${mood} ${bpmNum} bpm`;
    console.log(`🎵 API request: BPM=${bpmNum}, Mood=${mood}, Vocals=${vocals}, Token: ${token ? 'present' : 'missing'}`);
    const spotifySongs = await searchSongs(query, token);

    if (!spotifySongs.length) {
      return res.json({ songs: [], message: 'No songs found' });
    }

    const ranked = await rankSongsByMood(spotifySongs, bpmNum, mood, vocals);

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
    }).filter(s => s.id);

    res.json({ songs: enriched });
    */
  } catch (error) {
    if (error.code === 'SPOTIFY_AUTH') {
      return res.status(401).json({ error: error.message, code: 'SPOTIFY_AUTH' });
    }
    res.status(500).json({ error: error.message });
  }
});

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

// GET /api/mock-pace - Get current pace from mock Strava workout
router.get('/mock-pace', (req, res) => {
  const pace = getCurrentPace();
  res.json({ pace });
});

// POST /api/test-spotify - Test Spotify search with a specific song
router.post('/test-spotify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required in request body' });
  }

  try {
    console.log('🧪 Testing Spotify search...');
    const testSongs = await searchSongs('Who\'s That Chick Rihanna', token, 5);

    if (testSongs.length === 0) {
      return res.json({ error: 'No songs found', songs: [] });
    }

    const enriched = testSongs.map(s => ({
      id: s.id,
      name: s.name,
      artist: s.artists[0]?.name,
      spotify_url: s.external_urls?.spotify,
      image_url: s.album?.images[0]?.url
    }));

    console.log(`✓ Test successful: Found ${enriched.length} songs`);
    res.json({ success: true, songs: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
