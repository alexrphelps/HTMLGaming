(function(ns) {
  const SETTINGS_KEY = 'reaction-diffusion-experience-v1';
  const DEFAULT_SETTINGS = {
    startupMode: 'menu',
    reducedMotion: false,
    uiDensity: 'comfortable',
    autoPauseMenus: true,
    defaultPalette: 'neon',
    defaultView: 'beauty',
    defaultPreset: 'spots',
    defaultSpeed: 2
  };

  class ExperienceManager {
    constructor({ documentRef, storage, learningManager, missionManager }) {
      this.document = documentRef;
      this.storage = storage || null;
      this.learningManager = learningManager;
      this.missionManager = missionManager;
      this.mode = 'menu';
      this.settingsOpen = false;
      this.settings = { ...DEFAULT_SETTINGS };
      this.load();
    }

    get learningStage() {
      return Math.min(6, Math.max(1, (this.learningManager?.unlockedIndex || 0) + 1));
    }

    get activeMissionManager() {
      return this.mode === 'learning' ? this.learningManager : this.missionManager;
    }

    load() {
      if (!this.storage) return;
      try {
        const raw = this.storage.getItem(SETTINGS_KEY);
        if (!raw) return;
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      } catch (error) {
        console.warn('Experience settings could not be loaded:', error);
      }
    }

    save() {
      if (!this.storage) return;
      try {
        this.storage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      } catch (error) {
        console.warn('Experience settings could not be saved:', error);
      }
    }

    updateSetting(key, value) {
      this.settings[key] = value;
      this.save();
      this.applyClasses();
    }

    startFromSettings() {
      if (this.settings.startupMode === 'learning') return this.startLearning();
      if (this.settings.startupMode === 'full') return this.startFull();
      if (this.settings.startupMode === 'resume') {
        return this.settings.lastMode === 'learning' ? this.startLearning() : this.startFull();
      }
      return this.showMenu(false);
    }

    showMenu(settingsOpen = false) {
      this.mode = 'menu';
      this.settingsOpen = settingsOpen;
      this.applyClasses();
    }

    startLearning() {
      this.mode = 'learning';
      this.settingsOpen = false;
      this.settings.lastMode = 'learning';
      this.save();
      this.applyClasses();
    }

    startFull() {
      this.mode = 'full';
      this.settingsOpen = false;
      this.settings.lastMode = 'full';
      this.save();
      this.applyClasses();
    }

    showAllControls() {
      this.mode = 'full';
      this.settingsOpen = false;
      this.settings.lastMode = 'full';
      this.save();
      this.applyClasses();
    }

    resetLearningProgress() {
      this.learningManager.completedIds = [];
      this.learningManager.unlockedIndex = 0;
      this.learningManager.activeIndex = 0;
      this.learningManager.resetActions();
      this.learningManager.save();
      this.applyClasses();
    }

    resetMissionProgress() {
      this.missionManager.completedIds = [];
      this.missionManager.unlockedIndex = 0;
      this.missionManager.activeIndex = 0;
      this.missionManager.resetActions();
      this.missionManager.save();
    }

    resetAll() {
      this.settings = { ...DEFAULT_SETTINGS };
      this.resetLearningProgress();
      this.resetMissionProgress();
      if (this.storage) {
        try {
          this.storage.removeItem(SETTINGS_KEY);
        } catch (error) {
          console.warn('Experience settings could not be reset:', error);
        }
      }
      this.showMenu(false);
    }

    syncSettingsControls() {
      const doc = this.document;
      const setChecked = (id, value) => {
        const node = doc.getElementById(id);
        if (node) node.checked = Boolean(value);
      };
      const setValue = (id, value) => {
        const node = doc.getElementById(id);
        if (node) node.value = value;
      };

      setChecked('settingReducedMotion', this.settings.reducedMotion);
      setValue('settingDensity', this.settings.uiDensity);
      setChecked('settingAutoPause', this.settings.autoPauseMenus);
      setValue('settingDefaultPalette', this.settings.defaultPalette);
      setValue('settingDefaultView', this.settings.defaultView);
      setValue('settingDefaultPreset', this.settings.defaultPreset);
      setValue('settingStartup', this.settings.startupMode);
      setValue('settingDefaultSpeed', this.settings.defaultSpeed);
    }

    applyClasses() {
      const body = this.document.body;
      body.classList.toggle('menu-open', this.mode === 'menu');
      body.classList.toggle('settings-open', this.settingsOpen);
      body.classList.toggle('experience-learning', this.mode === 'learning');
      body.classList.toggle('experience-full', this.mode === 'full');
      body.classList.toggle('reduced-motion', Boolean(this.settings.reducedMotion));
      body.classList.toggle('density-compact', this.settings.uiDensity === 'compact');

      for (let stage = 1; stage <= 6; stage++) {
        body.classList.toggle(`learning-stage-${stage}`, this.mode === 'learning' && this.learningStage === stage);
        body.classList.toggle(`learning-unlocked-${stage}`, this.mode === 'learning' && this.learningStage >= stage);
      }

      const overlay = this.document.getElementById('mainMenuOverlay');
      if (overlay) overlay.setAttribute('aria-hidden', String(this.mode !== 'menu'));
      this.syncSettingsControls();
    }
  }

  ns.EXPERIENCE_SETTINGS_KEY = SETTINGS_KEY;
  ns.EXPERIENCE_DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  ns.ExperienceManager = ExperienceManager;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
