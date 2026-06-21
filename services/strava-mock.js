// Synthetic workout pace sequence — each value is one 2-second polling tick.
// Arc: immobile → walk warmup → jogging → running → wind-down → loops.
// BPM = step cadence (steps/min). Phases flow one-directionally with slight natural drift.
const WORKOUT_ARC = [
  // Still / just starting
  0, 0, 0, 6, 15, 26,

  // Picking up — first steps
  38, 50, 60, 67, 72, 76, 79, 81,

  // Walk settling in
  83, 85, 84, 87, 86, 88, 87, 90, 89, 91, 90, 92,

  // Transition to jog
  94, 97, 100, 103, 101, 105, 108, 106, 110,

  // Jogging — steady rhythm with small drift
  112, 114, 113, 115, 114, 116, 115, 117, 116, 118,
  117, 119, 118, 120, 119, 121, 120, 122, 121, 120,

  // Push toward run
  123, 125, 127, 129, 131, 133, 135, 137,

  // Running — drifts gently up and down, never more than 5 BPM from neighbours
  139, 141, 140, 142, 141, 143, 142, 144, 143, 145,
  144, 146, 145, 147, 146, 148, 147, 145, 146, 144,
  145, 143, 144, 142, 143, 141, 142, 140,

  // Wind-down — clear downward trend
  137, 134, 131, 128, 125, 122, 119, 116, 114,

  // Walk-out — tired but steady
  111, 108, 105, 102, 99, 96, 93, 90, 87,

  // Cooling
  83, 78, 72, 65, 56, 45, 32, 18,
];

let currentIndex = 0;

function getCurrentPace() {
  const bpm = WORKOUT_ARC[currentIndex];
  currentIndex = (currentIndex + 1) % WORKOUT_ARC.length;
  return bpm;
}

console.log(`✓ Synthetic workout arc loaded: ${WORKOUT_ARC.length} samples (~${Math.round(WORKOUT_ARC.length * 2)}s per loop)`);

module.exports = { getCurrentPace };
