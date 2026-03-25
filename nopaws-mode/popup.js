const toggleBtn = document.getElementById("toggleBtn");
const statusValue = document.getElementById("statusValue");
const statusDetail = document.getElementById("statusDetail");

function updateUI(isEnabled) {
  if (isEnabled) {
    toggleBtn.textContent = "Disable Protection";
    toggleBtn.classList.add("on");
    statusValue.textContent = "On";
    statusDetail.textContent =
      "Keyboard input is softly paused on the current page.";
  } else {
    toggleBtn.textContent = "Enable Protection";
    toggleBtn.classList.remove("on");
    statusValue.textContent = "Off";
    statusDetail.textContent =
      "Keyboard input is currently unprotected.";
  }
}

chrome.storage.sync.get(["noPawsEnabled"], (result) => {
  const isEnabled = result.noPawsEnabled || false;
  updateUI(isEnabled);
});

toggleBtn.addEventListener("click", async () => {
  chrome.storage.sync.get(["noPawsEnabled"], async (result) => {
    const currentState = result.noPawsEnabled || false;
    const newState = !currentState;

    chrome.storage.sync.set({ noPawsEnabled: newState }, async () => {
      updateUI(newState);

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "TOGGLE_NOPAWS_MODE",
          enabled: newState
        });
      }
    });
  });
});