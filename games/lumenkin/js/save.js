(function (ns) {
  'use strict';

  class SaveManager {
    constructor(storage) { this.storage = storage || window.localStorage; }

    serialize(campaign) {
      return JSON.stringify({ schemaVersion: ns.CONFIG.schemaVersion, savedAt: Date.now(), campaign });
    }

    deserialize(text) {
      const payload = JSON.parse(text);
      if (!payload || !payload.campaign) throw new Error('Save data is incomplete');
      if (payload.schemaVersion !== ns.CONFIG.schemaVersion) throw new Error('Save version is not supported');
      return payload.campaign;
    }

    saveAutosave(campaign) { this.storage.setItem(ns.CONFIG.autosaveKey, this.serialize(campaign)); }
    loadAutosave() { const value = this.storage.getItem(ns.CONFIG.autosaveKey); return value ? this.deserialize(value) : null; }
    hasAutosave() { return Boolean(this.storage.getItem(ns.CONFIG.autosaveKey)); }
    saveSlot(name, campaign) { this.storage.setItem(`${ns.CONFIG.savePrefix}${name}`, this.serialize(campaign)); }
    loadSlot(name) { const value = this.storage.getItem(`${ns.CONFIG.savePrefix}${name}`); return value ? this.deserialize(value) : null; }
    listSlots() {
      const slots = [];
      for (let i = 0; i < this.storage.length; i += 1) {
        const key = this.storage.key(i);
        if (key && key.indexOf(ns.CONFIG.savePrefix) === 0) {
          try {
            const payload = JSON.parse(this.storage.getItem(key));
            slots.push({ name: key.slice(ns.CONFIG.savePrefix.length), savedAt: payload.savedAt, chapter: payload.campaign.chapter, lineage: payload.campaign.lineage.name });
          } catch (error) { /* Ignore malformed unrelated user data. */ }
        }
      }
      return slots.sort((a, b) => b.savedAt - a.savedAt);
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
      copy.lineage.name = `${copy.lineage.name} · Branch`;
      copy.history.unshift('A new lineage diverged at metamorphosis.');
      return copy;
    }
  }

  ns.SaveManager = SaveManager;
})(window.Lumenkin = window.Lumenkin || {});
