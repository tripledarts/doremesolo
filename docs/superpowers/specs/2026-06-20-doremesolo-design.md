# DoReMeSoLo: Music Powered by Your Pace

**Product Requirements Document**

**Project:** DoReMeSoLo  
**Builder:** Solo (24h hackathon)  
**Duration:** 16 hours development + testing  
**Date:** 2026-06-20

---

## 1. Vision

A real-time music recommendation web app that matches songs to your current walking/running pace and mood. As your gait speed changes, the playlist adapts in real-time, keeping music synchronized with your movement.

---

## 2. Core Features (MVP)

### 2.1 Real-Time Pace Tracking
- User connects Strava account (OAuth)
- App polls Strava API every 5-10 seconds during an active workout
- Displays current steps/minute and current BPM
- For development: Use mock pace data (simulated varying speeds)

### 2.2 Mood & Vocal Preferences
- Before/during activity, user selects:
  - **Mood:** Happy, Energetic, Chill, Sad, Focused, etc.
  - **Vocals:** Voiced, Voiceless (instrumental), or Combo
- Preferences persist during the activity and can be changed mid-session

### 2.3 AI-Powered Song Matching
- User's current BPM + mood sent to Claude API
- Claude analyzes Spotify search results and recommends best matches
- Songs returned ranked by:
  - BPM alignment (±10 BPM tolerance)
  - Mood alignment (Claude interprets vibe)
  - Vocal preference match
- Results displayed in real-time as pace changes

### 2.4 "Surprise Me" Feature
- Button to randomize song selection from current matching results
- Adds discovery element to the experience

### 2.5 Recently Played Tracking
- Track songs played in current session
- Avoid recommending the same song twice in one activity
- Display list of songs played so far

### 2.6 Spotify Embedded Playback
- Users can play songs directly from the web app via Spotify embedded player
- Songs link to user's Spotify account for seamless playback

---

## 3. User Flow

1. User visits web app
2. Logs in with **Spotify OAuth** (to access song catalog + playback)
3. Authorizes **Strava connection** (to access pace data)
4. Starts a workout in Strava on their phone
5. Web app begins polling Strava for current pace
6. User selects mood and vocal preference in the app
7. Every 5-10 seconds:
   - Backend fetches latest pace from Strava
   - Searches Spotify for songs matching BPM + mood
   - Sends results + context to Claude API
   - Claude ranks by mood + BPM + vocals
   - Frontend displays ranked playlist
8. User plays songs via Spotify embedded player
9. When pace changes, playlist updates automatically
10. User can change mood/vocal prefs mid-activity
11. Recently played list prevents repetition

---

## 4. Architecture

### 4.1 System Overview

```
┌─────────────┐
│   iPhone    │
│   (Strava)  │ ◄─── User records workout
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Strava API      │
│  (pace data)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│         Web App (Browser)                │
├──────────────────────────────────────────┤
│  Frontend (HTML/CSS/JS)                  │
│  - Mood/vocal selection                  │
│  - Real-time playlist display            │
│  - Spotify embedded player               │
│  - Recently played tracking              │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│    Backend (Node.js + Express)           │
│    localhost:3000                        │
├──────────────────────────────────────────┤
│  Routes:                                 │
│  - /auth/spotify (OAuth flow)            │
│  - /auth/strava (OAuth flow)             │
│  - /api/current-songs (match logic)      │
│  - /api/recently-played (session history)│
└──────┬──────────────────────────────────┘
       │
       ├─────────────┬──────────────────┐
       ▼             ▼                  ▼
   ┌────────┐   ┌────────┐      ┌─────────────┐
   │ Spotify│   │Strava  │      │Claude API   │
   │ API    │   │API     │      │(Anthropic)  │
   └────────┘   └────────┘      └─────────────┘
```

### 4.2 Data Flow: Song Matching Loop

```
1. [Backend] Poll Strava API → Get current pace (BPM)
   └─ Every 5-10 seconds during activity

2. [Backend] Check recently played songs
   └─ Build exclusion list to avoid repeats

3. [Backend] Search Spotify
   └─ Query by BPM range + mood keywords
   └─ Returns ~10-20 candidate songs with metadata

4. [Backend] Call Claude API
   └─ Prompt: "User is at {BPM} BPM, mood {mood}, prefer {vocals}. Rank these songs."
   └─ Claude returns ranked list with reasoning

5. [Frontend] Display top 5-10 recommendations
   └─ Show song name, artist, why it matches (Claude's explanation)
   └─ Show matched BPM vs. user BPM
   └─ "Play on Spotify" button

6. [Frontend] User plays song or clicks "Surprise Me"
   └─ Add to recently played

7. [Loop repeats] When pace changes or user clicks refresh
```

---

## 5. Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Frontend** | HTML5, CSS3, Vanilla JS | No build tool needed; runs in browser |
| **Backend** | Node.js + Express.js | Simple REST API server |
| **APIs** | Strava OAuth, Spotify OAuth, Claude API | All free tiers available |
| **Hosting** | Local dev (later: Vercel free tier) | No hosting costs during hackathon |
| **Database** | None (session-based state) | Song data comes from Spotify on-demand |
| **Player** | Spotify Embedded Player | Built into frontend via Spotify SDK |

