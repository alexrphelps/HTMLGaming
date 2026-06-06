(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  function createSaveManager(storage, key) {
    const backing = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    const storageKey = key || ns.CONFIG.storageKey;

    return {
      save(campaign) {
        if (!backing || !campaign) return false;
        try {
          if (typeof ns.normalizeTutorialState === "function") ns.normalizeTutorialState(campaign);
          backing.setItem(storageKey, JSON.stringify(campaign));
          return true;
        } catch (error) {
          console.warn("Contraband Skies save failed:", error);
          return false;
        }
      },
      load() {
        if (!backing) return null;
        try {
          const raw = backing.getItem(storageKey);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          if (!parsed || parsed.version !== 1) return null;
          if (typeof ns.normalizeTutorialState === "function") ns.normalizeTutorialState(parsed);
          return parsed;
        } catch (error) {
          console.warn("Contraband Skies save load failed:", error);
          return null;
        }
      },
      clear() {
        if (!backing) return false;
        backing.removeItem(storageKey);
        return true;
      }
    };
  }

  ns.createSaveManager = createSaveManager;
})(typeof window !== "undefined" ? window : globalThis);
