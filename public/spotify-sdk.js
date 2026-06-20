// Store the short-lived access token + expiry from URL. The refresh token lives
// in an HttpOnly cookie set by the server — browser JS never sees or stores it.
function getSpotifyToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('spotify_token');

  if (token) {
    localStorage.setItem('spotify_token', token);

    const expiresIn = parseInt(params.get('spotify_expires_in') || '3600', 10);
    localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresIn * 1000));

    window.history.replaceState({}, document.title, '/');
  }

  return localStorage.getItem('spotify_token');
}

// Ask the server to mint a fresh access token using the HttpOnly refresh cookie.
// No token is sent from JS — the cookie rides along automatically (same-origin).
// Returns the new access token, or null if refresh isn't possible.
async function refreshSpotifyToken() {
  try {
    const res = await fetch('/auth/spotify/refresh', {
      method: 'POST',
      credentials: 'same-origin'
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.access_token) return null;

    localStorage.setItem('spotify_token', data.access_token);
    const expiresIn = data.expires_in || 3600;
    localStorage.setItem('spotify_token_expires_at', String(Date.now() + expiresIn * 1000));

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

// Clear all Spotify auth: local access token + the server-side refresh cookie.
function clearSpotifyAuth() {
  localStorage.removeItem('spotify_token');
  localStorage.removeItem('spotify_token_expires_at');
  localStorage.removeItem('spotify_refresh_token'); // legacy cleanup (no longer stored)
  // Best-effort clear of the HttpOnly refresh cookie (only the server can).
  return fetch('/auth/spotify/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
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
