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
        return { regions, landmarks: config.landmarks || ns.Registry?.all('landmark') || LANDMARKS, worldObjects: config.worldObjects || ns.Registry?.all('worldObject') || Object.values(WORLD_OBJECT_TYPES), worldEvents: config.worldEvents || ns.Registry?.all('worldEvent') || Object.values(WORLD_SCENARIOS), relic: config.relic || null, chunkSize: config.chunkSize || CHUNK_SIZE, loadRadius: Number.isInteger(config.loadRadius) ? config.loadRadius : LOAD_RADIUS, bounds: config.bounds || boundsFor(regions) };
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

    function containsPoint(x, y, config) { return (config?.regions || REGIONS).some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); }
    const isValidPoint = containsPoint;
    function rectDistance(x, y, region) { const dx = Math.max(region.x - x, 0, x - (region.x + region.w)), dy = Math.max(region.y - y, 0, y - (region.y + region.h)); return Math.hypot(dx, dy); }
    function exposedRegionEdges(config) {
        const regions = config?.regions || REGIONS, active = new Set(regions.map(region => `${region.column},${region.row}`)), edges = [];
        regions.forEach(region => {
            const neighbors = [
                { column: region.column - 1, row: region.row, axis: 'x', value: region.x, min: region.y, max: region.y + region.h, side: -1 },
                { column: region.column + 1, row: region.row, axis: 'x', value: region.x + region.w, min: region.y, max: region.y + region.h, side: 1 },
                { column: region.column, row: region.row - 1, axis: 'y', value: region.y, min: region.x, max: region.x + region.w, side: -1 },
                { column: region.column, row: region.row + 1, axis: 'y', value: region.y + region.h, min: region.x, max: region.x + region.w, side: 1 }
            ];
            neighbors.filter(edge => !active.has(`${edge.column},${edge.row}`)).forEach(edge => edges.push(Object.assign({ region }, edge)));
        });
        return edges;
    }
    function exposedRegionCorners(config) {
        const regions = config?.regions || REGIONS, active = new Set(regions.map(region => `${region.column},${region.row}`)), corners = [];
        regions.forEach(region => {
            [
                { dc: -1, dr: -1, x: region.x, y: region.y },
                { dc: 1, dr: -1, x: region.x + region.w, y: region.y },
                { dc: -1, dr: 1, x: region.x, y: region.y + region.h },
                { dc: 1, dr: 1, x: region.x + region.w, y: region.y + region.h }
            ].forEach(corner => {
                const horizontalOpen = !active.has(`${region.column + corner.dc},${region.row}`);
                const verticalOpen = !active.has(`${region.column},${region.row + corner.dr}`);
                const diagonalOpen = !active.has(`${region.column + corner.dc},${region.row + corner.dr}`);
                if (diagonalOpen) corners.push(Object.assign({ region, sideX: corner.dc, sideY: corner.dr, diagonalOnly: !horizontalOpen && !verticalOpen }, corner));
            });
        });
        return corners;
    }
    function boundaryExposure(x, y, config) {
        if (config && Number.isFinite(config.minX)) config = { bounds: config, regions: REGIONS };
        config = config || { bounds: WORLD_BOUNDS, regions: REGIONS }; const regions = config.regions || REGIONS, active = regions.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
        const depth = active ? 0 : Math.min(...regions.map(region => rectDistance(x, y, region)));
        let insideDistance = -depth;
        if (active) {
            const adjacent = (column, row) => regions.some(region => region.column === column && region.row === row), distances = [];
            if (!adjacent(active.column - 1, active.row)) distances.push(x - active.x);
            if (!adjacent(active.column + 1, active.row)) distances.push(active.x + active.w - x);
            if (!adjacent(active.column, active.row - 1)) distances.push(y - active.y);
            if (!adjacent(active.column, active.row + 1)) distances.push(active.y + active.h - y);
            exposedRegionCorners(config).filter(corner => corner.region === active).forEach(corner => distances.push(Math.hypot(x - corner.x, y - corner.y)));
            insideDistance = distances.length ? Math.min(...distances) : 900;
        }
        return { depth, insideDistance, active: depth > 0, proximity: clamp((900 - insideDistance) / 900, 0, 1) };
    }
    function regionAt(x, y, config) {
        const bounds = config?.bounds || WORLD_BOUNDS, regions = config?.regions || REGIONS;
        const safeX = clamp(x, bounds.minX + 1, bounds.maxX - 1);
        const safeY = clamp(y, bounds.minY + 1, bounds.maxY - 1);
        return regions.find(r => safeX >= r.x && safeX < r.x + r.w && safeY >= r.y && safeY < r.y + r.h) || regions.slice().sort((a, b) => rectDistance(x, y, a) - rectDistance(x, y, b))[0];
    }
    function projectToValidPoint(x, y, config, inset) {
        config = config || { bounds: WORLD_BOUNDS, regions: REGIONS };
        const regions = config.regions || REGIONS, margin = Number.isFinite(inset) ? inset : 120;
        const region = regions.find(item => x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h) || regions.slice().sort((a, b) => rectDistance(x, y, a) - rectDistance(x, y, b))[0];
        if (!region) return { x, y, region: null };
        const adjacent = (column, row) => regions.some(item => item.column === column && item.row === row);
        let px = clamp(x, region.x + 1, region.x + region.w - 1), py = clamp(y, region.y + 1, region.y + region.h - 1);
        if (!adjacent(region.column - 1, region.row)) px = Math.max(px, region.x + margin);
        if (!adjacent(region.column + 1, region.row)) px = Math.min(px, region.x + region.w - margin);
        if (!adjacent(region.column, region.row - 1)) py = Math.max(py, region.y + margin);
        if (!adjacent(region.column, region.row + 1)) py = Math.min(py, region.y + region.h - margin);
        return { x: px, y: py, region };
    }
    function distanceToInvalidSectorBoundary(ship, angle, config, maxDistance) {
        config = config || { bounds: WORLD_BOUNDS, regions: REGIONS };
        if (!containsPoint(ship.x, ship.y, config)) return 0;
        const dx = Math.cos(angle), dy = Math.sin(angle), limit = Number.isFinite(maxDistance) ? maxDistance : Infinity;
        let best = Infinity;
        exposedRegionEdges(config).forEach(edge => {
            let t = Infinity, along = 0;
            if (edge.axis === 'x') {
                if (Math.abs(dx) < .0001) return;
                t = (edge.value - ship.x) / dx; along = ship.y + dy * t;
            } else {
                if (Math.abs(dy) < .0001) return;
                t = (edge.value - ship.y) / dy; along = ship.x + dx * t;
            }
            if (t >= 0 && t <= limit && along >= edge.min - .001 && along <= edge.max + .001) best = Math.min(best, t);
        });
        return best;
    }
    function validStations(state, world, predicate) {
        const config = world?.config || ns.Galaxies?.worldConfig?.(state) || createConfig();
        return (config.landmarks || []).filter(item => item.type === 'station' && containsPoint(item.x, item.y, config) && (!predicate || predicate(item)));
    }
    function nearestValidStation(state, world, x, y, predicate) {
        const origin = { x, y }, preferred = validStations(state, world, predicate).sort((a, b) => distance(origin, a) - distance(origin, b))[0];
        if (preferred) return preferred;
        return validStations(state, world).sort((a, b) => distance(origin, a) - distance(origin, b))[0] || null;
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
    function staticRadius(entity) {
        if (entity.kind === 'station') return 105;
        if (entity.kind === 'anomaly') return 65;
        if (entity.kind === 'worldScenario') return entity.radius || 30;
        if (entity.kind === 'worldObject') return entity.radius || 22;
        return entity.radius || 0;
    }
    function resolveStaticOverlaps(entities, region, seed, cx, cy, chunkSize) {
        const staticKinds = new Set(['station', 'anomaly', 'worldObject', 'worldScenario']);
        const staticEntities = entities.filter(entity => staticKinds.has(entity.kind));
        for (let pass = 0; pass < 5; pass++) {
            let changed = false;
            for (let i = 0; i < staticEntities.length; i++) {
                for (let j = 0; j < i; j++) {
                    const a = staticEntities[i], b = staticEntities[j];
                    if (a.region !== b.region) continue;
                    const min = staticRadius(a) + staticRadius(b) + 54, actual = distance(a, b);
                    if (actual >= min) continue;
                    const angle = actual > 0 ? Math.atan2(a.y - b.y, a.x - b.x) : hash(seed, cx, cy, i * 97 + j) * Math.PI * 2;
                    const push = min - actual + 8;
                    a.x += Math.cos(angle) * push;
                    a.y += Math.sin(angle) * push;
                    const radius = staticRadius(a) + 80;
                    a.x = clamp(a.x, Math.max(cx * chunkSize + radius, region.x + radius), Math.min((cx + 1) * chunkSize - radius, region.x + region.w - radius));
                    a.y = clamp(a.y, Math.max(cy * chunkSize + radius, region.y + radius), Math.min((cy + 1) * chunkSize - radius, region.y + region.h - radius));
                    changed = true;
                }
            }
            if (!changed) break;
        }
    }
    function generateChunk(seed, cx, cy, options) {
        const config = options?.regions ? options : createConfig(options), chunkSize = config.chunkSize, bounds = config.bounds;
        const center = { x: (cx + .5) * chunkSize, y: (cy + .5) * chunkSize };
        const activeCell = containsPoint(center.x, center.y, config), region = regionAt(center.x, center.y, config);
        const entities = [];
        const baseAsteroids = 5 + Math.floor(hash(seed, cx, cy, 1) * (7 + region.danger * 2));
        const asteroidCount = Math.max(3, Math.round(baseAsteroids * (region.asteroidDensity || 1)));
        if (activeCell) for (let i = 0; i < asteroidCount; i++) entities.push(makeAsteroid(seed, cx, cy, i, chunkSize));
        const insideWorld = activeCell && center.x >= bounds.minX && center.x < bounds.maxX && center.y >= bounds.minY && center.y < bounds.maxY;
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
        const relic = config.relic;
        if (relic?.present && Math.floor(relic.x / chunkSize) === cx && Math.floor(relic.y / chunkSize) === cy) entities.push(Object.assign({}, relic));
        resolveStaticOverlaps(entities, region, seed, cx, cy, chunkSize);
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
            this.loadedEntities().filter(entity => entity.typeId === 'ancient_relic').forEach(entity => {
                const region = this.config.regions.find(item => item.id === entity.region); entity.x += entity.vx * dt; entity.y += entity.vy * dt; entity.rotation += entity.spin * dt;
                if (region && (entity.x < region.x + 80 || entity.x > region.x + region.w - 80)) { entity.vx *= -1; entity.x = clamp(entity.x, region.x + 80, region.x + region.w - 80); }
                if (region && (entity.y < region.y + 80 || entity.y > region.y + region.h - 80)) { entity.vy *= -1; entity.y = clamp(entity.y, region.y + 80, region.y + region.h - 80); }
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
            if (!entity || entity.kind !== 'asteroid' || entity.hull <= 0) return { hit: false, destroyed: false, fragments: [] };
            entity.hull -= Math.max(0, damage); if (entity.hull > 0) return { hit: true, destroyed: false, fragments: [] };
            const chunk = Array.from(this.chunks.values()).find(value => value.entities.includes(entity)); if (!chunk) return { hit: true, destroyed: true, asteroid: entity, fragments: [] };
            const fragments = this.splitAsteroid(entity); this.entities.remove(entity, chunk.key); chunk.entities.splice(chunk.entities.indexOf(entity), 1, ...fragments); fragments.forEach(fragment => this.entities.add(fragment, chunk.key));
            this.asteroidRecords.set(entity.rootId, chunk.entities.filter(value => value.kind === 'asteroid' && value.rootId === entity.rootId).map(value => Object.assign({}, value)));
            return { hit: true, destroyed: true, asteroid: Object.assign({}, entity), fragments };
        }
        spawnTransient(entity) {
            if (!entity?.id || this.entities.byId.has(entity.id)) return null;
            const chunk = Array.from(this.chunks.values()).find(value => entity.x >= value.cx * this.config.chunkSize && entity.x < (value.cx + 1) * this.config.chunkSize && entity.y >= value.cy * this.config.chunkSize && entity.y < (value.cy + 1) * this.config.chunkSize);
            if (!chunk) return null; chunk.entities.push(entity); this.entities.add(entity, chunk.key); return entity;
        }
        syncEntities() {
            const present = new Set();
            this.chunks.forEach(chunk => chunk.entities.forEach(entity => { present.add(entity); if (this.entities.byId.get(entity.id) !== entity) this.entities.add(entity, chunk.key); }));
            this.entities.all().filter(entity => !present.has(entity)).forEach(entity => { const chunk = Array.from(this.chunks.values()).find(value => this.entities.byChunk.get(value.key)?.has(entity)); this.entities.remove(entity, chunk?.key); });
        }
        loadedEntities(kind) { this.syncEntities(); return kind ? this.entities.query(this.entities.byKind, kind) : this.entities.all(); }
        nearbyEntities(x, y, radius, kind) { return this.loadedEntities(kind).filter(e => distance({ x, y }, e) <= radius); }
        consumeEntity(state, entity) {
            if (!entity || !['signal', 'salvage', 'anomaly', 'worldObject', 'worldScenario'].includes(entity.kind) || this.consumedEntityIds.has(entity.id)) return false;
            this.consumedEntityIds.add(entity.id); state.consumedEntityIds = Array.from(this.consumedEntityIds);
            for (const chunk of this.chunks.values()) { const index = chunk.entities.indexOf(entity); if (index >= 0) { this.entities.remove(entity, chunk.key); chunk.entities.splice(index, 1); break; } }
            return true;
        }
        nearestStation(x, y, predicate) { return nearestValidStation(null, this, x, y, predicate); }
        toScreen(x, y, camera, viewport) { return { x: viewport.w / 2 + x - camera.x, y: viewport.h / 2 + y - camera.y }; }
        discover(state, entity) { if (!entity || state.discoveries.includes(entity.id)) return false; state.discoveries.push(entity.id); state.stats.discoveries++; ns.Objectives?.record(state, 'discoveries', 1); return true; }
    }

    ns.World = { CHUNK_SIZE, LOAD_RADIUS, WORLD_BOUNDS, ASTEROID_TIERS, boundsFor, catalogBounds, createConfig, EntityStore, containsPoint, isValidPoint, exposedRegionEdges, exposedRegionCorners, boundaryExposure, regionAt, projectToValidPoint, distanceToInvalidSectorBoundary, validStations, nearestValidStation, eligibleDefinitions, weightedDefinition, generateChunk, WorldService };
})(window.FrontierWayfarer);
