const express = require('express');
const { searchSongs } = require('../services/spotify');
const { rankSongsByMood } = require('../services/gemini');
const router = express.Router();

// In-memory session state
const sessionState = {
  recentlyPlayed: []
};

// GET /api/current-songs?bpm=120&mood=happy&vocals=combo&token=spotify_token
router.get('/current-songs', async (req, res) => {
  const { bpm, mood, vocals, token } = req.query;

  if (!token || !bpm || !mood || !vocals) {
    return res.status(400).json({ error: 'Missing required params: token, bpm, mood, vocals' });
  }

  const bpmNum = parseInt(bpm);
  if (isNaN(bpmNum) || bpmNum < 50 || bpmNum > 200) {
    return res.status(400).json({ error: 'BPM must be between 50-200' });
  }

  try {
    const query = `${mood} ${bpm} bpm`;
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
  } catch (error) {
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

module.exports = router;
