const express = require('express');
const { searchSongs, getBatchAudioFeatures } = require('../services/spotify');
const { rankSongsByMood } = require('../services/gemini');
const { getCurrentPace } = require('../services/strava-mock');
const router = express.Router();

// In-memory session state — recently played stores full song objects
const sessionState = {
  recentlyPlayed: []
};

// Pace zone → Spotify genre seeds — 6 bands matched to typical song BPM ranges
const PACE_ZONES = [
  { max: 60,       genres: ['ambient', 'acoustic'] },
  { max: 80,       genres: ['soul', 'r-n-b', 'blues'] },
  { max: 95,       genres: ['hip-hop', 'reggae', 'funk'] },
  { max: 115,      genres: ['pop', 'indie-pop', 'disco'] },
  { max: 135,      genres: ['dance', 'electronic', 'house'] },
  { max: Infinity, genres: ['rock', 'drum-and-bass', 'techno'] }
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

  const bpmNum = parseInt(bpm) || 100;

  // IDs the client has already played — exclude from results to avoid repeats
  const exclude = req.query.exclude
    ? new Set(req.query.exclude.split(',').filter(Boolean))
    : new Set();

  // How many songs to return (1 for replacements, 5 for initial load)
  const returnLimit = Math.min(parseInt(req.query.limit) || 3, 3);

  console.log(`🎵 Matching songs: BPM=${bpmNum}, mood=${mood}, vocals=${vocals}, excluding=${exclude.size}`);

  try {
    const zone = getPaceZone(bpmNum);

    // Build the search query — append "instrumental" for voiceless preference so Spotify
    // surfaces tracks that are labelled instrumental in their metadata/titles
    const vocalsKeyword = vocals === 'voiceless' ? ' instrumental' : '';
    const queryBase = `${mood}${vocalsKeyword}`;

    // Single search combining genres as keywords — avoids parallel calls that burn rate limit
    const genreKeywords = zone.genres.join(' ');
    const tracks = await searchSongs(`${genreKeywords} ${queryBase}`, token, 12);

    const seen = new Set();
    const spotifySongs = tracks.filter(track => {
      if (!track?.id || seen.has(track.id) || exclude.has(track.id)) return false;
      seen.add(track.id);
      return true;
    });

    if (!spotifySongs.length) {
      return res.json({ songs: [], message: 'No songs found for this pace and mood' });
    }

    // Gemini re-ranks by mood fit
    const ranked = await rankSongsByMood(spotifySongs, bpmNum, mood, vocals);

    let enriched;
    if (ranked.length > 0) {
      enriched = ranked.slice(0, returnLimit).map(r => {
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
      enriched = spotifySongs.slice(0, returnLimit).map(song => ({
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

    // Enrich with tempo from audio features (best-effort — many apps get 403 here
    // because Spotify restricted /audio-features to Extended Quota Mode apps).
    // Fall back to the user's running pace (bpmNum) so the tag always shows something.
    const audioFeatures = await getBatchAudioFeatures(enriched.map(s => s.id), token);
    enriched = enriched.map(s => ({
      ...s,
      tempo: audioFeatures[s.id]?.tempo ? Math.round(audioFeatures[s.id].tempo) : bpmNum
    }));

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

// GET /api/recently-played — returns last 5 for display; full list kept in memory for exclusion
router.get('/recently-played', (req, res) => {
  res.json({ songs: sessionState.recentlyPlayed.slice(0, 5) });
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
