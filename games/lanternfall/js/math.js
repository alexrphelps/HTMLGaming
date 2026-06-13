(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};

  function hash(x, y, seed) {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 982451653);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n = (n ^ (n >>> 16)) >>> 0;
    return n / 4294967295;
  }

  function hashString(value) {
    let h = 0;
    const text = String(value);
    for (let i = 0; i < text.length; i++) {
      h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function valueNoise(x, y, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const sx = smooth(x - x0);
    const sy = smooth(y - y0);
    const n00 = hash(x0, y0, seed);
    const n10 = hash(x0 + 1, y0, seed);
    const n01 = hash(x0, y0 + 1, seed);
    const n11 = hash(x0 + 1, y0 + 1, seed);
    return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
  }

  function tileKey(x, y) {
    return `${x},${y}`;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  Lanternfall.math = {
    hash,
    hashString,
    smooth,
    lerp,
    clamp,
    valueNoise,
    tileKey,
    easeInOut
  };
})();
