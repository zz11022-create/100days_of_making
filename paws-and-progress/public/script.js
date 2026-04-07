// ─── Global State ─────────────────────────────────────────────────────────────
let currentCatData = null; // Full cat data from API (includes personality + shelter)
let pendingAction = null;  // Action waiting to execute after tip modal closes

// ─── Scene Definitions ────────────────────────────────────────────────────────
const scenes = [
  {
    title: "First Meeting",
    getText: (name, p) => {
      if (p.social <= 2)
        return `${name} hides behind the couch, peeking out with wide, nervous eyes. This cat needs patience and a very quiet approach...`;
      if (p.social >= 4)
        return `${name} rushes to greet you at the door, meowing enthusiastically and rubbing against your legs!`;
      return `${name} peeks at you from behind the door, curious but a little cautious...`;
    },
    actions: [
      { label: "🙌 Gentle approach", mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "🍖 Offer a treat",   mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "🧘 Stay still",      mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "👋 Energetic hello", mood: "excited", emoji: "🤩", color: "#FFEA06" }
    ]
  },
  {
    title: "Feeding Time",
    getText: (name, p) => {
      if (p.vocal >= 4)
        return `${name} is loudly announcing their hunger from across the room — there's no ignoring this one!`;
      return `${name}'s tummy rumbles. It's meal time!`;
    },
    actions: [
      { label: "🥗 Fresh food",   mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "🙌 Hand feed",    mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "🥣 Leave bowl",   mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "⏭ Skip meal",    mood: "excited", emoji: "🤩", color: "#FFEA06" }
    ]
  },
  {
    title: "Play Session",
    getText: (name, p) => {
      if (p.energy >= 4)
        return `${name} is sprinting across the room in full zoom mode — this cat has energy to burn!`;
      if (p.energy <= 2)
        return `${name} stretches lazily and bats at a toy with mild interest. Even short play makes a big difference.`;
      return `${name} is looking at you with playful eyes, ready for some fun!`;
    },
    actions: [
      { label: "🎾 Play fetch",   mood: "excited", emoji: "🤩", color: "#FFEA06" },
      { label: "🧩 Puzzle toy",   mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "🤗 Cuddle time",  mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "🚪 Give space",   mood: "calm",    emoji: "😌", color: "#6AE4FF" }
    ]
  },
  {
    title: "Comfort Time",
    getText: (name, p) => {
      if (p.affectionate >= 4)
        return `${name} curls up next to you, purring loudly and kneading the blanket. Pure bliss.`;
      if (p.affectionate <= 2)
        return `${name} retreats to a quiet corner for a solo nap. Some cats recharge alone.`;
      return `${name} is a little sleepy and wants a cozy moment.`;
    },
    actions: [
      { label: "🛏 Soft blanket",    mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "💤 Let them nap",    mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "🎵 Gentle music",    mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "📸 Surprise photo",  mood: "excited", emoji: "🤩", color: "#FFEA06" }
    ]
  },
  {
    title: "Grooming Time",
    getText: (name, p) => {
      return `${name} is looking a bit scruffy. Time for some grooming?`;
    },
    actions: [
      { label: "🪮 Gentle brush", mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "🛁 Bath time",    mood: "excited", emoji: "🤩", color: "#FFEA06" },
      { label: "🧻 Quick wipe",   mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "✨ Skip it",      mood: "happy",   emoji: "😊", color: "#8BFF91" }
    ]
  },
  {
    title: "Night Routine",
    getText: (name, p) => {
      if (p.energy >= 4)
        return `${name} is still bouncing off the walls as midnight approaches. High-energy cats need a proper wind-down ritual.`;
      return `The day is ending. How will you say goodnight to ${name}?`;
    },
    actions: [
      { label: "🌙 Sleep together",  mood: "happy",   emoji: "😊", color: "#8BFF91" },
      { label: "🧸 Cozy bed",        mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "💬 Soft goodbye",    mood: "calm",    emoji: "😌", color: "#6AE4FF" },
      { label: "🎉 Last play burst", mood: "excited", emoji: "🤩", color: "#FFEA06" }
    ]
  }
];

