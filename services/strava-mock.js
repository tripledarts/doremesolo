const fs = require('fs');
const path = require('path');

let mockWorkoutData = null;
const defaultPaceSequence = [100, 110, 120, 130, 140, 150, 145, 140, 135, 130, 125, 120, 115, 110, 105];

// Load and parse mock data from Kaggle dataset
function loadMockData() {
  try {
    const metaPath = path.join(__dirname, '../mock-data/META-DATA_1160x1.csv');
    const spdPath = path.join(__dirname, '../mock-data/SPD-DATA_std_1160x69.csv');

    if (!fs.existsSync(metaPath) || !fs.existsSync(spdPath)) {
      console.warn('Mock data files not found. Using default pace sequence.');
      mockWorkoutData = {
        paceValues: defaultPaceSequence,
        currentIndex: 0
      };
      return true;
    }

    const metaContent = fs.readFileSync(metaPath, 'utf-8');
    const spdContent = fs.readFileSync(spdPath, 'utf-8');

    const metaLines = metaContent.split('\n').slice(1);
    const spdLines = spdContent.split('\n').slice(1);

    // Find a Running activity
    let runningActivityIndex = null;
    for (let i = 0; i < metaLines.length; i++) {
      const parts = metaLines[i].split(',');
      if (parts[1] && parts[1].includes('Running')) {
        runningActivityIndex = i;
        console.log(`✓ Found Running activity at index ${i}`);
        break;
      }
    }

    if (runningActivityIndex === null) {
      console.warn('No Running activity found. Using default pace sequence.');
      mockWorkoutData = {
        paceValues: defaultPaceSequence,
        currentIndex: 0
      };
      return true;
    }

    const paceLine = spdLines[runningActivityIndex];
    if (!paceLine) {
      throw new Error('No pace data for this activity');
    }

    const paceValues = paceLine.split(',')
      .map(v => {
        const num = parseFloat(v);
        if (isNaN(num) || num === 0) return null;
        // SPD data is z-score standardized (not raw m/s).
        // Map z-score range ~(-2 to +2) to BPM range ~(70-190), centered at 130.
        const bpm = Math.max(80, Math.min(180, 130 + num * 30));
        return bpm;
      })
      .filter(v => v !== null);

    if (paceValues.length === 0) {
      throw new Error('No valid pace values extracted');
    }

    const minPace = Math.min(...paceValues);
    const maxPace = Math.max(...paceValues);
    const avgPace = (paceValues.reduce((a, b) => a + b, 0) / paceValues.length).toFixed(0);

    console.log(`✓ Loaded ${paceValues.length} pace samples (range: ${minPace.toFixed(0)}-${maxPace.toFixed(0)} BPM, avg: ${avgPace})`);

    mockWorkoutData = {
      paceValues,
      currentIndex: 0
    };

    return true;
  } catch (error) {
    console.error('⚠ Error loading mock data:', error.message);
    mockWorkoutData = {
      paceValues: defaultPaceSequence,
      currentIndex: 0
    };
    return false;
  }
}

// Get current pace (simulates real-time polling from Strava)
function getCurrentPace() {
  if (!mockWorkoutData || mockWorkoutData.paceValues.length === 0) {
    return 120;
  }

  const pace = mockWorkoutData.paceValues[mockWorkoutData.currentIndex];
  mockWorkoutData.currentIndex = (mockWorkoutData.currentIndex + 1) % mockWorkoutData.paceValues.length;

  return Math.round(Math.max(80, Math.min(180, pace)));
}

// Initialize on load
loadMockData();

module.exports = { getCurrentPace };
