const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function rankSongsByMood(songs, userBPM, userMood, userVocals) {
  const songList = songs
    .slice(0, 15)
    .map(s => `${s.name} by ${s.artists[0].name} (ID: ${s.id})`)
    .join('\n');

  const halfTime = Math.round(userBPM / 2);
  const doubleTime = userBPM * 2;
  const prompt = `You are a music curator for a workout app. The user has been sustaining a pace of ${userBPM} BPM. Mood: "${userMood}". Vocals: ${userVocals}.

Rank these songs best to worst for this exact moment:
${songList}

Use your knowledge of each song's actual tempo. Prioritise songs whose tempo is close to ${userBPM} BPM, or harmonically related (half-time ~${halfTime} BPM, double-time ~${doubleTime} BPM). A song that matches pace AND mood scores highest.

Return a JSON array:
[{ "track_id": "spotify_id", "reason": "1-sentence why it fits this pace and mood", "match_score": 0-100 }]

Only scores >70 for strong matches. Respond ONLY with valid JSON, no other text.`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const raw = response.data.candidates[0].content.parts[0].text;
    const content = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    const ranking = JSON.parse(content);
    return ranking;
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return [];
  }
}

module.exports = { rankSongsByMood };
