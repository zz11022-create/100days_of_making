const express = require("express");
const Datastore = require("nedb");
const path = require("path");

// Load .env if dotenv is available (optional)
try { require("dotenv").config(); } catch (e) {}

const app = express();
const PORT = 3000;

app.use(express.json());

const db = new Datastore({ filename: "sessions.db", autoload: true });

app.use("/final", express.static(path.join(__dirname, "public")));

app.get("/final", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Mock Cat Data ────────────────────────────────────────────────────────────
// personality fields: energy (1-5), vocal (1-5), social (1-5), affectionate (1-5)
const mockCats = [
  {
    id: "mock_001",
    name: "Luna",
    age: "3 years",
    description: "Luna is a gentle tortoiseshell who takes time to warm up. She loves quiet evenings by the window and will slowly become your devoted shadow once she trusts you.",
    personality: { energy: 2, vocal: 1, social: 2, affectionate: 3 },
    apartment: true,
    shelter: { name: "NYC Animal Care Centers", city: "Manhattan, NY", adoptionId: "ACC-2024-8821", url: "https://www.nycacc.org" }
  },
  {
    id: "mock_002",
    name: "Mochi",
    age: "1 year",
    description: "Mochi is a tiny bundle of unstoppable energy! This orange tabby kitten wants to play all day and will zoom through your apartment at full speed.",
    personality: { energy: 5, vocal: 3, social: 4, affectionate: 4 },
    apartment: true,
    shelter: { name: "Brooklyn Animal Care Centers", city: "Brooklyn, NY", adoptionId: "ACC-2024-9034", url: "https://www.nycacc.org" }
  },
  {
    id: "mock_003",
    name: "Shadow",
    age: "5 years",
    description: "Shadow is a regal black cat who prefers solitude and observes the world from his favorite windowsill. He's not antisocial — just very selective about his company.",
    personality: { energy: 1, vocal: 1, social: 1, affectionate: 2 },
    apartment: true,
    shelter: { name: "Queens Animal Care Centers", city: "Queens, NY", adoptionId: "ACC-2024-7612", url: "https://www.nycacc.org" }
  },
  {
    id: "mock_004",
    name: "Biscuit",
    age: "2 years",
    description: "Biscuit is the ultimate people-cat. This golden tabby runs to greet everyone at the door and demands cuddles at all times. Perfect for families!",
    personality: { energy: 3, vocal: 4, social: 5, affectionate: 5 },
    apartment: true,
    shelter: { name: "Happy Paws Rescue", city: "Hoboken, NJ", adoptionId: "HPR-2024-0445", url: "https://happypawsrescue.org" }
  },
  {
    id: "mock_005",
    name: "Cleo",
    age: "4 years",
    description: "Cleo is a chatty Siamese mix who will narrate her entire day to you. She loves interactive play and follows her person from room to room.",
    personality: { energy: 4, vocal: 5, social: 4, affectionate: 4 },
    apartment: false,
    shelter: { name: "Anjellicle Cats Rescue", city: "New York, NY", adoptionId: "ANJEL-2024-112", url: "https://anjellicle.org" }
  },
  {
    id: "mock_006",
    name: "Oliver",
    age: "6 years",
    description: "Oliver is the perfect couch companion. This laid-back British Shorthair loves naps, gentle strokes, and watching TV with his person. No surprises, please.",
    personality: { energy: 1, vocal: 2, social: 3, affectionate: 4 },
    apartment: true,
    shelter: { name: "ASPCA Adoption Center", city: "New York, NY", adoptionId: "ASPCA-2024-8823", url: "https://www.aspca.org/adopt" }
  },
  {
    id: "mock_007",
    name: "Nala",
    age: "2 years",
    description: "Nala came from a hoarding situation and is still learning to trust humans. With patience and a quiet home, she blossoms into a deeply loving companion.",
    personality: { energy: 2, vocal: 1, social: 1, affectionate: 3 },
    apartment: true,
    shelter: { name: "Little Wanderers NYC", city: "Bronx, NY", adoptionId: "LW-2024-0567", url: "https://littlewanderersnyc.org" }
  },
  {
    id: "mock_008",
    name: "Peanut",
    age: "1 year",
    description: "Peanut is a curious, playful grey kitten who investigates everything. He's social, adaptable, and great with other cats. Always in motion!",
    personality: { energy: 5, vocal: 3, social: 5, affectionate: 3 },
    apartment: true,
    shelter: { name: "City Critters NYC", city: "New York, NY", adoptionId: "CC-2024-3344", url: "https://citycritters.org" }
  },
  {
    id: "mock_009",
    name: "Rosie",
    age: "7 years",
    description: "Rosie is a senior cat looking for her forever home. She's calm, affectionate, and perfectly content to spend her golden years curled up with you.",
    personality: { energy: 1, vocal: 2, social: 3, affectionate: 5 },
    apartment: true,
    shelter: { name: "Zani's Furry Friends", city: "Jersey City, NJ", adoptionId: "ZFF-2024-0089", url: "https://zanisfurryfriends.org" }
  },
  {
    id: "mock_010",
    name: "Tiger",
    age: "3 years",
    description: "Tiger is an adventure-loving tabby who needs space to roam. He's friendly and talkative but needs vigorous interactive play every day to stay happy.",
    personality: { energy: 4, vocal: 4, social: 4, affectionate: 3 },
    apartment: false,
    shelter: { name: "North Shore Animal League", city: "Port Washington, NY", adoptionId: "NSAL-2024-5521", url: "https://www.animalleague.org" }
  }
];

// ─── Compatibility Scoring ────────────────────────────────────────────────────
function computeCompatibility(prefs, cat) {
  const p = cat.personality;
  let score = 100;
  score -= Math.abs(prefs.energy - p.energy) * 6;
  score -= Math.abs(prefs.noise - p.vocal) * 5;
  score -= Math.abs(prefs.social - p.social) * 5;
  score -= Math.abs(prefs.cuddle - p.affectionate) * 5;

  if (prefs.apartment && cat.apartment) score += 3;
  if (prefs.firstTime && p.social >= 3 && p.energy <= 3) score += 2;
  if (prefs.home && p.social >= 3) score += 2;

  return Math.min(99, Math.max(70, Math.round(score)));
}

// ─── Petfinder API Integration (optional) ────────────────────────────────────
let petfinderToken = null;
let tokenExpiry = 0;

async function getPetfinderToken() {
  if (petfinderToken && Date.now() < tokenExpiry) return petfinderToken;
  const { default: fetch } = await import("node-fetch");
  const response = await fetch("https://api.petfinder.com/v2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.PETFINDER_API_KEY,
      client_secret: process.env.PETFINDER_SECRET
    })
  });
  const data = await response.json();
  petfinderToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return petfinderToken;
}

