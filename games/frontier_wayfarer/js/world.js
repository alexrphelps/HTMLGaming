(function (ns) {
    const { REGIONS, LANDMARKS } = ns.Data;
    const { hash, distance } = ns.MathUtil;
    const CHUNK_SIZE = 900;
    const LOAD_RADIUS = 2;
    const WORLD_BOUNDS = { minX: -11200, maxX: 11200, minY: -3000, maxY: 8600 };

    function regionAt(x, y) {
        return REGIONS.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) || REGIONS[0];
    }
    function chunkKey(cx, cy) { return `${cx},${cy}`; }
    function generateChunk(seed, cx, cy) {
        const center = { x: (cx + .5) * CHUNK_SIZE, y: (cy + .5) * CHUNK_SIZE };
        const region = regionAt(center.x, center.y);
        const entities = [];
        const asteroidCount = 5 + Math.floor(hash(seed, cx, cy, 1) * (7 + region.danger * 2));
        for (let i = 0; i < asteroidCount; i++) {
            entities.push({
                id: `rock:${cx}:${cy}:${i}`, kind: 'asteroid',
                x: cx * CHUNK_SIZE + hash(seed, cx, cy, 20 + i) * CHUNK_SIZE,
                y: cy * CHUNK_SIZE + hash(seed, cx, cy, 80 + i) * CHUNK_SIZE,
                radius: 18 + hash(seed, cx, cy, 140 + i) * 42,
                spin: hash(seed, cx, cy, 220 + i) * 2 - 1
            });
        }
        if (hash(seed, cx, cy, 3) < .16 + region.danger * .035) {
            entities.push({
                id: `signal:${cx}:${cy}`, kind: hash(seed, cx, cy, 4) > .55 ? 'salvage' : 'signal',
                x: cx * CHUNK_SIZE + hash(seed, cx, cy, 5) * CHUNK_SIZE,
                y: cy * CHUNK_SIZE + hash(seed, cx, cy, 6) * CHUNK_SIZE,
                radius: 18, discovered: false, region: region.id
            });
        }
        LANDMARKS.filter(l => Math.floor(l.x / CHUNK_SIZE) === cx && Math.floor(l.y / CHUNK_SIZE) === cy)
            .forEach(l => entities.push(Object.assign({ radius: l.type === 'station' ? 105 : 65, kind: l.type }, l)));
        return { key: chunkKey(cx, cy), cx, cy, region: region.id, entities };
    }

    class WorldService {
        constructor(seed) { this.seed = seed; this.chunks = new Map(); this.origin = { x: 0, y: 0 }; }
        update(x, y) {
            const ccx = Math.floor(x / CHUNK_SIZE), ccy = Math.floor(y / CHUNK_SIZE);
            const wanted = new Set();
            for (let oy = -LOAD_RADIUS; oy <= LOAD_RADIUS; oy++) for (let ox = -LOAD_RADIUS; ox <= LOAD_RADIUS; ox++) {
                const key = chunkKey(ccx + ox, ccy + oy); wanted.add(key);
                if (!this.chunks.has(key)) this.chunks.set(key, generateChunk(this.seed, ccx + ox, ccy + oy));
            }
            for (const key of this.chunks.keys()) if (!wanted.has(key)) this.chunks.delete(key);
            if (Math.abs(x - this.origin.x) > 4000 || Math.abs(y - this.origin.y) > 4000) this.origin = { x, y };
            return regionAt(x, y);
        }
        loadedEntities() { return Array.from(this.chunks.values()).flatMap(chunk => chunk.entities); }
        nearbyEntities(x, y, radius) { return this.loadedEntities().filter(e => distance({ x, y }, e) <= radius); }
        nearestStation(x, y, predicate) {
            return LANDMARKS.filter(l => l.type === 'station' && (!predicate || predicate(l))).sort((a, b) => distance({ x, y }, a) - distance({ x, y }, b))[0];
        }
        toScreen(x, y, camera, viewport) { return { x: viewport.w / 2 + x - camera.x, y: viewport.h / 2 + y - camera.y }; }
        discover(state, entity) {
            if (!entity || state.discoveries.includes(entity.id)) return false;
            state.discoveries.push(entity.id); state.stats.discoveries++;
            return true;
        }
    }

    ns.World = { CHUNK_SIZE, LOAD_RADIUS, WORLD_BOUNDS, regionAt, generateChunk, WorldService };
})(window.MiniInvadersV2);
