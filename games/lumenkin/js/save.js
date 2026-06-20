(function (ns) {
  'use strict';

  const LEGACY_KEY = 'lumenkin.legacyRecords';

  class LegacySaveError extends Error {
    constructor(record) { super('This campaign belongs to the retired real-time rules.'); this.name = 'LegacySaveError'; this.record = record; }
  }

  class SaveManager {
    constructor(storage) { this.storage = storage || window.localStorage; this.lastError = null; }

    safely(operation, fallback) {
      try { this.lastError = null; return operation(); }
      catch (error) { this.lastError = error; return fallback; }
    }

    serialize(campaign) {
      return JSON.stringify({ schemaVersion: ns.CONFIG.schemaVersion, savedAt: Date.now(), campaign });
    }

    legacyRecord(payload) {
      const campaign = payload && payload.campaign || {};
      const lineage = campaign.lineage || {};
      return {
        sourceSchema: Number(payload && payload.schemaVersion) || 1,
        archivedAt: Date.now(),
        name: String(lineage.name || 'Unnamed lineage').slice(0, 80),
        chapter: clampChapter(campaign.chapter),
        founder: plainObject(lineage.founder),
        branches: stringArray(lineage.branches, 12),
        portraits: Array.isArray(lineage.portraits) ? lineage.portraits.slice(0, 12).map(plainObject) : [],
        generations: Math.max(1, Number(lineage.generations) || 1),
        populationPeak: Math.max(1, Number(lineage.populationPeak) || 1),
        history: stringArray(campaign.history, 50)
      };
    }

    archiveLegacy(record) {
      return this.safely(() => {
        const existing = JSON.parse(this.storage.getItem(LEGACY_KEY) || '[]');
        const records = Array.isArray(existing) ? existing : [];
        const duplicate = records.some(item => item.name === record.name && item.sourceSchema === record.sourceSchema && item.chapter === record.chapter);
        if (!duplicate) { records.unshift(record); this.storage.setItem(LEGACY_KEY, JSON.stringify(records.slice(0, 20))); }
        return record;
      }, record);
    }

    listLegacyRecords() {
      return this.safely(() => { const value = JSON.parse(this.storage.getItem(LEGACY_KEY) || '[]'); return Array.isArray(value) ? value : []; }, []);
    }

    deserialize(text) {
      const payload = JSON.parse(text);
      if (!payload || !payload.campaign) throw new Error('Save data is incomplete');
      if (payload.schemaVersion !== ns.CONFIG.schemaVersion) {
        const record = this.archiveLegacy(this.legacyRecord(payload));
        throw new LegacySaveError(record);
      }
      return payload.campaign;
    }

    saveAutosave(campaign) { return this.safely(() => { this.storage.setItem(ns.CONFIG.autosaveKey, this.serialize(campaign)); return true; }, false); }
    loadAutosave() { const value = this.safely(() => this.storage.getItem(ns.CONFIG.autosaveKey), null); return value ? this.deserialize(value) : null; }
    hasAutosave() { return Boolean(this.safely(() => this.storage.getItem(ns.CONFIG.autosaveKey), null)); }
    saveSlot(name, campaign) { return this.safely(() => { this.storage.setItem(`${ns.CONFIG.savePrefix}${name}`, this.serialize(campaign)); return true; }, false); }
    loadSlot(name) { const value = this.safely(() => this.storage.getItem(`${ns.CONFIG.savePrefix}${name}`), null); return value ? this.deserialize(value) : null; }
    listSlots() {
      return this.safely(() => {
        const slots = [];
        for (let i = 0; i < this.storage.length; i += 1) {
          const key = this.storage.key(i);
          if (!key || key.indexOf(ns.CONFIG.savePrefix) !== 0) continue;
          try {
            const payload = JSON.parse(this.storage.getItem(key));
            if (payload.schemaVersion !== ns.CONFIG.schemaVersion || !payload.campaign || !payload.campaign.lineage) continue;
            slots.push({ name: key.slice(ns.CONFIG.savePrefix.length), savedAt: payload.savedAt, chapter: clampChapter(payload.campaign.chapter), lineage: String(payload.campaign.lineage.name || 'Unnamed') });
          } catch (error) { /* Malformed slots remain isolated. */ }
        }
        return slots.sort((a, b) => b.savedAt - a.savedAt);
      }, []);
    }

    checkpoint(campaign) {
      const copy = JSON.parse(JSON.stringify(campaign));
      copy.checkpoint = null;
      campaign.checkpoint = { chapter: campaign.chapter, createdAt: Date.now(), campaign: copy };
      return campaign.checkpoint;
    }

    branchFromCheckpoint(campaign) {
      if (!campaign.checkpoint) return null;
      const copy = JSON.parse(JSON.stringify(campaign.checkpoint.campaign));
      copy.lineage.name = `${copy.lineage.name} - Branch`;
      copy.history.unshift('A new lineage diverged at metamorphosis.');
      return copy;
    }
  }

  function clampChapter(value) { return Math.max(0, Math.min(ns.CONFIG.chapters.length - 1, Number(value) || 0)); }
  function stringArray(value, limit) { return Array.isArray(value) ? value.slice(0, limit).map(item => String(item).slice(0, 240)) : []; }
  function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : {}; }

  ns.LegacySaveError = LegacySaveError;
  ns.SaveManager = SaveManager;
})(window.Lumenkin = window.Lumenkin || {});
