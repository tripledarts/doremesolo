let currentSpotifyToken = null;
let currentPace = 120;
let currentMood = 'happy';
let currentVocals = 'combo';
let surpriseMode = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  currentSpotifyToken = getSpotifyToken();

  if (currentSpotifyToken) {
    showApp();
    setupEventListeners();
    refreshRecentlyPlayed();
  } else {
    document.getElementById('spotify-login-btn').addEventListener('click', () => {
      window.location.href = '/auth/spotify/login';
    });
  }
});

function showApp() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-info').textContent = '✓ Connected';
}

function setupEventListeners() {
  // Pace slider
  const paceInput = document.getElementById('pace-input');
  paceInput.addEventListener('input', (e) => {
    currentPace = e.target.value;
    document.getElementById('pace-display').textContent = currentPace;
    document.getElementById('current-bpm').textContent = `BPM: ${currentPace}`;
  });

  // Mood selector
  document.getElementById('mood-select').addEventListener('change', (e) => {
    currentMood = e.target.value;
  });

  // Vocals selector
  document.getElementById('vocals-select').addEventListener('change', (e) => {
    currentVocals = e.target.value;
  });

  // Get songs button
  document.getElementById('refresh-btn').addEventListener('click', fetchSongs);

  // Surprise me button
  document.getElementById('surprise-btn').addEventListener('click', () => {
    surpriseMode = true;
    fetchSongs();
  });
}

async function fetchSongs() {
  try {
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').textContent = 'Loading...';

    const response = await fetch(
      `/api/current-songs?bpm=${currentPace}&mood=${currentMood}&vocals=${currentVocals}&token=${currentSpotifyToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      showError(error.error || 'Unknown error');
      return;
    }

    const data = await response.json();

    if (surpriseMode && data.songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.songs.length);
      displaySongs([data.songs[randomIndex]]);
      surpriseMode = false;
    } else {
      displaySongs(data.songs);
    }
  } catch (error) {
    console.error('Error fetching songs:', error);
    showError('Network error: ' + error.message);
  } finally {
    document.getElementById('refresh-btn').disabled = false;
    document.getElementById('refresh-btn').textContent = 'Get Songs';
  }
}

function displaySongs(songs) {
  const playlistDiv = document.getElementById('playlist');

  if (!songs || songs.length === 0) {
    playlistDiv.innerHTML = '<div class="placeholder">No songs found. Try a different mood or BPM.</div>';
    return;
  }

  playlistDiv.innerHTML = songs.map(song => `
    <div class="song-card">
      <img src="${song.image_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'}" alt="${song.name}" class="song-image">
      <div class="song-info">
        <h3>${song.name}</h3>
        <p>${song.artist}</p>
        <p><em>${song.reason}</em></p>
        <div class="match-score">Score: ${song.match_score}%</div>
      </div>
      <div class="song-actions">
        <a href="${song.spotify_url}" target="_blank">Play on Spotify</a>
        <button onclick="markSongPlayed('${song.id}')">Played</button>
      </div>
    </div>
  `).join('');
}

function showError(message) {
  const playlistDiv = document.getElementById('playlist');
  playlistDiv.innerHTML = `<div class="error-message">❌ ${message}</div>`;
}

async function markSongPlayed(songId) {
  try {
    await fetch('/api/song-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId })
    });

    refreshRecentlyPlayed();
  } catch (error) {
    console.error('Error marking song played:', error);
  }
}

async function refreshRecentlyPlayed() {
  try {
    const response = await fetch('/api/recently-played');
    const data = await response.json();

    const recentList = document.getElementById('recently-played');

    if (data.songs.length === 0) {
      recentList.innerHTML = '<li class="placeholder">No songs played yet</li>';
    } else {
      recentList.innerHTML = data.songs.map(id => `<li>Song ID: ${id}</li>`).join('');
    }
  } catch (error) {
    console.error('Error refreshing recently played:', error);
  }
}

// Refresh recently played every 2 seconds
setInterval(refreshRecentlyPlayed, 2000);
