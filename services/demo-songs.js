// Curated demo pool — 12 songs tagged by mood and vocals.
// Served when Spotify search is rate-limited. Playback still uses the Spotify SDK.
// Distribution: 6 happy / 6 chill  ×  voice / voiceless / combo (2 each).

const DEMO_SONGS = [
  // ── HAPPY + VOICED ────────────────────────────────────────────────────────
  {
    id: '60nZcImufyMA1MKQY3dcCH',
    name: 'Happy',
    artist: 'Pharrell Williams',
    uri: 'spotify:track:60nZcImufyMA1MKQY3dcCH',
    spotify_url: 'https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH',
    image_url: null,
    reason: 'The definition of happy — pure upbeat energy',
    match_score: 98, tempo: 160,
    mood: 'happy', vocals: 'voiced'
  },
  {
    id: '1WkMMavIMc4JZ8cfMmxHkI',
    name: "Can't Stop the Feeling!",
    artist: 'Justin Timberlake',
    uri: 'spotify:track:1WkMMavIMc4JZ8cfMmxHkI',
    spotify_url: 'https://open.spotify.com/track/1WkMMavIMc4JZ8cfMmxHkI',
    image_url: null,
    reason: 'Irresistibly happy groove — perfect running energy',
    match_score: 96, tempo: 113,
    mood: 'happy', vocals: 'voiced'
  },
  {
    id: '463CkQjx2Zk1yXoBuierM9',
    name: 'Levitating',
    artist: 'Dua Lipa',
    uri: 'spotify:track:463CkQjx2Zk1yXoBuierM9',
    spotify_url: 'https://open.spotify.com/track/463CkQjx2Zk1yXoBuierM9',
    image_url: null,
    reason: 'Disco-pop bounce matched to your stride',
    match_score: 94, tempo: 103,
    mood: 'happy', vocals: 'voiced'
  },

  // ── HAPPY + VOICELESS ─────────────────────────────────────────────────────
  {
    id: '0VjIjW4GlUZAMYd2vXMi3b',
    name: 'Blinding Lights',
    artist: 'The Weeknd',
    uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    spotify_url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    image_url: null,
    reason: 'Driving synth wall — propels you without thinking',
    match_score: 92, tempo: 171,
    mood: 'happy', vocals: 'voiceless'
  },
  {
    id: '7qiZfU4dY1lWllzX7mPBI3',
    name: 'Shape of You',
    artist: 'Ed Sheeran',
    uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI3',
    spotify_url: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
    image_url: null,
    reason: 'Pulsing beat keeps your pace locked in',
    match_score: 90, tempo: 96,
    mood: 'happy', vocals: 'voiceless'
  },

  // ── HAPPY + COMBO ─────────────────────────────────────────────────────────
  {
    id: '3PfIrDoz19wz7qK7tYeu62',
    name: "Don't Start Now",
    artist: 'Dua Lipa',
    uri: 'spotify:track:3PfIrDoz19wz7qK7tYeu62',
    spotify_url: 'https://open.spotify.com/track/3PfIrDoz19wz7qK7tYeu62',
    image_url: null,
    reason: 'Funky disco energy — keeps the legs going',
    match_score: 91, tempo: 124,
    mood: 'happy', vocals: 'combo'
  },
  {
    id: '5HCyWlXZPP0y6Gqq8TgA20',
    name: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    uri: 'spotify:track:5HCyWlXZPP0y6Gqq8TgA20',
    spotify_url: 'https://open.spotify.com/track/5HCyWlXZPP0y6Gqq8TgA20',
    image_url: null,
    reason: 'High-energy pop — propels you forward',
    match_score: 88, tempo: 170,
    mood: 'happy', vocals: 'combo'
  },

  // ── CHILL + VOICED ────────────────────────────────────────────────────────
  {
    id: '3KkXRkHbMCARz0aVfEt68P',
    name: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    uri: 'spotify:track:3KkXRkHbMCARz0aVfEt68P',
    spotify_url: 'https://open.spotify.com/track/3KkXRkHbMCARz0aVfEt68P',
    image_url: null,
    reason: 'Smooth melodic flow — easy stride music',
    match_score: 89, tempo: 90,
    mood: 'chill', vocals: 'voiced'
  },
  {
    id: '4iJyoBOLtHqaWYs3vyWFJl',
    name: 'Peaches',
    artist: 'Justin Bieber',
    uri: 'spotify:track:4iJyoBOLtHqaWYs3vyWFJl',
    spotify_url: 'https://open.spotify.com/track/4iJyoBOLtHqaWYs3vyWFJl',
    image_url: null,
    reason: 'Silky R&B groove — keeps it easy and flowing',
    match_score: 87, tempo: 90,
    mood: 'chill', vocals: 'voiced'
  },

  // ── CHILL + VOICELESS ─────────────────────────────────────────────────────
  {
    id: '6UelLqGlWMcVH1E5c4H7lY',
    name: 'Watermelon Sugar',
    artist: 'Harry Styles',
    uri: 'spotify:track:6UelLqGlWMcVH1E5c4H7lY',
    spotify_url: 'https://open.spotify.com/track/6UelLqGlWMcVH1E5c4H7lY',
    image_url: null,
    reason: 'Breezy summer groove — light and unhurried',
    match_score: 86, tempo: 95,
    mood: 'chill', vocals: 'voiceless'
  },
  {
    id: '4LRPiXqCikLlN15c3yImP7',
    name: 'As It Was',
    artist: 'Harry Styles',
    uri: 'spotify:track:4LRPiXqCikLlN15c3yImP7',
    spotify_url: 'https://open.spotify.com/track/4LRPiXqCikLlN15c3yImP7',
    image_url: null,
    reason: 'Airy synth-pop — chill but keeps you moving',
    match_score: 85, tempo: 174,
    mood: 'chill', vocals: 'voiceless'
  },

  // ── CHILL + COMBO ─────────────────────────────────────────────────────────
  {
    id: '4ZtFanR9U6ndgddUvNcjcG',
    name: 'good 4 u',
    artist: 'Olivia Rodrigo',
    uri: 'spotify:track:4ZtFanR9U6ndgddUvNcjcG',
    spotify_url: 'https://open.spotify.com/track/4ZtFanR9U6ndgddUvNcjcG',
    image_url: null,
    reason: 'Punchy energy with a chill-out release — best of both',
    match_score: 84, tempo: 166,
    mood: 'chill', vocals: 'combo'
  }
];

// Returns up to `limit` songs filtered by mood and vocals, excluding played IDs.
// Falls back to the full pool if the filtered set is too small.
function getDemoSongs(limit = 3, excludeIds = new Set(), mood = null, vocals = null) {
  const available = DEMO_SONGS.filter(s => !excludeIds.has(s.id));

  if (mood || vocals) {
    const filtered = available.filter(s =>
      (!mood   || s.mood   === mood)   &&
      (!vocals || s.vocals === vocals)
    );
    // If we have enough filtered songs, use them; otherwise fall back to full pool
    if (filtered.length >= limit) return filtered.slice(0, limit);
    // Pad with songs from the full pool not already included
    const filteredIds = new Set(filtered.map(s => s.id));
    const extras = available.filter(s => !filteredIds.has(s.id));
    return [...filtered, ...extras].slice(0, limit);
  }

  return available.slice(0, limit);
}

module.exports = { getDemoSongs, DEMO_SONGS };
