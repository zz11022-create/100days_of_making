let noPawsEnabled = false;
let banner = null;

function createBanner() {
  if (banner) return;

  banner = document.createElement("div");
  banner.setAttribute("id", "nopaws-banner");
  banner.innerHTML = `
    <div class="nopaws-pill">
      <div class="nopaws-icon">🐾</div>
      <div class="nopaws-copy">
        <div class="nopaws-title">NoPaws Mode</div>
        <div class="nopaws-subtitle">Input temporarily protected</div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.id = "nopaws-style";
  style.textContent = `
    #nopaws-banner {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
        "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    }

    #nopaws-banner .nopaws-pill {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 220px;
      padding: 12px 14px;
      border-radius: 999px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.18) 100%),
        linear-gradient(135deg, rgba(235,240,255,0.7), rgba(222,215,255,0.55));
      border: 1px solid rgba(255,255,255,0.42);
      box-shadow:
        0 10px 30px rgba(91, 102, 150, 0.16),
        inset 0 1px 0 rgba(255,255,255,0.65);
      backdrop-filter: blur(20px) saturate(150%);
      -webkit-backdrop-filter: blur(20px) saturate(150%);
      color: rgba(28,28,30,0.92);
    }

    #nopaws-banner .nopaws-icon {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      background: linear-gradient(
        180deg,
        rgba(255,255,255,0.65) 0%,
        rgba(255,255,255,0.24) 100%
      );
      border: 1px solid rgba(255,255,255,0.48);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.72);
      flex-shrink: 0;
    }

    #nopaws-banner .nopaws-copy {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    #nopaws-banner .nopaws-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    #nopaws-banner .nopaws-subtitle {
      margin-top: 3px;
      font-size: 11.5px;
      color: rgba(60,60,67,0.72);
      letter-spacing: -0.01em;
    }
  `;

  if (!document.getElementById("nopaws-style")) {
    document.documentElement.appendChild(style);
  }

  document.documentElement.appendChild(banner);
}

function removeBanner() {
  if (banner) {
    banner.remove();
    banner = null;
  }
}

document.addEventListener(
  "keydown",
  (event) => {
    if (!noPawsEnabled) return;

    const allowedKeys = ["Escape"];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  },
  true
);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TOGGLE_NOPAWS_MODE") {
    noPawsEnabled = message.enabled;

    if (noPawsEnabled) {
      createBanner();
    } else {
      removeBanner();
    }
  }
});

chrome.storage.sync.get(["noPawsEnabled"], (result) => {
  noPawsEnabled = result.noPawsEnabled || false;
  if (noPawsEnabled) {
    createBanner();
  }
});