// ─── Educational Tip Rules ────────────────────────────────────────────────────
const tipRules = [
  {
    match: (label, p) => label.includes("Energetic hello") && p.social <= 2,
    tip: "Shy cats are easily overwhelmed by sudden noise or fast movements. Sit quietly on the floor and let them approach you on their own terms — patience builds lasting trust."
  },
  {
    match: (label, p) => label.includes("Give space") && p.energy >= 4,
    tip: "High-energy cats need daily active play to stay mentally and physically healthy. Without it, they often become destructive or anxious. Try interactive wand toys for 15–20 minutes a day!"
  },
  {
    match: (label, p) => label.includes("Play fetch") && p.energy <= 2,
    tip: "Low-energy cats prefer short, gentle play sessions. Intense fetch games can stress them out. Follow your cat's lead — a few minutes of soft toy batting is perfect."
  },
  {
    match: (label) => label.includes("Skip meal"),
    tip: "Cats thrive on routine. Consistent meal times reduce anxiety and support digestive health. Skipping meals can cause stress and sometimes vomiting in sensitive cats."
  },
  {
    match: (label) => label.includes("Bath time"),
    tip: "Cats are expert self-groomers and rarely need baths. Forced bathing causes significant stress. Reserve it only for medical situations — a damp cloth wipe usually suffices."
  },
  {
    match: (label, p) => label.includes("Surprise photo") && p.affectionate <= 2,
    tip: "Independent cats value their personal space deeply. Sudden disturbances during rest can erode their trust over time. Let sleeping cats lie — respect earns their affection."
  },
  {
    match: (label, p) => label.includes("Last play burst") && p.energy <= 2,
    tip: "Gentle or shy cats need a calm wind-down before sleep. Sudden intense play at bedtime can cause anxiety and disrupt their sleep cycle. A soft goodnight works much better."
  }
];

function getActionTip(actionLabel, personality) {
  const rule = tipRules.find(r => r.match(actionLabel, personality));
  return rule ? rule.tip : null;
}

// ─── Personality → Tags Conversion ───────────────────────────────────────────
function personalityToTags(personality, age) {
  const tags = [];
  if (age) tags.push(age);

  const { energy, vocal, social, affectionate } = personality;

  if      (energy >= 5) tags.push("High Energy");
  else if (energy >= 4) tags.push("Playful");
  else if (energy <= 1) tags.push("Very Calm");
  else if (energy <= 2) tags.push("Laid-back");

  if      (vocal >= 4) tags.push("Very Vocal");
  else if (vocal <= 2) tags.push("Quiet");

  if      (social >= 4) tags.push("Very Social");
  else if (social <= 2) tags.push("Slow to Warm Up");

  if      (affectionate >= 4) tags.push("Cuddly");
  else if (affectionate <= 2) tags.push("Independent");

  return tags;
}

/**
 * Render cat detail into the #matched-pet-display card (Pawvera/Lupii layout)
 */
function renderPetDetail(cat, compatibility) {
  const container = document.getElementById("matched-pet-display");
  if (!container) return;

  const tags = personalityToTags(cat.personality, cat.age);
  const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join("");

  container.innerHTML = `
    <div class="image-container">
      <img id="pet-image" src="${cat.image}" alt="Photo of ${cat.name}">
    </div>

    <div class="content-container">
      <h2 id="pet-name">${cat.name}</h2>

      <div id="pet-tags">
        ${tagsHtml}
      </div>

      ${compatibility != null
        ? `<div><span class="match-score-inline">🐾 ${compatibility}% Match</span></div>`
        : ""}

      <div id="shelter-info">
        <h4>Shelter Info</h4>
        <p>🏡 ${cat.shelter.name}</p>
        <p>📍 ${cat.shelter.city}</p>
        <p>🆔 Adoption ID: ${cat.shelter.adoptionId}</p>
      </div>
    </div>
  `;
}

// ─── Image Helpers ────────────────────────────────────────────────────────────
function setImageById(id, imageUrl) {
  const img = document.getElementById(id);
  if (img) img.src = imageUrl;
}

async function loadLandingPhotos() {
  const ids = ["landingPet1", "landingPet2", "landingPet3"];
  for (let i = 0; i < ids.length; i++) {
    const imgUrl = "https://cataas.com/cat?width=150&height=150&t=" + Date.now() + "_" + i;
    setImageById(ids[i], imgUrl);
  }
}

function ensureMainPetImage() {
  const petImage = sessionStorage.getItem("petImage");
  if (!petImage) return;
  ["gamePetPhoto", "resultPetPhoto"].forEach(id => setImageById(id, petImage));
}

