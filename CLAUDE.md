# DoReMeSoLo — Project Context

Music recommendation web app that matches songs to your real-time walking/running pace and mood. Hackathon project (AIBoomi Startup Weekend), solo builder, submission deadline Sunday 9:30 AM.

GitHub: https://github.com/tripledarts/doremesolo

## Maintaining this file
**Keep this CLAUDE.md up to date.** Whenever you change the architecture or code in a way that makes something here inaccurate — new/removed/renamed files, endpoints, services, API decisions, run steps, or resolved gotchas — update the relevant section in the same change. Don't let it drift from the actual code.

## Run

```bash
npm start          # starts Express on http://127.0.0.1:3000
```

There are no automated tests. Verification is manual in the browser. **Always restart the server after editing backend files** (`.env`, `routes/`, `services/`, `server.js`) — `dotenv` and `require` only read on boot.

Use `http://127.0.0.1:3000`, NOT `localhost` — Spotify's registered redirect URI uses `127.0.0.1` and must match exactly.

## Tech Stack

- Backend: Node.js + Express (`server.js` entry)
- Frontend: Vanilla HTML/CSS/JS in `public/`
- APIs: Spotify Web API (songs), Gemini API (song ranking), mock Strava (pace)

## Architecture

```
public/            Frontend
  index.html       UI
  app.js           Frontend logic, workout loop, pace polling
  spotify-sdk.js   Token helpers (getSpotifyToken reads from URL → localStorage)
  styles.css
routes/
  auth.js          OAuth flows (Spotify, Strava)
  api.js           Song matching + playlist endpoints
services/
  spotify.js       Spotify search wrapper (with 429 retry)
  gemini.js        Gemini ranking wrapper (rankSongsByMood)
  strava-mock.js   Loads Kaggle CSV pace data, streams it via getCurrentPace()
mock-data/         Kaggle "Sport Activity Dataset - MTS-5" CSVs (committed, not gitignored)
```

### Key endpoints (`routes/api.js`)
- `GET /api/current-songs?bpm=&mood=&vocals=&token=&limit=&exclude=` — pace zone → genre-tagged Spotify search → Gemini re-rank → top N songs. `limit` defaults to 5, max 5. `exclude` is a comma-separated list of track IDs to skip (played songs + current queue). Falls back to top-N Spotify order if Gemini fails.
- `GET /api/mock-pace` — returns current pace BPM from mock stream
- `GET /api/recently-played` — returns last 5 played songs as `{ id, name, artist, image_url }` (full list kept server-side for exclusion logic)
- `POST /api/song-played` — body `{ songId, name, artist, image_url }` — prepends to recently-played list; deduplicates by id
- `POST /api/test-spotify` — debug-only Spotify search check

### Auth endpoints (`routes/auth.js`)
- `GET /auth/spotify/login` → `GET /auth/spotify/callback` — OAuth. Callback sets the **refresh token in an HttpOnly cookie** (`spotify_refresh`, path `/auth/spotify`, `SameSite=Lax`, `Secure` only in production) and redirects to `/index.html?spotify_token=&spotify_expires_in=` (only the short-lived access token + lifetime go to the client).
- `POST /auth/spotify/refresh` — reads the refresh token from the HttpOnly cookie (never from URL/body, so it stays out of logs), exchanges it for a fresh access token (`client_secret` stays server-side). Returns `{access_token, expires_in}`; rotates the cookie if Spotify returns a new refresh token; `401 {code:'SPOTIFY_AUTH'}` if missing/rejected.
- `POST /auth/spotify/logout` — clears the refresh cookie.
- **Security note:** the long-lived refresh token is deliberately NEVER exposed to browser JS, the URL, or `localStorage` (only the ~1h access token is). This was a security-review fix — keep it that way.

## API decisions
- **Song ranking: Gemini API** (switched from Claude midway). Model `gemini-1.5-flash`. Auth via `?key=` query param. Key in `.env` as `GEMINI_API_KEY`.
- **Songs: Spotify Web API**, user has Premium. Auth scopes in `routes/auth.js`. **Token refresh implemented:** access tokens expire in ~1h. The refresh token lives in an HttpOnly cookie (see Auth endpoints); the client holds only the short-lived access token (+expiry) in `localStorage` and auto-renews via `POST /auth/spotify/refresh` — proactively before expiry (`getValidSpotifyToken`) and reactively on a 401 (one refresh + retry in `fetchSongs`) before prompting a reconnect.
- **Spotify `/v1/recommendations` and `/v1/audio-features` are DISABLED** — both return 403 for apps without Extended Quota Mode approval. Song search uses `genre:${genre} ${mood}` queries against `/v1/search` instead. BPM tag falls back to the user's running pace (`bpmNum`) since audio features are unavailable.
- **Spotify rate limits (429):** Spotify uses a rolling 30-second window. `searchSongs` in `services/spotify.js` automatically retries once after the `Retry-After` header value (defaults to 10s if header missing). Don't spam the API during testing.
- **Pace: mock data** from Kaggle (real Strava requires paid tier). `strava-mock.js` reads a "Running" activity from the CSVs and cycles its pace samples (range 84–116 BPM, avg 113). Falls back to a synthetic sequence if CSVs missing.
- **Hosting target: Vercel** (not yet deployed).

