(function (ns) {
    const DEFAULT_SLOTS = {
        primary1: 'pulse_mk1', primary2: null,
        reactor: 'reactor_mk1', engine: 'drive_mk1', defense: null,
        cargo: 'cargo_mk1', utility1: null, utility2: null, utility3: null, utility4: null,
        abilitySpace: null, abilityQ: null, abilityE: null, abilityShift: null
    };

    function createState(seed) {
        return {
            schemaVersion: 4,
            worldSeed: Number.isFinite(seed) ? seed : Math.floor(Math.random() * 0x7fffffff),
            playTime: 0,
            pilot: { level: 1, xp: 0, traitPoints: 0, traits: {}, achievements: {}, wallet: { banked: { aetherium: 250, sunshards: 0, helionite: 0 }, unbanked: { aetherium: 0, sunshards: 0, helionite: 0 } }, allegiance: null },
            ship: {
                name: 'Wayfarer', x: 260, y: 80, vx: 0, vy: 0, angle: -Math.PI / 2,
                hull: 140, shield: 0, overshield: 0, shieldRechargeDelay: 0, energy: 80, heat: 0,
                damageSerial: 0,
                chassis: { level: 1, integrity: 140, reactorBonus: 0, cargoBonus: 0, massLimit: 52 },
                slots: Object.assign({}, DEFAULT_SLOTS), ownedModules: ['pulse_mk1', 'reactor_mk1', 'drive_mk1', 'cargo_mk1'],
                moduleDamage: {}, abilityCooldowns: {}, abilityEffects: {}, cargo: {}, insured: false
            },
            reputations: { concord: 0, corsairs: 0, independents: 5 },
            economy: {},
            marketInventories: {},
            contracts: { board: [], active: null, completed: 0, history: [], boardRevision: 0, lastManualRefreshAt: 0 },
            quests: { independents: 0, concord: 0, corsairs: 0 },
            progression: { tutorialStep: 0, legacyCareer: false, legacyShield: false },
            discoveries: ['waypoint_zero'],
            consumedEntityIds: [],
            visitedRegions: ['trade_belt'],
            dockedAt: 'waypoint_zero',
            stats: { kills: 0, discoveries: 0, contracts: 0, trades: 0, repairs: 0, distance: 0 },
            settings: { volume: 0.5, screenShake: true, radarScale: 1 },
            lastSaveAt: Date.now()
        };
    }

    function xpForLevel(level) { return 160 + (level - 1) * 90; }
    function addExperience(state, amount) {
        state.pilot.xp += Math.max(0, Math.round(amount));
        const levels = [];
        while (state.pilot.level < 30 && state.pilot.xp >= xpForLevel(state.pilot.level)) {
            state.pilot.xp -= xpForLevel(state.pilot.level);
            state.pilot.level++;
            state.pilot.traitPoints++;
            levels.push(state.pilot.level);
        }
        if (state.pilot.level >= 30) state.pilot.xp = 0;
        return levels;
    }

    ns.State = { createState, xpForLevel, addExperience, DEFAULT_SLOTS };
})(window.MiniInvadersV2);
