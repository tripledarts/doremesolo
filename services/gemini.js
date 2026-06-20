const axios = require('axios');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function rankSongsByMood(songs, userBPM, userMood, userVocals) {
  const songList = songs
    .slice(0, 15)
    .map(s => `${s.name} by ${s.artists[0].name} (ID: ${s.id})`)
    .join('\n');

  const prompt = `You are a music curator. The user is exercising at ${userBPM} BPM with mood "${userMood}". They prefer ${userVocals} vocals.

Rank these songs from best to worst match:
${songList}

Return a JSON array with:
[
  { track_id: "spotify_id", reason: "1-sentence why it matches", match_score: 0-100 }
]

Be strict: only highly relevant matches score >70. Respond ONLY with valid JSON, no other text.`;

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

    const content = response.data.candidates[0].content.parts[0].text;
    const ranking = JSON.parse(content);
    return ranking;
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return [];
  }
}

module.exports = { rankSongsByMood };
