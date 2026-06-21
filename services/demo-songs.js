// Hardcoded demo song pool — used when Spotify search API is rate-limited.
// URIs are real Spotify tracks; playback still goes through the Spotify SDK.
// Covers happy (majority) and chill moods as requested for the demo.

const DEMO_SONGS = [
  {
    id: '60nZcImufyMA1MKQY3dcCH',
    name: 'Happy',
    artist: 'Pharrell Williams',
    uri: 'spotify:track:60nZcImufyMA1MKQY3dcCH',
    spotify_url: 'https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH',
    image_url: null,
    reason: 'The definition of happy — pure upbeat energy',
    match_score: 98,
    tempo: 160
  },
  {
    id: '1WkMMavIMc4JZ8cfMmxHkI',
    name: "Can't Stop the Feeling!",
    artist: 'Justin Timberlake',
    uri: 'spotify:track:1WkMMavIMc4JZ8cfMmxHkI',
    spotify_url: 'https://open.spotify.com/track/1WkMMavIMc4JZ8cfMmxHkI',
    image_url: null,
    reason: 'Irresistibly happy groove — perfect running energy',
    match_score: 96,
    tempo: 113
  },
  {
    id: '463CkQjx2Zk1yXoBuierM9',
    name: 'Levitating',
    artist: 'Dua Lipa',
    uri: 'spotify:track:463CkQjx2Zk1yXoBuierM9',
    spotify_url: 'https://open.spotify.com/track/463CkQjx2Zk1yXoBuierM9',
    image_url: null,
    reason: 'Disco-pop bounce — floats you through your run',
    match_score: 94,
    tempo: 103
  },
  {
    id: '0VjIjW4GlUZAMYd2vXMi3b',
    name: 'Blinding Lights',
    artist: 'The Weeknd',
    uri: 'spotify:track:0VjIjW4GlUZAMYd2vXMi3b',
    spotify_url: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b',
    image_url: null,
    reason: 'Driving synth energy — paces you without thinking',
    match_score: 92,
    tempo: 171
  },
  {
    id: '7qiZfU4dY1lWllzX7mPBI3',
    name: 'Shape of You',
    artist: 'Ed Sheeran',
    uri: 'spotify:track:7qiZfU4dY1lWllzX7mPBI3',
    spotify_url: 'https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI3',
    image_url: null,
    reason: 'Catchy and upbeat — keeps the mood light',
    match_score: 90,
    tempo: 96
  },
  {
    id: '6UelLqGlWMcVH1E5c4H7lY',
    name: 'Watermelon Sugar',
    artist: 'Harry Styles',
    uri: 'spotify:track:6UelLqGlWMcVH1E5c4H7lY',
    spotify_url: 'https://open.spotify.com/track/6UelLqGlWMcVH1E5c4H7lY',
    image_url: null,
    reason: 'Breezy happy-pop — summer run vibes',
    match_score: 89,
    tempo: 95
  },
  {
    id: '3KkXRkHbMCARz0aVfEt68P',
    name: 'Sunflower',
    artist: 'Post Malone & Swae Lee',
    uri: 'spotify:track:3KkXRkHbMCARz0aVfEt68P',
    spotify_url: 'https://open.spotify.com/track/3KkXRkHbMCARz0aVfEt68P',
    image_url: null,
    reason: 'Chill melodic flow — easy stride music',
    match_score: 88,
    tempo: 90
  },
  {
    id: '3PfIrDoz19wz7qK7tYeu62',
    name: "Don't Start Now",
    artist: 'Dua Lipa',
    uri: 'spotify:track:3PfIrDoz19wz7qK7tYeu62',
    spotify_url: 'https://open.spotify.com/track/3PfIrDoz19wz7qK7tYeu62',
    image_url: null,
    reason: 'Funky disco-pop energy — gets the legs moving',
    match_score: 87,
    tempo: 124
  },
  {
    id: '4LRPiXqCikLlN15c3yImP7',
    name: 'As It Was',
    artist: 'Harry Styles',
    uri: 'spotify:track:4LRPiXqCikLlN15c3yImP7',
    spotify_url: 'https://open.spotify.com/track/4LRPiXqCikLlN15c3yImP7',
    image_url: null,
    reason: 'Upbeat melancholy — chill but keeps you moving',
    match_score: 86,
    tempo: 174
  },
  {
    id: '4ZtFanR9U6ndgddUvNcjcG',
    name: 'good 4 u',
    artist: 'Olivia Rodrigo',
    uri: 'spotify:track:4ZtFanR9U6ndgddUvNcjcG',
    spotify_url: 'https://open.spotify.com/track/4ZtFanR9U6ndgddUvNcjcG',
    image_url: null,
    reason: 'High-energy pop-punk — great for picking up pace',
    match_score: 85,
    tempo: 166
  },
  {
    id: '4iJyoBOLtHqaWYs3vyWFJl',
    name: 'Peaches',
    artist: 'Justin Bieber',
    uri: 'spotify:track:4iJyoBOLtHqaWYs3vyWFJl',
    spotify_url: 'https://open.spotify.com/track/4iJyoBOLtHqaWYs3vyWFJl',
    image_url: null,
    reason: 'Smooth chill R&B — keeps it easy and flowing',
    match_score: 84,
    tempo: 90
  },
  {
    id: '5HCyWlXZPP0y6Gqq8TgA20',
    name: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    uri: 'spotify:track:5HCyWlXZPP0y6Gqq8TgA20',
    spotify_url: 'https://open.spotify.com/track/5HCyWlXZPP0y6Gqq8TgA20',
    image_url: null,
    reason: 'High-energy pop — propels you forward',
    match_score: 83,
    tempo: 170
  }
];

function getDemoSongs(limit = 3, excludeIds = new Set()) {
  const available = DEMO_SONGS.filter(s => !excludeIds.has(s.id));
  return available.slice(0, limit);
}

module.exports = { getDemoSongs, DEMO_SONGS };
