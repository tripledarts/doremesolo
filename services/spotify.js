const axios = require('axios');

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

async function searchSongs(query, token, limit = 15) {
  if (!token) {
    console.error('❌ Spotify token is missing');
    const err = new Error('Not connected to Spotify — please reconnect.');
    err.code = 'SPOTIFY_AUTH';
    throw err;
  }

  console.log(`🔍 Searching Spotify: "${query}"`);

  const url = `${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`;

  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const tracks = response.data.tracks.items || [];
    console.log(`✓ Found ${tracks.length} tracks`);
    return tracks;
  } catch (error) {
    const status = error.response?.status;
    // 401/403 = the user token is expired/invalid. Surface it as an auth error so the
    // UI can prompt a reconnect instead of showing a misleading "No songs found".
    if (status === 401 || status === 403) {
      console.error(`❌ Spotify auth error ${status}:`, error.response.data?.error?.message || error.message);
      const err = new Error('Spotify session expired — please reconnect Spotify.');
      err.code = 'SPOTIFY_AUTH';
      err.status = status;
      throw err;
    }
    if (error.response) {
      console.error(`❌ Spotify API error ${status}:`, error.response.data?.error?.message || error.message);
    } else {
      console.error('❌ Spotify search error:', error.message);
    }
    return [];
  }
}

async function getTrackAudioFeatures(trackId, token) {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/audio-features/${trackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error(`Audio features error for ${trackId}:`, error.message);
    return null;
  }
}

module.exports = { searchSongs, getTrackAudioFeatures };