function inferPersonality(tags, age) {
  const tagStr = (tags || []).join(" ").toLowerCase();
  let energy = 3, vocal = 2, social = 3, affectionate = 3;

  if (/playful|active|energetic|high.energy|frisky/.test(tagStr)) energy = 4;
  if (/very.*playful|super.*active/.test(tagStr) || age === "Baby") energy = 5;
  if (/calm|laid.back|mellow|lazy|relaxed/.test(tagStr)) energy = 2;
  if (/very.*calm|senior/.test(tagStr) || age === "Senior") energy = 1;

  if (/vocal|chatty|talkative/.test(tagStr)) vocal = 4;
  if (/very.*vocal|extremely.*chatty/.test(tagStr)) vocal = 5;
  if (/quiet|silent/.test(tagStr)) vocal = 1;

  if (/friendly|social|outgoing|loves.*people/.test(tagStr)) social = 4;
  if (/very.*friendly|extremely.*social/.test(tagStr)) social = 5;
  if (/shy|reserved|timid|fearful|nervous/.test(tagStr)) social = 2;
  if (/very.*shy|extremely.*timid/.test(tagStr)) social = 1;

  if (/affectionate|cuddly|loving|snuggly|lap.cat/.test(tagStr)) affectionate = 4;
  if (/very.*affectionate|extremely.*cuddly/.test(tagStr)) affectionate = 5;
  if (/independent|aloof/.test(tagStr)) affectionate = 2;

  return { energy, vocal, social, affectionate };
}

