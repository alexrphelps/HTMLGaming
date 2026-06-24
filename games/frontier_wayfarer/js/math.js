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
    function segmentCircleHit(from, to, circle, padding) {
        const dx = to.x - from.x, dy = to.y - from.y, radius = (circle.radius || 0) + (padding || 0);
        const fx = from.x - circle.x, fy = from.y - circle.y, a = dx * dx + dy * dy;
        if (a <= 0) return fx * fx + fy * fy <= radius * radius ? 0 : null;
        const b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - radius * radius, discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null;
        const root = Math.sqrt(discriminant), near = (-b - root) / (2 * a), far = (-b + root) / (2 * a);
        if (near >= 0 && near <= 1) return near;
        if (far >= 0 && far <= 1) return far;
        return null;
    }
    function groupedNumber(value) { return String(Math.round(Math.max(0, Number(value) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function formatDistance(value) { return `${groupedNumber(value)} KM`; }
    function formatSpeed(value) { return `${groupedNumber(value)} KM/S`; }
    function angleToPointer(pointer, viewport, fallback, origin) {
        if (!pointer || !pointer.hasPosition) return Number.isFinite(fallback) ? fallback : 0;
        const center = origin || { x: viewport.w / 2, y: viewport.h / 2 };
        return Math.atan2(pointer.y - center.y, pointer.x - center.x);
    }
    function shipScale(ship) { return 1 + Math.min(4, (ship?.chassis?.level || 1) - 1) * .035; }
    function weaponMount(moduleOrId) { const id = typeof moduleOrId === 'string' ? moduleOrId : moduleOrId?.id || ''; return { forward: id.includes('rail') ? 31 : id.includes('seeker') ? 13 : 24, lateral: 15 }; }
    function weaponHardpoint(ship, slot, module) {
        const side = slot === 'primary2' ? 1 : -1, scale = shipScale(ship), moduleMount = weaponMount(module), hullMount = ns.Data?.HULLS?.[ship?.activeHullId]?.mounts, mount = { forward: hullMount?.forward || moduleMount.forward, lateral: hullMount?.lateral || moduleMount.lateral };
        const forward = mount.forward * scale, lateral = side * mount.lateral * scale;
        return { x: ship.x + Math.cos(ship.angle) * forward - Math.sin(ship.angle) * lateral, y: ship.y + Math.sin(ship.angle) * forward + Math.cos(ship.angle) * lateral };
    }
    ns.MathUtil = { clamp, lerp, distance, hash, seeded, circlesOverlap, segmentCircleHit, formatDistance, formatSpeed, angleToPointer, shipScale, weaponMount, weaponHardpoint };
})(window.FrontierWayfarer);