// ─── Debounce Utility ─────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Slider Value Display ─────────────────────────────────────────────────────
function updateSliderValue(sliderId, textId, suffix) {
  const slider = document.getElementById(sliderId);
  const text = document.getElementById(textId);
  if (!slider || !text) return;
  text.innerText = suffix ? slider.value + suffix : slider.value + "/5";
}

// ─── Fetch Matched Cat from API ───────────────────────────────────────────────
async function fetchMatchedCat(prefs, location, distance) {
  const params = new URLSearchParams({
    energy: prefs.energy,
    noise: prefs.noise,
    social: prefs.social,
    cuddle: prefs.cuddle,
    apartment: prefs.apartment,
    firstTime: prefs.firstTime,
    home: prefs.home,
    location: location || "",
    distance: distance || 25
  });

  const res = await fetch("/final/api/cats?" + params);
  const data = await res.json();

  // Pick top match (or random from top 3 for variety when ties)
  const top3 = data.cats.slice(0, 3);
  const topScore = top3[0]?.compatibility || 0;
  const tied = top3.filter(c => c.compatibility >= topScore - 2);
  const chosen = tied[Math.floor(Math.random() * tied.length)];

  // Update source badge
  const badge = document.getElementById("sourceBadge");
  if (badge) {
    badge.textContent = data.source === "petfinder" ? "Petfinder Live" : "Demo Data";
    badge.className = "source-badge " + (data.source === "petfinder" ? "source-live" : "source-mock");
  }

  return chosen || null;
}

// ─── Update Match Preview ─────────────────────────────────────────────────────
async function updateMatchedPet() {
  const energy  = Number(document.getElementById("energy")?.value  || 3);
  const noise   = Number(document.getElementById("noise")?.value   || 3);
  const social  = Number(document.getElementById("social")?.value  || 3);
  const cuddle  = Number(document.getElementById("cuddle")?.value  || 3);
  const apartment = document.getElementById("apartment")?.checked || false;
  const firstTime = document.getElementById("firstTime")?.checked || false;
  const home      = document.getElementById("home")?.checked      || false;
  const location  = document.getElementById("locationInput")?.value?.trim() || "";
  const distance  = Number(document.getElementById("distance")?.value || 25);

  // Show loading state via M3 card
  const container = document.getElementById("matched-pet-display");
  if (container) container.innerHTML = `<div class="loading">Finding cats near you...</div>`;

  try {
    const cat = await fetchMatchedCat({ energy, noise, social, cuddle, apartment, firstTime, home }, location, distance);

    if (!cat) return;
    currentCatData = cat;

    // Render M3 pet detail card
    renderPetDetail(cat, cat.compatibility);

    sessionStorage.setItem("compatibility", cat.compatibility);

  } catch (err) {
    console.error("fetch cat error:", err);
    const container = document.getElementById("matched-pet-display");
    if (container) container.innerHTML = `<div class="loading" style="color:red">Could not load cats — make sure the server is running (node server.js) and visit http://localhost:3000/final/</div>`;
  }
}

const debouncedUpdate = debounce(updateMatchedPet, 350);

// ─── Match Page Initialization ────────────────────────────────────────────────
async function initMatchPage() {
  // Slider display updates
  const sliders = [
    { slider: "energy",   text: "energyValue",   suffix: "/5" },
    { slider: "noise",    text: "noiseValue",    suffix: "/5" },
    { slider: "social",   text: "socialValue",   suffix: "/5" },
    { slider: "cuddle",   text: "cuddleValue",   suffix: "/5" },
    { slider: "distance", text: "distanceValue", suffix: " miles" }
  ];

  sliders.forEach(({ slider, text, suffix }) => {
    const el = document.getElementById(slider);
    const textEl = document.getElementById(text);
    if (!el || !textEl) return;
    textEl.innerText = el.value + suffix;
    el.addEventListener("input", () => {
      textEl.innerText = el.value + suffix;
      debouncedUpdate();
    });
  });

  ["apartment", "firstTime", "home"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", debouncedUpdate);
  });

  const locationInput = document.getElementById("locationInput");
  if (locationInput) {
    locationInput.addEventListener("input", debounce(updateMatchedPet, 600));
  }

  await updateMatchedPet();

  // "Meet Your Match" button
  document.getElementById("meetBtn")?.addEventListener("click", () => {
    if (!currentCatData) return;

    sessionStorage.setItem("petName",        currentCatData.name);
    sessionStorage.setItem("petType",        currentCatData.age || "Cat");
    sessionStorage.setItem("petDescription", currentCatData.description);
    sessionStorage.setItem("petImage",       currentCatData.image);
    sessionStorage.setItem("petId",          currentCatData.id);
    sessionStorage.setItem("shelterName",    currentCatData.shelter?.name || "");
    sessionStorage.setItem("shelterCity",    currentCatData.shelter?.city || "");
    sessionStorage.setItem("adoptionId",     currentCatData.shelter?.adoptionId || "");
    sessionStorage.setItem("shelterUrl",     currentCatData.shelter?.url || "");
    sessionStorage.setItem("petPersonality", JSON.stringify(currentCatData.personality));
    sessionStorage.setItem("compatibility",  currentCatData.compatibility);

    sessionStorage.setItem("gameData",      JSON.stringify([]));
    sessionStorage.setItem("currentRound",  "0");
    sessionStorage.setItem("savedSession",  "false");

    window.location.href = "game.html";
  });
}

