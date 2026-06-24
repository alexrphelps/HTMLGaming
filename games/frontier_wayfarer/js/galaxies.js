(function (ns) {
    const MASKS = {
        galaxy_a: ['.#####..','#######.','########','########','########','########','.#######','..####..'],
        galaxy_b: ['..####..','#######.','#######.','########','########','.#######','.######.','..#####.'],
        galaxy_c: ['.######.','.#######','########','########','########','#######.','.######.','..####..'],
        galaxy_d: ['..####..','.######.','.#######','#######.','.#######','#######.','.######.','..####..'],
        galaxy_e: ['.#####..','.#######','########','########','########','#######.','.#######','...###..'],
        galaxy_f: ['..#####.','.######.','.#######','########','########','########','.######.','...###..'],
        galaxy_g: ['...###..','.######.','#######.','########','########','.#######','.######.','..####..']
    };
    const GALAXIES = [
        { id: 'galaxy_a', code: 'A', name: 'Meridian Reach', cluster: 'SPIRAL', x: 10, y: 61, seed: 0x00000000, color: '#55f0ad', backdrop: 'frontier', beltSectors: ['B2','C2','C3','E3','E4','F4','F5'] },
        { id: 'galaxy_b', code: 'B', name: 'Brontide Wheel', cluster: 'BARRED SPIRAL', x: 27, y: 53, seed: 0x1b873593, color: '#ffbd59', backdrop: 'giant-star', beltSectors: ['B5','C5','D5','D4','E4','F4','F3'] },
        { id: 'galaxy_c', code: 'C', name: 'Aster Vale', cluster: 'BLUE ELLIPTICAL', x: 50, y: 56, seed: 0x85ebca6b, color: '#55d7ff', backdrop: 'elliptical', unlocksFaction: 'aster_collective', beltSectors: ['B3','C3','D3','E3','F3','F4','F5'] },
        { id: 'galaxy_d', code: 'D', name: 'Orchid Rift', cluster: 'IRREGULAR', x: 50, y: 20, seed: 0xc2b2ae35, color: '#ce75ff', backdrop: 'nebula-cloud', unlocksFaction: 'orchid_synod', beltSectors: ['B7','C6','D5','E4','F3','E2'] },
        { id: 'galaxy_e', code: 'E', name: 'Auric Halo', cluster: 'RING', x: 78, y: 79, seed: 0x27d4eb2f, color: '#ffbd59', backdrop: 'ring', unlocksFaction: 'auric_combine', beltSectors: ['B4','C3','D2','E2','F3','F4','E5','D6','C7'] },
        { id: 'galaxy_f', code: 'F', name: 'Cyan Drift', cluster: 'LENTICULAR', x: 72, y: 55, seed: 0x165667b1, color: '#55d7ff', backdrop: 'corner-black-hole', unlocksFaction: 'cyan_nomads', beltSectors: ['B6','C6','D5','E5','F4','F3'] },
        { id: 'galaxy_g', code: 'G', name: 'Gemini Veil', cluster: 'INTERACTING PAIR', x: 87, y: 31, seed: 0xd3a2646c, color: '#b68cff', backdrop: 'twin', unlocksFaction: 'gemini_directorate', beltSectors: ['B2','C3','D4','E5','F6','F2','E3','C5','B6'] }
    ];
    GALAXIES.forEach(galaxy => { galaxy.mask = MASKS[galaxy.id]; });
    const LINKS = [
        ['galaxy_a', 'galaxy_b'],
        ['galaxy_b', 'galaxy_c'], ['galaxy_b', 'galaxy_d'],
        ['galaxy_c', 'galaxy_e'], ['galaxy_c', 'galaxy_f'],
        ['galaxy_d', 'galaxy_g'],
        ['galaxy_f', 'galaxy_e'], ['galaxy_f', 'galaxy_g']
    ];
    const HULL_TIERS = {
        wayfarer: 1,
        guild_mule: 2,
        concord_kestrel: 2,
        concord_bulwark: 3,
        corsair_wraith: 3,
        meridian_ranger: 4,
        concord_lancer: 4,
        corsair_ravager: 4,
        prism_eidolon: 4,
        aster_cartograph: 5,
        orchid_riftneedle: 5,
        auric_vaultbarge: 5,
        cyan_salvage_lantern: 6,
        gemini_echelon_spear: 6,
        concord_solar_bulwark: 6,
        frontier_horizon_ark: 7,
        null_crown_reaver: 7
    };
    const GATE_ENGINE = 'atlas_stargate_engine';
    const GATE_REACTOR = 'gateheart_core';
    const STARGATE_COOLDOWN_MS = 60000;
    const C = (aetherium, sunshards, helionite) => ({ aetherium, sunshards, helionite });
    const GALAXY_NAME_PARTS = {
        galaxy_b: { prefix: 'Brontide', stations: ['Crownport', 'Thunder Quay', 'Stormwake Yard', 'Oathwheel Harbor', 'Cloudbreak Exchange', 'Bright Keel', 'Copper Ring', 'Sable Mooring'], beacons: ['Wheel Beacon', 'Stormglass Relay', 'Thunderhead Lens', 'Static Crown', 'Copper Signal', 'Rainwake Marker'] },
        galaxy_c: { prefix: 'Aster', stations: ['Archive', 'Cartographer Pier', 'Blueleaf Station', 'Survey Spindle', 'Vale Anchorage', 'Lenswright Dock', 'Frost Archive', 'Atlas Garden'], beacons: ['Vale Beacon', 'Glassroot Relay', 'Blue Archive Signal', 'Aster Lens', 'Shared Chart Marker', 'Horizon Probe'] },
        galaxy_d: { prefix: 'Orchid', stations: ['Spindle', 'Rift Chapel', 'Petal Gate', 'Bloomhold', 'Violet Loom', 'Choir Station', 'Nullflower Dock', 'Ritual Quay'], beacons: ['Rift Beacon', 'Bloom Lens', 'Petal Signal', 'Violet Reliquary', 'Spindle Marker', 'Chorus Relay'] },
        galaxy_e: { prefix: 'Auric', stations: ['Exchange', 'Halo Foundry', 'Gilt Harbor', 'Coinwake Port', 'Sunmetal Yard', 'Ledger Gate', 'Profit Crown', 'Brass Anchorage'], beacons: ['Halo Beacon', 'Gilt Relay', 'Ledger Signal', 'Coinwake Marker', 'Sunmetal Lens', 'Auric Choir'] },
        galaxy_f: { prefix: 'Cyan', stations: ['Freeport', 'Drift Harbor', 'Nomad Yard', 'Tidewake Station', 'Moving Quay', 'Salvage Lantern', 'Bluewake Dock', 'Current Gate'], beacons: ['Drift Beacon', 'Tide Relay', 'Nomad Marker', 'Freewater Lens', 'Current Signal', 'Bluewake Probe'] },
        galaxy_g: { prefix: 'Gemini', stations: ['Crown', 'Twin Command', 'Mirror Dock', 'Doctrine Gate', 'Paired Harbor', 'Crownline Yard', 'Echelon Station', 'Duet Anchorage'], beacons: ['Veil Beacon', 'Mirror Relay', 'Twin Signal', 'Doctrine Lens', 'Crown Marker', 'Paired Probe'] }
    };

    Object.values(ns.Data.HULLS).forEach(hull => { hull.tier = HULL_TIERS[hull.id] || 1; });
    Object.assign(ns.Data.MODULES, {
        [GATE_REACTOR]: {
            id: GATE_REACTOR,
            name: 'Gateheart Singularity Core',
            description: 'A contained singularity reactor that stabilizes station-scale stargate translation. Tier IV+ hulls only.',
            slot: 'reactor', mass: 13, reactor: 165, energyRecharge: 22,
            cost: C(1800, 70, 75), tier: 5, unlock: 'capitalVeteran', majorOnly: true, stargateSystem: true
        },
        [GATE_ENGINE]: {
            id: GATE_ENGINE,
            name: 'Atlas Stargate Engine',
            description: 'A frame-locked translation engine capable of surviving a station stargate aperture. Tier IV+ hulls only.',
            slot: 'engine', mass: 14, thrust: 330, maxSpeed: 20, strafe: 1.05, turn: 2.8, braking: 1.3,
            lightSpeed: true, lightTurn: 1.1, lightCharge: .85, lightDeceleration: .85,
            cost: C(1900, 60, 90), tier: 5, unlock: 'capitalVeteran', majorOnly: true, stargateSystem: true
        }
    });
    ns.Data.normalizeModuleTravelFlags?.();

    function byId(id) { return GALAXIES.find(galaxy => galaxy.id === id) || GALAXIES[0]; }
    function current(state) { ensureState(state); return byId(state.galaxyId); }
    function localName(galaxy, landmark, index) {
        const parts = GALAXY_NAME_PARTS[galaxy.id];
        if (!parts) return landmark.name;
        const pool = landmark.type === 'station' ? parts.stations : parts.beacons;
        return `${parts.prefix} ${pool[index % pool.length]}${index >= pool.length ? ` ${Math.floor(index / pool.length) + 1}` : ''}`;
    }
    function saltFor(id) { return String(id || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0); }
    function landmarkRadius(item) { return item.type === 'station' ? 105 : 65; }
    function regionFor(item) { return ns.Data.REGIONS.find(region => region.id === item.region); }
    function placeForGalaxy(galaxy, item, index) {
        if (galaxy.id === 'galaxy_a') return item;
        const region = regionFor(item), inset = landmarkRadius(item) + 180, salt = saltFor(item.id) + index * 37;
        if (!region) return item;
        item.x = region.x + inset + ns.MathUtil.hash(galaxy.seed ^ salt, region.column + 1, region.row + 1, 17) * Math.max(1, region.w - inset * 2);
        item.y = region.y + inset + ns.MathUtil.hash(galaxy.seed ^ salt, region.column + 1, region.row + 1, 53) * Math.max(1, region.h - inset * 2);
        return item;
    }
    function clampToRegion(item) {
        const region = regionFor(item), inset = landmarkRadius(item) + 90;
        if (!region) return item;
        item.x = ns.MathUtil.clamp(item.x, region.x + inset, region.x + region.w - inset);
        item.y = ns.MathUtil.clamp(item.y, region.y + inset, region.y + region.h - inset);
        return item;
    }
    function stationMajorScore(galaxy, item, index) {
        const region = regionFor(item), faction = ns.Data.FACTIONS[item.faction], localFaction = faction?.unlockGalaxy === galaxy.id;
        const factionHub = localFaction || (galaxy.id === 'galaxy_b' && ['independents', 'concord', 'corsairs'].includes(item.faction));
        return (factionHub ? 1000 : 0) + (item.major ? 260 : 0) + ((region?.danger || 0) * 50) + ((region?.remoteness || 0) * 38) + ns.MathUtil.hash(galaxy.seed, saltFor(item.id), index, 211);
    }
    function applyGalaxyMajorStations(galaxy, landmarks) {
        landmarks.forEach(item => { if (item.type === 'station') delete item.major; });
        if (galaxy.id === 'galaxy_a') return landmarks;
        const stations = landmarks.filter(item => item.type === 'station');
        const target = Math.min(stations.length, 3 + Math.floor(ns.MathUtil.hash(galaxy.seed, stations.length, 0, 347) * 3));
        stations
            .map((item, index) => ({ item, score: stationMajorScore(galaxy, item, index) }))
            .sort((a, b) => b.score - a.score || String(a.item.id).localeCompare(String(b.item.id)))
            .slice(0, target)
            .forEach(entry => { entry.item.major = true; });
        return landmarks;
    }
    function separateLandmarks(landmarks) {
        const list = landmarks.map(item => Object.assign({}, item, { radius: landmarkRadius(item) }));
        for (let pass = 0; pass < 6; pass++) {
            let changed = false;
            for (let i = 0; i < list.length; i++) {
                for (let j = 0; j < i; j++) {
                    if (list[i].region !== list[j].region) continue;
                    const min = list[i].radius + list[j].radius + 70, actual = ns.MathUtil.distance(list[i], list[j]);
                    if (actual >= min) continue;
                    const angle = actual > 0 ? Math.atan2(list[i].y - list[j].y, list[i].x - list[j].x) : ns.MathUtil.hash(i + 17, j + 31, list[i].x, list[i].y) * Math.PI * 2;
                    const push = min - actual + 12;
                    list[i].x += Math.cos(angle) * push;
                    list[i].y += Math.sin(angle) * push;
                    clampToRegion(list[i]);
                    changed = true;
                }
            }
            if (!changed) break;
        }
        return list.map(item => { const clean = Object.assign({}, item); delete clean.radius; return clean; });
    }
    function displayLandmarks(state, landmarks) {
        const galaxy = current(state), counts = { station: 0, anomaly: 0 };
        const named = landmarks.map((item, index) => {
            const clone = Object.assign({}, item), isNamedStatic = clone.type === 'station' || clone.type === 'anomaly';
            placeForGalaxy(galaxy, clone, index);
            if (isNamedStatic && galaxy.id !== 'galaxy_a') clone.name = localName(galaxy, clone, counts[clone.type]++);
            return clone;
        });
        return ns.StationWar ? ns.StationWar.applyToLandmarks(state, applyGalaxyMajorStations(galaxy, separateLandmarks(named)), galaxy.id) : applyGalaxyMajorStations(galaxy, separateLandmarks(named));
    }
    function neighbors(id) {
        return LINKS.filter(link => link.includes(id)).map(link => link[0] === id ? link[1] : link[0]);
    }
    function connected(from, to) { return neighbors(from).includes(to); }
    function isHighestTierHull(hullOrState) {
        const hull = hullOrState?.ship ? ns.Data.HULLS[hullOrState.ship.activeHullId] : hullOrState;
        return (hull?.tier || 0) >= 4;
    }
    function gateStatus(state) {
        const highestTierHull = isHighestTierHull(state);
        const reactor = state.ship.slots.reactor === GATE_REACTOR;
        const engine = state.ship.slots.engine === GATE_ENGINE;
        return { highestTierHull, reactor, engine, ready: highestTierHull && reactor && engine };
    }
    function ensureState(state) {
        if (!byId(state.galaxyId) || state.galaxyId !== byId(state.galaxyId).id) state.galaxyId = 'galaxy_a';
        state.visitedGalaxies = Array.isArray(state.visitedGalaxies) ? state.visitedGalaxies.filter(id => GALAXIES.some(galaxy => galaxy.id === id)) : [];
        if (!state.visitedGalaxies.includes(state.galaxyId)) state.visitedGalaxies.push(state.galaxyId);
        state.galaxyCharts = state.galaxyCharts && typeof state.galaxyCharts === 'object' ? state.galaxyCharts : {};
        if (state.progression) {
            state.progression.roamingThreats = state.progression.roamingThreats && typeof state.progression.roamingThreats === 'object' ? state.progression.roamingThreats : {};
            state.progression.roamingThreatCooldowns = state.progression.roamingThreatCooldowns && typeof state.progression.roamingThreatCooldowns === 'object' ? state.progression.roamingThreatCooldowns : {};
            if (state.progression.roamingThreat && !state.progression.roamingThreat.galaxyId) state.progression.roamingThreat.galaxyId = state.galaxyId;
            if (state.progression.roamingThreat?.galaxyId && !state.progression.roamingThreats[state.progression.roamingThreat.galaxyId]) state.progression.roamingThreats[state.progression.roamingThreat.galaxyId] = state.progression.roamingThreat;
            state.progression.roamingThreat = state.progression.roamingThreats[state.galaxyId] || null;
            state.progression.nextRoamingThreatAt = Math.max(0, Number(state.progression.roamingThreatCooldowns[state.galaxyId]) || 0);
        }
        state.lastStargateTravelAt = Math.max(0, Number(state.lastStargateTravelAt) || 0);
        return state;
    }
    function factionAvailable(state, factionId) {
        const faction = ns.Data.FACTIONS[factionId];
        return Boolean(faction && (!faction.unlockGalaxy || state.visitedGalaxies?.includes(faction.unlockGalaxy)));
    }
    function availableFactions(state) { ensureState(state); return Object.values(ns.Data.FACTIONS).filter(faction => factionAvailable(state, faction.id)); }
    function availableLandmarks(state) {
        ensureState(state);
        const mask = current(state).mask;
        const landmarks = ns.Data.LANDMARKS.filter(item => {
            if (item.unlockGalaxy && !state.visitedGalaxies.includes(item.unlockGalaxy)) return false;
            const region = ns.Data.REGIONS.find(entry => entry.id === item.region);
            return Boolean(region && mask[region.row]?.[region.column] === '#');
        });
        return displayLandmarks(state, landmarks);
    }
    function landmarkById(state, id) { return availableLandmarks(state).find(item => item.id === id) || ns.Data.LANDMARKS.find(item => item.id === id) || null; }
    function worldRegions(state) {
        const galaxy = current(state), belt = new Set(galaxy.beltSectors || []), mask = galaxy.mask;
        return ns.Data.REGIONS.filter(region => mask[region.row]?.[region.column] === '#').map(region => Object.assign({}, region, { asteroidDensity: belt.has(region.grid) ? 1.6 : galaxy.id === 'galaxy_a' && region.id === 'trade_belt' ? .75 : 1 }));
    }
    function worldConfig(state) { return { regions: worldRegions(state), landmarks: availableLandmarks(state), relic: ns.Objectives?.relicFor(state, state.galaxyId) || null }; }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function storeChart(state) {
        ensureState(state);
        state.galaxyCharts[state.galaxyId] = clone({
            x: state.ship.x, y: state.ship.y, dockedAt: state.dockedAt,
            discoveries: state.discoveries, visitedRegions: state.visitedRegions,
            consumedEntityIds: state.consumedEntityIds, economy: state.economy,
            marketInventories: state.marketInventories, contractBoard: state.contracts.board, boardStationId: state.contracts.boardStationId,
            boardRevision: state.contracts.boardRevision, lastManualRefreshAt: state.contracts.lastManualRefreshAt
        });
    }
    function defaultChartFor(galaxyId) {
        const chartState = { galaxyId, visitedGalaxies: [galaxyId], galaxyCharts: {}, lastStargateTravelAt: 0 };
        const stations = availableLandmarks(chartState).filter(item => item.type === 'station');
        const station = stations.find(item => item.id === 'waypoint_zero') || stations.sort((a, b) => (b.major ? 1 : 0) - (a.major ? 1 : 0))[0] || { id: 'waypoint_zero', x: 0, y: 0, region: 'trade_belt' };
        return { x: station.x, y: station.y, dockedAt: station.id, discoveries: [station.id], visitedRegions: [station.region], consumedEntityIds: [], economy: {}, marketInventories: {}, contractBoard: [], boardStationId: null, boardRevision: 0, lastManualRefreshAt: 0 };
    }
    function arrivalStation(state, chart, galaxyId) {
        const stations = availableLandmarks(state).filter(item => item.type === 'station');
        return stations.find(item => item.id === chart?.dockedAt) || stations.find(item => item.id === 'waypoint_zero') || stations.sort((a, b) => (b.major ? 1 : 0) - (a.major ? 1 : 0))[0] || defaultChartFor(galaxyId);
    }
    function loadChart(state, galaxyId) {
        const saved = state.galaxyCharts[galaxyId];
        const chart = saved || defaultChartFor(galaxyId);
        const station = arrivalStation(state, chart, galaxyId);
        state.ship.x = station.x; state.ship.y = station.y;
        state.ship.vx = 0; state.ship.vy = 0; state.dockedAt = station.id;
        state.discoveries = Array.from(new Set(clone(chart.discoveries || []).concat(station.id))); state.visitedRegions = Array.from(new Set(clone(chart.visitedRegions || []).concat(station.region)));
        state.consumedEntityIds = clone(chart.consumedEntityIds || []); state.economy = clone(chart.economy || {});
        state.marketInventories = clone(chart.marketInventories || {}); state.contracts.board = clone(chart.contractBoard || []);
        state.contracts.boardStationId = typeof chart.boardStationId === 'string' ? chart.boardStationId : null;
        state.contracts.boardRevision = Math.max(0, Number(chart.boardRevision) || 0); state.contracts.lastManualRefreshAt = Math.max(0, Number(chart.lastManualRefreshAt) || 0);
        state.customWaypoint = null;
    }
    function travel(state, destinationId) {
        ensureState(state);
        const destination = GALAXIES.find(galaxy => galaxy.id === destinationId), status = gateStatus(state);
        if (!state.dockedAt) return { ok: false, reason: 'dock-required' };
        if (!status.ready) return { ok: false, reason: 'systems-offline', status };
        if (!destination) return { ok: false, reason: 'unknown-galaxy' };
        if (destination.id === state.galaxyId) return { ok: false, reason: 'current-galaxy' };
        if (!connected(state.galaxyId, destination.id)) return { ok: false, reason: 'no-direct-route' };
        if (state.contracts.active) return { ok: false, reason: 'active-contract' };
        const cooldown = Math.max(0, STARGATE_COOLDOWN_MS - (Date.now() - state.lastStargateTravelAt));
        if (cooldown > 0) return { ok: false, reason: 'cooldown', remaining: cooldown };
        const origin = current(state); storeChart(state); state.galaxyId = destination.id; loadChart(state, destination.id);
        if (!state.visitedGalaxies.includes(destination.id)) state.visitedGalaxies.push(destination.id);
        ensureState(state);
        state.lastStargateTravelAt = Date.now();
        return { ok: true, origin, destination };
    }
    function worldSeed(state) { const galaxy = current(state); return (state.worldSeed ^ galaxy.seed) >>> 0; }

    ns.Data.GALAXIES = GALAXIES;
    ns.Data.GALAXY_LINKS = LINKS;
    ns.Galaxies = { GALAXIES, LINKS, MASKS, GATE_ENGINE, GATE_REACTOR, STARGATE_COOLDOWN_MS, byId, current, neighbors, connected, isHighestTierHull, gateStatus, ensureState, factionAvailable, availableFactions, availableLandmarks, landmarkById, worldRegions, worldConfig, travel, worldSeed };
})(window.FrontierWayfarer);
