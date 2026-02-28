
const DEV_MESSAGES = [
  "Your bugs will wait. Your back won't. 🚶",
  "git stash your work — time to walk! 🏃",
  "No PR is worth a herniated disc.",
  "console.log('Walk time!') — Your Spine 🦴",
  "Stack Overflow can wait. Your legs cannot.",
  "Even infinite loops need a break.",
  "sudo walk --now --force",
  "npm run walk",
  "Time to refactor your posture. 🚶‍♂️",
  "Merge conflict: desk vs. body. Body wins.",
  "Deploy yourself to the hallway for a few mins.",
  "Your stand-up just became literal. Walk!"
];

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "walkReminder" || alarm.name === "snoozedWalk") handleWalkAlarm();
  else if (alarm.name === "dailyReset") resetDailyStats();
});

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  if (notifId !== "walkReminderNotif") return;
  chrome.notifications.clear("walkReminderNotif");
  if (buttonIndex === 0) {
    // Start Walk
    chrome.storage.local.get(["walkDurationMins"], (data) => {
      const dur = data.walkDurationMins || 10;
      chrome.tabs.create({ url: chrome.runtime.getURL("walk-timer.html") + "?duration=" + dur });
    });
  } else if (buttonIndex === 1) {
    // Snooze 10 min
    chrome.alarms.create("snoozedWalk", { delayInMinutes: 10 });
  }
  // buttonIndex 2 = macOS "Settings" — added by OS, we safely ignore it
});

async function handleWalkAlarm() {
  const data = await chrome.storage.local.get(["quietEnabled", "quietStart", "quietEnd"]);
  if (data.quietEnabled && isInQuietHours(data.quietStart, data.quietEnd)) return;
  chrome.idle.queryState(300, (state) => {
    if (state !== "active") return;
    playChime();
    triggerWalkNotification();
  });
}

// ── Chime via Offscreen API ─────────────────────────────────────────────
async function playChime() {
  try {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: chrome.runtime.getURL("offscreen.html"),
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play walk reminder chime sound"
      });
    }
    // Small delay to ensure offscreen doc is ready
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "PLAY_CHIME" });
    }, 150);
    // Close offscreen doc after sound finishes (~3s)
    setTimeout(async () => {
      try { await chrome.offscreen.closeDocument(); } catch(e) {}
    }, 3500);
  } catch (e) {
    console.warn("[WalkBit] Chime error:", e.message);
  }
}

function triggerWalkNotification() {
  const msg = DEV_MESSAGES[Math.floor(Math.random() * DEV_MESSAGES.length)];
  chrome.notifications.create("walkReminderNotif", {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: "WalkBit — Time to Move! 🚶",
    message: msg,
    buttons: [{ title: "🚶 Start Walk" }, { title: "💤 Snooze 10 min" }],
    priority: 2,
    requireInteraction: true
  }, (notifId) => {
    if (chrome.runtime.lastError) {
      console.error("[WalkBit] Notification error:", chrome.runtime.lastError.message);
    }
  });
}

function resetDailyStats() {
  chrome.storage.local.get(["breaksTakenToday", "currentStreak"], (data) => {
    const newStreak = (data.breaksTakenToday || 0) >= 3 ? (data.currentStreak || 0) + 1 : 0;
    chrome.storage.local.set({ breaksTakenToday: 0, totalWalkMinsToday: 0, currentStreak: newStreak });
  });
}

function isInQuietHours(start, end) {
  if (!start || !end) return false;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? (cur >= s && cur <= e) : (cur >= s || cur <= e);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("dailyReset", { periodInMinutes: 1440 });
  chrome.storage.local.set({
    breaksTakenToday: 0, totalWalkMinsToday: 0, currentStreak: 0,
    isRunning: false, intervalMins: 60, walkDurationMins: 10,
    quietEnabled: false, quietStart: "22:00", quietEnd: "09:00"
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["isRunning", "intervalMins"], (data) => {
    if (data.isRunning) chrome.alarms.create("walkReminder", { periodInMinutes: data.intervalMins || 60 });
  });
});
