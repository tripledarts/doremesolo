// Escape untrusted strings before injecting into innerHTML (quote-aware for attribute safety)
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Validate a URL is https, then HTML-escape it so it's safe in href/src attributes
function safeUrl(url, fallback = '') {
  const target = (url && /^https?:\/\//i.test(url)) ? url : fallback;
  return esc(target);
}

let currentSpotifyToken = null;
let currentPace = 120;
let currentMood = 'happy';
let currentVocals = 'combo';
let surpriseMode = false;
let mockWorkoutActive = false;
let workoutStartTime = null;
let paceReadings = [];
let playlistStarted = false;

// Spotify Web Playback SDK state
let spotifyPlayer = null;
let playerDeviceId = null;
let spotifySDKReady = false;
let lastPlayedTrack = null;
let currentQueue = [];
let lastSongPlaying = false; // true when we're on the final track in the queue
let pendingFetch = false;    // prevents double auto-fetch when queue empties

// Called by Spotify's SDK script once it finishes loading
window.onSpotifyWebPlaybackSDKReady = () => {
  spotifySDKReady = true;
  if (currentSpotifyToken) initSpotifyPlayer();
};

function initSpotifyPlayer() {
  if (spotifyPlayer || !window.Spotify) return;

  spotifyPlayer = new Spotify.Player({
    name: 'DoReMeSoLo',
    getOAuthToken: async cb => {
      const token = await getValidSpotifyToken();
      currentSpotifyToken = token;
      cb(token);
    },
    volume: 0.8
  });

  spotifyPlayer.addListener('ready', ({ device_id }) => {
    playerDeviceId = device_id;
    console.log('🎵 Spotify player ready, device:', device_id);
    document.getElementById('connection-status').textContent = '🟢 Player ready';
  });

  spotifyPlayer.addListener('not_ready', ({ device_id }) => {
    console.warn('⚠️ Player offline:', device_id);
    playerDeviceId = null;
  });

  spotifyPlayer.addListener('player_state_changed', handlePlayerStateChange);

  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    console.error('Spotify init error:', message);
  });

  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    console.error('Spotify auth error:', message);
  });

  spotifyPlayer.connect();
}

function handlePlayerStateChange(state) {
  if (!state) return;

  const track = state.track_window?.current_track;
  if (!track) return;

  const nextTracks = state.track_window?.next_tracks ?? [];

  // Track changed → previous song was played or skipped
  if (lastPlayedTrack && lastPlayedTrack.id !== track.id) {
    markSongPlayed(lastPlayedTrack);
    removeSongFromQueue(lastPlayedTrack.id);
    lastSongPlaying = false;
  }

  // Detect natural end of last song:
  // Spotify resets position to 0 and pauses when the final track finishes
  if (nextTracks.length === 0) {
    if (!state.paused) {
      lastSongPlaying = true;
    } else if (lastSongPlaying && state.position === 0) {
      markSongPlayed({ id: track.id, name: track.name, artist: track.artists?.[0]?.name, image_url: track.album?.images?.[0]?.url });
      removeSongFromQueue(track.id);
      lastSongPlaying = false;
    }
  }

  lastPlayedTrack = {
    id: track.id,
    name: track.name,
    artist: track.artists?.[0]?.name,
    image_url: track.album?.images?.[0]?.url
  };

  updateNowPlayingDisplay(track.id);

  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';

  document.getElementById('player-controls').style.display = 'block';
  const bar = document.getElementById('now-playing-text');
  if (bar) bar.textContent = `${track.name ?? ''} — ${track.artists?.[0]?.name ?? ''}`;
}

// Remove a played/skipped song from the Now Playing list and auto-fetch when empty
function removeSongFromQueue(songId) {
  currentQueue = currentQueue.filter(s => s.id !== songId);
  renderQueue();
  if (currentQueue.length === 0 && !pendingFetch) {
    pendingFetch = true;
    document.getElementById('playlist').innerHTML =
      '<div class="placeholder">Fetching next songs...</div>';
    fetchSongs().finally(() => { pendingFetch = false; });
  }
}

