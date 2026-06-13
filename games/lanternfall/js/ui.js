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
        toast: doc.getElementById("toast"),
        statSeed: doc.getElementById("statSeed"),
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
      this.elements.seedRow.style.display = "";
      this.elements.beginBtn.textContent = "Begin Expedition";
      this.elements.overlay.classList.remove("hidden");
    }

    showPausePage() {
      this.elements.seedRow.style.display = "none";
      this.elements.beginBtn.textContent = "Resume Expedition";
      this.elements.overlay.classList.remove("hidden");
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
  }

  Lanternfall.LanternfallUi = LanternfallUi;
})();