async function fetchFromPetfinder(prefs, location, distance) {
  const { default: fetch } = await import("node-fetch");
  const token = await getPetfinderToken();
  const params = new URLSearchParams({
    type: "cat", location, distance: String(distance), limit: "20", status: "adoptable"
  });
  const response = await fetch(`https://api.petfinder.com/v2/animals?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  return (data.animals || []).map(animal => ({
    id: `pf_${animal.id}`,
    name: animal.name,
    age: animal.age,
    description: animal.description || "A wonderful cat looking for a loving home.",
    image: animal.photos?.[0]?.medium || null,
    personality: inferPersonality(animal.tags, animal.age),
    apartment: animal.attributes?.apartment_friendly ?? true,
    shelter: {
      name: animal.organization_id,
      city: animal.contact?.address?.city || location,
      adoptionId: String(animal.id),
      url: animal.url || `https://www.petfinder.com/cat/${animal.id}`
    }
  }));
}

// ─── API: Get Matched Cats ────────────────────────────────────────────────────
app.get("/final/api/cats", async (req, res) => {
  const { energy = 3, noise = 3, social = 3, cuddle = 3,
          apartment, firstTime, home, location, distance = 25 } = req.query;

  const prefs = {
    energy: Number(energy),
    noise: Number(noise),
    social: Number(social),
    cuddle: Number(cuddle),
    apartment: apartment === "true",
    firstTime: firstTime === "true",
    home: home === "true"
  };

  let cats = mockCats;
  let source = "mock";

  if (process.env.PETFINDER_API_KEY && process.env.PETFINDER_SECRET && location) {
    try {
      cats = await fetchFromPetfinder(prefs, location, distance);
      source = "petfinder";
    } catch (err) {
      console.log("Petfinder unavailable, using mock data:", err.message);
      cats = mockCats;
      source = "mock";
    }
  }

  const ts = Date.now();
  const scored = cats.map((cat, i) => ({
    id: cat.id,
    name: cat.name,
    age: cat.age,
    description: cat.description,
    image: cat.image || `https://cataas.com/cat?width=300&height=300&t=${ts}_${i}`,
    personality: cat.personality,
    shelter: cat.shelter,
    compatibility: computeCompatibility(prefs, cat)
  })).sort((a, b) => b.compatibility - a.compatibility);

  res.json({ source, location: location || "Near You", cats: scored });
});

// ─── API: Random Cat Image (kept for landing page) ───────────────────────────
app.get("/final/api/cat", (req, res) => {
  const imageUrl = "https://cataas.com/cat?width=300&height=300&t=" + Date.now();
  res.json({ image: imageUrl });
});

// ─── API: Save Session ────────────────────────────────────────────────────────
app.post("/final/api/session", (req, res) => {
  const session = { ...req.body, createdAt: Date.now() };
  db.insert(session, (err, newDoc) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(newDoc);
  });
});

app.get("/final/api/session", (req, res) => {
  db.find({}, (err, docs) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(docs);
  });
});

// ─── API: Save Adoption Application ──────────────────────────────────────────
app.post("/final/api/adoption", (req, res) => {
  const adoption = { ...req.body, type: "adoption_intent", createdAt: Date.now() };
  db.insert(adoption, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const applicationId = "APP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json({ success: true, applicationId });
  });
});

// ─── API: Schedule Shelter Visit ─────────────────────────────────────────────
app.post("/final/api/appointment", (req, res) => {
  const appointment = { ...req.body, type: "appointment", createdAt: Date.now() };
  db.insert(appointment, (err) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const confirmationId = "CONF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json({ success: true, confirmationId });
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/final`);
  if (process.env.PETFINDER_API_KEY) {
    console.log("Petfinder API: enabled");
  } else {
    console.log("Petfinder API: using mock data (set PETFINDER_API_KEY to enable)");
  }
});
