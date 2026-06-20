(function(D) {
  with (D) {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
  function randRange(rng, a, b) { return a + (b - a) * rng(); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function roomKey(x, y) { return `${x},${y}`; }
  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seeded(seed, x = 0, y = 0, salt = "") {
    return mulberry32(hashString(`${seed}|${x}|${y}|${salt}`));
  }
  function chance(rng, p) { return rng() < p; }

  function hexToRgba(hex, alpha) {
    const c = hex.replace("#", "");
    const n = parseInt(c.length === 3 ? c.split("").map(v=>v+v).join("") : c, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function roundRect(x, y, w, h, r, fill, stroke = false) {
    r = Math.min(r, Math.abs(w)/2, Math.abs(h)/2);
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

    Object.assign(D, {
      clamp,
      lerp,
      dist,
      angleTo,
      randRange,
      pick,
      roomKey,
      hashString,
      mulberry32,
      seeded,
      chance,
      hexToRgba,
      roundRect
    });
  }
})(window.Depthbound = window.Depthbound || {});
