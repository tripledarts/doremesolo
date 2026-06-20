class MockPaceGenerator {
  constructor() {
    this.currentBPM = 100;
    this.direction = 1;
  }

  getNextBPM() {
    const shift = Math.random() * 5 * this.direction;
    this.currentBPM += shift;

    if (this.currentBPM > 180) {
      this.currentBPM = 180;
      this.direction = -1;
    } else if (this.currentBPM < 80) {
      this.currentBPM = 80;
      this.direction = 1;
    }

    return Math.round(this.currentBPM);
  }

  getMockPaceData() {
    const bpm = this.getNextBPM();
    const stepsPerMinute = Math.round(bpm / 1.5);

    return {
      current_pace_bpm: bpm,
      steps_per_minute: stepsPerMinute,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { MockPaceGenerator };
