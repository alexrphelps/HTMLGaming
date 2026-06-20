(function (ns) {
  'use strict';

  function hashSeed(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed) || 1;
    const random = function () {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    random.int = (min, max) => Math.floor(random() * (max - min + 1)) + min;
    random.pick = list => list[Math.floor(random() * list.length)];
    random.state = () => state >>> 0;
    return random;
  }

  ns.hashSeed = hashSeed;
  ns.createRng = createRng;
})(window.Lumenkin = window.Lumenkin || {});
