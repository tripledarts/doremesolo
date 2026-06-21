# DoReMeSoLo

**Your workout playlist, synced to your pace.**

DoReMeSoLo is an AI-powered music companion that listens to how fast you're moving and serves up songs that match your exact running BPM in real time — no manual setup, no playlist curation, just music that moves with you.

## The Problem

Runners know the feeling: you hit your stride, and the song is all wrong — too slow, too chaotic, wrong vibe. Curating the perfect workout playlist is a full-time job, and even then it doesn't adapt when your pace changes mid-run.

## The Solution

DoReMeSoLo reads your live pace from your fitness tracker, maps it to a musical BPM zone, factors in your mood and vocal preference, and uses AI to rank and queue songs that fit *right now*. As your pace changes, the queue updates. No buttons to press.

- **Pace → BPM mapping:** walking (80–95), easy jog (96–110), tempo run (111–130), sprint (131+)
- **Mood matching:** energetic, chill, focused, happy, dark, or surprise me
- **Vocals toggle:** singing, instrumental, or mix
- **Auto-queue:** 3-song rolling queue; replacement songs fetch in the background as you listen

## Demo

**[Watch the demo video →](#)** *(link to be added)*

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Music | Spotify Web API + Web Playback SDK |
| AI ranking | Google Gemini 1.5 Flash |
| Pace data | Mock Strava data (Kaggle "Sport Activity Dataset - MTS-5") |
| Auth | OAuth 2.0 (Spotify), HttpOnly cookie for refresh token |

## How It Works

1. **Start workout** — app collects 6 seconds of pace readings from your fitness data
2. **Auto-fetch** — average BPM is computed, Spotify is searched using pace-zone genre tags
3. **AI re-rank** — Gemini re-scores the candidates against your mood and energy level
4. **Play** — top 3 songs load into the Spotify player; queue replenishes as you listen
5. **Adapt** — change mood or vocals mid-run; queue tail updates instantly without interrupting the current song

## Architecture

```
public/
  index.html        UI shell
  app.js            Workout loop, pace polling, Spotify SDK controls
  spotify-sdk.js    Token helpers
  styles.css
routes/
  auth.js           Spotify OAuth (access token + HttpOnly refresh cookie)
  api.js            Song matching, queue management, pace endpoint
services/
  spotify.js        Spotify search with 429 retry
  gemini.js         Gemini mood-ranking wrapper
  strava-mock.js    Streams real pace samples from Kaggle CSV data
mock-data/          Kaggle sport activity CSVs (running, 84–116 BPM range)
```

## Key Design Decisions

- **No manual BPM input** — pace drives everything automatically
- **No `/v1/recommendations`** — Spotify's recommendation endpoint requires Extended Quota Mode (not available to new apps); uses `genre:` search queries instead
- **Gemini over Claude** — Gemini 1.5 Flash chosen for free-tier availability and low latency for re-ranking calls
- **Refresh token never touches the browser** — stored in an HttpOnly cookie; only the short-lived access token reaches client JS

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/tripledarts/doremesolo.git
cd doremesolo

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, GEMINI_API_KEY, SESSION_SECRET

# 4. Start the server
npm start
# Open http://127.0.0.1:3000  (must be 127.0.0.1, not localhost — Spotify OAuth redirect requirement)
```

## Built At

AIBoomi Startup Weekend 2025 — solo project, 48-hour build.
