(function() {
  "use strict";

  const ns = window.StormlineRunner;

  function hashSeed(seed) {
    const text = String(seed || "stormline");
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
      next: function() {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      },
      range: function(min, max) {
        return min + (max - min) * this.next();
      },
      int: function(min, max) {
        return Math.floor(this.range(min, max + 1));
      },
      pick: function(items) {
        return items[Math.floor(this.next() * items.length) % items.length];
      },
      chance: function(probability) {
        return this.next() < probability;
      }
    };
  }

  ns.hashSeed = hashSeed;
  ns.createRng = createRng;
})();
