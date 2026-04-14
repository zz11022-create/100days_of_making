const captureArea = document.getElementById("captureArea");
const canvas = document.getElementById("traceCanvas");
const ctx = canvas.getContext("2d");

const currentStateEl = document.getElementById("currentState");
const stateDescriptionEl = document.getElementById("stateDescription");
const patternLabelEl = document.getElementById("patternLabel");
const patternDescriptionEl = document.getElementById("patternDescription");
const rhythmLabelEl = document.getElementById("rhythmLabel");
const rhythmDescriptionEl = document.getElementById("rhythmDescription");

const movementCountEl = document.getElementById("movementCount");
const clickCountEl = document.getElementById("clickCount");
const hoverZoneCountEl = document.getElementById("hoverZoneCount");
const avgSpeedEl = document.getElementById("avgSpeed");

const summaryStateEl = document.getElementById("summaryState");
const summaryClicksEl = document.getElementById("summaryClicks");
const summaryZonesEl = document.getElementById("summaryZones");
const summarySpeedEl = document.getElementById("summarySpeed");
const summaryTextEl = document.getElementById("summaryText");

const reflectBtn = document.getElementById("reflectBtn");
const resetBtn = document.getElementById("resetBtn");

const urlInput = document.getElementById("urlInput");
const loadUrlBtn = document.getElementById("loadUrlBtn");
const demoModeBtn = document.getElementById("demoModeBtn");
const fallbackDemoBtn = document.getElementById("fallbackDemoBtn");

const siteFrame = document.getElementById("siteFrame");
const demoContent = document.getElementById("demoContent");
const fallbackOverlay = document.getElementById("fallbackOverlay");
const surfaceLabel = document.getElementById("surfaceLabel");

let trails = [];
let clicks = [];
let hoverPoints = [];

let movementCount = 0;
let clickCount = 0;
let totalSpeed = 0;
let lastX = null;
let lastY = null;
let lastTime = null;

let hoverGrid = {};
let recentPositions = [];
let iframeLoadTimer = null;

