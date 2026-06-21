// Synthetic workout pace sequence — each value is one 2-second polling tick.
// Arc: immobile → walk warmup → jogging → running → wind-down → loops.
// BPM = step cadence (steps/min). Zones: walk 70-100, jog 100-130, run 130-160.
// Natural variation baked in: drift, micro-surges, stumbles, rhythm shifts.
const WORKOUT_ARC = [
  // Still / just starting
  0, 0, 0, 8, 18, 30,

  // Picking up — uneven first steps
  44, 55, 61, 58, 66, 72, 69, 75, 78,

  // Walk settling in — rhythm finding itself
  82, 79, 84, 81, 86, 88, 84, 87, 90, 85, 89, 91,

  // Slight pace dip, then push
  86, 83, 88, 93, 97, 94, 99, 96,

  // Jogging — uneven early cadence
  102, 105, 101, 108, 104, 110, 107, 112, 109, 106,

  // Mid jog — rhythm clicks in, then wavers
  115, 118, 114, 119, 116, 121, 118, 115, 120, 117,
  123, 119, 122, 126, 121, 118, 124, 120,

  // Push to run — surges and settling
  128, 132, 129, 135, 131, 138, 134, 140, 137,

  // Running — natural drift up and down
  143, 140, 146, 142, 148, 144, 150, 146, 143,
  149, 152, 147, 144, 150, 153, 148, 145, 151,
  147, 143, 148, 145, 141, 146, 150, 144,

  // Brief surge then backing off
  155, 158, 153, 148, 143, 138,

  // Wind-down jog — unsteady
  133, 128, 124, 120, 116, 121, 115, 110, 107, 113,

  // Walk out — tired legs, inconsistent
  104, 99, 96, 101, 94, 89, 85, 91, 86, 81,

  // Cooling — slowing unevenly
  76, 71, 65, 58, 50, 40, 28, 14,
];

let currentIndex = 0;

function getCurrentPace() {
  const bpm = WORKOUT_ARC[currentIndex];
  currentIndex = (currentIndex + 1) % WORKOUT_ARC.length;
  return bpm;
}

console.log(`✓ Synthetic workout arc loaded: ${WORKOUT_ARC.length} samples (~${Math.round(WORKOUT_ARC.length * 2)}s per loop)`);

module.exports = { getCurrentPace };
