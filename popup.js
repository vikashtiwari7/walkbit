
const $ = (id) => document.getElementById(id);

function init() {
  chrome.storage.local.get(null, (data) => {
    const iv = data.intervalMins || 60;
    const ivSel = $("intervalSelect");
    const stdOpts = [15, 30, 45, 60, 90];
    if (stdOpts.includes(iv)) {
      ivSel.value = String(iv);
    } else {
      ivSel.value = "custom";
      $("customIntervalGroup").style.display = "block";
      $("customInterval").value = iv;
    }
    $("walkDuration").value = data.walkDurationMins || 10;
    $("walkDurationLabel").textContent = (data.walkDurationMins || 10) + " min";
    $("quietToggle").checked = data.quietEnabled || false;
    $("quietStart").value = data.quietStart || "22:00";
    $("quietEnd").value   = data.quietEnd   || "09:00";
    if (data.quietEnabled) $("quietTimeInputs").style.display = "flex";
    refreshStats(data);
    updateStatusUI(data.isRunning, data.intervalMins || 60);
  });
}

function refreshStats(data) {
  $("breaksTaken").textContent = data.breaksTakenToday   || 0;
  $("walkMins").textContent    = data.totalWalkMinsToday || 0;
  $("streak").textContent      = "\uD83D\uDD25" + (data.currentStreak || 0);
}

// Live stats update — fires whenever walk-timer.js writes to storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const patch = {};
  if (changes.breaksTakenToday)   patch.breaksTakenToday   = changes.breaksTakenToday.newValue;
  if (changes.totalWalkMinsToday) patch.totalWalkMinsToday = changes.totalWalkMinsToday.newValue;
  if (changes.currentStreak)      patch.currentStreak      = changes.currentStreak.newValue;
  if (Object.keys(patch).length)  refreshStats(patch);
  if (changes.isRunning !== undefined) {
    updateStatusUI(changes.isRunning.newValue, null);
  }
});

function updateStatusUI(isRunning, intervalMins) {
  const dot  = $("statusDot");
  const txt  = $("statusText");
  const btn  = $("mainBtn");
  const next = $("nextBreakText");
  if (isRunning) {
    dot.classList.add("active");
    txt.textContent = "Active";
    btn.textContent = "\u23F9 Stop WalkBit";
    btn.className   = "main-btn stop";
    chrome.alarms.get("walkReminder", (alarm) => {
      if (alarm) {
        const mins = Math.round((alarm.scheduledTime - Date.now()) / 60000);
        next.textContent = "next in " + Math.max(0, mins) + "m";
      }
    });
  } else {
    dot.classList.remove("active");
    txt.textContent = "Inactive";
    btn.textContent = "\u25B6 Start WalkBit";
    btn.className   = "main-btn start";
    next.textContent = "";
  }
}

function getAndSaveSettings() {
  const sel = $("intervalSelect").value;
  const iv  = sel === "custom" ? Math.max(1, parseInt($("customInterval").value) || 60) : parseInt(sel);
  const walkDur     = parseInt($("walkDuration").value);
  const quietEnabled = $("quietToggle").checked;
  chrome.storage.local.set({
    intervalMins: iv, walkDurationMins: walkDur,
    quietEnabled, quietStart: $("quietStart").value, quietEnd: $("quietEnd").value
  });
  return iv;
}

$("intervalSelect").addEventListener("change", () => {
  $("customIntervalGroup").style.display = $("intervalSelect").value === "custom" ? "block" : "none";
  getAndSaveSettings();
});
$("customInterval").addEventListener("input", getAndSaveSettings);
$("walkDuration").addEventListener("input", () => {
  $("walkDurationLabel").textContent = $("walkDuration").value + " min";
  getAndSaveSettings();
});
$("quietToggle").addEventListener("change", () => {
  $("quietTimeInputs").style.display = $("quietToggle").checked ? "flex" : "none";
  getAndSaveSettings();
});
$("quietStart").addEventListener("change", getAndSaveSettings);
$("quietEnd").addEventListener("change",   getAndSaveSettings);

$("mainBtn").addEventListener("click", () => {
  chrome.storage.local.get(["isRunning"], (data) => {
    if (data.isRunning) {
      chrome.alarms.clear("walkReminder", () => {
        chrome.storage.local.set({ isRunning: false });
        updateStatusUI(false, null);
      });
    } else {
      const iv = getAndSaveSettings();
      chrome.alarms.create("walkReminder", { periodInMinutes: iv });
      chrome.storage.local.set({ isRunning: true, intervalMins: iv });
      updateStatusUI(true, iv);
    }
  });
});

$("walkNowBtn").addEventListener("click", () => {
  chrome.storage.local.get(["walkDurationMins"], (data) => {
    const dur = data.walkDurationMins || 10;
    chrome.tabs.create({ url: chrome.runtime.getURL("walk-timer.html") + "?duration=" + dur });
    window.close();
  });
});

init();
