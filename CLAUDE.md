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
  spotify.js       Spotify search wrapper
  gemini.js        Gemini ranking wrapper (rankSongsByMood)
  strava-mock.js   Loads Kaggle CSV pace data, streams it via getCurrentPace()
mock-data/         Kaggle "Sport Activity Dataset - MTS-5" CSVs (gitignored? NO — currently committed)
```

### Key endpoints (`routes/api.js`)
- `GET /api/current-songs?bpm=&mood=&vocals=&token=` — main flow: Spotify search → Gemini rank → top 5
- `GET /api/mock-pace` — returns current pace BPM from mock stream
- `GET /api/recently-played`, `POST /api/song-played`
- `POST /api/test-spotify` — debug-only Spotify search check

### Auth endpoints (`routes/auth.js`)
- `GET /auth/spotify/login` → `GET /auth/spotify/callback` — OAuth. Callback sets the **refresh token in an HttpOnly cookie** (`spotify_refresh`, path `/auth/spotify`, `SameSite=Lax`, `Secure` only in production) and redirects to `/index.html?spotify_token=&spotify_expires_in=` (only the short-lived access token + lifetime go to the client).
- `POST /auth/spotify/refresh` — reads the refresh token from the HttpOnly cookie (never from URL/body, so it stays out of logs), exchanges it for a fresh access token (`client_secret` stays server-side). Returns `{access_token, expires_in}`; rotates the cookie if Spotify returns a new refresh token; `401 {code:'SPOTIFY_AUTH'}` if missing/rejected.
- `POST /auth/spotify/logout` — clears the refresh cookie.
- **Security note:** the long-lived refresh token is deliberately NEVER exposed to browser JS, the URL, or `localStorage` (only the ~1h access token is). This was a security-review fix — keep it that way.

## API decisions
- **Song ranking: Gemini API** (switched from Claude midway). Model `gemini-1.5-flash`. Auth via `?key=` query param. Key in `.env` as `GEMINI_API_KEY`.
- **Songs: Spotify Web API**, user has Premium. Auth scopes in `routes/auth.js`. **Token refresh implemented:** access tokens expire in ~1h. The refresh token lives in an HttpOnly cookie (see Auth endpoints); the client holds only the short-lived access token (+expiry) in `localStorage` and auto-renews via `POST /auth/spotify/refresh` — proactively before expiry (`getValidSpotifyToken`) and reactively on a 401 (one refresh + retry in `fetchSongs`) before prompting a reconnect. Docs: https://developer.spotify.com/documentation/web-api — note: this site does **not** serve an `llms.txt`/`llms-full.txt` (both checked 2026-06-20: `/llms.txt` returns the normal HTML page, `/llms-full.txt` is 404), so read the regular docs pages directly.
- **Pace: mock data** from Kaggle (real Strava requires paid tier). `strava-mock.js` reads a "Running" activity from the CSVs and cycles its pace samples. Falls back to a synthetic sequence if CSVs missing.
- **Hosting target: Vercel** (not yet deployed).

## Workout / pace logic (frontend `app.js`)
Design intent (per user): NO manual BPM input — pace is driven entirely by mock data and shown as a large changing BPM number.
- On "Start Mock Workout": collect pace readings for **30s**, then start playlist using the average.
- After start: re-check every **15s** to queue the next song near the end of the current one.
- Pace polled every 2s from `/api/mock-pace`.

## Current state / gotchas
- ⚠️ **`/api/current-songs` is in TEMPORARY TEST MODE** — it ignores ranking and hard-returns "Who's That Chick" by Rihanna. Original logic is preserved in a comment block in `routes/api.js`. Restore it after Spotify search is verified working.
- Spotify search had a 400 "Invalid limit" error — fixed by building the search URL with query string instead of axios `params`.
- Mock pace was stuck at 80 BPM — pace conversion in `strava-mock.js` was adjusted; verify it actually varies. **Still stuck:** mock loader reports "range: 80-80 BPM, avg: 80" on boot — not yet fixed.
- ✅ **RESOLVED: "No songs found" was an expired Spotify token, not a search bug.** Spotify user access tokens expire after ~1 hour, and `auth.js` saves only `access_token` (discards `refresh_token`), so there's no refresh. An expired token → `401 Invalid access token` → previously swallowed by `searchSongs` as `[]` → misleading "No songs found". Search itself works fine with a valid token (verified via client-credentials token: 5 tracks). **Fix applied:** `searchSongs` now throws an error with `code: 'SPOTIFY_AUTH'` on 401/403; `/api/current-songs` returns `401 {code:'SPOTIFY_AUTH'}`; frontend `fetchSongs` clears the dead token and shows a "Reconnect Spotify" link. **Recovery for the demo: just re-login to Spotify to get a fresh token.** Follow-up DONE: refresh-token flow now implemented (see API decisions / `/auth/spotify/refresh`), so the token auto-renews instead of dying after ~1h.

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

## Remaining roadmap
Restore real song matching → verify Spotify+Gemini end-to-end → Strava (mock) polish → testing → README + AI Impact Statement + pitch deck → deploy to Vercel.
