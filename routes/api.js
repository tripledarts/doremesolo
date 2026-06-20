const express = require('express');
const { searchSongs, getRecommendations } = require('../services/spotify');
const { rankSongsByMood } = require('../services/gemini');
const { getCurrentPace } = require('../services/strava-mock');
const router = express.Router();

// In-memory session state — recently played stores full song objects
const sessionState = {
  recentlyPlayed: []
};

// Pace zone → Spotify genre seeds (Option B)
const PACE_ZONES = [
  { max: 94,       genres: ['hip-hop', 'r-n-b'] },
  { max: 108,      genres: ['pop', 'indie-pop', 'disco'] },
  { max: Infinity, genres: ['rock', 'dance', 'electronic'] }
];

// Mood → Spotify audio feature targets (used by Option A)
const MOOD_PARAMS = {
  happy:     { target_energy: 0.7, target_valence: 0.8 },
  energetic: { target_energy: 0.9, target_valence: 0.7 },
  chill:     { target_energy: 0.3, target_valence: 0.6 },
  focused:   { target_energy: 0.5, target_valence: 0.4 },
  sad:       { target_energy: 0.3, target_valence: 0.2 }
};

// Vocals → Spotify instrumentalness filter
const VOCALS_PARAMS = {
  voiced:    { max_instrumentalness: 0.3 },
  voiceless: { min_instrumentalness: 0.7 },
  combo:     {}
};

function getPaceZone(bpm) {
  return PACE_ZONES.find(z => bpm < z.max);
}

// GET /api/current-songs?bpm=120&mood=happy&vocals=combo&token=...
router.get('/current-songs', async (req, res) => {
  const { bpm, mood, vocals, token } = req.query;

  if (!token || !bpm || !mood || !vocals) {
    return res.status(400).json({ error: 'Missing required params: token, bpm, mood, vocals' });
  }

  const bpmNum = parseInt(bpm);
  if (isNaN(bpmNum) || bpmNum < 60 || bpmNum > 200) {
    return res.status(400).json({ error: 'BPM must be between 60-200' });
  }

  console.log(`🎵 Matching songs: BPM=${bpmNum}, mood=${mood}, vocals=${vocals}`);

  try {
    const zone = getPaceZone(bpmNum);
    const moodParams = MOOD_PARAMS[mood] || MOOD_PARAMS.happy;
    const vocalsParam = VOCALS_PARAMS[vocals] || {};

    // Option D: two BPM targets — direct match and double-time
    const targets = [bpmNum, bpmNum * 2];

    // Option A: fetch recommendations for both targets in parallel
    const batches = await Promise.all(
      targets.map(tempo =>
        getRecommendations({ genres: zone.genres, targetTempo: tempo, moodParams, vocalsParam, token, limit: 10 })
      )
    );

    // Deduplicate across both batches
    const seen = new Set();
    const spotifySongs = batches.flat().filter(track => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });

    // If recommendations returned nothing (e.g. API tier restriction), fall back to text search
    if (!spotifySongs.length) {
      console.log('⚠️ Recommendations returned empty — falling back to text search');
      const query = `${mood} ${zone.genres[0]}`;
      const fallback = await searchSongs(query, token, 15);
      if (!fallback.length) {
        return res.json({ songs: [], message: 'No songs found for this pace and mood' });
      }
      fallback.forEach(t => spotifySongs.push(t));
    }

    // Gemini re-ranks by mood fit
    const ranked = await rankSongsByMood(spotifySongs, bpmNum, mood, vocals);

    let enriched;
    if (ranked.length > 0) {
      enriched = ranked.slice(0, 5).map(r => {
        const song = spotifySongs.find(s => s.id === r.track_id);
        if (!song) return null;
        return {
          id: song.id,
          name: song.name,
          artist: song.artists[0]?.name,
          uri: song.uri,
          spotify_url: song.external_urls?.spotify,
          image_url: song.album?.images[0]?.url,
          reason: r.reason,
          match_score: r.match_score
        };
      }).filter(Boolean);
    }

    // Fallback if Gemini failed or returned no matching IDs
    if (!enriched || enriched.length === 0) {
      enriched = spotifySongs.slice(0, 5).map(song => ({
        id: song.id,
        name: song.name,
        artist: song.artists[0]?.name,
        uri: song.uri,
        spotify_url: song.external_urls?.spotify,
        image_url: song.album?.images[0]?.url,
        reason: 'Matched by pace and mood',
        match_score: 75
      }));
    }

    console.log(`✓ Returning ${enriched.length} songs`);
    res.json({ songs: enriched });

  } catch (error) {
    if (error.code === 'SPOTIFY_AUTH') {
      return res.status(401).json({ error: error.message, code: 'SPOTIFY_AUTH' });
    }
    console.error('❌ /api/current-songs error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/recently-played
router.get('/recently-played', (req, res) => {
  res.json({ songs: sessionState.recentlyPlayed });
});

// POST /api/song-played — body: { songId, name, artist, image_url }
router.post('/song-played', (req, res) => {
  const { songId, name, artist, image_url } = req.body;

  if (!songId) {
    return res.status(400).json({ error: 'songId required' });
  }

  if (!sessionState.recentlyPlayed.find(s => s.id === songId)) {
    sessionState.recentlyPlayed.unshift({ id: songId, name: name || songId, artist, image_url });
  }

  res.json({ recentlyPlayed: sessionState.recentlyPlayed });
});

// GET /api/mock-pace
router.get('/mock-pace', (req, res) => {
  const pace = getCurrentPace();
  res.json({ pace });
});

// POST /api/test-spotify — debug only
router.post('/test-spotify', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const songs = await searchSongs('Who\'s That Chick Rihanna', token, 5);
    const enriched = songs.map(s => ({
      id: s.id,
      name: s.name,
      artist: s.artists[0]?.name,
      spotify_url: s.external_urls?.spotify,
      image_url: s.album?.images[0]?.url
    }));
    res.json({ success: true, songs: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