// ─── Mood Map ─────────────────────────────────────────────────────────────────
function createMoodTile(item) {
  const tile = document.createElement("div");
  tile.className = "mood-tile";
  tile.style.background = item.color;
  tile.textContent = item.emoji;
  return tile;
}

function renderMoodMap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const gameData = JSON.parse(sessionStorage.getItem("gameData")) || [];
  gameData.forEach(item => container.appendChild(createMoodTile(item)));
}

// ─── Educational Tip Modal ────────────────────────────────────────────────────
function showTip(tipMessage, catName, onClose) {
  const overlay  = document.getElementById("tipOverlay");
  const textEl   = document.getElementById("tipText");
  const labelEl  = document.getElementById("tipCatLabel");
  const closeBtn = document.getElementById("tipClose");
  if (!overlay) { onClose(); return; }

  if (textEl)  textEl.innerText  = tipMessage;
  if (labelEl) labelEl.innerText = `About ${catName}:`;

  overlay.style.display = "flex";

  const handler = () => {
    overlay.style.display = "none";
    closeBtn.removeEventListener("click", handler);
    onClose();
  };
  closeBtn.addEventListener("click", handler);
}

// ─── Game Round Rendering ─────────────────────────────────────────────────────
function renderGameRound(roundIndex) {
  const scene = scenes[roundIndex];
  if (!scene) return;

  const petName       = sessionStorage.getItem("petName") || "Whiskers";
  const personality   = JSON.parse(sessionStorage.getItem("petPersonality") || "null") ||
                        { energy: 3, vocal: 3, social: 3, affectionate: 3 };

  const roundText    = document.getElementById("roundText");
  const sceneTitle   = document.getElementById("sceneTitle");
  const sceneText    = document.getElementById("sceneText");
  const progressFill = document.getElementById("progressFill");
  const actionsGrid  = document.getElementById("actionsGrid");
  const gameName     = document.querySelector(".game-card .pet-name");

  if (roundText)    roundText.innerText    = `Round ${roundIndex + 1} of ${scenes.length}`;
  if (sceneTitle)   sceneTitle.innerText   = scene.title;
  if (sceneText)    sceneText.innerText    = scene.getText(petName, personality);
  if (progressFill) progressFill.style.width = `${((roundIndex + 1) / scenes.length) * 100}%`;
  if (gameName)     gameName.innerText     = petName;

  if (actionsGrid) {
    actionsGrid.innerHTML = "";
    scene.actions.forEach(action => {
      const btn = document.createElement("button");
      btn.className   = "action-btn";
      btn.textContent = action.label;
      btn.addEventListener("click", () => handleAction(action, personality, petName));
      actionsGrid.appendChild(btn);
    });
  }

  renderMoodMap("moodMap");
}

// ─── Handle Action with Tip Logic ────────────────────────────────────────────
function handleAction(action, personality, petName) {
  const tip = getActionTip(action.label, personality);

  const proceed = () => {
    const gameData = JSON.parse(sessionStorage.getItem("gameData")) || [];
    gameData.push(action);
    sessionStorage.setItem("gameData", JSON.stringify(gameData));

    let currentRound = Number(sessionStorage.getItem("currentRound")) || 0;
    currentRound++;
    sessionStorage.setItem("currentRound", currentRound);

    if (currentRound >= scenes.length) {
      window.location.href = "result.html";
    } else {
      renderGameRound(currentRound);
    }
  };

  if (tip) {
    // Disable all action buttons while tip is showing
    document.querySelectorAll(".action-btn").forEach(btn => btn.disabled = true);
    showTip(tip, petName, proceed);
  } else {
    proceed();
  }
}

