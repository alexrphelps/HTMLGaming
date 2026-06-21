(function (ns) {
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function hash(seed, x, y, salt) {
        let h = (seed ^ (x * 374761393) ^ (y * 668265263) ^ ((salt || 0) * 1442695041)) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function seeded(seed) {
        let value = seed >>> 0;
        return function () {
            value += 0x6D2B79F5;
            let t = value;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function circlesOverlap(a, b) { return distance(a, b) <= (a.radius || 0) + (b.radius || 0); }
    function angleToPointer(pointer, viewport, fallback) {
        if (!pointer || !pointer.hasPosition) return Number.isFinite(fallback) ? fallback : 0;
        return Math.atan2(pointer.y - viewport.h / 2, pointer.x - viewport.w / 2);
    }
    ns.MathUtil = { clamp, lerp, distance, hash, seeded, circlesOverlap, angleToPointer };
})(window.MiniInvadersV2);
