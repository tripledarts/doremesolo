const axios = require('axios');

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

async function searchSongs(query, token, limit = 15) {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        q: query,
        type: 'track',
        limit
      }
    });
    return response.data.tracks.items || [];
  } catch (error) {
    console.error('Spotify search error:', error.message);
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
