(function(ns) {
  const STORAGE_KEY = 'reaction-diffusion-missions-v1';

  function readMetric(metrics, path) {
    return path.split('.').reduce((value, part) => {
      if (value === undefined || value === null) return undefined;
      return value[part];
    }, metrics);
  }

  function formatValue(value) {
    if (typeof value === 'boolean') return value ? 'yes' : 'no';
    if (typeof value === 'string') return value;
    if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
    if (Math.abs(value) < 1 && value !== 0) return value.toFixed(3);
    return value.toFixed(value % 1 === 0 ? 0 : 2);
  }

  class MissionManager {
    constructor(missions, storage, options = {}) {
      this.missions = missions || [];
      this.storage = storage || null;
      this.storageKey = options.storageKey || STORAGE_KEY;
      this.actionCounts = {};
      this.activeIndex = 0;
      this.unlockedIndex = 0;
      this.completedIds = [];
      this.holdStart = null;
      this.lastStatus = null;
      this.load();
    }

    get activeMission() {
      return this.missions[this.activeIndex] || null;
    }

    load() {
      if (!this.storage) return;
      try {
        const raw = this.storage.getItem(this.storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        this.completedIds = Array.isArray(saved.completedIds) ? saved.completedIds : [];
        this.unlockedIndex = Math.min(Number(saved.unlockedIndex) || 0, Math.max(0, this.missions.length - 1));
        this.activeIndex = Math.min(Number(saved.activeIndex) || this.unlockedIndex, this.unlockedIndex);
      } catch (error) {
        console.warn('Mission progress could not be loaded:', error);
      }
    }

    save() {
      if (!this.storage) return;
      try {
        this.storage.setItem(this.storageKey, JSON.stringify({
          completedIds: this.completedIds,
          unlockedIndex: this.unlockedIndex,
          activeIndex: this.activeIndex
        }));
      } catch (error) {
        console.warn('Mission progress could not be saved:', error);
      }
    }

    recordAction(action, amount = 1) {
      this.actionCounts[action] = (this.actionCounts[action] || 0) + amount;
      if (['paint', 'burst', 'pulse', 'generate', 'preset'].includes(action)) {
        this.actionCounts.seeded = (this.actionCounts.seeded || 0) + amount;
      }
    }

    resetActions() {
      this.actionCounts = {};
      this.holdStart = null;
    }

    startMission(indexOrId = this.activeIndex) {
      const index = typeof indexOrId === 'string'
        ? this.missions.findIndex(mission => mission.id === indexOrId)
        : indexOrId;
      if (index < 0 || index >= this.missions.length || index > this.unlockedIndex) return null;
      this.activeIndex = index;
      this.holdStart = null;
      this.lastStatus = null;
      this.save();
      return this.activeMission;
    }

    resetActiveMission() {
      this.resetActions();
      this.lastStatus = null;
      return this.activeMission;
    }

    nextMission() {
      const nextIndex = Math.min(this.activeIndex + 1, this.unlockedIndex, this.missions.length - 1);
      return this.startMission(nextIndex);
    }

    evaluateRequirement(requirement, metrics) {
      const actual = readMetric(metrics, requirement.metric);
      let met = true;

      if (requirement.equals !== undefined) met = actual === requirement.equals;
      if (requirement.min !== undefined) met = met && Number(actual || 0) >= requirement.min;
      if (requirement.max !== undefined) met = met && Number(actual || 0) <= requirement.max;

      let target = '';
      if (requirement.equals !== undefined) target = formatValue(requirement.equals);
      else if (requirement.min !== undefined && requirement.max !== undefined) target = `${formatValue(requirement.min)}-${formatValue(requirement.max)}`;
      else if (requirement.min !== undefined) target = `${formatValue(requirement.min)}+`;
      else if (requirement.max !== undefined) target = `under ${formatValue(requirement.max)}`;

      return {
        ...requirement,
        actual,
        actualText: formatValue(actual),
        targetText: target,
        met
      };
    }

    update(metrics, now = performance.now()) {
      const mission = this.activeMission;
      if (!mission) return null;

      const requirements = mission.requirements.map(requirement => this.evaluateRequirement(requirement, metrics));
      const allMet = requirements.every(requirement => requirement.met);

      if (allMet) {
        if (this.holdStart === null) this.holdStart = now;
      } else {
        this.holdStart = null;
      }

      const holdMs = mission.holdMs || 0;
      const heldMs = this.holdStart === null ? 0 : Math.max(0, now - this.holdStart);
      const completed = allMet && heldMs >= holdMs;

      if (completed && !this.completedIds.includes(mission.id)) {
        this.completedIds.push(mission.id);
        this.unlockedIndex = Math.min(this.missions.length - 1, Math.max(this.unlockedIndex, this.activeIndex + 1));
        this.save();
      }

      this.lastStatus = {
        mission,
        activeIndex: this.activeIndex,
        unlockedIndex: this.unlockedIndex,
        completedIds: [...this.completedIds],
        requirements,
        allMet,
        completed: this.completedIds.includes(mission.id),
        holdProgress: holdMs ? ns.clamp(heldMs / holdMs, 0, 1) : Number(allMet),
        rewardText: mission.rewardText,
        actionCounts: { ...this.actionCounts }
      };

      return this.lastStatus;
    }
  }

  ns.MISSION_STORAGE_KEY = STORAGE_KEY;
  ns.MissionManager = MissionManager;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
