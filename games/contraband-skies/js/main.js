(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  class ContrabandSkiesApp {
    constructor(documentRef) {
      this.document = documentRef;
      this.saveManager = ns.createSaveManager();
      this.campaign = null;
      this.renderer = null;
      this.frame = null;
      this.elements = {};
      this.tutorialGates = [];
    }

    init() {
      this.cacheElements();
      this.renderer = new ns.SkyMapRenderer(this.elements.canvas);
      this.bindEvents();
      this.startCampaign(this.saveManager.load() || ns.createNewCampaign("first-ledger"));
      this.resize();
      this.loop();
      console.log("Contraband Skies initialized");
    }

    cacheElements() {
      const ids = [
        "sky-map", "new-season-btn", "save-btn", "stat-day", "stat-money", "stat-debt",
        "stat-fuel", "stat-hull", "stat-suspicion", "current-port", "contract-list",
        "selected-contract-title", "route-preview", "fly-route-btn", "upgrade-list",
        "log-list", "dial-pace", "dial-altitude", "dial-engine", "dial-stealth", "dial-care",
        "pace-value", "altitude-value", "engine-value", "stealth-value", "care-value",
        "guide-panel", "guide-title", "guide-body", "guide-progress", "guide-next-btn",
        "guide-skip-btn", "guide-btn", "log-toggle-btn"
      ];
      ids.forEach(id => {
        const key = id.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        this.elements[key] = this.document.getElementById(id);
      });
      this.elements.canvas = this.elements.skyMap;
      this.tutorialGates = Array.from(this.document.querySelectorAll("[data-tutorial-gate]"));
    }

    bindEvents() {
      global.addEventListener("resize", () => this.resize());
      this.elements.newSeasonBtn.addEventListener("click", () => {
        const inherited = this.campaign && this.campaign.outcome && this.campaign.outcome.inheritedPerk
          ? [this.campaign.outcome.inheritedPerk.id]
          : this.campaign ? this.campaign.inheritedPerks : [];
        this.startCampaign(ns.createNewCampaign(`season-${Date.now()}`, inherited));
        this.save();
      });
      this.elements.saveBtn.addEventListener("click", () => this.save());
      this.elements.flyRouteBtn.addEventListener("click", () => this.flyRoute());
      this.elements.guideNextBtn.addEventListener("click", () => {
        ns.advanceTutorial(this.campaign);
        this.renderUi();
      });
      this.elements.guideSkipBtn.addEventListener("click", () => {
        ns.skipTutorial(this.campaign);
        this.renderUi();
      });
      this.elements.guideBtn.addEventListener("click", () => {
        ns.replayTutorial(this.campaign);
        this.renderUi();
      });
      this.elements.logToggleBtn.addEventListener("click", () => this.toggleLogPane());
      this.dialElements().forEach(input => input.addEventListener("input", () => this.renderUi()));
    }

    startCampaign(campaign) {
      this.campaign = campaign;
      ns.normalizeTutorialState(this.campaign);
      if (this.campaign.tutorial && this.campaign.tutorial.firstRun) {
        this.applyTutorialDefaultDials();
      }
      if (!this.campaign.selectedContractId && this.campaign.contracts[0]) {
        ns.selectContract(this.campaign, this.campaign.contracts[0].id);
      }
      this.renderUi();
    }

    resize() {
      if (this.renderer) this.renderer.resize();
    }

    loop() {
      this.renderer.render(this.campaign);
      this.frame = global.requestAnimationFrame(() => this.loop());
    }

    dials() {
      return {
        pace: Number(this.elements.dialPace.value),
        altitude: Number(this.elements.dialAltitude.value),
        engine: Number(this.elements.dialEngine.value),
        stealth: Number(this.elements.dialStealth.value),
        care: Number(this.elements.dialCare.value)
      };
    }

    dialElements() {
      return [
        this.elements.dialPace,
        this.elements.dialAltitude,
        this.elements.dialEngine,
        this.elements.dialStealth,
        this.elements.dialCare
      ];
    }

    applyTutorialDefaultDials() {
      const defaults = ns.TUTORIAL_DEFAULT_DIALS;
      this.elements.dialPace.value = defaults.pace;
      this.elements.dialAltitude.value = defaults.altitude;
      this.elements.dialEngine.value = defaults.engine;
      this.elements.dialStealth.value = defaults.stealth;
      this.elements.dialCare.value = defaults.care;
    }

    renderUi() {
      const c = this.campaign;
      if (!c) return;
      const currentPort = ns.getSettlement(c, c.currentSettlementId);
      this.elements.statDay.textContent = String(c.day);
      this.elements.statMoney.textContent = `${c.money}c`;
      this.elements.statDebt.textContent = `${c.debt}c`;
      this.elements.statFuel.textContent = `${c.fuel}/${c.maxFuel}`;
      this.elements.statHull.textContent = `${c.hull}%`;
      this.elements.statSuspicion.textContent = `${c.suspicion}%`;
      this.elements.currentPort.textContent = `${currentPort.name} (${currentPort.typeName})`;
      this.renderContracts();
      this.renderDials();
      this.renderUpgrades();
      this.renderLog();
      this.renderTutorial();
      this.save();
    }

    toggleLogPane() {
      const shell = this.document.querySelector(".game-shell");
      if (!shell) return;
      const collapsed = !shell.classList.contains("log-collapsed");
      shell.classList.toggle("log-collapsed", collapsed);
      this.elements.logToggleBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      if (this.renderer) this.renderer.resize();
    }

    renderDials() {
      const dials = this.dials();
      this.elements.paceValue.textContent = dials.pace;
      this.elements.altitudeValue.textContent = dials.altitude;
      this.elements.engineValue.textContent = dials.engine;
      this.elements.stealthValue.textContent = dials.stealth;
      this.elements.careValue.textContent = dials.care;

      const selected = ns.getSelectedContract(this.campaign);
      this.elements.flyRouteBtn.disabled = !selected || this.campaign.status !== "active" || !ns.canFlyInTutorial(this.campaign);
      if (!selected) {
        this.elements.selectedContractTitle.textContent = this.campaign.status === "ended" ? "Season ended" : "Select a contract";
        this.elements.routePreview.textContent = this.campaign.outcome ? this.campaign.outcome.text : "Pick a contract to read the sky.";
        this.elements.routePreview.className = `route-preview ${this.campaign.outcome ? `outcome-${this.campaign.outcome.kind}` : ""}`;
        return;
      }

      const route = ns.getRoute(this.campaign, selected.routeId);
      const hazard = ns.getHazard(route.hazardId);
      const preview = ns.previewRoute(this.campaign, dials);
      this.elements.selectedContractTitle.textContent = selected.title;
      this.elements.routePreview.className = "route-preview";
      this.elements.routePreview.textContent = `${hazard.name}: risk ${preview.eventRisk}%, fuel ${preview.fuelCost}, time ${preview.timeCost}d, hull ${preview.hullStress}, cargo ${preview.cargoCondition}%, heat +${preview.suspicion}, expected ${preview.payout}c.`;
    }

    renderTutorial() {
      ns.normalizeTutorialState(this.campaign);
      const tutorial = this.campaign.tutorial;
      const copy = ns.getTutorialCopy(this.campaign);
      this.document.body.dataset.tutorialStatus = tutorial.status;
      this.document.body.dataset.tutorialStep = tutorial.stepId;

      this.tutorialGates.forEach(node => {
        const visible = ns.isTutorialGateVisible(this.campaign, node.dataset.tutorialGate);
        node.dataset.tutorialHidden = visible ? "false" : "true";
      });

      const active = tutorial.status === "active" && copy;
      this.elements.guidePanel.hidden = !active;
      this.elements.guideBtn.hidden = active;
      if (!active) return;

      this.elements.guideTitle.textContent = copy.title;
      this.elements.guideBody.textContent = copy.body;
      this.elements.guideProgress.textContent = `${copy.index + 1} of ${copy.total}`;
      this.elements.guideNextBtn.disabled = !copy.nextEnabled;
      this.elements.guideNextBtn.textContent = copy.nextEnabled ? "Next" : "Fly Route";
    }

    renderContracts() {
      const list = this.elements.contractList;
      list.innerHTML = "";
      if (this.campaign.status !== "active") {
        const button = this.document.createElement("button");
        button.type = "button";
        button.className = "contract-card selected";
        button.textContent = this.campaign.outcome ? this.campaign.outcome.text : "Season ended.";
        list.appendChild(button);
        return;
      }
      this.campaign.contracts.forEach(contract => {
        const route = ns.getRoute(this.campaign, contract.routeId);
        const hazard = ns.getHazard(route.hazardId);
        const button = this.document.createElement("button");
        button.type = "button";
        button.className = `contract-card ${contract.id === this.campaign.selectedContractId ? "selected" : ""}`;
        button.innerHTML = `<strong>${escapeHtml(contract.title)}</strong><span>${escapeHtml(contract.cargo.familyName)} cargo through ${escapeHtml(hazard.name)}</span><div class="card-meta"><b class="chip">${contract.payout}c</b><b class="chip">${contract.deadline}d limit</b><b class="chip">${route.distance}km</b></div>`;
        button.addEventListener("click", () => {
          ns.selectContract(this.campaign, contract.id);
          this.renderUi();
        });
        list.appendChild(button);
      });
    }

    renderUpgrades() {
      const list = this.elements.upgradeList;
      list.innerHTML = "";
      ns.UPGRADES.forEach(upgrade => {
        const owned = this.campaign.upgrades.indexOf(upgrade.id) !== -1;
        const button = this.document.createElement("button");
        button.type = "button";
        button.className = "upgrade-card";
        button.disabled = owned || this.campaign.money < upgrade.cost || this.campaign.status !== "active";
        button.innerHTML = `<strong>${escapeHtml(upgrade.name)} ${owned ? "(installed)" : `${upgrade.cost}c`}</strong><span>${escapeHtml(upgrade.text)}</span>`;
        button.addEventListener("click", () => {
          if (ns.buyUpgrade(this.campaign, upgrade.id)) {
            this.renderUi();
            this.save();
          }
        });
        list.appendChild(button);
      });
    }

    renderLog() {
      const list = this.elements.logList;
      list.innerHTML = "";
      this.campaign.log.forEach(entry => {
        const item = this.document.createElement("li");
        item.textContent = `Day ${entry.day}: ${entry.text}`;
        list.appendChild(item);
      });
    }

    flyRoute() {
      const result = ns.flySelectedRoute(this.campaign, this.dials());
      if (!result) return;
      this.renderUi();
      this.save();
    }

    save() {
      this.saveManager.save(this.campaign);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  ns.ContrabandSkiesApp = ContrabandSkiesApp;

  if (typeof document !== "undefined") {
    global.addEventListener("load", () => {
      const app = new ContrabandSkiesApp(document);
      app.init();
      global.contrabandSkiesApp = app;
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
