(function (ns) {
    const { REGIONS, LANDMARKS, WORLD_OBJECT_TYPES, WORLD_SCENARIOS } = ns.Data;
    const { clamp, hash, distance } = ns.MathUtil;
    const CHUNK_SIZE = 900;
    const LOAD_RADIUS = 2;
    function boundsFor(regions) {
        return (regions || REGIONS).reduce((bounds, region) => ({ minX: Math.min(bounds.minX, region.x), maxX: Math.max(bounds.maxX, region.x + region.w), minY: Math.min(bounds.minY, region.y), maxY: Math.max(bounds.maxY, region.y + region.h) }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    }
    const WORLD_BOUNDS = boundsFor(REGIONS);
    function catalogBounds() { return boundsFor(ns.Registry?.all('region') || REGIONS); }
    function createConfig(options) {
        const config = options || {}, regions = config.regions || ns.Registry?.all('region') || REGIONS;
        return { regions, landmarks: config.landmarks || ns.Registry?.all('landmark') || LANDMARKS, worldObjects: config.worldObjects || ns.Registry?.all('worldObject') || Object.values(WORLD_OBJECT_TYPES), worldEvents: config.worldEvents || ns.Registry?.all('worldEvent') || Object.values(WORLD_SCENARIOS), chunkSize: config.chunkSize || CHUNK_SIZE, loadRadius: Number.isInteger(config.loadRadius) ? config.loadRadius : LOAD_RADIUS, bounds: config.bounds || boundsFor(regions) };
    }
    class EntityStore {
        constructor() { this.byId = new Map(); this.byKind = new Map(); this.byRegion = new Map(); this.byFaction = new Map(); this.byChunk = new Map(); }
        index(map, key, entity) { if (!key) return; if (!map.has(key)) map.set(key, new Set()); map.get(key).add(entity); }
        unindex(map, key, entity) { const values = map.get(key); if (!values) return; values.delete(entity); if (!values.size) map.delete(key); }
        add(entity, chunkKey) { this.byId.set(entity.id, entity); this.index(this.byKind, entity.kind, entity); this.index(this.byRegion, entity.region, entity); this.index(this.byFaction, entity.faction, entity); this.index(this.byChunk, chunkKey, entity); return entity; }
        remove(entity, chunkKey) { if (!entity) return; this.byId.delete(entity.id); this.unindex(this.byKind, entity.kind, entity); this.unindex(this.byRegion, entity.region, entity); this.unindex(this.byFaction, entity.faction, entity); this.unindex(this.byChunk, chunkKey, entity); }
        addChunk(chunk) { chunk.entities.forEach(entity => this.add(entity, chunk.key)); }
        removeChunk(chunk) { Array.from(this.byChunk.get(chunk.key) || []).forEach(entity => this.remove(entity, chunk.key)); }
        all() { return Array.from(this.byId.values()); }
        query(index, key) { return Array.from(index.get(key) || []); }
    }
    const ASTEROID_TIERS = {
        large: { radius: 54, radiusVariance: 14, hull: 90, speed: 7, child: 'medium' },
        medium: { radius: 31, radiusVariance: 7, hull: 45, speed: 12, child: 'small' },
        small: { radius: 16, radiusVariance: 4, hull: 20, speed: 18, child: null }
    };

    function boundaryExposure(x, y, bounds) {
        bounds = bounds || WORLD_BOUNDS;
        const outsideX = Math.max(bounds.minX - x, 0, x - bounds.maxX);
        const outsideY = Math.max(bounds.minY - y, 0, y - bounds.maxY);
        const depth = Math.hypot(outsideX, outsideY);
        const insideDistance = depth ? -depth : Math.min(x - bounds.minX, bounds.maxX - x, y - bounds.minY, bounds.maxY - y);
        return { depth, insideDistance, active: depth > 0, proximity: clamp((900 - insideDistance) / 900, 0, 1) };
    }
    function regionAt(x, y, config) {
        const bounds = config?.bounds || WORLD_BOUNDS, regions = config?.regions || REGIONS;
        const safeX = clamp(x, bounds.minX + 1, bounds.maxX - 1);
        const safeY = clamp(y, bounds.minY + 1, bounds.maxY - 1);
        return regions.find(r => safeX >= r.x && safeX < r.x + r.w && safeY >= r.y && safeY < r.y + r.h) || regions[0];
    }
    function chunkKey(cx, cy) { return `${cx},${cy}`; }
    function asteroidTier(seed, cx, cy, index) {
        const roll = hash(seed, cx, cy, 300 + index);
        return roll < .34 ? 'large' : roll < .73 ? 'medium' : 'small';
    }
    function makeAsteroid(seed, cx, cy, index, chunkSize) {
        chunkSize = chunkSize || CHUNK_SIZE;
        const id = `rock:${cx}:${cy}:${index}`, tier = asteroidTier(seed, cx, cy, index), spec = ASTEROID_TIERS[tier];
        const direction = hash(seed, cx, cy, 360 + index) * Math.PI * 2;
        const speed = spec.speed * (.45 + hash(seed, cx, cy, 420 + index) * .75);
        const radius = spec.radius + (hash(seed, cx, cy, 140 + index) * 2 - 1) * spec.radiusVariance;
        return {
            id, rootId: id, kind: 'asteroid', tier,
            x: cx * chunkSize + hash(seed, cx, cy, 20 + index) * chunkSize,
            y: cy * chunkSize + hash(seed, cx, cy, 80 + index) * chunkSize,
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
    function generatedEntity(seed, cx, cy, region, definition, kind, salt, chunkSize) {
        chunkSize = chunkSize || CHUNK_SIZE;
        const minX = Math.max(cx * chunkSize + 80, region.x + 80), maxX = Math.min((cx + 1) * chunkSize - 80, region.x + region.w - 80);
        const minY = Math.max(cy * chunkSize + 80, region.y + 80), maxY = Math.min((cy + 1) * chunkSize - 80, region.y + region.h - 80);
        return {
            id: `${kind === 'worldScenario' ? 'world-scenario' : 'world-object'}:${definition.id}:${cx}:${cy}`,
            kind, typeId: definition.id, name: definition.name,
            x: minX + hash(seed, cx, cy, salt) * Math.max(0, maxX - minX),
            y: minY + hash(seed, cx, cy, salt + 1) * Math.max(0, maxY - minY),
            radius: kind === 'worldScenario' ? 30 : 22, region: region.id,
            variant: definition.ambushChance && hash(seed, cx, cy, salt + 2) < definition.ambushChance ? 'guarded' : 'standard'
        };
    }
    function generateChunk(seed, cx, cy, options) {
        const config = options?.regions ? options : createConfig(options), chunkSize = config.chunkSize, bounds = config.bounds;
        const center = { x: (cx + .5) * chunkSize, y: (cy + .5) * chunkSize };
        const region = regionAt(center.x, center.y, config);
        const entities = [];
        const baseAsteroids = 5 + Math.floor(hash(seed, cx, cy, 1) * (7 + region.danger * 2));
        const asteroidCount = Math.max(3, Math.round(baseAsteroids * (region.asteroidDensity || 1)));
        for (let i = 0; i < asteroidCount; i++) entities.push(makeAsteroid(seed, cx, cy, i, chunkSize));
        const insideWorld = center.x >= bounds.minX && center.x < bounds.maxX && center.y >= bounds.minY && center.y < bounds.maxY;
        const openingRoute = region.id === 'trade_belt' && distance(center, { x: 0, y: 0 }) < 2500;
        const objectChance = .08 + region.danger * .02 + region.remoteness * .015;
        if (insideWorld && hash(seed, cx, cy, 3) < objectChance) {
            const definition = weightedDefinition(config.worldObjects, region, hash(seed, cx, cy, 4), openingRoute);
            if (definition) entities.push(generatedEntity(seed, cx, cy, region, definition, 'worldObject', 5, chunkSize));
        }
        const scenarioChance = .025 + region.danger * .012 + region.remoteness * .01;
        if (insideWorld && !openingRoute && hash(seed, cx, cy, 10) < scenarioChance) {
            const definition = weightedDefinition(config.worldEvents, region, hash(seed, cx, cy, 11), false);
            if (definition) {
                const scenario = generatedEntity(seed, cx, cy, region, definition, 'worldScenario', 12, chunkSize); entities.push(scenario);
                const companionDefinition = definition.companionObject && config.worldObjects.find(item => item.id === definition.companionObject);
                if (companionDefinition) {
                    const companion = generatedEntity(seed, cx, cy, region, companionDefinition, 'worldObject', 16, chunkSize);
                    companion.id += ':worksite'; companion.x = clamp(scenario.x + 95, Math.max(cx * chunkSize + 40, region.x + 40), Math.min((cx + 1) * chunkSize - 40, region.x + region.w - 40)); companion.y = clamp(scenario.y - 65, Math.max(cy * chunkSize + 40, region.y + 40), Math.min((cy + 1) * chunkSize - 40, region.y + region.h - 40)); companion.variant = 'worksite'; entities.push(companion);
                }
            }
        }
        config.landmarks.filter(l => Math.floor(l.x / chunkSize) === cx && Math.floor(l.y / chunkSize) === cy)
            .forEach(l => entities.push(Object.assign({ radius: l.type === 'station' ? 105 : 65, kind: l.type }, l)));
        return { key: chunkKey(cx, cy), cx, cy, region: region.id, entities };
    }

    class WorldService {
        constructor(seed, consumedEntityIds, options) { this.seed = seed; this.config = createConfig(options); this.chunks = new Map(); this.entities = new EntityStore(); this.asteroidRecords = new Map(); this.consumedEntityIds = new Set(consumedEntityIds || []); this.origin = { x: 0, y: 0 }; }
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
            const generated = generateChunk(this.seed, chunk.cx, chunk.cy, this.config).entities.filter(entity => entity.kind === 'asteroid');
            generated.forEach(root => this.asteroidRecords.set(root.rootId, grouped.get(root.rootId) || []));
        }
        update(x, y) {
            const size = this.config.chunkSize, radius = this.config.loadRadius, ccx = Math.floor(x / size), ccy = Math.floor(y / size);
            const wanted = new Set();
            for (let oy = -radius; oy <= radius; oy++) for (let ox = -radius; ox <= radius; ox++) {
                const key = chunkKey(ccx + ox, ccy + oy); wanted.add(key);
                if (!this.chunks.has(key)) { const chunk = generateChunk(this.seed, ccx + ox, ccy + oy, this.config); chunk.entities = chunk.entities.filter(entity => !this.consumedEntityIds.has(entity.id)); this.restoreAsteroids(chunk); this.chunks.set(key, chunk); this.entities.addChunk(chunk); }
            }
            for (const [key, chunk] of this.chunks) if (!wanted.has(key)) { this.snapshotAsteroids(chunk); this.entities.removeChunk(chunk); this.chunks.delete(key); }
            if (Math.abs(x - this.origin.x) > 4000 || Math.abs(y - this.origin.y) > 4000) this.origin = { x, y };
            return regionAt(x, y, this.config);
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
            const fragments = this.splitAsteroid(entity); this.entities.remove(entity, chunk.key); chunk.entities.splice(chunk.entities.indexOf(entity), 1, ...fragments); fragments.forEach(fragment => this.entities.add(fragment, chunk.key));
            this.asteroidRecords.set(entity.rootId, chunk.entities.filter(value => value.kind === 'asteroid' && value.rootId === entity.rootId).map(value => Object.assign({}, value)));
            return { hit: true, destroyed: true, reward: fragments.length ? 0 : 2, fragments };
        }
        syncEntities() {
            const present = new Set();
            this.chunks.forEach(chunk => chunk.entities.forEach(entity => { present.add(entity); if (this.entities.byId.get(entity.id) !== entity) this.entities.add(entity, chunk.key); }));
            this.entities.all().filter(entity => !present.has(entity)).forEach(entity => { const chunk = Array.from(this.chunks.values()).find(value => this.entities.byChunk.get(value.key)?.has(entity)); this.entities.remove(entity, chunk?.key); });
        }
        loadedEntities(kind) { this.syncEntities(); return kind ? this.entities.query(this.entities.byKind, kind) : this.entities.all(); }
        nearbyEntities(x, y, radius, kind) { return this.loadedEntities(kind).filter(e => distance({ x, y }, e) <= radius); }
        consumeEntity(state, entity) {
            if (!entity || !['signal', 'salvage', 'worldObject', 'worldScenario'].includes(entity.kind) || this.consumedEntityIds.has(entity.id)) return false;
            this.consumedEntityIds.add(entity.id); state.consumedEntityIds = Array.from(this.consumedEntityIds);
            for (const chunk of this.chunks.values()) { const index = chunk.entities.indexOf(entity); if (index >= 0) { this.entities.remove(entity, chunk.key); chunk.entities.splice(index, 1); break; } }
            return true;
        }
        nearestStation(x, y, predicate) { return LANDMARKS.filter(l => l.type === 'station' && (!predicate || predicate(l))).sort((a, b) => distance({ x, y }, a) - distance({ x, y }, b))[0]; }
        toScreen(x, y, camera, viewport) { return { x: viewport.w / 2 + x - camera.x, y: viewport.h / 2 + y - camera.y }; }
        discover(state, entity) { if (!entity || state.discoveries.includes(entity.id)) return false; state.discoveries.push(entity.id); state.stats.discoveries++; return true; }
    }

    ns.World = { CHUNK_SIZE, LOAD_RADIUS, WORLD_BOUNDS, ASTEROID_TIERS, boundsFor, catalogBounds, createConfig, EntityStore, boundaryExposure, regionAt, eligibleDefinitions, weightedDefinition, generateChunk, WorldService };
})(window.MiniInvadersV2);
