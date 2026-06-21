// Synthetic workout pace sequence — each value is one 2-second polling tick.
// Arc: immobile → brisk walk warmup → jogging → running → wind-down → loops.
// BPM = step cadence (steps/min). Zones: walk 70-100, jog 100-130, run 130-160.
const WORKOUT_ARC = [
  // Immobile / just starting (0-8s)
  0, 0, 0, 10, 22,
  // Picking up — slow walk warmup (10-30s)
  38, 52, 63, 70, 76, 80, 83, 85, 86,
  // Brisk walk (32-50s)
  88, 90, 91, 93, 92, 94, 93, 95, 94,
  // Jogging transition (52-66s)
  98, 103, 108, 113, 116, 118, 120,
  // Steady jog (68-100s)
  122, 121, 123, 120, 124, 122, 123, 125, 121, 124, 122, 123, 125, 123, 122, 124,
  // Picking up to run (102-116s)
  127, 130, 134, 138, 141, 143, 145,
  // Running (118-148s)
  146, 148, 145, 147, 149, 146, 148, 150, 147, 146, 148, 149, 147, 148, 146,
  // Wind-down (150-166s)
  142, 137, 130, 124, 117, 110, 103, 96,
  // Walk cooldown (168-180s)
  91, 88, 85, 82, 79, 72,
  // Brief rest before loop (182-188s)
  55, 38, 20
];

let currentIndex = 0;

function getCurrentPace() {
  const bpm = WORKOUT_ARC[currentIndex];
  currentIndex = (currentIndex + 1) % WORKOUT_ARC.length;
  return bpm;
}

console.log(`✓ Synthetic workout arc loaded: ${WORKOUT_ARC.length} samples (~${Math.round(WORKOUT_ARC.length * 2)}s per loop)`);

module.exports = { getCurrentPace };
