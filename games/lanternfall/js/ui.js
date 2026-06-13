(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG } = Lanternfall;

  class LanternfallUi {
    constructor(doc = document) {
      this.document = doc;
      this.toastTimer = null;
      this.callbacks = {};
      this.elements = {
        overlay: doc.getElementById("overlay"),
        seedInput: doc.getElementById("seedInput"),
        beginBtn: doc.getElementById("beginBtn"),
        helpBtn: doc.getElementById("helpBtn"),
        muteBtn: doc.getElementById("muteBtn"),
        randomSeedBtn: doc.getElementById("randomSeedBtn"),
        seedRow: doc.querySelector(".seedRow"),
        pageTitle: doc.getElementById("pageTitle"),
        pageSub: doc.getElementById("pageSub"),
        pageIntro: doc.getElementById("pageIntro"),
        pageControls: doc.getElementById("pageControls"),
        toast: doc.getElementById("toast"),
        statSeed: doc.getElementById("statSeed"),
        rowObjective: doc.getElementById("rowObjective"),
        statObjective: doc.getElementById("statObjective"),
        rowFuel: doc.getElementById("rowFuel"),
        statFuel: doc.getElementById("statFuel"),
        statScore: doc.getElementById("statScore"),
        statLantern: doc.getElementById("statLantern"),
        rowSpeed: doc.getElementById("rowSpeed"),
        statSpeed: doc.getElementById("statSpeed"),
        statTiles: doc.getElementById("statTiles"),
        statDist: doc.getElementById("statDist")
      };

      this.handleRandomSeed = this.handleRandomSeed.bind(this);
      this.handleBegin = this.handleBegin.bind(this);
      this.handleHelp = this.handleHelp.bind(this);
      this.handleMute = this.handleMute.bind(this);
    }

    bind(callbacks) {
      this.callbacks = callbacks || {};
      this.elements.randomSeedBtn.addEventListener("click", this.handleRandomSeed);
      this.elements.beginBtn.addEventListener("click", this.handleBegin);
      this.elements.helpBtn.addEventListener("click", this.handleHelp);
      this.elements.muteBtn.addEventListener("click", this.handleMute);
    }

    unbind() {
      this.elements.randomSeedBtn.removeEventListener("click", this.handleRandomSeed);
      this.elements.beginBtn.removeEventListener("click", this.handleBegin);
      this.elements.helpBtn.removeEventListener("click", this.handleHelp);
      this.elements.muteBtn.removeEventListener("click", this.handleMute);
      clearTimeout(this.toastTimer);
    }

    handleRandomSeed() {
      this.elements.seedInput.value = Math.floor(Math.random() * 1000000);
    }

    handleBegin() {
      if (this.callbacks.onBegin) {
        this.callbacks.onBegin(this.elements.seedInput.value.trim());
      }
    }

    handleHelp() {
      if (this.callbacks.onHelp) {
        this.callbacks.onHelp();
      }
    }

    handleMute() {
      if (this.callbacks.onMute) {
        const muted = this.callbacks.onMute();
        this.setMuted(muted);
      }
    }

    showStartPage() {
      this.setPageCopy(
        "Lanternfall",
        "bring the ember home before the light fails",
        "Somewhere beneath the world, a buried ember waits in the dark. Find it, turn back, and reach camp before your lantern burns down.",
        "Move with WASD or arrow keys - or the dial in the corner, if you're charting by touch."
      );
      this.elements.seedRow.style.display = "";
      this.elements.beginBtn.textContent = "Begin Expedition";
      this.elements.overlay.classList.remove("hidden");
    }

    showPausePage() {
      this.setPageCopy(
        "Journal Paused",
        "the lantern waits while you read the map",
        "Your current expedition is paused. Resume when you're ready to keep tracing the cave.",
        "The ember is still out there; fuel only burns while the expedition is moving."
      );
      this.elements.seedRow.style.display = "none";
      this.elements.beginBtn.textContent = "Resume Expedition";
      this.elements.overlay.classList.remove("hidden");
    }

    showEndPage(state) {
      const won = state.status === "won";
      this.setPageCopy(
        won ? "Chart Sealed" : "Light Lost",
        won ? "the ember made it back to camp" : "the cave took the last of the flame",
        won ? `Final tally: ${state.score}. The route is written, and the campfire is brighter for it.` : `Final tally: ${state.score}. The map ends where the lantern went dark.`,
        "Start a new expedition with the chart number below, or leave it blank for a fresh route."
      );
      this.elements.seedRow.style.display = "";
      this.elements.beginBtn.textContent = "Begin New Expedition";
      this.elements.overlay.classList.remove("hidden");
      this.toast(state.status === "won" ? CONFIG.ui.messages.extracted : CONFIG.ui.messages.lost);
    }

    setPageCopy(title, sub, intro, controls) {
      this.elements.pageTitle.textContent = title;
      this.elements.pageSub.textContent = sub;
      this.elements.pageIntro.textContent = intro;
      this.elements.pageControls.textContent = controls;
    }

    hideOverlay() {
      this.elements.overlay.classList.add("hidden");
      this.elements.seedInput.blur();
    }

    isOverlayHidden() {
      return this.elements.overlay.classList.contains("hidden");
    }

    setMuted(muted) {
      this.elements.muteBtn.textContent = muted ? CONFIG.ui.muteIcon : CONFIG.ui.soundIcon;
    }

    toast(message) {
      this.elements.toast.textContent = message;
      this.elements.toast.classList.add("show");
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => this.elements.toast.classList.remove("show"), 2200);
    }

    updateHud(state) {
      this.elements.statSeed.textContent = state.seed;
      this.elements.statObjective.textContent = this.objectiveText(state);
      this.elements.rowObjective.classList.toggle("active", state.hasEmber);
      this.elements.statFuel.textContent = `${Math.ceil((state.fuel / state.maxFuel) * 100)}%`;
      this.elements.rowFuel.classList.toggle("warn", state.fuel <= CONFIG.fuel.lowThreshold);
      this.elements.statScore.textContent = state.score;
      this.elements.statLantern.textContent = `Lvl ${state.lanternLevel}`;

      if (state.speedRemaining > 0) {
        this.elements.statSpeed.textContent = `${Math.ceil(state.speedRemaining)}s`;
        this.elements.rowSpeed.classList.add("active");
      } else {
        this.elements.statSpeed.textContent = CONFIG.ui.empty;
        this.elements.rowSpeed.classList.remove("active");
      }

      this.elements.statTiles.textContent = state.explored.size;
      this.elements.statDist.textContent = Math.round(Math.hypot(state.player.gx, state.player.gy));
    }

    objectiveText(state) {
      if (state.status === "won") return "Sealed";
      if (state.status === "lost") return "Light Lost";
      return state.hasEmber ? "Return Camp" : "Find Ember";
    }
  }

  Lanternfall.LanternfallUi = LanternfallUi;
})();
