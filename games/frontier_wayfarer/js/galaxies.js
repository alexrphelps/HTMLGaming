(function (ns) {
    const GALAXIES = [
        { id: 'galaxy_a', code: 'A', name: 'Meridian Reach', cluster: 'SPIRAL', x: 10, y: 61, seed: 0x00000000, color: '#55f0ad' },
        { id: 'galaxy_b', code: 'B', name: 'Brontide Wheel', cluster: 'BARRED SPIRAL', x: 27, y: 53, seed: 0x1b873593, color: '#ffbd59' },
        { id: 'galaxy_c', code: 'C', name: 'Aster Vale', cluster: 'BLUE ELLIPTICAL', x: 50, y: 56, seed: 0x85ebca6b, color: '#55d7ff' },
        { id: 'galaxy_d', code: 'D', name: 'Orchid Rift', cluster: 'IRREGULAR', x: 50, y: 20, seed: 0xc2b2ae35, color: '#ce75ff' },
        { id: 'galaxy_e', code: 'E', name: 'Auric Halo', cluster: 'RING', x: 78, y: 79, seed: 0x27d4eb2f, color: '#ffbd59' },
        { id: 'galaxy_f', code: 'F', name: 'Cyan Drift', cluster: 'LENTICULAR', x: 72, y: 55, seed: 0x165667b1, color: '#55d7ff' },
        { id: 'galaxy_g', code: 'G', name: 'Gemini Veil', cluster: 'INTERACTING PAIR', x: 87, y: 31, seed: 0xd3a2646c, color: '#b68cff' }
    ];
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
        prism_eidolon: 4
    };
    const GATE_ENGINE = 'atlas_stargate_engine';
    const GATE_REACTOR = 'gateheart_core';
    const C = (aetherium, sunshards, helionite) => ({ aetherium, sunshards, helionite });

    Object.values(ns.Data.HULLS).forEach(hull => { hull.tier = HULL_TIERS[hull.id] || 1; });
    Object.assign(ns.Data.MODULES, {
        [GATE_REACTOR]: {
            id: GATE_REACTOR,
            name: 'Gateheart Singularity Core',
            description: 'A contained singularity reactor that stabilizes station-scale stargate translation. Tier IV hulls only.',
            slot: 'reactor', mass: 13, reactor: 165, energyRecharge: 22,
            cost: C(1800, 70, 75), tier: 5, unlock: 'capitalVeteran', majorOnly: true, stargateSystem: true
        },
        [GATE_ENGINE]: {
            id: GATE_ENGINE,
            name: 'Atlas Stargate Engine',
            description: 'A frame-locked translation engine capable of surviving a station stargate aperture. Tier IV hulls only.',
            slot: 'engine', mass: 14, thrust: 330, maxSpeed: 20, strafe: 1.05, turn: 2.8, braking: 1.3,
            lightSpeed: true, lightTurn: 1.1, lightCharge: .85, lightDeceleration: .85,
            cost: C(1900, 60, 90), tier: 5, unlock: 'capitalVeteran', majorOnly: true, stargateSystem: true
        }
    });

    function byId(id) { return GALAXIES.find(galaxy => galaxy.id === id) || GALAXIES[0]; }
    function current(state) { ensureState(state); return byId(state.galaxyId); }
    function neighbors(id) {
        return LINKS.filter(link => link.includes(id)).map(link => link[0] === id ? link[1] : link[0]);
    }
    function connected(from, to) { return neighbors(from).includes(to); }
    function isHighestTierHull(hullOrState) {
        const hull = hullOrState?.ship ? ns.Data.HULLS[hullOrState.ship.activeHullId] : hullOrState;
        return (hull?.tier || 0) === 4;
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
        state.lastStargateTravelAt = Math.max(0, Number(state.lastStargateTravelAt) || 0);
        return state;
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function storeChart(state) {
        ensureState(state);
        state.galaxyCharts[state.galaxyId] = clone({
            x: state.ship.x, y: state.ship.y, dockedAt: state.dockedAt,
            discoveries: state.discoveries, visitedRegions: state.visitedRegions,
            consumedEntityIds: state.consumedEntityIds, economy: state.economy,
            marketInventories: state.marketInventories, contractBoard: state.contracts.board,
            boardRevision: state.contracts.boardRevision, lastManualRefreshAt: state.contracts.lastManualRefreshAt
        });
    }
    function loadChart(state, galaxyId) {
        const saved = state.galaxyCharts[galaxyId];
        const chart = saved || {
            x: 0, y: 0, dockedAt: 'waypoint_zero', discoveries: ['waypoint_zero'], visitedRegions: ['trade_belt'],
            consumedEntityIds: [], economy: {}, marketInventories: {}, contractBoard: [], boardRevision: 0, lastManualRefreshAt: 0
        };
        state.ship.x = Number.isFinite(chart.x) ? chart.x : 0; state.ship.y = Number.isFinite(chart.y) ? chart.y : 0;
        state.ship.vx = 0; state.ship.vy = 0; state.dockedAt = chart.dockedAt || 'waypoint_zero';
        state.discoveries = clone(chart.discoveries || ['waypoint_zero']); state.visitedRegions = clone(chart.visitedRegions || ['trade_belt']);
        state.consumedEntityIds = clone(chart.consumedEntityIds || []); state.economy = clone(chart.economy || {});
        state.marketInventories = clone(chart.marketInventories || {}); state.contracts.board = clone(chart.contractBoard || []);
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
        const origin = current(state); storeChart(state); loadChart(state, destination.id);
        state.galaxyId = destination.id;
        if (!state.visitedGalaxies.includes(destination.id)) state.visitedGalaxies.push(destination.id);
        state.lastStargateTravelAt = Date.now();
        return { ok: true, origin, destination };
    }
    function worldSeed(state) { const galaxy = current(state); return (state.worldSeed ^ galaxy.seed) >>> 0; }

    ns.Data.GALAXIES = GALAXIES;
    ns.Data.GALAXY_LINKS = LINKS;
    ns.Galaxies = { GALAXIES, LINKS, GATE_ENGINE, GATE_REACTOR, byId, current, neighbors, connected, isHighestTierHull, gateStatus, ensureState, travel, worldSeed };
})(window.MiniInvadersV2);