function resizeCanvas() {
  const rect = captureArea.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function getRelativePosition(event) {
  const rect = captureArea.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function gridKey(x, y) {
  const size = 120;
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  return `${gx},${gy}`;
}

function registerMovement(event) {
  const { x, y } = getRelativePosition(event);
  const now = performance.now();

  movementCount++;

  let speed = 0;
  if (lastX !== null && lastY !== null && lastTime !== null) {
    const dx = x - lastX;
    const dy = y - lastY;
    const dt = Math.max(now - lastTime, 1);
    const dist = Math.sqrt(dx * dx + dy * dy);
    speed = dist / dt;
    totalSpeed += speed;
  }

  trails.push({
    x,
    y,
    life: 1,
    size: 2 + Math.random() * 2
  });

  const key = gridKey(x, y);
  hoverGrid[key] = (hoverGrid[key] || 0) + 1;

  hoverPoints.push({
    x,
    y,
    life: 0.55
  });

  recentPositions.push({ x, y, time: now });
  if (recentPositions.length > 80) recentPositions.shift();

  lastX = x;
  lastY = y;
  lastTime = now;

  updateInsights();
}

function registerClick(event) {
  const { x, y } = getRelativePosition(event);
  clickCount++;

  clicks.push({
    x,
    y,
    radius: 0,
    life: 1
  });

  updateInsights();
}

captureArea.addEventListener("mousemove", registerMovement);
captureArea.addEventListener("click", registerClick);

function getAverageSpeed() {
  if (movementCount <= 1) return 0;
  return totalSpeed / (movementCount - 1);
}

function getHoverZoneCount() {
  const threshold = 18;
  return Object.values(hoverGrid).filter((count) => count > threshold).length;
}

function getRepeatedPausePattern() {
  const threshold = 35;
  return Object.values(hoverGrid).filter((count) => count > threshold).length;
}

function getMovementSpread() {
  if (recentPositions.length < 10) return 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of recentPositions) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return (maxX - minX) * (maxY - minY);
}

function determineState() {
  if (movementCount < 10) {
    return {
      state: "Waiting",
      description: "Trace is listening for the first signs of motion, pause, and intent."
    };
  }

  const avgSpeed = getAverageSpeed();
  const hoverZones = getHoverZoneCount();
  const repeatedPause = getRepeatedPausePattern();
  const spread = getMovementSpread();

  if (clickCount > 10 && avgSpeed > 0.7) {
    return {
      state: "Fragmented",
      description: "The session appears interrupted and fast-moving, with attention distributed across abrupt interaction bursts."
    };
  }

  if (repeatedPause >= 2 && hoverZones <= 3) {
    return {
      state: "Hesitating",
      description: "Trace detects return patterns around nearby areas, suggesting evaluation, uncertainty, or close consideration."
    };
  }

  if (avgSpeed < 0.22 && hoverZones <= 3 && spread < 90000) {
    return {
      state: "Focused",
      description: "Movement remains measured and concentrated, indicating a more directed and sustained reading of the surface."
    };
  }

  return {
    state: "Drifting",
    description: "The session feels exploratory and lightly distributed, with attention moving across the surface without settling."
  };
}

function determinePattern() {
  const repeatedPause = getRepeatedPausePattern();
  const hoverZones = getHoverZoneCount();

  if (repeatedPause >= 3) {
    return {
      label: "Repeated pause zones",
      description: "A small cluster of revisited areas suggests the user is returning to specific points of interest."
    };
  }

  if (hoverZones >= 5) {
    return {
      label: "Wide-area scanning",
      description: "Interaction is spread across multiple regions, indicating broad browsing rather than narrow concentration."
    };
  }

  if (clickCount >= 8) {
    return {
      label: "Dense interaction activity",
      description: "Click frequency is rising, pointing to a more active or decision-heavy moment in the session."
    };
  }

  return {
    label: "Signal still forming",
    description: "Trace is collecting enough behavioral texture to translate this session into a clearer reading."
  };
}

function determineRhythm() {
  const avgSpeed = getAverageSpeed();

  if (movementCount < 10) {
    return {
      label: "Idle",
      description: "No stable tempo has emerged yet."
    };
  }

  if (clickCount > 10 && avgSpeed > 0.7) {
    return {
      label: "Broken tempo",
      description: "The pace feels uneven, with short bursts of interaction and frequent shifts in direction."
    };
  }

  if (avgSpeed < 0.25) {
    return {
      label: "Measured tempo",
      description: "Movement remains calm and paced, suggesting a slower and more attentive rhythm."
    };
  }

  return {
    label: "Adaptive tempo",
    description: "The session moves between stillness and motion, balancing browsing with moments of focus."
  };
}

function updateInsights() {
  const stateResult = determineState();
  const patternResult = determinePattern();
  const rhythmResult = determineRhythm();

  currentStateEl.textContent = stateResult.state;
  stateDescriptionEl.textContent = stateResult.description;

  patternLabelEl.textContent = patternResult.label;
  patternDescriptionEl.textContent = patternResult.description;

  rhythmLabelEl.textContent = rhythmResult.label;
  rhythmDescriptionEl.textContent = rhythmResult.description;

  movementCountEl.textContent = movementCount;
  clickCountEl.textContent = clickCount;
  hoverZoneCountEl.textContent = getHoverZoneCount();
  avgSpeedEl.textContent = getAverageSpeed().toFixed(2);
}

function generateSummaryText() {
  const mainState = determineState().state;
  const avgSpeed = getAverageSpeed().toFixed(2);
  const zones = getHoverZoneCount();
  const repeatedPause = getRepeatedPausePattern();

  if (mainState === "Focused") {
    return `This session remained relatively concentrated. Movement stayed measured, hover activity was limited, and attention gathered around a smaller set of regions. With an average motion speed of ${avgSpeed}, the overall reading suggests a directed and sustained interaction rather than casual scanning.`;
  }

  if (mainState === "Hesitating") {
    return `This session carried a reflective quality. Trace detected repeated returns to nearby areas, suggesting evaluation, comparison, or uncertainty before action. ${repeatedPause} stronger pause signals emerged across ${zones} meaningful hover zones, creating a pattern of careful reconsideration rather than immediate flow.`;
  }

  if (mainState === "Fragmented") {
    return `The interaction pattern appears visibly broken and fast-moving. Frequent clicks and abrupt directional shifts suggest a session shaped by interruption, switching, or decision pressure. Rather than settling into one path, attention moved in short and discontinuous bursts.`;
  }

  return `This session read as exploratory. Attention remained fluid across the surface, with ${zones} hover zones and an average motion speed of ${avgSpeed}. Instead of concentrating around one destination, the movement pattern suggests open-ended browsing, light searching, and a willingness to wander across multiple points of interest.`;
}

reflectBtn.addEventListener("click", () => {
  const mainState = determineState().state;
  summaryStateEl.textContent = mainState;
  summaryClicksEl.textContent = clickCount;
  summaryZonesEl.textContent = getHoverZoneCount();
  summarySpeedEl.textContent = getAverageSpeed().toFixed(2);
  summaryTextEl.textContent = generateSummaryText();
});

function resetSessionData() {
  trails = [];
  clicks = [];
  hoverPoints = [];
  hoverGrid = {};
  recentPositions = [];
  movementCount = 0;
  clickCount = 0;
  totalSpeed = 0;
  lastX = null;
  lastY = null;
  lastTime = null;

  currentStateEl.textContent = "Waiting";
  stateDescriptionEl.textContent = "Trace is listening for the first signs of motion, pause, and intent.";
  patternLabelEl.textContent = "No pattern yet";
  patternDescriptionEl.textContent = "Subtle repetition, directional drift, and hover density will appear here.";
  rhythmLabelEl.textContent = "Idle";
  rhythmDescriptionEl.textContent = "Trace will describe the pace of this session once movement begins.";

  movementCountEl.textContent = "0";
  clickCountEl.textContent = "0";
  hoverZoneCountEl.textContent = "0";
  avgSpeedEl.textContent = "0";

  summaryStateEl.textContent = "—";
  summaryClicksEl.textContent = "0";
  summaryZonesEl.textContent = "0";
  summarySpeedEl.textContent = "0";
  summaryTextEl.textContent =
    "No reflection yet. Interact with the live surface, then click “Reflect Session” to generate a session summary.";
}

resetBtn.addEventListener("click", resetSessionData);

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function openDemoMode() {
  demoContent.classList.remove("hidden");
  siteFrame.classList.add("hidden");
  fallbackOverlay.classList.add("hidden");
  surfaceLabel.textContent = "Demo Content Surface";
}

function attemptLoadUrl() {
  const input = normalizeUrl(urlInput.value);
  if (!input) return;

  demoContent.classList.add("hidden");
  fallbackOverlay.classList.add("hidden");
  siteFrame.classList.remove("hidden");
  siteFrame.src = input;
  surfaceLabel.textContent = "Embedded Website Surface";

  clearTimeout(iframeLoadTimer);

  iframeLoadTimer = setTimeout(() => {
    let blocked = false;
    try {
      const frameDoc = siteFrame.contentDocument || siteFrame.contentWindow.document;
      if (!frameDoc || frameDoc.body.innerHTML === "") {
        blocked = true;
      }
    } catch (error) {
      blocked = true;
    }

    if (blocked) {
      fallbackOverlay.classList.remove("hidden");
      surfaceLabel.textContent = "Blocked Embed Surface";
    }
  }, 1800);
}

loadUrlBtn.addEventListener("click", attemptLoadUrl);
demoModeBtn.addEventListener("click", openDemoMode);
fallbackDemoBtn.addEventListener("click", openDemoMode);

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    attemptLoadUrl();
  }
});

