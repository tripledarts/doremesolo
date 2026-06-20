const express = require('express');
const axios = require('axios');
const router = express.Router();

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';

// The long-lived Spotify refresh token is kept in an HttpOnly cookie so browser
// JS never sees it (no URL/localStorage exposure). Only the short-lived access
// token is handed to the client. Cookie is path-scoped to /auth/spotify.
const REFRESH_COOKIE = 'spotify_refresh';

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // off for local http, on for https deploy
    sameSite: 'lax',
    path: '/auth/spotify',
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  });
}

// Minimal cookie reader (no cookie-parser dependency).
function getCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const found = header.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

// Spotify login
router.get('/spotify/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const scopes = ['streaming', 'user-read-private', 'user-read-email', 'user-library-read', 'user-read-playback-state'];

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

    const { access_token, refresh_token, expires_in } = response.data;
    // Refresh token → HttpOnly cookie (never exposed to JS/URL).
    // Only the short-lived access token + lifetime go to the client via URL.
    if (refresh_token) setRefreshCookie(res, refresh_token);
    const params = new URLSearchParams({
      spotify_token: access_token,
      spotify_expires_in: String(expires_in || 3600)
    });
    res.redirect(`/index.html?${params.toString()}`);
  } catch (error) {
    res.status(500).json({ error: 'Spotify auth failed', details: error.message });
  }
});

// Spotify token refresh — reads the refresh token from the HttpOnly cookie (not
// from the URL/body, so it never appears in logs) and exchanges it for a fresh
// access token. client_secret stays server-side.
router.post('/spotify/refresh', async (req, res) => {
  const refresh_token = getCookie(req, REFRESH_COOKIE);

  if (!refresh_token) {
    return res.status(401).json({ error: 'No Spotify session — please reconnect.', code: 'SPOTIFY_AUTH' });
  }

  try {
    const response = await axios.post(SPOTIFY_TOKEN_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET
      }
    });

    // Spotify sometimes rotates the refresh token; persist the new one if given.
    const { access_token, expires_in, refresh_token: new_refresh } = response.data;
    if (new_refresh) setRefreshCookie(res, new_refresh);
    res.json({ access_token, expires_in });
  } catch (error) {
    console.error('❌ Spotify token refresh failed:', error.response?.data || error.message);
    res.status(401).json({ error: 'Token refresh failed', code: 'SPOTIFY_AUTH' });
  }
});

// Clear the refresh cookie on logout (browser JS can't touch an HttpOnly cookie).
router.post('/spotify/logout', (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/auth/spotify' });
  res.json({ ok: true });
});

// Strava login
router.get('/strava/login', (req, res) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.STRAVA_REDIRECT_URI;

  const authUrl = `${STRAVA_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=activity:read_all`;

  res.redirect(authUrl);
});

// Strava callback
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

module.exports = router;
