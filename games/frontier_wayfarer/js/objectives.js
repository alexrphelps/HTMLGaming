(function (ns) {
    const LOCAL_FACTIONS = {
        galaxy_a: ['independents', 'concord', 'corsairs'], galaxy_b: ['independents', 'concord', 'corsairs'],
        galaxy_c: ['aster_collective'], galaxy_d: ['orchid_synod'], galaxy_e: ['auric_combine'],
        galaxy_f: ['cyan_nomads'], galaxy_g: ['gemini_directorate']
    };
    const REWARD_RANGES = {
        easy: { aetherium: [75, 125], sunshards: [5, 10], helionite: [2, 5] },
        medium: { aetherium: [150, 250], sunshards: [10, 20], helionite: [5, 10] },
        hard: { aetherium: [300, 450], sunshards: [20, 35], helionite: [10, 20] }
    };
    function stringSeed(value) { let seed = 2166136261; for (const char of String(value)) { seed ^= char.charCodeAt(0); seed = Math.imul(seed, 16777619); } return seed >>> 0; }
    function roll(seed, key, salt) { return ns.MathUtil.hash(seed >>> 0, stringSeed(key), salt || 0, 913); }
    function ranged(seed, key, salt, range) { return Math.floor(range[0] + roll(seed, key, salt) * (range[1] - range[0] + 1)); }
    function rewardFor(state, galaxyId, objectiveId, difficulty) {
        const ranges = REWARD_RANGES[difficulty] || REWARD_RANGES.medium, key = `${galaxyId}:${objectiveId}`;
        return Object.fromEntries(Object.entries(ranges).map(([currency, range], index) => [currency, ranged(state.worldSeed, key, index + 31, range)]));
    }
    function relicFor(state, galaxyId) {
        const galaxy = ns.Galaxies.byId(galaxyId), present = roll(state.worldSeed ^ galaxy.seed, galaxyId, 71) < .3;
        if (!present) return { present: false, id: `ancient-relic:${galaxyId}` };
        const regions = ns.Data.REGIONS.filter(region => galaxy.mask[region.row]?.[region.column] === '#').sort((a, b) => (b.remoteness + b.danger) - (a.remoteness + a.danger) || a.id.localeCompare(b.id));
        const candidates = regions.slice(0, Math.max(8, Math.ceil(regions.length / 3))), region = candidates[Math.floor(roll(state.worldSeed ^ galaxy.seed, galaxyId, 72) * candidates.length)];
        return {
            present: true, id: `ancient-relic:${galaxyId}`, galaxyId, region: region.id,
            x: region.x + region.w * (.2 + roll(state.worldSeed, galaxyId, 73) * .6),
            y: region.y + region.h * (.2 + roll(state.worldSeed, galaxyId, 74) * .6),
            radius: 34, kind: 'worldObject', typeId: 'ancient_relic', name: 'Ancient Relic',
            vx: (roll(state.worldSeed, galaxyId, 75) * 2 - 1) * 8, vy: (roll(state.worldSeed, galaxyId, 76) * 2 - 1) * 8,
            rotation: roll(state.worldSeed, galaxyId, 77) * Math.PI * 2, spin: (roll(state.worldSeed, galaxyId, 78) * 2 - 1) * .18,
            shapeSeed: stringSeed(`${state.worldSeed}:${galaxyId}:relic`)
        };
    }
    function threshold(index, values, random) { return values[Math.min(values.length - 1, Math.floor((index + random * 2.8) / 3))]; }
    function generatedDefinition(state, galaxy, family, random) {
        const index = ns.Data.GALAXIES.indexOf(galaxy), suffix = `${family}_${Math.floor(random * 100000)}`;
        if (family === 'contracts') { const required = threshold(index, [20,25,30], random); return { id: suffix, family, required, difficulty: required === 20 ? 'medium' : 'hard', label: `Complete ${required} contracts` }; }
        if (family === 'explore') { const missing = threshold(index, [3,2,0], random); const total = ns.Galaxies.worldRegions(Object.assign({}, state, { galaxyId: galaxy.id, visitedGalaxies: state.visitedGalaxies.slice(), galaxyCharts: state.galaxyCharts })).length, required = total - missing; return { id: suffix, family, required, difficulty: 'hard', label: missing ? `Explore all but ${missing} sectors` : 'Explore all sectors' }; }
        if (family === 'bosses') { const required = threshold(index, [3,4,5], random); return { id: suffix, family, required, difficulty: 'hard', label: `Destroy ${required} Bandit Bosses` }; }
        if (family === 'relic') return { id: suffix, family, required: 1, difficulty: 'hard', label: 'Discover the Ancient Relic' };
        if (family === 'standing') return { id: suffix, family, required: 100, difficulty: 'hard', label: 'Gain +100 with any local Faction' };
        if (family === 'localContracts') { const required = threshold(index, [8,12,16], random); return { id: suffix, family, required, difficulty: required === 8 ? 'medium' : 'hard', label: `Complete ${required} local Faction contracts` }; }
        if (family === 'discoveries') { const required = threshold(index, [12,18,24], random); return { id: suffix, family, required, difficulty: 'medium', label: `Discover ${required} signals or objects` }; }
        if (family === 'kills') { const required = threshold(index, [75,100,150], random); return { id: suffix, family, required, difficulty: required === 75 ? 'medium' : 'hard', label: `Destroy ${required} hostile ships` }; }
        if (family === 'trades') { const required = threshold(index, [10,15,20], random); return { id: suffix, family, required, difficulty: 'medium', label: `Complete ${required} trades` }; }
        const required = threshold(index, [1500,2500,4000], random); return { id: suffix, family: 'earnings', required, difficulty: required === 1500 ? 'medium' : 'hard', label: `Earn ${required.toLocaleString()} AE in this galaxy` };
    }
    function definitionsFor(state, galaxyId) {
        ensure(state); if (state.mapObjectives.definitions[galaxyId]) return state.mapObjectives.definitions[galaxyId];
        const galaxy = ns.Galaxies.byId(galaxyId), fixed = galaxyId === 'galaxy_a' ? [
            { id: 'light_speed_engine', family: 'lightEngine', required: 1, difficulty: 'easy', label: "Purchase a 'Light Speed' capable ENGINE." },
            { id: 'stargate_pair', family: 'stargatePair', required: 2, difficulty: 'hard', label: "Purchase a 'Station Stargate' capable ENGINE and REACTOR." }
        ] : [];
        const families = ['contracts','explore','bosses','standing','localContracts','discoveries','kills','trades','earnings'];
        if (relicFor(state, galaxyId).present) families.push('relic');
        const ordered = families.map((family, index) => ({ family, order: roll(state.worldSeed ^ galaxy.seed, family, index + 101) })).sort((a,b) => a.order - b.order);
        const generated = ordered.slice(0, 5 - fixed.length).map((entry, index) => generatedDefinition(state, galaxy, entry.family, roll(state.worldSeed ^ galaxy.seed, entry.family, index + 201)));
        const definitions = fixed.concat(generated).map(definition => Object.assign(definition, { reward: rewardFor(state, galaxyId, definition.id, definition.difficulty) }));
        state.mapObjectives.definitions[galaxyId] = definitions; return definitions;
    }
    function defaultProgress() { return { contracts: 0, bosses: 0, localContracts: 0, discoveries: 0, kills: 0, trades: 0, earnings: 0, relic: 0 }; }
    function ensure(state, legacy) {
        state.mapObjectives = state.mapObjectives && typeof state.mapObjectives === 'object' ? state.mapObjectives : {};
        state.mapObjectives.definitions = state.mapObjectives.definitions || {}; state.mapObjectives.progress = state.mapObjectives.progress || {}; state.mapObjectives.paid = state.mapObjectives.paid || {};
        ns.Data.GALAXIES.forEach(galaxy => { state.mapObjectives.progress[galaxy.id] = Object.assign(defaultProgress(), state.mapObjectives.progress[galaxy.id]); state.mapObjectives.paid[galaxy.id] = Array.isArray(state.mapObjectives.paid[galaxy.id]) ? state.mapObjectives.paid[galaxy.id] : []; });
        if (legacy && !state.mapObjectives.legacyImported) {
            const progress = state.mapObjectives.progress[state.galaxyId] || defaultProgress();
            progress.contracts = Math.max(progress.contracts, Number(state.contracts?.completed) || 0); progress.kills = Math.max(progress.kills, Number(state.stats?.kills) || 0); progress.trades = Math.max(progress.trades, Number(state.stats?.trades) || 0);
            progress.bosses = Math.max(progress.bosses, Object.values(state.progression?.bossesDefeated || {}).reduce((sum, count) => sum + (Number(count) || 0), 0)); progress.earnings = Math.max(progress.earnings, (Number(state.pilot?.wallet?.banked?.aetherium) || 0) + (Number(state.pilot?.wallet?.unbanked?.aetherium) || 0)); state.mapObjectives.legacyImported = true;
        }
        return state.mapObjectives;
    }
    function chartFor(state, galaxyId) { return galaxyId === state.galaxyId ? state : state.galaxyCharts?.[galaxyId] || {}; }
    function valueFor(state, galaxyId, definition) {
        const progress = ensure(state).progress[galaxyId], chart = chartFor(state, galaxyId);
        if (definition.family === 'lightEngine') return state.ship.ownedModules.some(id => ns.Data.MODULES[id]?.slot === 'engine' && (id === 'light_drive' || ns.Data.MODULES[id]?.lightSpeed)) ? 1 : 0;
        if (definition.family === 'stargatePair') return [ns.Galaxies.GATE_ENGINE, ns.Galaxies.GATE_REACTOR].filter(id => state.ship.ownedModules.includes(id)).length;
        if (definition.family === 'explore') return new Set(chart.visitedRegions || []).size;
        if (definition.family === 'standing') return Math.max(...(LOCAL_FACTIONS[galaxyId] || ['independents']).map(id => Number(state.reputations[id]) || 0));
        return Number(progress[definition.family]) || 0;
    }
    function evaluate(state, galaxyId) {
        galaxyId = galaxyId || state.galaxyId; const objectives = ensure(state), paid = objectives.paid[galaxyId], completed = [];
        const entries = definitionsFor(state, galaxyId).map(definition => {
            const value = Math.min(definition.required, Math.max(0, valueFor(state, galaxyId, definition))), done = value >= definition.required;
            if (done && !paid.includes(definition.id)) { paid.push(definition.id); const wallet = ns.Wallet.ensure(state).banked; Object.entries(definition.reward).forEach(([key, amount]) => { wallet[key] += amount; }); completed.push(definition); }
            return { definition, value, done, paid: paid.includes(definition.id) };
        });
        return { entries, completed };
    }
    function record(state, family, amount, metadata) {
        const galaxyId = metadata?.galaxyId || state.galaxyId, progress = ensure(state).progress[galaxyId]; if (!(family in progress)) return evaluate(state, galaxyId);
        progress[family] = Math.max(0, (Number(progress[family]) || 0) + (Number(amount) || 0)); return evaluate(state, galaxyId);
    }
    ns.Objectives = { LOCAL_FACTIONS, REWARD_RANGES, ensure, definitionsFor, relicFor, valueFor, evaluate, record };
})(window.MiniInvadersV2);
