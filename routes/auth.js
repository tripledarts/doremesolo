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
  const scopes = ['streaming', 'user-read-private', 'user-read-email'];

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

    const { access_token } = response.data;
    res.redirect(`/index.html?spotify_token=${access_token}`);
  } catch (error) {
    res.status(500).json({ error: 'Spotify auth failed', details: error.message });
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
