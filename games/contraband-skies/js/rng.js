(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashString(seed) || 1;
    return function next() {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function range(rng, min, max) {
    return min + (max - min) * rng();
  }

  function int(rng, min, max) {
    return Math.floor(range(rng, min, max + 1));
  }

  function choice(rng, items) {
    return items[Math.floor(rng() * items.length) % items.length];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  ns.hashString = hashString;
  ns.createRng = createRng;
  ns.rngRange = range;
  ns.rngInt = int;
  ns.rngChoice = choice;
  ns.clamp = clamp;
})(typeof window !== "undefined" ? window : globalThis);