## Workout / pace logic (frontend `app.js`)
Design intent: NO manual BPM input — pace is driven entirely by mock data and shown as a large changing BPM number.
- **No "Get Songs" button** — removed. Songs auto-fetch after pace collection completes.
- On "Start Mock Workout": collect pace readings for **6 seconds**, compute average, then auto-fetch songs.
- Once playlist starts, the Spotify SDK plays through the 5-song queue automatically. As each song is played, `fetchReplacement()` adds a new song to keep the queue at 5.
- Pace polled every 2s from `/api/mock-pace`.
- **Mood / vocals change mid-workout:** `refreshQueueTail()` keeps song 1 (currently playing), replaces songs 2–5 with new preference-matched songs and reloads the Spotify context at the current playback position so there's no audible skip.
- **Surprise Me button:** picks a random genre from a 45-genre list (`SURPRISE_GENRES` in `app.js`), stores it in `surpriseGenre`, and calls `fetchSongs()`. The genre is locked for the session; subsequent replacements use the same genre. `surpriseGenre` is cleared when the workout stops. **Note: backend does not yet use `surprise_genre` param** — previous attempts to wire it up were reverted due to bugs. Currently Surprise Me fetches songs using the normal pace-zone genres and the old `surpriseMode` branch in `fetchSongs` picks one random song from the result.
- Queue is always capped at 5 songs.
- Recently Played: displayed capped at 5; full list kept in `playedSongIds` Map (id → timestamp) for 1-hour exclusion from future fetches.

## Spotify Web Playback SDK (`public/app.js`)
- SDK script loaded from `https://sdk.scdn.co/spotify-player.js` (after `app.js` so `window.onSpotifyWebPlaybackSDKReady` is defined first).
- `initSpotifyPlayer()` creates the player, connects, captures `device_id` from `ready` event.
- `playQueue(songs)` calls `PUT /v1/me/player/play?device_id=...` with all 5 URIs.
- Controls: `pauseResume()` toggles pause/play; `nextSong()` marks current as played then calls `player.nextTrack()`.
- `player_state_changed` listener:
  - Detects track changes → marks previous song played, removes from queue, calls `fetchReplacement()`.
  - `isLastInContext` flag on `lastPlayedTrack`: when Next is pressed on the last song, Spotify loops back to song 1 of the old context. Detected via `nextTracks.length === 0` — triggers `playQueue(currentQueue)` to restart with fresh context.
  - `justRestartedContext` one-shot flag prevents double-restart on the first state-change of a new context.
  - `lastSongPlaying` flag detects natural end of last song (paused at position 0).
- `renderQueue()` uses `lastPlayedTrack?.id` for correct now-playing highlight (not index 0).
- Auth scopes: `streaming`, `user-read-playback-state`, `user-modify-playback-state`.

## Current state / gotchas
- ✅ **RESOLVED: Mock pace varies.** Range 84–116 BPM, avg 113.
- ✅ **RESOLVED: Token auto-refresh.** HttpOnly cookie for refresh token; client auto-renews before expiry.
- ✅ **RESOLVED: Double-click Next / queue looping.** Removed `POST /v1/me/player/queue` entirely; use only `PUT /v1/me/player/play` for context. `isLastInContext` + `justRestartedContext` handle end-of-queue restart.
- ✅ **RESOLVED: Duplicate songs in queue.** `fetchReplacement` excludes both played IDs and current queue IDs.
- ✅ **RESOLVED: Now-playing highlight mismatch.** `renderQueue` uses `lastPlayedTrack?.id` not index.
- ✅ **RESOLVED: Vocals filtering.** Appends `instrumental` keyword to Spotify search for voiceless; uses `voiced`/`combo` logic.
- ✅ **RESOLVED: BPM tag.** Falls back to running pace since `/audio-features` returns 403.
- ✅ **RESOLVED: Preference change mid-workout.** `refreshQueueTail()` keeps song 1, replaces 2–5, reloads Spotify context at current `position_ms`.
- ✅ **RESOLVED: 429 rate limiting.** `searchSongs` retries once after `Retry-After` delay (10s fallback). Don't hammer the API during testing.
- ⚠️ **PENDING: Surprise Me genre lock end-to-end.** Frontend sets `surpriseGenre` and passes `surprise_genre` param, but backend wiring was reverted. Backend currently ignores `surprise_genre` and uses pace-zone genres. The `surpriseMode` branch in `fetchSongs` picks one random song. Needs a clean backend implementation that searches using the locked genre as a keyword (not `genre:` filter — that fails for non-standard genre names like `afrobeats`, `lo-fi`, etc).

## Git
This repo uses a **local** git identity (do not change global):
- `user.name = tripledarts`
- `user.email = myemailboxr@gmail.com`

`.env` is gitignored and holds real secrets — never commit it. `.env.example` is the committed template.

**Workflow — MANDATORY:** After EVERY set of changes (no exceptions), immediately run `git add <files> && git commit && git push origin master`. Do not wait, do not batch, do not leave commits sitting local. Commit AND push before reporting the work as done.

## User preferences
- Not deeply experienced with GitHub/IDEs/deployment — give explicit step-by-step instructions.
- Wants fixes applied, not just error messages echoed back.
- Wants flawless execution on a tight timeline.
- Do NOT claim something works without testing it first in the browser.

## Remaining roadmap
- ⚠️ Surprise Me end-to-end (backend genre lock) — needs careful testing before attempting again
- README + AI Impact Statement + pitch deck
- Deploy to Vercel