function updateNowPlayingDisplay(trackId) {
  document.querySelectorAll('.song-card').forEach(card => {
    const isPlaying = card.dataset.trackId === trackId;
    card.classList.toggle('now-playing', isPlaying);
    const title = card.querySelector('h3');
    if (title) {
      title.textContent = (isPlaying ? '▶ ' : '') +
        (card.dataset.trackName || title.textContent.replace(/^▶ /, ''));
    }
  });
}

async function playQueue(songs) {
  if (!playerDeviceId) {
    console.warn('No Spotify player device ready yet — displaying songs without autoplay');
    return;
  }

  const uris = songs.filter(s => s.uri).map(s => s.uri);
  if (!uris.length) return;

  try {
    const token = await getValidSpotifyToken();
    currentSpotifyToken = token;

    const resp = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${playerDeviceId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris })
      }
    );

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('❌ Play error:', resp.status, err);
    }
  } catch (e) {
    console.error('❌ playQueue error:', e);
  }
}

window.pauseResume = async function () {
  if (!spotifyPlayer) return;
  const state = await spotifyPlayer.getCurrentState();
  if (!state) return;
  state.paused ? spotifyPlayer.resume() : spotifyPlayer.pause();
};

window.nextSong = function () {
  if (!spotifyPlayer) return;
  // player_state_changed will fire on track change and handle marking as played
  spotifyPlayer.nextTrack();
};

// ─── App init ───────────────────────────────────────────────────────────────

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

  document.getElementById('spotify-logout-btn').addEventListener('click', async () => {
    await clearSpotifyAuth();
    window.location.reload();
  });
});

function showApp() {
  document.getElementById('auth-status').style.display = 'none';
  document.getElementById('user-connected').style.display = 'block';
  document.getElementById('app').style.display = 'block';
  if (spotifySDKReady) initSpotifyPlayer();
}

function setupEventListeners() {
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
    } else {
      mockWorkoutActive = false;
      playlistStarted = false;
      btn.textContent = '▶️ Start Mock Workout';
      btn.style.backgroundColor = '';
      status.textContent = 'Stopped';
      status.style.color = '';
    }
  });

  document.getElementById('mood-select').addEventListener('change', e => {
    currentMood = e.target.value;
  });

  document.getElementById('vocals-select').addEventListener('change', e => {
    currentVocals = e.target.value;
  });

  document.getElementById('refresh-btn').addEventListener('click', fetchSongs);

  document.getElementById('surprise-btn').addEventListener('click', () => {
    surpriseMode = true;
    fetchSongs();
  });
}

// ─── Song fetching ───────────────────────────────────────────────────────────

function requestSongs(token) {
  return fetch(
    `/api/current-songs?bpm=${currentPace}&mood=${currentMood}&vocals=${currentVocals}&token=${token}`
  );
}

async function fetchSongs() {
  try {
    document.getElementById('refresh-btn').disabled = true;
    document.getElementById('refresh-btn').textContent = 'Loading...';

    currentSpotifyToken = await getValidSpotifyToken();
    let response = await requestSongs(currentSpotifyToken);

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
        mockWorkoutActive = false;
        clearSpotifyAuth();
        showError(`${esc(error.error)} <a href="/auth/spotify/login">Reconnect Spotify</a>`);
        return;
      }
      showError(esc(error.error || 'Unknown error'));
      return;
    }

    const data = await response.json();

    if (surpriseMode && data.songs.length > 0) {
      const idx = Math.floor(Math.random() * data.songs.length);
      displaySongs([data.songs[idx]]);
      surpriseMode = false;
    } else {
      displaySongs(data.songs);
    }
  } catch (error) {
    console.error('Error fetching songs:', error);
    showError('Network error: ' + esc(error.message));
  } finally {
    document.getElementById('refresh-btn').disabled = false;
    document.getElementById('refresh-btn').textContent = 'Get Songs';
  }
}

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E';