// ─── Result Page ──────────────────────────────────────────────────────────────
function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

async function saveSession(score, petName, gameData) {
  if (sessionStorage.getItem("savedSession") === "true") return;

  const shelterName = sessionStorage.getItem("shelterName") || "";
  const adoptionId  = sessionStorage.getItem("adoptionId") || "";

  try {
    await fetch("/final/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pet: petName, compatibility: score, moods: gameData, shelterName, adoptionId })
    });
    sessionStorage.setItem("savedSession", "true");
  } catch (err) {
    console.log("save session error:", err);
  }
}

function buildResultPage() {
  const score          = sessionStorage.getItem("compatibility") || "79";
  const petName        = sessionStorage.getItem("petName")        || "Whiskers";
  const petType        = sessionStorage.getItem("petType")        || "Cat";
  const petDescription = sessionStorage.getItem("petDescription") || "";
  const shelterName    = sessionStorage.getItem("shelterName")    || "";
  const shelterCity    = sessionStorage.getItem("shelterCity")    || "";
  const adoptionId     = sessionStorage.getItem("adoptionId")     || "";
  const shelterUrl     = sessionStorage.getItem("shelterUrl")     || "";
  const gameData       = JSON.parse(sessionStorage.getItem("gameData")) || [];

  // Pet card
  document.getElementById("resultPetName") && (document.getElementById("resultPetName").innerText = petName);
  document.getElementById("resultPetAge")  && (document.getElementById("resultPetAge").innerText  = petType);
  document.getElementById("resultPetDesc") && (document.getElementById("resultPetDesc").innerText = petDescription);
  document.getElementById("finalScore")    && (document.getElementById("finalScore").innerText    = score + "%");

  // Shelter CTA card
  if (shelterName) {
    const ctaCard = document.getElementById("shelterCtaCard");
    if (ctaCard) ctaCard.style.display = "";
    document.getElementById("resultShelterName") && (document.getElementById("resultShelterName").innerText = shelterName);
    document.getElementById("resultShelterCity") && (document.getElementById("resultShelterCity").innerText = shelterCity);
    document.getElementById("resultAdoptionId")  && (document.getElementById("resultAdoptionId").innerText  = adoptionId);
  }

  renderMoodMap("resultMoodMap");

  // Mood tags + care list
  const moodCount = {};
  const careList = document.getElementById("careList");
  if (careList) {
    careList.innerHTML = "";
    gameData.forEach((item, index) => {
      moodCount[item.mood] = (moodCount[item.mood] || 0) + 1;
      const p = document.createElement("p");
      p.innerText = `Round ${index + 1}: ${item.label} → ${item.emoji} ${capitalize(item.mood)}`;
      careList.appendChild(p);
    });
  }

  const moodTags = document.getElementById("moodTags");
  if (moodTags) {
    moodTags.innerHTML = "";
    Object.keys(moodCount).forEach(key => {
      const tag = document.createElement("div");
      tag.className = "mood-tag";
      tag.innerText = `${capitalize(key)} × ${moodCount[key]}`;
      moodTags.appendChild(tag);
    });
  }

  const summaryText = document.getElementById("summaryText");
  if (summaryText) {
    if ((moodCount.happy || 0) >= 3)
      summaryText.innerText = "You brought so much joy to your matched cat! Your caring nature really shines through.";
    else if ((moodCount.calm || 0) >= 3)
      summaryText.innerText = "You created a peaceful, comforting environment. Your cat felt truly safe with you.";
    else
      summaryText.innerText = "You and your cat had an energetic session full of stimulation and surprise!";
  }

  // Schedule Visit button
  document.getElementById("scheduleBtn")?.addEventListener("click", () => openScheduleModal(petName, shelterName));

  // Save Profile button
  document.getElementById("saveProfileBtn")?.addEventListener("click", () => saveAdoptionProfile(petName, score, shelterName, adoptionId, shelterUrl, gameData));

  // Appointment modal
  document.getElementById("apptCancel")?.addEventListener("click", () => {
    document.getElementById("scheduleOverlay").style.display = "none";
  });
  document.getElementById("apptConfirm")?.addEventListener("click", submitAppointment);

  // Confirm modal close
  document.getElementById("confirmClose")?.addEventListener("click", () => {
    document.getElementById("confirmOverlay").style.display = "none";
  });

  saveSession(score, petName, gameData);
}

