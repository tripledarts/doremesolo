const express = require('express');
const axios = require('axios');
const router = express.Router();

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';

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
    // Pass the refresh token + lifetime to the client so it can auto-renew the
    // access token (which expires after ~1h) without forcing a re-login.
    const params = new URLSearchParams({
      spotify_token: access_token,
      spotify_refresh: refresh_token || '',
      spotify_expires_in: String(expires_in || 3600)
    });
    res.redirect(`/index.html?${params.toString()}`);
  } catch (error) {
    res.status(500).json({ error: 'Spotify auth failed', details: error.message });
  }
});

// Spotify token refresh — exchanges a refresh_token for a fresh access_token.
// The client_secret must stay server-side, so the browser calls this endpoint.
router.get('/spotify/refresh', async (req, res) => {
  const { refresh_token } = req.query;

  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token required' });
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

    // Spotify may or may not return a new refresh_token; pass through whatever it gives.
    const { access_token, expires_in, refresh_token: new_refresh } = response.data;
    res.json({ access_token, expires_in, refresh_token: new_refresh });
  } catch (error) {
    console.error('❌ Spotify token refresh failed:', error.response?.data || error.message);
    res.status(401).json({ error: 'Token refresh failed', code: 'SPOTIFY_AUTH' });
  }
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
