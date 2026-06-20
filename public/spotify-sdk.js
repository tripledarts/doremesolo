// Store Spotify token (+ refresh token and expiry) from URL
function getSpotifyToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('spotify_token');

  if (token) {
    localStorage.setItem('spotify_token', token);

    const refresh = params.get('spotify_refresh');
    if (refresh) localStorage.setItem('spotify_refresh_token', refresh);

    const expiresIn = parseInt(params.get('spotify_expires_in') || '3600', 10);
    localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresIn * 1000));

    window.history.replaceState({}, document.title, '/');
  }

  return localStorage.getItem('spotify_token');
}

// Exchange the stored refresh token for a fresh access token (via our server).
// Returns the new access token, or null if refresh isn't possible.
async function refreshSpotifyToken() {
  const refresh = localStorage.getItem('spotify_refresh_token');
  if (!refresh) return null;

  try {
    const res = await fetch(`/auth/spotify/refresh?refresh_token=${encodeURIComponent(refresh)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.access_token) return null;

    localStorage.setItem('spotify_token', data.access_token);
    const expiresIn = data.expires_in || 3600;
    localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresIn * 1000));
    if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);

    console.log('🔄 Spotify token refreshed');
    return data.access_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

// Return a valid access token, proactively refreshing if it's within 60s of expiry.
async function getValidSpotifyToken() {
  const token = localStorage.getItem('spotify_token');
  const expiresAt = parseInt(localStorage.getItem('spotify_token_expires_at') || '0', 10);

  if (token && expiresAt && Date.now() > expiresAt - 60000) {
    const refreshed = await refreshSpotifyToken();
    if (refreshed) return refreshed;
  }

  return token;
}

// Clear all stored Spotify auth (on logout or unrecoverable auth failure).
function clearSpotifyAuth() {
  localStorage.removeItem('spotify_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expires_at');
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
