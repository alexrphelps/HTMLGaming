(function (ns) {
  'use strict';

  class LumenkinGame {
    constructor(documentRef) {
      this.document = documentRef || document;
      this.canvas = this.document.getElementById('game');
      this.catalog = new ns.ArtCatalog(ns.CONFIG.atlasPath);
      this.assembler = new ns.SpriteAssembler(this.catalog);
      this.palette = new ns.PaletteManager();
      this.particles = new ns.ParticleSystem(ns.createRng('lumenkin:particles'));
      this.renderer = new ns.LumenkinRenderer(this.canvas, this.catalog, this.assembler, this.palette);
      this.input = new ns.InputManager(this.canvas);
      this.saves = new ns.SaveManager();
      this.campaign = null;
      this.chapter = null;
      this.running = false;
      this.paused = true;
      this.lastTime = 0;
      this.accumulator = 0;
      this.time = 0;
      this.autosaveClock = 0;
      this.uiClock = 0;
      this.selectedEgg = ns.CONFIG.eggTypes[0];
      this.boundFrame = time => this.frame(time);
      this.elements = {};
    }

    async init() {
      this.cacheElements();
      this.bindUi();
      this.renderEggChoices();
      this.elements.continueButton.classList.toggle('hidden', !this.saves.hasAutosave());
      await this.catalog.load();
      if (!this.catalog.ready) this.hint('Atlas unavailable: using fallback pixel silhouettes.');
      this.running = true;
      requestAnimationFrame(this.boundFrame);
      console.log('🎮 Lumenkin initialized');
    }

    cacheElements() {
      ['chapterTitle', 'lineageNumber', 'objectiveTitle', 'objectiveText', 'objectiveFill', 'objectiveValue', 'stats', 'actionBar', 'eventLog', 'canvasHint', 'controlHint', 'saveStatus', 'startOverlay', 'eggChoices', 'continueButton', 'newLineageButton', 'metamorphosisOverlay', 'metamorphosisTitle', 'metamorphosisText', 'legacyChoices', 'panelOverlay', 'panelTitle', 'panelContent', 'closePanelButton', 'historyButton', 'saveButton', 'settingsButton', 'endingOverlay', 'endingSummary', 'continueEndlessButton', 'newGameButton'].forEach(id => { this.elements[id] = this.document.getElementById(id); });
    }

    bindUi() {
      this.elements.newLineageButton.addEventListener('click', () => this.startNew());
      this.elements.continueButton.addEventListener('click', () => this.continueAutosave());
      this.elements.historyButton.addEventListener('click', () => this.openHistory());
      this.elements.saveButton.addEventListener('click', () => this.openSaves());
      this.elements.settingsButton.addEventListener('click', () => this.openSettings());
      this.elements.closePanelButton.addEventListener('click', () => this.closePanel());
      this.elements.continueEndlessButton.addEventListener('click', () => { this.elements.endingOverlay.classList.add('hidden'); this.campaign.status = 'endless'; this.paused = false; this.log('The new ecosystem continues beyond recorded history.'); });
      this.elements.newGameButton.addEventListener('click', () => window.location.reload());
    }

    renderEggChoices() {
      this.elements.eggChoices.textContent = '';
      ns.CONFIG.eggTypes.forEach((egg, index) => {
        const button = this.document.createElement('button');
        button.type = 'button'; button.className = `egg-choice${index === 0 ? ' selected' : ''}`;
        button.innerHTML = `<span class="choice-icon">${egg.icon}</span>${egg.name}<span class="choice-description">${egg.description}<br><strong>${egg.trait}</strong></span>`;
        button.addEventListener('click', () => { this.selectedEgg = egg; [...this.elements.eggChoices.children].forEach(child => child.classList.remove('selected')); button.classList.add('selected'); });
        this.elements.eggChoices.appendChild(button);
      });
    }

    startNew() {
      const seed = `${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      this.campaign = ns.createCampaign(this.selectedEgg, seed);
      this.startChapter();
      this.elements.startOverlay.classList.add('hidden');
      this.paused = false;
      this.saveAutosave();
    }

    continueAutosave() {
      try {
        this.campaign = this.saves.loadAutosave();
        this.applySettings();
        this.startChapter();
        this.elements.startOverlay.classList.add('hidden');
        this.paused = false;
        this.log('The lineage wakes exactly where it rested.');
      } catch (error) {
        this.hint(`Could not load autosave: ${error.message}`);
      }
    }

    startChapter() {
      if (this.chapter) this.chapter.cleanup();
      this.chapter = ns.createChapter(this, this.campaign);
      this.chapter.enter();
      this.elements.chapterTitle.textContent = ns.CONFIG.chapters[this.campaign.chapter].title;
      this.elements.lineageNumber.textContent = String(this.campaign.lineage.generations).padStart(2, '0');
      this.renderUi(true);
    }

    frame(timestamp) {
      if (!this.running) return;
      const dt = Math.min(.1, Math.max(0, (timestamp - this.lastTime) / 1000 || 0));
      this.lastTime = timestamp;
      if (!this.paused && this.campaign && this.chapter) {
        this.accumulator += dt;
        while (this.accumulator >= ns.CONFIG.fixedStep) {
          this.update(ns.CONFIG.fixedStep);
          this.accumulator -= ns.CONFIG.fixedStep;
        }
      }
      this.renderer.allowGlow = !this.campaign || this.campaign.settings.glow;
      this.renderer.render(this);
      this.input.endFrame();
      requestAnimationFrame(this.boundFrame);
    }

    update(dt) {
      this.time += dt;
      this.campaign.elapsed += dt;
      this.autosaveClock += dt;
      this.uiClock += dt;
      this.palette.update(dt);
      this.particles.update(dt);
      this.chapter.update(dt, this.input);
      this.campaign.chapterState = this.chapter.serialize();
      this.campaign.score = Math.floor(this.campaign.elapsed / 4 + this.campaign.lineage.populationPeak * 3 + this.campaign.ecology.health * 2 + this.campaign.lineage.branches.length * 500);
      if (this.chapter.state.health <= 0 || this.chapter.state.hull <= 0 || (this.chapter.state.creatures && this.chapter.state.creatures.every(creature => creature.hp <= 0))) this.handleExtinction();
      if (this.uiClock >= .2) { this.uiClock = 0; this.renderUi(); }
      if (this.autosaveClock >= 20) { this.autosaveClock = 0; this.saveAutosave(); }
    }

    renderUi(force) {
      if (!this.chapter || !this.campaign) return;
      const objective = this.chapter.objective();
      this.elements.objectiveTitle.textContent = objective.title;
      this.elements.objectiveText.textContent = objective.text;
      const percent = Math.min(100, objective.value / objective.target * 100);
      this.elements.objectiveFill.style.width = `${percent}%`;
      this.elements.objectiveValue.textContent = `${objective.value} / ${objective.target}`;
      this.elements.stats.textContent = '';
      this.chapter.stats().forEach(([label, rawValue]) => {
        const item = this.document.createElement('div'); item.className = 'stat';
        const value = typeof rawValue === 'number' ? Math.max(0, Math.round(rawValue)) : rawValue;
        item.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
        this.elements.stats.appendChild(item);
      });
      this.renderActions(force);
      this.renderEventLog();
    }

    renderActions() {
      this.elements.actionBar.textContent = '';
      this.chapter.actions().forEach(action => {
        const button = this.document.createElement('button');
        button.type = 'button'; button.textContent = action.label; button.disabled = Boolean(action.disabled);
        button.addEventListener('click', () => { action.run(); this.renderUi(true); });
        this.elements.actionBar.appendChild(button);
      });
      if (this.chapter.ready() && this.campaign.status !== 'complete') {
        const button = this.document.createElement('button'); button.type = 'button'; button.textContent = this.campaign.chapter === 4 ? 'Seed the New World' : 'Begin Metamorphosis';
        button.addEventListener('click', () => this.beginTransition()); this.elements.actionBar.appendChild(button);
      }
    }

    renderEventLog() {
      this.elements.eventLog.textContent = '';
      this.campaign.history.slice(0, 6).forEach(entry => { const li = this.document.createElement('li'); li.textContent = entry; this.elements.eventLog.appendChild(li); });
    }

    beginTransition() {
      if (!this.chapter.ready()) return;
      if (this.campaign.chapter === ns.CONFIG.chapters.length - 1) { this.finishCampaign(); return; }
      this.paused = true;
      this.saves.checkpoint(this.campaign);
      const chapter = ns.CONFIG.chapters[this.campaign.chapter];
      this.elements.metamorphosisTitle.textContent = `${chapter.title} becomes inheritance`;
      this.elements.metamorphosisText.textContent = 'Your history determines what is possible. This choice permanently closes the other branches for this lineage.';
      this.elements.legacyChoices.textContent = '';
      ns.eligibleBranches(this.campaign.chapter, this.campaign).forEach(branch => {
        const button = this.document.createElement('button'); button.type = 'button'; button.className = 'legacy-choice';
        button.innerHTML = `<span class="choice-icon">${branch.icon}</span>${branch.name}<span class="choice-description">${branch.description}<br>${branch.reason}</span>`;
        button.addEventListener('click', () => this.commitTransition(branch.id));
        this.elements.legacyChoices.appendChild(button);
      });
      this.elements.metamorphosisOverlay.classList.remove('hidden');
    }

    commitTransition(branchId) {
      try {
        const branch = ns.commitBranch(this.campaign, branchId);
        this.chapter.cleanup();
        this.campaign.chapter += 1;
        this.campaign.chapterState = {};
        this.campaign.history.unshift(`The lineage crossed into ${ns.CONFIG.chapters[this.campaign.chapter].title}.`);
        this.elements.metamorphosisOverlay.classList.add('hidden');
        this.startChapter();
        this.paused = false;
        this.saveAutosave();
        this.hint(`${branch.name} is now permanent.`);
      } catch (error) { this.hint(error.message); }
    }

    finishCampaign() {
      this.campaign.status = 'complete';
      this.campaign.history.unshift('The first seed took root beneath an unfamiliar sky.');
      this.campaign.lineage.portraits.push({ chapter: 4, branch: 'new-world', title: 'The Great Bloom', appearance: Object.assign({}, this.campaign.lineage.founder), at: this.campaign.elapsed });
      this.saveAutosave();
      this.paused = true;
      this.elements.endingSummary.textContent = `${this.campaign.lineage.name} crossed five forms of life, carried ${this.chapter.state.seeds} living seeds, and founded a new ecosystem with a score of ${this.campaign.score}.`;
      this.elements.endingOverlay.classList.remove('hidden');
    }

    handleExtinction() {
      if (this.campaign.status === 'extinct') return;
      this.campaign.status = 'extinct'; this.paused = true;
      this.elements.panelTitle.textContent = 'The last glow faded';
      this.elements.panelContent.innerHTML = `<p>This lineage ended during <strong>${ns.CONFIG.chapters[this.campaign.chapter].title}</strong>.</p><p>Its record remains, but a new egg must carry life forward.</p><button id="extinctionRestart" type="button">Return to Egg Chamber</button>`;
      this.elements.panelOverlay.classList.remove('hidden');
      this.document.getElementById('extinctionRestart').addEventListener('click', () => window.location.reload());
    }

    log(message) {
      if (!this.campaign) return;
      if (this.campaign.history[0] !== message) this.campaign.history.unshift(message);
      if (this.campaign.history.length > 50) this.campaign.history.length = 50;
    }
    hint(message) { this.elements.canvasHint.textContent = message; }

    saveAutosave() {
      if (!this.campaign) return;
      this.saves.saveAutosave(this.campaign);
      this.elements.saveStatus.textContent = `Autosaved · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    openPanel(title, html) { this.elements.panelTitle.textContent = title; this.elements.panelContent.innerHTML = html; this.elements.panelOverlay.classList.remove('hidden'); this.paused = true; }
    closePanel() { this.elements.panelOverlay.classList.add('hidden'); this.paused = !this.campaign || this.campaign.status === 'extinct'; }

    openHistory() {
      if (!this.campaign) return;
      const portraits = this.campaign.lineage.portraits.length ? this.campaign.lineage.portraits.map(item => `<article class="portrait-card"><div class="portrait-swatch">${item.chapter === 4 ? '✹' : ['◉','✧','⌂','❉'][item.chapter]}</div><div><strong>${item.title}</strong><p>${item.branch.replace(/-/g, ' ')}</p></div></article>`).join('') : '<p>No metamorphosis portraits have been recorded yet.</p>';
      const history = this.campaign.history.map(entry => `<li>${entry}</li>`).join('');
      this.openPanel('Lineage History', `<div class="history-grid">${portraits}<ol>${history}</ol><p>Score: ${this.campaign.score} · Generations: ${this.campaign.lineage.generations} · Peak population: ${this.campaign.lineage.populationPeak}</p></div>`);
    }

    openSaves() {
      if (!this.campaign) return;
      const slots = this.saves.listSlots();
      this.openPanel('Named Colonies', `<div class="save-grid"><label>Save name <input id="slotName" value="${this.campaign.lineage.name.replace(/[^a-z0-9 -]/gi, '')}"></label><button id="createSlot" type="button">Save Current Lineage</button>${slots.map(slot => `<button class="load-slot" data-slot="${slot.name}" type="button">Load ${slot.name} · ${ns.CONFIG.chapters[slot.chapter].title}</button>`).join('')}</div>`);
      this.document.getElementById('createSlot').addEventListener('click', () => { const name = this.document.getElementById('slotName').value.trim() || 'Unnamed'; this.saves.saveSlot(name, this.campaign); this.hint(`Saved ${name}.`); this.closePanel(); });
      [...this.document.querySelectorAll('.load-slot')].forEach(button => button.addEventListener('click', () => { this.campaign = this.saves.loadSlot(button.dataset.slot); this.applySettings(); this.startChapter(); this.closePanel(); }));
    }

    openSettings() {
      const settings = this.campaign ? this.campaign.settings : { reducedMotion: false, glow: true, contrast: false, colorMode: 'default', uiScale: 1 };
      this.openPanel('Settings', `<div class="settings-grid"><label>Reduced motion <input id="settingMotion" type="checkbox" ${settings.reducedMotion ? 'checked' : ''}></label><label>Bioluminescent glow <input id="settingGlow" type="checkbox" ${settings.glow ? 'checked' : ''}></label><label>High contrast <input id="settingContrast" type="checkbox" ${settings.contrast ? 'checked' : ''}></label><label>Color mode <select id="settingColor"><option value="default">Cyan</option><option value="amber">Amber</option><option value="mint">Mint</option></select></label><label>UI scale <input id="settingScale" type="range" min="0.9" max="1.25" step="0.05" value="${settings.uiScale}"></label><button id="applySettings" type="button">Apply</button></div>`);
      this.document.getElementById('settingColor').value = settings.colorMode;
      this.document.getElementById('applySettings').addEventListener('click', () => {
        const target = this.campaign ? this.campaign.settings : settings;
        target.reducedMotion = this.document.getElementById('settingMotion').checked;
        target.glow = this.document.getElementById('settingGlow').checked;
        target.contrast = this.document.getElementById('settingContrast').checked;
        target.colorMode = this.document.getElementById('settingColor').value;
        target.uiScale = Number(this.document.getElementById('settingScale').value);
        this.applySettings(target); this.closePanel();
      });
    }

    applySettings(overrides) {
      const settings = overrides || (this.campaign && this.campaign.settings);
      if (!settings) return;
      document.body.classList.toggle('reduced-motion', settings.reducedMotion);
      document.body.classList.toggle('no-glow', !settings.glow);
      document.body.classList.toggle('high-contrast', settings.contrast);
      document.body.classList.toggle('color-amber', settings.colorMode === 'amber');
      document.body.classList.toggle('color-mint', settings.colorMode === 'mint');
      document.documentElement.style.setProperty('--ui-scale', settings.uiScale);
    }

    destroy() {
      this.running = false;
      if (this.chapter) this.chapter.cleanup();
      this.input.destroy();
      console.log('🎮 Lumenkin cleaned up');
    }
  }

  ns.LumenkinGame = LumenkinGame;
})(window.Lumenkin = window.Lumenkin || {});
