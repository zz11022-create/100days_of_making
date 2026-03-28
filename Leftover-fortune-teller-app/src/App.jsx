import React, { useMemo, useState } from "react";
import {
  Bell,
  Camera,
  Plus,
  Sparkles,
  Clock3,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { motion } from "framer-motion";
import "./App.css";

const ingredientLibrary = {
  milk: { days: 5, color: "#ffb3c1", emoji: "🥛" },
  egg: { days: 21, color: "#ffe066", emoji: "🥚" },
  spinach: { days: 4, color: "#b7ef8a", emoji: "🥬" },
  mushroom: { days: 5, color: "#ffd6a5", emoji: "🍄" },
  shrimp: { days: 2, color: "#ffad7a", emoji: "🦐" },
  tomato: { days: 6, color: "#ff8e8e", emoji: "🍅" },
  beef: { days: 4, color: "#ff9bb3", emoji: "🥩" },
  tofu: { days: 7, color: "#e9e3d5", emoji: "🧈" },
  cheese: { days: 10, color: "#ffd95e", emoji: "🧀" },
  avocado: { days: 3, color: "#9be282", emoji: "🥑" },
  onion: { days: 14, color: "#f1b7ff", emoji: "🧅" },
  rice: { days: 30, color: "#d9f0ff", emoji: "🍚" },
};

const starterItems = [
  { id: 1, name: "milk", daysLeft: 1 },
  { id: 2, name: "spinach", daysLeft: 3 },
  { id: 3, name: "mushroom", daysLeft: 2 },
  { id: 4, name: "egg", daysLeft: 8 },
  { id: 5, name: "shrimp", daysLeft: 1 },
  { id: 6, name: "tomato", daysLeft: 4 },
];

const fortunePool = [
  "You ignored this yesterday.",
  "Decay is a choice.",
  "This fridge remembers everything.",
  "Something in here is running out of patience.",
  "Tonight’s dinner is also a rescue mission.",
  "You still have time. Barely.",
];

const recipeTemplates = [
  "Pan-fry everything gently and pretend this was the plan.",
  "Turn it into a quick bowl and call it emotional meal prep.",
  "Cook quickly, season boldly, regret nothing.",
  "Use a pan, low effort, and a suspicious amount of confidence.",
  "Stir, taste, improvise, survive.",
];

function getIngredientMeta(name) {
  const key = name.toLowerCase().trim();
  return ingredientLibrary[key] || { days: 5, color: "#e8e8e8", emoji: "🍽️" };
}

function getStatus(daysLeft) {
  if (daysLeft <= 1) {
    return { label: "Critical", className: "status-critical" };
  }
  if (daysLeft <= 3) {
    return { label: "Warning", className: "status-warning" };
  }
  return { label: "Fresh", className: "status-fresh" };
}

function buildFortune(items) {
  if (!items.length) {
    return {
      headline: "Your fridge is eerily calm.",
      combo: "Nothing urgent right now.",
      recipe: "Add ingredients to awaken the prophecy.",
    };
  }

  const urgent = [...items].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
  const names = urgent.map((i) => i.name);
  const headline = fortunePool[urgent.length % fortunePool.length];
  const combo = `Use: ${names.join(" + ")}`;
  const recipe = recipeTemplates[names.length % recipeTemplates.length];

  return { headline, combo, recipe };
}

function PhoneFrame({ children }) {
  return (
    <div className="phone-frame">
      <div className="phone-topbar">
        <span>9:41</span>
        <span>◔◔◔</span>
      </div>
      <div className="phone-screen">{children}</div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [ingredients, setIngredients] = useState(starterItems);
  const [inputValue, setInputValue] = useState("");

  const fortune = useMemo(() => buildFortune(ingredients), [ingredients]);
  const urgentCount = ingredients.filter((item) => item.daysLeft <= 2).length;

  function addIngredient(name) {
    const clean = name.toLowerCase().trim();
    if (!clean) return;

    const meta = getIngredientMeta(clean);
    setIngredients((prev) => [
      {
        id: Date.now(),
        name: clean,
        daysLeft: meta.days,
      },
      ...prev,
    ]);
    setInputValue("");
    setScreen("home");
  }

  function decayOneDay() {
    setIngredients((prev) =>
      prev.map((item) => ({
        ...item,
        daysLeft: Math.max(0, item.daysLeft - 1),
      }))
    );
  }

  return (
    <div className="app-shell">
      <div className="page-title">
        <h1>Leftover Fortune Teller</h1>
        <p>
          A playful food-expiry app with bright cards, mild judgment, and small
          domestic prophecies.
        </p>
      </div>

      <div className="layout">
        <PhoneFrame>
          {screen === "home" && (
            <div className="screen-content">
              <div className="header-row">
                <div>
                  <p className="small-muted">Hi, Queena</p>
                  <h2>Your fridge is still under control.</h2>
                </div>
                <button className="icon-btn" onClick={() => setScreen("alerts")}>
                  <Bell size={20} />
                </button>
              </div>

              <div className="ingredient-grid">
                {ingredients.map((item) => {
                  const meta = getIngredientMeta(item.name);
                  const status = getStatus(item.daysLeft);

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ y: -4, rotate: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className={`ingredient-card ${
                        item.daysLeft <= 1 ? "urgent-pulse" : ""
                      }`}
                      style={{ backgroundColor: meta.color }}
                      onClick={() => setScreen("fate")}
                    >
                      <div className="ingredient-emoji">{meta.emoji}</div>
                      <div className="ingredient-name">{item.name}</div>
                      <div className="ingredient-footer">
                        <span>
                          {item.daysLeft} day{item.daysLeft === 1 ? "" : "s"} left
                        </span>
                        <span className={`status-chip ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <button className="primary-btn purple" onClick={() => setScreen("fate")}>
                <Sparkles size={18} />
                Generate Today’s Fate
              </button>

              <div className="two-col">
                <button className="info-card yellow" onClick={() => setScreen("add")}>
                  <div className="card-title">
                    <Plus size={18} />
                    Add ingredient
                  </div>
                  <p>Tell the fridge what you brought home.</p>
                </button>

                <button className="info-card green" onClick={decayOneDay}>
                  <div className="card-title">
                    <Clock3 size={18} />
                    Skip a day
                  </div>
                  <p>Advance the chaos for demo purposes.</p>
                </button>
              </div>
            </div>
          )}

          {screen === "add" && (
            <div className="screen-content">
              <button className="back-btn" onClick={() => setScreen("home")}>
                <ArrowLeft size={16} />
                Back
              </button>

              <h2>Add something new</h2>
              <p className="small-muted">
                Enter an ingredient and let the app estimate its shelf life.
              </p>

              <div className="form-card">
                <label>Ingredient</label>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="milk"
                />

                <div className="chip-wrap">
                  {Object.keys(ingredientLibrary)
                    .slice(0, 8)
                    .map((item) => (
                      <button
                        key={item}
                        className="mini-chip"
                        onClick={() => setInputValue(item)}
                      >
                        {item}
                      </button>
                    ))}
                </div>
              </div>

              <button className="primary-btn blue">
                <Camera size={18} />
                Scan instead
              </button>

              <button
                className="primary-btn orange"
                onClick={() => addIngredient(inputValue)}
              >
                <Plus size={18} />
                Add to fridge
              </button>
            </div>
          )}

          {screen === "fate" && (
            <div className="screen-content">
              <button className="back-btn" onClick={() => setScreen("home")}>
                <ArrowLeft size={16} />
                Back
              </button>

              <h2>Today’s Fate</h2>
              <p className="small-muted">
                A semi-useful prophecy based on your most neglected ingredients.
              </p>

              <motion.div
                initial={{ rotate: -2, scale: 0.98 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="fortune-card"
              >
                <div className="fortune-label">Fortune message</div>
                <div className="fortune-headline">“{fortune.headline}”</div>
                <div className="fortune-combo">{fortune.combo}</div>
                <div className="recipe-card">
                  <div className="fortune-label">Absurd recipe</div>
                  <div className="recipe-text">{fortune.recipe}</div>
                </div>
              </motion.div>

              <div className="reaction-row">
                <button className="reaction-btn reaction-yellow">
                  <div className="reaction-emoji">😭</div>
                  <div>accurate</div>
                </button>
                <button className="reaction-btn reaction-pink">
                  <div className="reaction-emoji">💀</div>
                  <div>cursed</div>
                </button>
                <button className="reaction-btn reaction-blue">
                  <div className="reaction-emoji">🤨</div>
                  <div>hmm</div>
                </button>
              </div>
            </div>
          )}

          {screen === "alerts" && (
            <div className="screen-content">
              <button className="back-btn" onClick={() => setScreen("home")}>
                <ArrowLeft size={16} />
                Back
              </button>

              <h2>Something is wrong</h2>
              <p className="small-muted">
                Your fridge has opinions about your recent behavior.
              </p>

              <div className="alert-list">
                <div className="alert-card red">
                  <div className="alert-row">
                    <AlertTriangle size={20} />
                    <div>
                      <div className="alert-title">Milk expires in 1 day</div>
                      <div className="alert-text">
                        This is not a warning. This is a countdown.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert-card yellow-soft">
                  <div className="alert-title">
                    {urgentCount} ingredients are being neglected
                  </div>
                  <div className="alert-text">
                    The mushrooms have noticed the pattern.
                  </div>
                </div>

                <div className="alert-card blue-soft">
                  <div className="alert-title">7-day save streak available</div>
                  <div className="alert-text">
                    Cook one urgent item today to keep your conscience intact.
                  </div>
                </div>
              </div>

              <button className="primary-btn purple" onClick={() => setScreen("fate")}>
                Fix it now
              </button>
            </div>
          )}
        </PhoneFrame>

        <div className="side-panel">
          <div className="side-card pink">
            <h3>Core concept</h3>
            <p>
              A playful app that tracks ingredients, visualizes shelf life, and
              generates a daily fortune based on what is closest to expiring.
            </p>
          </div>

          <div className="side-card green">
            <h3>Future vision</h3>
            <p>
              Later, this can connect to a smart fridge so ingredients are
              recognized automatically when placed inside, without manual input.
            </p>
          </div>

          <div className="side-card white">
            <h3>Quick editing notes</h3>
            <p>
              Change colors, ingredient defaults, or fortune text directly in
              the arrays at the top of the file.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}