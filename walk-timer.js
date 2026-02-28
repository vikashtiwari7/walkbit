
const WALK_MESSAGES = [
  "Step away from the keyboard. You earned it.",
  "Hydrate. Stretch. Walk. Repeat.",
  "This is not procrastination. This is maintenance.",
  "Your next great idea might come on this walk.",
  "Blood flowing to your brain = better code.",
  "Go touch grass. For real.",
  "Every step now = fewer bugs later. Probably.",
  "Future you says: thank you for this walk.",
  "Even 5 minutes of movement changes everything.",
  "Your body called. It just wants a quick walk."
];

const params   = new URLSearchParams(window.location.search);
const totalSec = (parseInt(params.get("duration")) || 10) * 60;
const CIRC     = 753.98;
let remaining  = totalSec;
let timerInt   = null;
let completed  = false;

const progressEl  = document.getElementById("ringProgress");
const countdownEl = document.getElementById("countdown");
const msgEl       = document.getElementById("walkerMessage");
const mainContent = document.getElementById("mainContent");
const doneOverlay = document.getElementById("doneOverlay");

progressEl.style.strokeDasharray  = CIRC;
progressEl.style.strokeDashoffset = 0;

function fmt(s) {
  return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");
}
function pickMsg() {
  return WALK_MESSAGES[Math.floor(Math.random() * WALK_MESSAGES.length)];
}
function updateRing() {
  progressEl.style.strokeDashoffset = CIRC * (1 - remaining / totalSec);
}

countdownEl.textContent = fmt(remaining);
msgEl.textContent = pickMsg();

// FIX: logWalk now accepts a callback fired AFTER storage write completes
// This eliminates the race condition where the done overlay read stale data
function logWalk(mins, countAsBreak, callback) {
  chrome.storage.local.get(["breaksTakenToday", "totalWalkMinsToday"], (data) => {
    const newBreaks = (data.breaksTakenToday  || 0) + (countAsBreak ? 1 : 0);
    const newMins   = (data.totalWalkMinsToday || 0) + Math.max(1, mins);
    chrome.storage.local.set({ breaksTakenToday: newBreaks, totalWalkMinsToday: newMins }, () => {
      if (callback) callback(newBreaks, newMins);
    });
  });
}

timerInt = setInterval(() => {
  remaining--;
  countdownEl.textContent = fmt(remaining);
  updateRing();
  if (remaining % 60 === 0) msgEl.textContent = pickMsg();
  if (remaining <= 0) {
    clearInterval(timerInt);
    completed = true;
    // FIX: confetti + overlay shown INSIDE callback, after storage write
    logWalk(Math.round(totalSec / 60), true, (newBreaks, newMins) => {
      document.getElementById("doneBreaks").textContent = newBreaks;
      document.getElementById("doneMins").textContent   = newMins;
      triggerConfetti();
      mainContent.style.display = "none";
      doneOverlay.style.display = "flex";
    });
  }
}, 1000);

document.getElementById("doneEarlyBtn").addEventListener("click", () => {
  if (!completed) {
    clearInterval(timerInt);
    // FIX: always log as a break, minimum 1 min credit
    logWalk(Math.max(1, Math.round((totalSec - remaining) / 60)), true, () => window.close());
  } else {
    window.close();
  }
});

document.getElementById("skipBtn").addEventListener("click", () => {
  clearInterval(timerInt);
  window.close();  // Skip = no credit logged, intentional
});

function triggerConfetti() {
  const container = document.getElementById("confettiContainer");
  const colors = ["#22c55e","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#06b6d4"];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.cssText = [
      "left:"             + (Math.random()*100) + "%",
      "top:-10px",
      "background:"       + colors[Math.floor(Math.random()*colors.length)],
      "width:"            + (Math.random()*10+5) + "px",
      "height:"           + (Math.random()*10+5) + "px",
      "border-radius:"    + (Math.random()>.5 ? "50%" : "2px"),
      "animation-delay:"  + (Math.random()*2) + "s",
      "animation-duration:" + (Math.random()*2+2) + "s"
    ].join(";");
    container.appendChild(p);
  }
}
