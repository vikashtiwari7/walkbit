
const ctx = new (window.AudioContext || window.webkitAudioContext)();

// 3-note ascending chime: C5 → E5 → G5 (pleasant, gentle)
function playChime() {
  const notes = [
    { freq: 523.25, t: 0.00 },   // C5
    { freq: 659.25, t: 0.18 },   // E5
    { freq: 783.99, t: 0.36 }    // G5
  ];

  notes.forEach(({ freq, t }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    // Slight reverb feel using a second softer oscillator
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc.type  = "sine";
    osc2.type = "sine";
    osc.frequency.value  = freq;
    osc2.frequency.value = freq * 2;  // Octave harmonic for warmth

    const now = ctx.currentTime + t;
    // Main note envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    // Harmonic envelope (softer, decays faster)
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.start(now);  osc.stop(now + 1.0);
    osc2.start(now); osc2.stop(now + 0.5);
  });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "PLAY_CHIME") {
    if (ctx.state === "suspended") ctx.resume().then(playChime);
    else playChime();
  }
});