function songCardHTML(song, isFirst) {
  return `
    <div class="song-card${isFirst ? ' now-playing' : ''}"
         data-track-id="${esc(song.id)}"
         data-track-name="${esc(song.name)}">
      <img src="${safeUrl(song.image_url, PLACEHOLDER_IMG)}"
           alt="${esc(song.name)}" class="song-image">
      <div class="song-info">
        <h3>${isFirst ? '▶ ' : ''}${esc(song.name)}</h3>
        <p>${esc(song.artist)}</p>
        <p><em>${esc(song.reason)}</em></p>
        <div class="match-score">Match: ${esc(String(song.match_score))}%</div>
      </div>
      <div class="song-actions">
        <a href="${safeUrl(song.spotify_url, '#')}" target="_blank" rel="noopener noreferrer" class="btn-link">Open in Spotify</a>
      </div>
    </div>`;
}

function renderQueue() {
  const playlistDiv = document.getElementById('playlist');
  if (!currentQueue.length) return;
  playlistDiv.innerHTML = currentQueue.map((song, i) => songCardHTML(song, i === 0)).join('');
}

function displaySongs(songs) {
  const playlistDiv = document.getElementById('playlist');

  if (!songs || songs.length === 0) {
    playlistDiv.innerHTML = '<div class="placeholder">No songs found. Try a different mood or BPM.</div>';
    return;
  }

  currentQueue = [...songs];
  lastSongPlaying = false;
  renderQueue();
  playQueue(songs);
}

// safeHtml: pass a pre-built HTML string where the text portions are already esc()'d
function showError(safeHtml) {
  document.getElementById('playlist').innerHTML =
    `<div class="error-message">❌ ${safeHtml}</div>`;
}

// ─── Recently played ─────────────────────────────────────────────────────────

async function markSongPlayed(song) {
  if (!song?.id) return;
  try {
    await fetch('/api/song-played', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songId: song.id,
        name: song.name,
        artist: song.artist,
        image_url: song.image_url
      })
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

    if (!data.songs.length) {
      recentList.innerHTML = '<li class="placeholder">No songs played yet</li>';
      return;
    }

    recentList.innerHTML = data.songs.map(song => `
      <li class="recent-item">
        ${safeUrl(song.image_url)
          ? `<img src="${safeUrl(song.image_url)}" class="recent-thumb" alt="">`
          : '<div class="recent-thumb-placeholder"></div>'}
        <span class="recent-info">
          <strong>${esc(song.name || 'Unknown')}</strong>
          ${song.artist ? `<span class="recent-artist"> — ${esc(song.artist)}</span>` : ''}
        </span>
      </li>
    `).join('');
  } catch (error) {
    console.error('Error refreshing recently played:', error);
  }
}

setInterval(refreshRecentlyPlayed, 2000);

// ─── Pace / workout loop ─────────────────────────────────────────────────────

function simulatePaceUpdates() {
  if (!mockWorkoutActive || !currentSpotifyToken) return;

  fetch('/api/mock-pace')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      if (!data.pace || data.pace <= 0) return;

      currentPace = data.pace;
      document.getElementById('pace-display').textContent = currentPace;

      const elapsed = Date.now() - workoutStartTime;

      if (!playlistStarted && elapsed < 30000) {
        paceReadings.push(currentPace);
        document.getElementById('workout-status').textContent =
          `🔴 Collecting pace... ${Math.floor(elapsed / 1000)}s`;

      } else if (!playlistStarted && elapsed >= 30000) {
        const avgPace = Math.round(
          paceReadings.reduce((a, b) => a + b, 0) / paceReadings.length
        );
        currentPace = avgPace;
        document.getElementById('pace-display').textContent = currentPace;
        document.getElementById('workout-status').textContent = '🟢 Playing';
        playlistStarted = true;
        paceReadings = [];
        fetchSongs();
      }
      // Once playlist started, Spotify SDK handles queue advancement automatically.
      // BPM display keeps updating so the user sees live pace.
    })
    .catch(err => console.error('Pace update error:', err));
}

setInterval(simulatePaceUpdates, 2000);

// ─── Dev helper ──────────────────────────────────────────────────────────────

window.testSpotify = async function () {
  const token = localStorage.getItem('spotify_token');
  if (!token) { console.error('❌ No token. Log in first.'); return; }
  try {
    const response = await fetch('/api/test-spotify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    if (data.success) {
      console.log(`✓ Found ${data.songs.length} songs:`);
      data.songs.forEach(s => console.log(`  🎵 ${s.name} by ${s.artist}`));
    } else {
      console.error('❌ Test failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};
