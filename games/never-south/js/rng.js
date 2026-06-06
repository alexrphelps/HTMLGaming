(function() {
  "use strict";

  const ns = window.NeverSouth || {};

  function hashSeed(seed) {
    const text = String(seed || "never-south");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed);
    return {
      next() {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      },
      int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
      },
      pick(items) {
        return items[Math.floor(this.next() * items.length)];
      },
      chance(probability) {
        return this.next() < probability;
      },
      shuffle(items) {
        const result = items.slice();
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(this.next() * (i + 1));
          const tmp = result[i];
          result[i] = result[j];
          result[j] = tmp;
        }
        return result;
      }
    };
  }

  ns.createRng = createRng;
  window.NeverSouth = ns;
})();
