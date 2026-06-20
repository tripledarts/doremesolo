let currentSpotifyToken = null;
let currentPace = 120;
let currentMood = 'happy';
let currentVocals = 'combo';
let surpriseMode = false;
let mockWorkoutActive = false;
let workoutStartTime = null;
let paceReadings = [];
let playlistStarted = false;

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

  // Logout button
  document.getElementById('spotify-logout-btn').addEventListener('click', () => {
    clearSpotifyAuth();
    window.location.reload();
  });
});

function showApp() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('user-connected').style.display = 'block';
  document.getElementById('app').style.display = 'block';
}

function setupEventListeners() {
  // Workout button
  document.getElementById('workout-btn').addEventListener('click', () => {
    mockWorkoutActive = !mockWorkoutActive;
    const btn = document.getElementById('workout-btn');
    const status = document.getElementById('workout-status');

    if (mockWorkoutActive) {
      workoutStartTime = Date.now();
      playlistStarted = false;
      paceReadings = [];
      btn.textContent = '⏸️ Stop Workout';
      btn.style.backgroundColor = '#ff6b6b';
      status.textContent = '🔴 Collecting pace data (30s)...';
      status.style.color = '#ff6b6b';
      simulatePaceUpdates();
    } else {
      mockWorkoutActive = false;
      playlistStarted = false;
      btn.textContent = '▶️ Start Mock Workout';
      btn.style.backgroundColor = '';
      status.textContent = 'Stopped';
      status.style.color = '';
    }
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

function requestSongs(token) {
  return fetch(
    `/api/current-songs?bpm=${currentPace}&mood=${currentMood}&vocals=${currentVocals}&token=${token}`
  );
}

async function fetchSongs() {
  try {
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').textContent = 'Loading...';

    // Proactively refresh the access token if it's about to expire.
    currentSpotifyToken = await getValidSpotifyToken();

    let response = await requestSongs(currentSpotifyToken);

    // Reactive fallback: token rejected mid-session — try one refresh + retry.
    if (response.status === 401) {
      const refreshed = await refreshSpotifyToken();
      if (refreshed) {
        currentSpotifyToken = refreshed;
        response = await requestSongs(refreshed);
      }
    }

    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'SPOTIFY_AUTH') {
        // Refresh failed or no refresh token — stop and prompt a reconnect.
        mockWorkoutActive = false;
        clearSpotifyAuth();
        showError(`${error.error} <a href="/auth/spotify/login">Reconnect Spotify</a>`);
        return;
      }
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

// Collect BPM data for 30 seconds, then start playlist, then refresh every 15 seconds
function simulatePaceUpdates() {
  if (!mockWorkoutActive || !currentSpotifyToken) return;

  fetch('/api/mock-pace')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (data.pace && data.pace > 0) {
        currentPace = data.pace;
        document.getElementById('pace-display').textContent = currentPace;
        console.log(`📍 Pace: ${currentPace} BPM`);

        const elapsed = Date.now() - workoutStartTime;

        if (!playlistStarted && elapsed < 30000) {
          // Still collecting data (first 30 seconds)
          paceReadings.push(currentPace);
          console.log(`📊 Collecting data... ${elapsed / 1000 | 0}s (${paceReadings.length} samples)`);
        } else if (!playlistStarted && elapsed >= 30000) {
          // 30 seconds reached - calculate average and start playlist
          const avgPace = Math.round(paceReadings.reduce((a, b) => a + b, 0) / paceReadings.length);
          console.log(`🎵 Starting playlist with avg pace: ${avgPace} BPM`);
          currentPace = avgPace;
          document.getElementById('pace-display').textContent = currentPace;
          playlistStarted = true;
          paceReadings = [];
          fetchSongs();
        } else if (playlistStarted) {
          // Playlist running - refresh songs every 15 seconds
          if (paceReadings.length === 0) {
            paceReadings.push(currentPace);
          }
          if (elapsed % 15000 < 2000) {
            // Queue next song every 15 seconds
            const avgPace = Math.round(paceReadings.reduce((a, b) => a + b, 0) / paceReadings.length);
            console.log(`🔄 Checking for next song (avg: ${avgPace} BPM)`);
            fetchSongs();
            paceReadings = [];
          }
        }
      }
    })
    .catch(err => console.error('Pace update error:', err));
}

setInterval(simulatePaceUpdates, 2000);

// Test function for Spotify (run in browser console: testSpotify())
window.testSpotify = async function() {
  const token = localStorage.getItem('spotify_token');
  if (!token) {
    console.error('❌ No Spotify token found. Log in first.');
    return;
  }

  try {
    console.log('🧪 Testing Spotify search with "Who\'s That Chick"...');
    const response = await fetch('/api/test-spotify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✓ Spotify test passed! Found ${data.songs.length} songs:`);
      data.songs.forEach(song => {
        console.log(`  🎵 ${song.name} by ${song.artist}`);
      });
    } else {
      console.error('❌ Test failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};
