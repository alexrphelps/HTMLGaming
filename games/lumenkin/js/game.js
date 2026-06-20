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
      this.selectedEgg = ns.CONFIG.eggTypes[0];
      this.planSignature = '';
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
      console.log('Lumenkin initialized');
    }

    cacheElements() {
      ['chapterTitle', 'lineageNumber', 'objectiveTitle', 'objectiveText', 'objectiveFill', 'objectiveValue', 'stats', 'actionBar', 'eventLog', 'canvasHint', 'controlHint', 'saveStatus', 'cycleLabel', 'planForecast', 'planOutcome', 'resolveCycleButton', 'transitionButton', 'startOverlay', 'eggChoices', 'continueButton', 'newLineageButton', 'metamorphosisOverlay', 'metamorphosisTitle', 'metamorphosisText', 'legacyChoices', 'panelOverlay', 'panelTitle', 'panelContent', 'closePanelButton', 'historyButton', 'saveButton', 'settingsButton', 'endingOverlay', 'endingSummary', 'continueEndlessButton', 'newGameButton'].forEach(id => { this.elements[id] = this.document.getElementById(id); });
    }

    bindUi() {
      this.elements.newLineageButton.addEventListener('click', () => this.startNew());
      this.elements.continueButton.addEventListener('click', () => this.continueAutosave());
      this.elements.historyButton.addEventListener('click', () => this.openHistory());
      this.elements.saveButton.addEventListener('click', () => this.openSaves());
      this.elements.settingsButton.addEventListener('click', () => this.openSettings());
      this.elements.closePanelButton.addEventListener('click', () => this.closePanel());
      this.elements.resolveCycleButton.addEventListener('click', () => this.resolveCycle());
      this.elements.transitionButton.addEventListener('click', () => this.beginTransition());
      this.elements.continueEndlessButton.addEventListener('click', () => { this.elements.endingOverlay.classList.add('hidden'); this.campaign.status = 'endless'; this.paused = false; this.log('The new ecosystem continues beyond recorded history.'); });
      this.elements.newGameButton.addEventListener('click', () => window.location.reload());
    }

    make(tag, text, className) {
      const element = this.document.createElement(tag);
      if (text != null) element.textContent = text;
      if (className) element.className = className;
      return element;
    }

    renderEggChoices() {
      this.elements.eggChoices.textContent = '';
      ns.CONFIG.eggTypes.forEach((egg, index) => {
        const button = this.make('button', null, `egg-choice${index === 0 ? ' selected' : ''}`); button.type = 'button';
        button.append(this.make('span', egg.icon, 'choice-icon'), this.document.createTextNode(egg.name));
        const description = this.make('span', `${egg.description} ${egg.trait}`, 'choice-description'); button.appendChild(description);
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
        this.applySettings(); this.startChapter();
        this.elements.startOverlay.classList.add('hidden'); this.paused = false;
        this.log('The lineage wakes with its unfinished plan intact.');
      } catch (error) {
        if (error instanceof ns.LegacySaveError) this.showLegacyRecord(error.record);
        else this.hint(`Could not load autosave: ${error.message}`);
      }
    }

    startChapter() {
      if (this.chapter) this.chapter.cleanup();
      this.chapter = ns.createChapter(this, this.campaign);
      this.chapter.enter();
      this.elements.chapterTitle.textContent = ns.CONFIG.chapters[this.campaign.chapter].title;
      this.elements.lineageNumber.textContent = String(this.campaign.lineage.generations).padStart(2, '0');
      this.planSignature = '';
      this.renderUi(true);
    }

    frame(timestamp) {
      if (!this.running) return;
      const dt = Math.min(.1, Math.max(0, (timestamp - this.lastTime) / 1000 || 0));
      this.lastTime = timestamp;
      if (!this.paused && this.campaign && this.chapter) {
        this.accumulator += dt;
        while (this.accumulator >= ns.CONFIG.fixedStep) { this.update(ns.CONFIG.fixedStep); this.accumulator -= ns.CONFIG.fixedStep; }
        if (this.input.pointer.clicked && typeof this.chapter.selectAt === 'function') {
          this.chapter.selectAt(this.input.pointer);
          this.renderUi(true);
        }
      }
      this.renderer.allowGlow = !this.campaign || this.campaign.settings.glow;
      this.renderer.render(this);
      this.input.endFrame();
      requestAnimationFrame(this.boundFrame);
    }

    update(dt) {
      this.time += dt;
      this.palette.update(dt);
      this.particles.update(dt);
      this.chapter.update(dt, this.input);
    }

    resolveCycle() {
      if (!this.chapter || !this.chapter.canResolve()) return;
      try {
        this.chapter.resolveCycle();
        this.campaign.chapterState = this.chapter.serialize();
        this.campaign.score = (this.campaign.totalCycles || 0) * 100 + this.campaign.lineage.populationPeak * 3 + Math.round(this.campaign.ecology.health * 2) + this.campaign.lineage.branches.length * 500;
        this.checkExtinction();
        this.renderUi(true);
        this.saveAutosave();
      } catch (error) { this.hint(error.message); }
    }

    checkExtinction() {
      const state = this.chapter.state;
      const noLiving = state.creatures && state.creatures.every(creature => creature.hp <= 0);
      if (state.health <= 0 || state.hull <= 0 || noLiving) this.handleExtinction();
    }

    renderUi(force) {
      if (!this.chapter || !this.campaign) return;
      const objective = this.chapter.objective();
      this.elements.objectiveTitle.textContent = objective.title;
      this.elements.objectiveText.textContent = objective.text;
      this.elements.objectiveFill.style.width = `${Math.min(100, objective.value / objective.target * 100)}%`;
      this.elements.objectiveValue.textContent = `${objective.value} / ${objective.target} milestones`;
      this.renderStats();
      this.renderPlanning(force);
      this.renderEventLog();
    }

    renderStats() {
      this.elements.stats.textContent = '';
      this.chapter.stats().forEach(([label, rawValue]) => {
        const item = this.make('div', null, 'stat');
        item.append(this.make('span', label), this.make('strong', typeof rawValue === 'number' ? Math.max(0, Math.round(rawValue)) : rawValue));
        this.elements.stats.appendChild(item);
      });
    }

    renderPlanning(force) {
      const model = this.chapter.planModel();
      const signature = JSON.stringify(model.slots.map(slot => [slot.id, slot.orders.map(order => [order.id, Boolean(order.disabled)])]));
      if (force || signature !== this.planSignature) {
        this.planSignature = signature;
        this.elements.actionBar.textContent = '';
        model.slots.forEach(slot => {
          const row = this.make('label', null, 'plan-slot'); row.dataset.slot = slot.id;
          row.appendChild(this.make('span', slot.label));
          const select = this.make('select'); select.setAttribute('aria-label', slot.label); select.dataset.slot = slot.id;
          const placeholder = this.make('option', 'Choose commitment'); placeholder.value = ''; select.appendChild(placeholder);
          slot.orders.forEach(order => { const option = this.make('option', order.label); option.value = order.id; option.disabled = Boolean(order.disabled); select.appendChild(option); });
          select.addEventListener('change', () => {
            if (select.value) this.chapter.assignOrder(slot.id, select.value);
            else this.chapter.clearOrder(slot.id);
            this.renderUi(false);
            this.saves.saveAutosave(this.campaign);
          });
          row.appendChild(select);
          const target = this.make('small', '', 'plan-target'); target.dataset.targetFor = slot.id; row.appendChild(target);
          this.elements.actionBar.appendChild(row);
        });
      }
      model.slots.forEach(slot => {
        const select = this.elements.actionBar.querySelector(`select[data-slot="${slot.id}"]`); if (select) select.value = slot.assignment ? slot.assignment.orderId : '';
        const target = this.elements.actionBar.querySelector(`[data-target-for="${slot.id}"]`); if (target) target.textContent = slot.targetLabel ? `Target: ${slot.targetLabel}` : '';
      });
      const refreshed = this.chapter.planModel();
      this.elements.cycleLabel.textContent = refreshed.cycleLabel;
      this.elements.planForecast.textContent = refreshed.forecast;
      this.elements.planOutcome.textContent = refreshed.outcome;
      this.elements.resolveCycleButton.disabled = !refreshed.canResolve;
      this.elements.transitionButton.classList.toggle('hidden', !this.chapter.ready() || this.campaign.status === 'complete');
      this.elements.transitionButton.textContent = this.campaign.chapter === 4 ? 'Seed the New World' : 'Begin Metamorphosis';
    }

    renderEventLog() {
      this.elements.eventLog.textContent = '';
      this.campaign.history.slice(0, 6).forEach(entry => this.elements.eventLog.appendChild(this.make('li', entry)));
    }

    beginTransition() {
      if (!this.chapter.ready()) return;
      if (this.campaign.chapter === ns.CONFIG.chapters.length - 1) { this.finishCampaign(); return; }
      this.paused = true;
      this.saves.checkpoint(this.campaign);
      const chapter = ns.CONFIG.chapters[this.campaign.chapter];
      this.elements.metamorphosisTitle.textContent = `${chapter.title} becomes inheritance`;
      this.elements.metamorphosisText.textContent = 'Resolved behavior shapes what this lineage can carry forward. This choice is permanent.';
      this.elements.legacyChoices.textContent = '';
      ns.eligibleBranches(this.campaign.chapter, this.campaign).forEach(branch => {
        const button = this.make('button', null, 'legacy-choice'); button.type = 'button';
        button.append(this.make('span', branch.icon, 'choice-icon'), this.document.createTextNode(branch.name), this.make('span', `${branch.description} ${branch.reason}`, 'choice-description'));
        button.addEventListener('click', () => this.commitTransition(branch.id));
        this.elements.legacyChoices.appendChild(button);
      });
      this.elements.metamorphosisOverlay.classList.remove('hidden');
    }

    commitTransition(branchId) {
      try {
        const branch = ns.commitBranch(this.campaign, branchId);
        this.chapter.cleanup(); this.campaign.chapter += 1; this.campaign.chapterState = {};
        this.campaign.history.unshift(`The lineage crossed into ${ns.CONFIG.chapters[this.campaign.chapter].title}.`);
        this.elements.metamorphosisOverlay.classList.add('hidden');
        this.startChapter(); this.paused = false; this.saveAutosave(); this.hint(`${branch.name} is now permanent.`);
      } catch (error) { this.hint(error.message); }
    }

    finishCampaign() {
      this.campaign.status = 'complete';
      this.campaign.history.unshift('The first seed took root beneath an unfamiliar sky.');
      this.campaign.lineage.portraits.push({ chapter: 4, branch: 'new-world', title: 'The Great Bloom', appearance: Object.assign({}, this.campaign.lineage.founder), at: this.campaign.elapsed });
      this.saveAutosave(); this.paused = true;
      this.elements.endingSummary.textContent = `${this.campaign.lineage.name} crossed five management eras in ${this.campaign.totalCycles || 0} cycles, carrying ${this.chapter.state.seeds} viable seeds to a new ecosystem.`;
      this.elements.endingOverlay.classList.remove('hidden');
    }

    handleExtinction() {
      if (this.campaign.status === 'extinct') return;
      this.campaign.status = 'extinct'; this.paused = true;
      this.openPanel('The last glow faded');
      this.elements.panelContent.append(this.make('p', `This lineage ended during ${ns.CONFIG.chapters[this.campaign.chapter].title}. Its record remains, but a new egg must carry life forward.`));
      const button = this.make('button', 'Return to Egg Chamber'); button.type = 'button'; button.addEventListener('click', () => window.location.reload()); this.elements.panelContent.appendChild(button);
    }

    log(message) {
      if (!this.campaign) return;
      if (this.campaign.history[0] !== message) this.campaign.history.unshift(message);
      if (this.campaign.history.length > 50) this.campaign.history.length = 50;
    }
    hint(message) { this.elements.canvasHint.textContent = message; }

    saveAutosave() {
      if (!this.campaign) return;
      if (this.saves.saveAutosave(this.campaign)) this.elements.saveStatus.textContent = `Autosaved after cycle ${this.campaign.totalCycles || 0}`;
      else this.elements.saveStatus.textContent = 'Autosave unavailable - campaign continues safely';
    }

    openPanel(title) { this.elements.panelTitle.textContent = title; this.elements.panelContent.textContent = ''; this.elements.panelOverlay.classList.remove('hidden'); this.paused = true; }
    closePanel() { this.elements.panelOverlay.classList.add('hidden'); this.paused = !this.campaign || this.campaign.status === 'extinct'; }

    showLegacyRecord(record) {
      this.openPanel('Archived Lineage');
      this.elements.panelContent.append(this.make('p', `${record.name} reached ${ns.CONFIG.chapters[record.chapter].title} under Lumenkin's retired real-time rules. Its history is preserved, but its simulation cannot be continued.`));
      const summary = this.make('dl', null, 'legacy-record');
      [['Generations', record.generations], ['Peak population', record.populationPeak], ['Branches', record.branches.join(', ') || 'None recorded']].forEach(([label, value]) => { summary.append(this.make('dt', label), this.make('dd', value)); });
      this.elements.panelContent.appendChild(summary);
      const list = this.make('ol'); record.history.slice(0, 8).forEach(entry => list.appendChild(this.make('li', entry))); this.elements.panelContent.appendChild(list);
    }

    openHistory() {
      if (!this.campaign) return;
      this.openPanel('Lineage History');
      const grid = this.make('div', null, 'history-grid');
      this.campaign.lineage.portraits.forEach(item => { const card = this.make('article', null, 'portrait-card'); card.append(this.make('div', '*', 'portrait-swatch'), this.make('div', `${String(item.title)} - ${String(item.branch).replace(/-/g, ' ')}`)); grid.appendChild(card); });
      const history = this.make('ol'); this.campaign.history.forEach(entry => history.appendChild(this.make('li', entry))); grid.appendChild(history);
      grid.appendChild(this.make('p', `Score: ${this.campaign.score} - Cycles: ${this.campaign.totalCycles || 0} - Peak population: ${this.campaign.lineage.populationPeak}`)); this.elements.panelContent.appendChild(grid);
    }

    openSaves() {
      if (!this.campaign) return;
      this.openPanel('Named Colonies');
      const grid = this.make('div', null, 'save-grid');
      const label = this.make('label', 'Save name '); const input = this.make('input'); input.id = 'slotName'; input.value = this.campaign.lineage.name.replace(/[^a-z0-9 -]/gi, ''); label.appendChild(input); grid.appendChild(label);
      const create = this.make('button', 'Save Current Lineage'); create.type = 'button'; create.addEventListener('click', () => { const name = input.value.trim() || 'Unnamed'; this.hint(this.saves.saveSlot(name, this.campaign) ? `Saved ${name}.` : 'Named saves are unavailable.'); this.closePanel(); }); grid.appendChild(create);
      this.saves.listSlots().forEach(slot => { const button = this.make('button', `Load ${slot.name} - ${ns.CONFIG.chapters[slot.chapter].title}`); button.type = 'button'; button.addEventListener('click', () => { try { this.campaign = this.saves.loadSlot(slot.name); this.applySettings(); this.startChapter(); this.closePanel(); } catch (error) { if (error instanceof ns.LegacySaveError) this.showLegacyRecord(error.record); else this.hint(error.message); } }); grid.appendChild(button); });
      this.elements.panelContent.appendChild(grid);
    }

    openSettings() {
      const settings = this.campaign ? this.campaign.settings : { reducedMotion: false, glow: true, contrast: false, colorMode: 'default', uiScale: 1 };
      this.openPanel('Settings');
      const grid = this.make('div', null, 'settings-grid');
      const controls = {};
      [['Motion', 'Reduced motion', 'checkbox', settings.reducedMotion], ['Glow', 'Bioluminescent glow', 'checkbox', settings.glow], ['Contrast', 'High contrast', 'checkbox', settings.contrast]].forEach(([id, labelText, type, checked]) => { const label = this.make('label', labelText); const input = this.make('input'); input.id = `setting${id}`; input.type = type; input.checked = checked; controls[id] = input; label.appendChild(input); grid.appendChild(label); });
      const colorLabel = this.make('label', 'Color mode'); const color = this.make('select'); color.id = 'settingColor'; ['default', 'amber', 'mint'].forEach(value => { const option = this.make('option', value); option.value = value; color.appendChild(option); }); color.value = settings.colorMode; colorLabel.appendChild(color); grid.appendChild(colorLabel);
      const scaleLabel = this.make('label', 'UI scale'); const scale = this.make('input'); scale.type = 'range'; scale.min = '.9'; scale.max = '1.25'; scale.step = '.05'; scale.value = settings.uiScale; scaleLabel.appendChild(scale); grid.appendChild(scaleLabel);
      const apply = this.make('button', 'Apply'); apply.type = 'button'; apply.addEventListener('click', () => { const target = this.campaign ? this.campaign.settings : settings; target.reducedMotion = controls.Motion.checked; target.glow = controls.Glow.checked; target.contrast = controls.Contrast.checked; target.colorMode = color.value; target.uiScale = Number(scale.value); this.applySettings(target); this.closePanel(); }); grid.appendChild(apply);
      this.elements.panelContent.appendChild(grid);
    }

    applySettings(overrides) {
      const settings = overrides || (this.campaign && this.campaign.settings); if (!settings) return;
      this.document.body.classList.toggle('reduced-motion', settings.reducedMotion);
      this.document.body.classList.toggle('no-glow', !settings.glow);
      this.document.body.classList.toggle('high-contrast', settings.contrast);
      this.document.body.classList.toggle('color-amber', settings.colorMode === 'amber');
      this.document.body.classList.toggle('color-mint', settings.colorMode === 'mint');
      this.document.documentElement.style.setProperty('--ui-scale', settings.uiScale);
    }

    destroy() { this.running = false; if (this.chapter) this.chapter.cleanup(); this.input.destroy(); console.log('Lumenkin cleaned up'); }
  }

  ns.LumenkinGame = LumenkinGame;
})(window.Lumenkin = window.Lumenkin || {});
