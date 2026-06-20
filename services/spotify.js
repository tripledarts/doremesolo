const axios = require('axios');

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

async function searchSongs(query, token, limit = 10) {
  if (!token) {
    const err = new Error('Not connected to Spotify — please reconnect.');
    err.code = 'SPOTIFY_AUTH';
    throw err;
  }

  console.log(`🔍 Searching Spotify: "${query}" (limit=${limit})`);

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
    if (status === 401 || status === 403) {
      console.error(`❌ Spotify auth error ${status}:`, error.response.data?.error?.message || error.message);
      const err = new Error('Spotify session expired — please reconnect Spotify.');
      err.code = 'SPOTIFY_AUTH';
      err.status = status;
      throw err;
    }
    // Log full error body so we can see exactly what Spotify says
    console.error(`❌ Spotify search error ${status}:`, JSON.stringify(error.response?.data || error.message));
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

async function getRecommendations({ genres, targetTempo, moodParams, vocalsParam, token, limit = 10 }) {
  const params = new URLSearchParams({
    seed_genres: genres.join(','),
    target_tempo: targetTempo,
    min_tempo: Math.max(40, targetTempo - 12),
    max_tempo: targetTempo + 12,
    limit
  });

  Object.entries(moodParams).forEach(([k, v]) => params.set(k, v));
  if (vocalsParam) Object.entries(vocalsParam).forEach(([k, v]) => params.set(k, v));

  const url = `${SPOTIFY_API_URL}/recommendations?${params.toString()}`;
  console.log(`🎯 Recommendations: genres=${genres.join(',')} tempo=${targetTempo}±12`);

  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tracks = response.data.tracks || [];
    console.log(`✓ Got ${tracks.length} recommendations`);
    return tracks;
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      const err = new Error('Spotify session expired — please reconnect Spotify.');
      err.code = 'SPOTIFY_AUTH';
      throw err;
    }
    console.error(`❌ Recommendations error ${status}:`, error.response?.data || error.message);
    return [];
  }
}

module.exports = { searchSongs, getTrackAudioFeatures, getRecommendations };
