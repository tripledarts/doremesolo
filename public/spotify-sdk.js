// Store Spotify token from URL
function getSpotifyToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('spotify_token');

  if (token) {
    localStorage.setItem('spotify_token', token);
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
