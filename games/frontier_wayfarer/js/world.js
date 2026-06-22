(function (ns) {
    const { REGIONS, LANDMARKS, WORLD_OBJECT_TYPES, WORLD_SCENARIOS } = ns.Data;
    const { clamp, hash, distance } = ns.MathUtil;
    const CHUNK_SIZE = 900;
    const LOAD_RADIUS = 2;
    const WORLD_BOUNDS = { minX: -33750, maxX: 33750, minY: -18000, maxY: 46800 };
    const ASTEROID_TIERS = {
        large: { radius: 54, radiusVariance: 14, hull: 90, speed: 7, child: 'medium' },
        medium: { radius: 31, radiusVariance: 7, hull: 45, speed: 12, child: 'small' },
        small: { radius: 16, radiusVariance: 4, hull: 20, speed: 18, child: null }
    };

    function boundaryExposure(x, y) {
        const outsideX = Math.max(WORLD_BOUNDS.minX - x, 0, x - WORLD_BOUNDS.maxX);
        const outsideY = Math.max(WORLD_BOUNDS.minY - y, 0, y - WORLD_BOUNDS.maxY);
        const depth = Math.hypot(outsideX, outsideY);
        const insideDistance = depth ? -depth : Math.min(x - WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX - x, y - WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY - y);
        return { depth, insideDistance, active: depth > 0, proximity: clamp((900 - insideDistance) / 900, 0, 1) };
    }
    function regionAt(x, y) {
        const safeX = clamp(x, WORLD_BOUNDS.minX + 1, WORLD_BOUNDS.maxX - 1);
        const safeY = clamp(y, WORLD_BOUNDS.minY + 1, WORLD_BOUNDS.maxY - 1);
        return REGIONS.find(r => safeX >= r.x && safeX < r.x + r.w && safeY >= r.y && safeY < r.y + r.h) || REGIONS[0];
    }
    function chunkKey(cx, cy) { return `${cx},${cy}`; }
    function asteroidTier(seed, cx, cy, index) {
        const roll = hash(seed, cx, cy, 300 + index);
        return roll < .34 ? 'large' : roll < .73 ? 'medium' : 'small';
    }
    function makeAsteroid(seed, cx, cy, index) {
        const id = `rock:${cx}:${cy}:${index}`, tier = asteroidTier(seed, cx, cy, index), spec = ASTEROID_TIERS[tier];
        const direction = hash(seed, cx, cy, 360 + index) * Math.PI * 2;
        const speed = spec.speed * (.45 + hash(seed, cx, cy, 420 + index) * .75);
        const radius = spec.radius + (hash(seed, cx, cy, 140 + index) * 2 - 1) * spec.radiusVariance;
        return {
            id, rootId: id, kind: 'asteroid', tier,
            x: cx * CHUNK_SIZE + hash(seed, cx, cy, 20 + index) * CHUNK_SIZE,
            y: cy * CHUNK_SIZE + hash(seed, cx, cy, 80 + index) * CHUNK_SIZE,
            vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
            radius, hull: spec.hull, maxHull: spec.hull,
            rotation: hash(seed, cx, cy, 180 + index) * Math.PI * 2,
            spin: (hash(seed, cx, cy, 220 + index) * 2 - 1) * (.18 + 12 / radius),
            shapeSeed: Math.floor(hash(seed, cx, cy, 500 + index) * 100000)
        };
    }
    function eligibleDefinitions(definitions, region, safeOnly) {
        return Object.values(definitions).filter(definition => {
            if (!definition.backdrops?.[region.backdrop] || region.danger < (definition.minDanger || 0) || region.danger > (definition.maxDanger || Infinity)) return false;
            return !safeOnly || ['survey_probe', 'emergency_supply_pod', 'abandoned_worksite'].includes(definition.id);
        });
    }
    function weightedDefinition(definitions, region, roll, safeOnly) {
        const eligible = eligibleDefinitions(definitions, region, safeOnly), total = eligible.reduce((sum, definition) => sum + definition.backdrops[region.backdrop], 0);
        if (!total) return null;
        let cursor = roll * total;
        return eligible.find(definition => (cursor -= definition.backdrops[region.backdrop]) <= 0) || eligible[eligible.length - 1];
    }
    function generatedEntity(seed, cx, cy, region, definition, kind, salt) {
        const minX = Math.max(cx * CHUNK_SIZE + 80, region.x + 80), maxX = Math.min((cx + 1) * CHUNK_SIZE - 80, region.x + region.w - 80);
        const minY = Math.max(cy * CHUNK_SIZE + 80, region.y + 80), maxY = Math.min((cy + 1) * CHUNK_SIZE - 80, region.y + region.h - 80);
        return {
            id: `${kind === 'worldScenario' ? 'world-scenario' : 'world-object'}:${definition.id}:${cx}:${cy}`,
            kind, typeId: definition.id, name: definition.name,
            x: minX + hash(seed, cx, cy, salt) * Math.max(0, maxX - minX),
            y: minY + hash(seed, cx, cy, salt + 1) * Math.max(0, maxY - minY),
            radius: kind === 'worldScenario' ? 30 : 22, region: region.id,
            variant: definition.ambushChance && hash(seed, cx, cy, salt + 2) < definition.ambushChance ? 'guarded' : 'standard'
        };
    }
    function generateChunk(seed, cx, cy) {
        const center = { x: (cx + .5) * CHUNK_SIZE, y: (cy + .5) * CHUNK_SIZE };
        const region = regionAt(center.x, center.y);
        const entities = [];
        const baseAsteroids = 5 + Math.floor(hash(seed, cx, cy, 1) * (7 + region.danger * 2));
        const asteroidCount = Math.max(3, Math.round(baseAsteroids * (region.asteroidDensity || 1)));
        for (let i = 0; i < asteroidCount; i++) entities.push(makeAsteroid(seed, cx, cy, i));
        const insideWorld = center.x >= WORLD_BOUNDS.minX && center.x < WORLD_BOUNDS.maxX && center.y >= WORLD_BOUNDS.minY && center.y < WORLD_BOUNDS.maxY;
        const openingRoute = region.id === 'trade_belt' && distance(center, { x: 0, y: 0 }) < 2500;
        const objectChance = .08 + region.danger * .02 + region.remoteness * .015;
        if (insideWorld && hash(seed, cx, cy, 3) < objectChance) {
            const definition = weightedDefinition(WORLD_OBJECT_TYPES, region, hash(seed, cx, cy, 4), openingRoute);
            if (definition) entities.push(generatedEntity(seed, cx, cy, region, definition, 'worldObject', 5));
        }
        const scenarioChance = .025 + region.danger * .012 + region.remoteness * .01;
        if (insideWorld && !openingRoute && hash(seed, cx, cy, 10) < scenarioChance) {
            const definition = weightedDefinition(WORLD_SCENARIOS, region, hash(seed, cx, cy, 11), false);
            if (definition) {
                const scenario = generatedEntity(seed, cx, cy, region, definition, 'worldScenario', 12); entities.push(scenario);
                if (definition.companionObject && WORLD_OBJECT_TYPES[definition.companionObject]) {
                    const companion = generatedEntity(seed, cx, cy, region, WORLD_OBJECT_TYPES[definition.companionObject], 'worldObject', 16);
                    companion.id += ':worksite'; companion.x = clamp(scenario.x + 95, Math.max(cx * CHUNK_SIZE + 40, region.x + 40), Math.min((cx + 1) * CHUNK_SIZE - 40, region.x + region.w - 40)); companion.y = clamp(scenario.y - 65, Math.max(cy * CHUNK_SIZE + 40, region.y + 40), Math.min((cy + 1) * CHUNK_SIZE - 40, region.y + region.h - 40)); companion.variant = 'worksite'; entities.push(companion);
                }
            }
        }
        LANDMARKS.filter(l => Math.floor(l.x / CHUNK_SIZE) === cx && Math.floor(l.y / CHUNK_SIZE) === cy)
            .forEach(l => entities.push(Object.assign({ radius: l.type === 'station' ? 105 : 65, kind: l.type }, l)));
        return { key: chunkKey(cx, cy), cx, cy, region: region.id, entities };
    }

    class WorldService {
        constructor(seed, consumedEntityIds) { this.seed = seed; this.chunks = new Map(); this.asteroidRecords = new Map(); this.consumedEntityIds = new Set(consumedEntityIds || []); this.origin = { x: 0, y: 0 }; }
        restoreAsteroids(chunk) {
            const roots = chunk.entities.filter(entity => entity.kind === 'asteroid');
            chunk.entities = chunk.entities.filter(entity => entity.kind !== 'asteroid');
            roots.forEach(root => {
                const record = this.asteroidRecords.get(root.rootId);
                if (record) record.forEach(entity => chunk.entities.push(Object.assign({}, entity)));
                else chunk.entities.push(root);
            });
        }
        snapshotAsteroids(chunk) {
            const grouped = new Map();
            chunk.entities.filter(entity => entity.kind === 'asteroid').forEach(entity => {
                if (!grouped.has(entity.rootId)) grouped.set(entity.rootId, []);
                grouped.get(entity.rootId).push(Object.assign({}, entity));
            });
            const generated = generateChunk(this.seed, chunk.cx, chunk.cy).entities.filter(entity => entity.kind === 'asteroid');
            generated.forEach(root => this.asteroidRecords.set(root.rootId, grouped.get(root.rootId) || []));
        }
        update(x, y) {
            const ccx = Math.floor(x / CHUNK_SIZE), ccy = Math.floor(y / CHUNK_SIZE);
            const wanted = new Set();
            for (let oy = -LOAD_RADIUS; oy <= LOAD_RADIUS; oy++) for (let ox = -LOAD_RADIUS; ox <= LOAD_RADIUS; ox++) {
                const key = chunkKey(ccx + ox, ccy + oy); wanted.add(key);
                if (!this.chunks.has(key)) { const chunk = generateChunk(this.seed, ccx + ox, ccy + oy); chunk.entities = chunk.entities.filter(entity => !this.consumedEntityIds.has(entity.id)); this.restoreAsteroids(chunk); this.chunks.set(key, chunk); }
            }
            for (const [key, chunk] of this.chunks) if (!wanted.has(key)) { this.snapshotAsteroids(chunk); this.chunks.delete(key); }
            if (Math.abs(x - this.origin.x) > 4000 || Math.abs(y - this.origin.y) > 4000) this.origin = { x, y };
            return regionAt(x, y);
        }
        updateAsteroids(dt) {
            this.loadedEntities().filter(entity => entity.kind === 'asteroid').forEach(entity => {
                entity.x += entity.vx * dt; entity.y += entity.vy * dt; entity.rotation += entity.spin * dt;
            });
        }
        splitAsteroid(entity) {
            const spec = ASTEROID_TIERS[entity.tier]; if (!spec?.child) return [];
            const childSpec = ASTEROID_TIERS[spec.child], base = Math.atan2(entity.vy, entity.vx);
            return [-1, 1].map((side, index) => {
                const angle = base + side * (.55 + hash(this.seed, entity.shapeSeed, index, 1) * .25);
                const speed = childSpec.speed * (.8 + hash(this.seed, entity.shapeSeed, index, 2) * .55);
                const radius = childSpec.radius + (hash(this.seed, entity.shapeSeed, index, 3) * 2 - 1) * childSpec.radiusVariance;
                return { id: `${entity.id}.${index}`, rootId: entity.rootId, kind: 'asteroid', tier: spec.child, x: entity.x + Math.cos(angle) * radius, y: entity.y + Math.sin(angle) * radius, vx: entity.vx * .45 + Math.cos(angle) * speed, vy: entity.vy * .45 + Math.sin(angle) * speed, radius, hull: childSpec.hull, maxHull: childSpec.hull, rotation: entity.rotation + side, spin: entity.spin * -side * 1.35, shapeSeed: entity.shapeSeed + index + 1 };
            });
        }
        damageAsteroid(entity, damage) {
            if (!entity || entity.kind !== 'asteroid' || entity.hull <= 0) return { hit: false, destroyed: false, reward: 0, fragments: [] };
            entity.hull -= Math.max(0, damage); if (entity.hull > 0) return { hit: true, destroyed: false, reward: 0, fragments: [] };
            const chunk = Array.from(this.chunks.values()).find(value => value.entities.includes(entity)); if (!chunk) return { hit: true, destroyed: true, reward: 0, fragments: [] };
            const fragments = this.splitAsteroid(entity); chunk.entities.splice(chunk.entities.indexOf(entity), 1, ...fragments);
            this.asteroidRecords.set(entity.rootId, chunk.entities.filter(value => value.kind === 'asteroid' && value.rootId === entity.rootId).map(value => Object.assign({}, value)));
            return { hit: true, destroyed: true, reward: fragments.length ? 0 : 2, fragments };
        }
        loadedEntities() { return Array.from(this.chunks.values()).flatMap(chunk => chunk.entities); }
        nearbyEntities(x, y, radius) { return this.loadedEntities().filter(e => distance({ x, y }, e) <= radius); }
        consumeEntity(state, entity) {
            if (!entity || !['signal', 'salvage', 'worldObject', 'worldScenario'].includes(entity.kind) || this.consumedEntityIds.has(entity.id)) return false;
            this.consumedEntityIds.add(entity.id); state.consumedEntityIds = Array.from(this.consumedEntityIds);
            for (const chunk of this.chunks.values()) { const index = chunk.entities.indexOf(entity); if (index >= 0) { chunk.entities.splice(index, 1); break; } }
            return true;
        }
        nearestStation(x, y, predicate) { return LANDMARKS.filter(l => l.type === 'station' && (!predicate || predicate(l))).sort((a, b) => distance({ x, y }, a) - distance({ x, y }, b))[0]; }
        toScreen(x, y, camera, viewport) { return { x: viewport.w / 2 + x - camera.x, y: viewport.h / 2 + y - camera.y }; }
        discover(state, entity) { if (!entity || state.discoveries.includes(entity.id)) return false; state.discoveries.push(entity.id); state.stats.discoveries++; return true; }
    }

    ns.World = { CHUNK_SIZE, LOAD_RADIUS, WORLD_BOUNDS, ASTEROID_TIERS, boundaryExposure, regionAt, eligibleDefinitions, weightedDefinition, generateChunk, WorldService };
})(window.MiniInvadersV2);