// ─── Schedule Visit Modal ─────────────────────────────────────────────────────
function openScheduleModal(petName, shelterName) {
  const overlay = document.getElementById("scheduleOverlay");
  if (!overlay) return;

  document.getElementById("apptCatName")     && (document.getElementById("apptCatName").innerText     = petName);
  document.getElementById("apptShelterName") && (document.getElementById("apptShelterName").innerText = shelterName);

  // Default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateInput = document.getElementById("apptDate");
  if (dateInput) dateInput.value = tomorrow.toISOString().split("T")[0];

  overlay.style.display = "flex";
}

async function submitAppointment() {
  const userName    = document.getElementById("apptUserName")?.value?.trim();
  const email       = document.getElementById("apptEmail")?.value?.trim();
  const date        = document.getElementById("apptDate")?.value;
  const time        = document.getElementById("apptTime")?.value;
  const petName     = sessionStorage.getItem("petName") || "";
  const shelterName = sessionStorage.getItem("shelterName") || "";
  const petId       = sessionStorage.getItem("petId") || "";

  if (!userName || !email || !date) {
    alert("Please fill in your name, email, and preferred date.");
    return;
  }

  const confirmBtn = document.getElementById("apptConfirm");
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    const res = await fetch("/final/api/appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId, petName, shelterName, date, time, userName, userEmail: email })
    });
    const data = await res.json();

    document.getElementById("scheduleOverlay").style.display = "none";

    const confirmOverlay = document.getElementById("confirmOverlay");
    const confirmText    = document.getElementById("confirmText");
    if (confirmText) {
      confirmText.innerText =
        `Your visit to see ${petName} at ${shelterName} is booked for ${date} at ${time}.\n\nConfirmation: ${data.confirmationId}\nWe'll send details to ${email}.`;
    }
    if (confirmOverlay) confirmOverlay.style.display = "flex";

  } catch (err) {
    console.log("appointment error:", err);
    alert("Could not schedule visit. Please try again.");
  } finally {
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

// ─── Save Adoption Profile ────────────────────────────────────────────────────
function saveAdoptionProfile(petName, score, shelterName, adoptionId, shelterUrl, gameData) {
  const personality = JSON.parse(sessionStorage.getItem("petPersonality") || "{}");
  const description = sessionStorage.getItem("petDescription") || "";

  const moodSummary = gameData.map((item, i) =>
    `Round ${i + 1}: ${item.label} → ${capitalize(item.mood)}`
  ).join("\n");

  const profile = [
    "=== PAWS & PROGRESS — ADOPTION PROFILE ===",
    "",
    `Cat Name:     ${petName}`,
    `Compatibility: ${score}%`,
    `Shelter:      ${shelterName}`,
    `Adoption ID:  ${adoptionId}`,
    shelterUrl ? `Shelter Link: ${shelterUrl}` : "",
    "",
    `Description: ${description}`,
    "",
    "Cat Personality Traits:",
    personality.energy      != null ? `  Energy:      ${personality.energy}/5` : "",
    personality.vocal       != null ? `  Vocal:       ${personality.vocal}/5` : "",
    personality.social      != null ? `  Social:      ${personality.social}/5` : "",
    personality.affectionate != null ? `  Affectionate: ${personality.affectionate}/5` : "",
    "",
    "Care Session Results:",
    moodSummary,
    "",
    `Generated: ${new Date().toLocaleString()}`,
    "=== paws-and-progress.app ==="
  ].filter(Boolean).join("\n");

  const blob = new Blob([profile], { type: "text/plain" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `adoption-profile-${petName.toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page Router ──────────────────────────────────────────────────────────────
async function initPage() {
  const page = document.body.dataset.page;

  if (page === "index") {
    try { await loadLandingPhotos(); } catch (e) { console.log("landing photos error:", e); }
  }

  if (page === "match") {
    await initMatchPage();
  }

  if (page === "game") {
    ensureMainPetImage();
    const currentRound = Number(sessionStorage.getItem("currentRound")) || 0;
    renderGameRound(currentRound);
  }

  if (page === "result") {
    ensureMainPetImage();
    buildResultPage();
  }
}

window.onload = initPage;