siteFrame.addEventListener("load", () => {
  clearTimeout(iframeLoadTimer);

  let blocked = false;
  try {
    const frameDoc = siteFrame.contentDocument || siteFrame.contentWindow.document;
    if (!frameDoc || !frameDoc.body) {
      blocked = true;
    }
  } catch (error) {
    blocked = true;
  }

  if (blocked) {
    fallbackOverlay.classList.remove("hidden");
    surfaceLabel.textContent = "Blocked Embed Surface";
  } else {
    fallbackOverlay.classList.add("hidden");
    surfaceLabel.textContent = "Embedded Website Surface";
  }
});

function drawBackgroundGlow() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(0, 51, 255, 0.04)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.01)");
  gradient.addColorStop(1, "rgba(255, 212, 0, 0.05)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundGlow();

  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life -= 0.012;

    ctx.beginPath();
    ctx.fillStyle = `rgba(0, 51, 255, ${t.life * 0.20})`;
    ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
    ctx.fill();

    if (t.life <= 0) {
      trails.splice(i, 1);
    }
  }

  for (let i = hoverPoints.length - 1; i >= 0; i--) {
    const h = hoverPoints[i];
    h.life -= 0.008;

    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 212, 0, ${h.life * 0.10})`;
    ctx.arc(h.x, h.y, 18, 0, Math.PI * 2);
    ctx.fill();

    if (h.life <= 0) {
      hoverPoints.splice(i, 1);
    }
  }

  for (let i = clicks.length - 1; i >= 0; i--) {
    const c = clicks[i];
    c.radius += 1.4;
    c.life -= 0.018;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 51, 255, ${c.life * 0.72})`;
    ctx.lineWidth = 2;
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (c.life <= 0) {
      clicks.splice(i, 1);
    }
  }

  requestAnimationFrame(animate);
}

openDemoMode();
resetSessionData();
updateInsights();
animate();