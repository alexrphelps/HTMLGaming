(function(ns) {
  class SimulatorController {
    constructor({ state, simulation, renderer, view, presets, analyzer, missionManager, learningMissionManager, experienceManager }) {
      this.state = state;
      this.simulation = simulation;
      this.renderer = renderer;
      this.view = view;
      this.presets = presets;
      this.analyzer = analyzer;
      this.missionManager = missionManager;
      this.learningMissionManager = learningMissionManager;
      this.experienceManager = experienceManager;
      this.running = true;
      this.dragging = false;
      this.lastTime = performance.now();
      this.frameCounter = 0;
      this.fps = 0;
      this.currentPresetKey = null;
      this.isCustom = false;
      this.applyingPreset = false;
      this.adaptiveThrottle = {
        active: false,
        idleSince: null,
        lastStepAt: 0,
        holdMs: 1500,
        stepIntervalMs: 1000
      };
    }

    init() {
      this.view.setValues();
      this.view.updateFormula();
      this.applySettingsDefaults();
      this.bindEvents();
      this.experienceManager.startFromSettings();
      this.updateMissionDisplay();
      requestAnimationFrame(now => this.loop(now));
    }

    bindEvents() {
      this.view.document.querySelectorAll('.tab').forEach(button => {
        button.addEventListener('click', () => this.view.setActiveTab(button.dataset.tab));
      });

      this.view.document.querySelectorAll('[data-preset]').forEach(button => {
        button.addEventListener('click', () => this.applyPreset(button.dataset.preset));
      });

      ns.CONTROL_IDS.forEach(key => {
        const control = this.view.controls[key];
        control.addEventListener('input', () => this.handleControlChange(key));
        control.addEventListener('change', () => this.handleControlChange(key));
      });

      this.view.document.getElementById('generateBtn').addEventListener('click', () => {
        this.view.setPresetName('Custom');
        this.currentPresetKey = null;
        this.isCustom = true;
        this.recordAction('generate');
        this.resetAdaptiveThrottle();
        this.randomizeSeeds('spots');
        this.renderCurrent();
      });

      this.view.pauseBtn.addEventListener('click', () => {
        this.running = !this.running;
        this.recordAction('pause');
        this.view.setPaused(!this.running);
      });

      this.view.document.getElementById('stepBtn').addEventListener('click', () => {
        const params = this.simulation.getParams(this.view.controls);
        this.state.snapshotFrameStart();
        for (let i = 0; i < 20; i++) this.simulation.step(params);
        this.recordAction('step');
        this.resetAdaptiveThrottle();
        this.renderCurrent(params);
      });

      this.view.document.getElementById('clearBtn').addEventListener('click', () => {
        this.state.reset();
        this.view.setPresetName('Cleared');
        this.currentPresetKey = null;
        this.isCustom = true;
        this.recordAction('clear');
        this.resetAdaptiveThrottle();
        this.renderCurrent();
      });

      this.view.document.getElementById('burstBtn').addEventListener('click', () => {
        this.state.splat(
          this.state.width / 2,
          this.state.height / 2,
          Math.max(10, Number(this.view.controls.brushSize.value) * 1.6),
          0.92
        );
        this.recordAction('burst');
        this.resetAdaptiveThrottle();
        this.renderCurrent();
      });

      this.view.document.getElementById('randomPulseBtn').addEventListener('click', () => {
        for (let n = 0; n < 6; n++) {
          this.state.splat(
            Math.random() * this.state.width,
            Math.random() * this.state.height,
            3 + Math.random() * 8,
            0.7 + Math.random() * 0.25
          );
        }
        this.recordAction('pulse');
        this.resetAdaptiveThrottle();
        this.renderCurrent();
      });

      this.view.document.getElementById('morphBtn').addEventListener('click', () => this.morphCurrent());
      this.view.wrapToggle.addEventListener('click', () => {
        this.state.setWrapEdges(!this.state.wrapEdges);
        this.view.setWrapState(this.state.wrapEdges);
      });

      this.view.mission.startBtn.addEventListener('click', () => this.startActiveMission());
      this.view.mission.nextBtn.addEventListener('click', () => {
        this.getActiveMissionManager().nextMission();
        this.startActiveMission(false);
      });
      this.view.mission.resetBtn.addEventListener('click', () => {
        this.getActiveMissionManager().resetActiveMission();
        this.startActiveMission(false);
      });
      this.view.mission.focusBtn.addEventListener('click', () => {
        const mission = this.getActiveMissionManager().activeMission;
        this.view.setActiveTab(mission?.recommendedTab || 'core');
      });
      this.view.mission.revealBtn.addEventListener('click', () => {
        this.experienceManager.showAllControls();
        this.renderCurrent();
      });

      this.bindExperienceEvents();

      this.bindCanvasPainting();
    }

    bindExperienceEvents() {
      const doc = this.view.document;
      doc.getElementById('startLearningBtn').addEventListener('click', () => this.startLearningMode());
      doc.getElementById('startFullBtn').addEventListener('click', () => this.startFullMode());
      doc.getElementById('backToMenuBtn').addEventListener('click', () => {
        this.experienceManager.showMenu(false);
        if (this.experienceManager.settings.autoPauseMenus && this.running) {
          this.running = false;
          this.view.setPaused(true);
        }
      });
      doc.getElementById('openSettingsBtn').addEventListener('click', () => {
        this.experienceManager.showMenu(true);
        if (this.experienceManager.settings.autoPauseMenus && this.running) {
          this.running = false;
          this.view.setPaused(true);
        }
      });
      doc.getElementById('closeSettingsBtn').addEventListener('click', () => this.experienceManager.showMenu(false));

      const setting = (id, key, mapper = value => value) => {
        const node = doc.getElementById(id);
        node.addEventListener('input', () => this.experienceManager.updateSetting(key, mapper(node)));
        node.addEventListener('change', () => this.experienceManager.updateSetting(key, mapper(node)));
      };

      setting('settingReducedMotion', 'reducedMotion', node => node.checked);
      setting('settingDensity', 'uiDensity', node => node.value);
      setting('settingAutoPause', 'autoPauseMenus', node => node.checked);
      setting('settingDefaultPalette', 'defaultPalette', node => node.value);
      setting('settingDefaultView', 'defaultView', node => node.value);
      setting('settingDefaultPreset', 'defaultPreset', node => node.value);
      setting('settingStartup', 'startupMode', node => node.value);
      setting('settingDefaultSpeed', 'defaultSpeed', node => Number(node.value));

      doc.getElementById('resetDefaultsBtn').addEventListener('click', () => {
        Object.entries(ns.EXPERIENCE_DEFAULT_SETTINGS).forEach(([key, value]) => {
          this.experienceManager.settings[key] = value;
        });
        this.experienceManager.save();
        this.experienceManager.applyClasses();
        this.applySettingsDefaults();
      });
      doc.getElementById('resetLearningBtn').addEventListener('click', () => {
        this.experienceManager.resetLearningProgress();
        this.updateMissionDisplay();
      });
      doc.getElementById('resetMissionsBtn').addEventListener('click', () => {
        this.experienceManager.resetMissionProgress();
        this.updateMissionDisplay();
      });
      doc.getElementById('resetAllBtn').addEventListener('click', () => {
        this.experienceManager.resetAll();
        this.applySettingsDefaults();
        this.updateMissionDisplay();
      });
    }

    bindCanvasPainting() {
      const canvas = this.view.canvas;
      canvas.addEventListener('pointerdown', event => {
        this.dragging = true;
        canvas.setPointerCapture?.(event.pointerId);
        const point = this.pointerToCell(event);
        this.state.splat(point.x, point.y, Number(this.view.controls.brushSize.value), 0.88);
        this.recordAction('paint');
        this.resetAdaptiveThrottle();
        this.renderCurrent();
      });

      canvas.addEventListener('pointermove', event => {
        if (!this.dragging) return;
        const point = this.pointerToCell(event);
        this.state.splat(point.x, point.y, Number(this.view.controls.brushSize.value) * 0.75, 0.82);
        this.recordAction('paint', 0.25);
        this.resetAdaptiveThrottle();
        this.renderCurrent();
      });

      const stopDragging = event => {
        this.dragging = false;
        if (event?.pointerId !== undefined) canvas.releasePointerCapture?.(event.pointerId);
      };

      canvas.addEventListener('pointerup', stopDragging);
      canvas.addEventListener('pointercancel', stopDragging);
      window.addEventListener('pointerup', stopDragging);
    }

    pointerToCell(event) {
      const rect = this.view.canvas.getBoundingClientRect();
      return {
        x: Math.floor((event.clientX - rect.left) / rect.width * this.state.width),
        y: Math.floor((event.clientY - rect.top) / rect.height * this.state.height)
      };
    }

    updateControlText() {
      this.view.setValues();
      this.view.updateFormula();
    }

    handleControlChange(key) {
      if (!this.applyingPreset) {
        this.currentPresetKey = null;
        this.isCustom = true;
        this.recordAction('morph');
        if (['feed', 'kill', 'diffU', 'diffV'].includes(key)) this.recordAction('coreTune');
        if (['gain', 'exp', 'sat', 'noise', 'flowX', 'flowY', 'anisotropy', 'diag', 'dt', 'speed'].includes(key)) this.recordAction('advancedTune');
      }
      this.updateControlText();
      this.resetAdaptiveThrottle();
      this.renderCurrent();
    }

    applyPreset(key, options = {}) {
      const preset = this.presets[key];
      if (!preset) return;

      this.applyingPreset = true;
      this.view.setPresetName(preset.name);
      Object.keys(preset).forEach(name => {
        if (this.view.controls[name]) this.view.controls[name].value = preset[name];
      });
      this.applyingPreset = false;
      this.currentPresetKey = key;
      this.isCustom = false;
      if (!options.silent) this.recordAction('preset');
      this.updateControlText();
      this.resetAdaptiveThrottle();
      this.randomizeSeeds(preset.seedStyle || 'spots');
      this.renderCurrent();
    }

    randomizeSeeds(style) {
      this.state.randomizeSeeds(
        style,
        Number(this.view.controls.seedDensity.value),
        Number(this.view.controls.seedRadius.value)
      );
    }

    morphCurrent() {
      const jitterSlider = (control, amount, min, max) => {
        const current = Number(this.view.controls[control].value);
        this.view.controls[control].value = ns.clamp(current + (Math.random() - 0.5) * amount, min, max)
          .toFixed(control === 'speed' ? 0 : 3);
      };

      jitterSlider('feed', 0.008, 0.010, 0.090);
      jitterSlider('kill', 0.008, 0.030, 0.080);
      jitterSlider('gain', 0.25, 0.20, 2.50);
      jitterSlider('flowX', 0.08, -0.30, 0.30);
      jitterSlider('flowY', 0.08, -0.30, 0.30);
      jitterSlider('noise', 0.0016, 0.0000, 0.0100);
      this.currentPresetKey = null;
      this.isCustom = true;
      this.recordAction('morph');
      this.recordAction('advancedTune');
      this.updateControlText();
      this.resetAdaptiveThrottle();
      this.renderCurrent();
    }

    startActiveMission(resetActions = true) {
      const manager = this.getActiveMissionManager();
      const mission = manager.startMission();
      if (!mission) return;
      if (resetActions) manager.resetActions();
      if (mission.preset) this.applyPreset(mission.preset, { silent: true });
      else this.renderCurrent();
      this.view.setActiveTab(mission.recommendedTab || 'core');
      this.updateMissionDisplay();
    }

    startLearningMode() {
      this.experienceManager.startLearning();
      this.learningMissionManager.startMission();
      this.view.setActiveTab(this.learningMissionManager.activeMission?.recommendedTab || 'brush');
      this.updateMissionDisplay();
    }

    startFullMode() {
      this.experienceManager.startFull();
      this.view.setActiveTab('core');
      this.updateMissionDisplay();
    }

    applySettingsDefaults() {
      const settings = this.experienceManager.settings;
      if (this.view.controls.palette) this.view.controls.palette.value = settings.defaultPalette;
      if (this.view.controls.viewMode) this.view.controls.viewMode.value = settings.defaultView;
      if (this.view.controls.speed) this.view.controls.speed.value = settings.defaultSpeed;
      this.applyPreset(settings.defaultPreset || 'spots', { silent: true, preserveDisplay: true });
      if (this.view.controls.palette) this.view.controls.palette.value = settings.defaultPalette;
      if (this.view.controls.viewMode) this.view.controls.viewMode.value = settings.defaultView;
      if (this.view.controls.speed) this.view.controls.speed.value = settings.defaultSpeed;
      this.updateControlText();
    }

    recordAction(action, amount = 1) {
      this.missionManager.recordAction(action, amount);
      this.learningMissionManager.recordAction(action, amount);
    }

    getActiveMissionManager() {
      return this.experienceManager.activeMissionManager || this.missionManager;
    }

    renderCurrent(params = this.simulation.getParams(this.view.controls), now = performance.now()) {
      const stats = this.renderer.render(params, this.fps);
      const manager = this.getActiveMissionManager();
      const missionMetrics = this.analyzer.analyze(stats, params, {
        actionCounts: manager.actionCounts,
        presetKey: this.currentPresetKey,
        isCustom: this.isCustom
      });
      const beforeUnlocked = manager.unlockedIndex;
      const missionStatus = manager.update(missionMetrics);
      if (this.experienceManager.mode === 'learning' && manager.unlockedIndex !== beforeUnlocked) {
        this.experienceManager.applyClasses();
      }
      this.view.updateStats(stats);
      this.view.updateMission(missionStatus, manager.missions.length);
      this.updateAdaptiveThrottle(stats, now);
      return stats;
    }

    updateMissionDisplay() {
      const params = this.simulation.getParams(this.view.controls);
      const stats = this.renderer.render(params, this.fps);
      const manager = this.getActiveMissionManager();
      const missionMetrics = this.analyzer.analyze(stats, params, {
        actionCounts: manager.actionCounts,
        presetKey: this.currentPresetKey,
        isCustom: this.isCustom
      });
      this.view.updateMission(manager.update(missionMetrics), manager.missions.length);
    }

    resetAdaptiveThrottle() {
      this.adaptiveThrottle.active = false;
      this.adaptiveThrottle.idleSince = null;
      this.adaptiveThrottle.lastStepAt = 0;
    }

    isCollapsedField(stats) {
      return stats.steps > 60 &&
        stats.avgChange < 0.00008 &&
        stats.avgReaction < 0.00008 &&
        stats.contrast < 0.002 &&
        (stats.coverage < 0.01 || stats.coverage > 0.99);
    }

    updateAdaptiveThrottle(stats, now = performance.now()) {
      if (!this.isCollapsedField(stats)) {
        this.resetAdaptiveThrottle();
        return false;
      }

      if (this.adaptiveThrottle.idleSince === null) {
        this.adaptiveThrottle.idleSince = now;
      }

      this.adaptiveThrottle.active = now - this.adaptiveThrottle.idleSince >= this.adaptiveThrottle.holdMs;
      return this.adaptiveThrottle.active;
    }

    shouldRunFrame(now) {
      if (!this.adaptiveThrottle.active) return true;
      if (now - this.adaptiveThrottle.lastStepAt < this.adaptiveThrottle.stepIntervalMs) return false;
      this.adaptiveThrottle.lastStepAt = now;
      return true;
    }

    loop(now) {
      if (this.running && this.shouldRunFrame(now)) {
        const params = this.simulation.getParams(this.view.controls);
        const speed = this.adaptiveThrottle.active ? 1 : Number(this.view.controls.speed.value);
        this.state.snapshotFrameStart();
        for (let i = 0; i < speed; i++) this.simulation.step(params);
        this.renderCurrent(params, now);
        this.frameCounter++;
      }

      if (now - this.lastTime >= 1000) {
        this.fps = this.running ? this.frameCounter : 0;
        this.frameCounter = 0;
        this.lastTime = now;
      }

      requestAnimationFrame(next => this.loop(next));
    }
  }

  ns.SimulatorController = SimulatorController;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