---

## 6. Implementation Details

### 6.1 Backend Endpoints

#### `/auth/spotify`
- Initiates Spotify OAuth flow
- Returns access token for song catalog access

#### `/auth/strava`
- Initiates Strava OAuth flow
- Returns access token for pace data access

#### `/api/current-songs`
- **Input:** `{ bpm: number, mood: string, vocals: string, excludeSongs: [songIds] }`
- **Process:**
  1. Search Spotify by BPM range ± 10 (+ mood keywords in artist/track names)
  2. Fetch top 10-15 results
  3. Call Claude API to rank by mood + vocals
  4. Return top 5 with explanations
- **Output:** `{ songs: [...], explanation: "..." }`

#### `/api/recently-played`
- Returns list of songs played in current session
- Used by frontend to avoid repeating songs

### 6.2 Claude API Integration

**Prompt Structure:**
```
You are a music curator. The user is exercising at {BPM} BPM with mood "{mood}". 
They prefer {vocals} vocals.

Rank these songs from best to worst match:
[List of Spotify songs with metadata: name, artist, genre]

Return a JSON array with:
- track_id: Spotify ID
- reason: 1-sentence explanation why it matches
- match_score: 0-100

Be strict: only highly relevant matches should score >70.
```

### 6.3 Frontend UI Components

- **Header:** Spotify user profile, currently active mood, BPM display
- **Pace Display:** Real-time steps/minute + matched song's BPM
- **Mood Selector:** Dropdown/buttons for mood + vocals
- **Playlist Area:** Display top 5 song recommendations with "Play on Spotify" links
- **Recently Played:** Side panel showing songs already played
- **Surprise Me Button:** Randomizes from current matches
- **Status Indicator:** Shows "Connected to Strava", "Fetching songs", "Ready to play"

---

## 7. Development Strategy

### Phase 1: Setup & Mock Data (1-2 hours)
- Initialize Node.js + Express project
- Set up Spotify OAuth flow (no Strava yet)
- Create mock pace data generator
- Test basic Express routing

### Phase 2: Backend Core (3-4 hours)
- Implement `/api/current-songs` endpoint
- Integrate Spotify search API
- Integrate Claude API for ranking
- Test with mock data

### Phase 3: Frontend (3-4 hours)
- Build UI with mood selector, playlist display
- Spotify embedded player integration
- Real-time updates from backend
- Recently played tracking

### Phase 4: Strava Integration (1-2 hours)
- Add Strava OAuth flow
- Implement `/auth/strava` endpoint
- Poll live Strava data instead of mocks
- Test with real workout data

### Phase 5: Testing & Polish (2+ hours)
- End-to-end testing (full workflow)
- Error handling (API timeouts, missing data)
- Browser compatibility check
- UI refinements

### Phase 6: Pitch Preparation (1-2 hours)
- Record demo video (optional)
- Prepare talking points
- Create pitch deck

---

## 8. Nice-to-Have Features

- **Post-Activity Summary:** Display workout recap with songs played, average BPM, average steps/min
- **Mood-Based Playlist History:** Show which moods worked best for the user
- **Explanation UI:** Show Claude's reasoning for why a song was recommended
- **Error Fallback:** If Spotify search fails, show preset genre playlists by BPM range

---

## 9. Known Constraints & Decisions

### Why Not YouTube Music / Apple Music?
- **Spotify:** Mature API, embedded player, good BPM metadata
- **Strava:** Industry standard for workout tracking, good pace data
- **Claude:** Best quality for AI-powered ranking; free tier acceptable for demo

### Why Mock Data During Dev?
- Strava OAuth setup adds complexity early on
- Mock data allows full feature testing without real workouts
- Switch to live Strava in final hours before demo

### Why Claude API (Not Free LLM)?
- Claude provides best-quality recommendations for demo
- During hackathon, use personal API credits (no cost to user)
- For production, would replace with Ollama or open-source LLM

### API Rate Limits
- **Spotify:** 429 errors possible if polling too frequently; poll every 5-10 seconds should be safe
- **Strava:** ~600 requests per 15 min; well within limits for single-user demo
- **Claude:** ~300k tokens per min on free tier; ~2-5 tokens per recommendation; safe

---

## 10. Success Criteria

- ✅ App runs locally without errors
- ✅ Spotify login works
- ✅ Mock pace data updates playlist in real-time
- ✅ Claude successfully ranks songs by BPM + mood
- ✅ Spotify embedded player plays songs
- ✅ Recently played prevents song repetition
- ✅ "Surprise Me" works (randomizes from current matches)
- ✅ Mood/vocal preferences change recommendations
- ✅ Strava integration works (live data polling)
- ✅ App works in Chrome, Firefox, Safari (desktop browsers)
- ✅ Pitch deck explains the concept clearly

---

## 11. Post-Hackathon Roadmap (Not in Scope)

- Add user accounts + persistent workout history
- Machine learning to learn mood-to-BPM preferences
- Mobile app (iOS/Android) for better on-device tracking
- Personalized song generation (as originally proposed)
- Integration with other workout apps (Apple Health, Google Fit)
- Open-source LLM deployment (replace Claude for cost)

---

**End of Design Document**
