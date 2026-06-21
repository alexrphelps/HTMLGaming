(function (ns) {
    const { CONTRACT_TYPES, REGIONS, LANDMARKS, FACTIONS } = ns.Data;
    const { seeded, distance, clamp } = ns.MathUtil;

    function eligibleTypes(state, faction) {
        const unlocked = ns.Unlocks.evaluate(state).contractTypes;
        return CONTRACT_TYPES.filter(t => unlocked[t.id] && (t.id !== 'smuggle' || faction === 'corsairs' || state.reputations.corsairs >= 10));
    }
    function tutorialContract(state, station) {
        const first = (state.progression?.tutorialStep || 0) === 0;
        const destinationId = first ? 'cold_start_beacon' : station.id === 'greenline_exchange' ? 'waypoint_zero' : 'greenline_exchange';
        const destination = LANDMARKS.find(l => l.id === destinationId);
        return {
            id: `tutorial:${first ? 'cold_start' : 'parts_run'}`, tutorialStep: first ? 1 : 2,
            type: first ? 'survey' : 'haul', name: first ? 'Cold Start' : 'Parts Run',
            description: first ? 'Calibrate the Wayfarer at the nearby Guild beacon.' : 'Deliver a Guild parts package to Greenline Exchange.',
            issuer: 'independents', origin: station.id, destination: destination.id, target: { x: destination.x, y: destination.y },
            reward: first ? { aetherium: 120, sunshards: 0, helionite: 0 } : { aetherium: 100, sunshards: 0, helionite: 0 },
            xp: first ? 60 : 80, risk: 0, progress: 0, required: 1, status: 'offered', createdAt: state.playTime
        };
    }
    function generate(state, station, index) {
        const rand = seeded((state.worldSeed ^ station.x ^ station.y ^ state.contracts.completed * 97 ^ index * 131) >>> 0);
        const types = eligibleTypes(state, station.faction);
        const type = types[Math.floor(rand() * types.length)];
        const fieldContract = ['survey', 'salvage', 'rescue'].includes(type.id);
        const destinations = LANDMARKS.filter(l => l.id !== station.id && (fieldContract || l.type === 'station'));
        const destination = destinations[Math.floor(rand() * destinations.length)] || station;
        const region = REGIONS.find(r => r.id === destination.region) || REGIONS[0];
        const levelScale = 1 + (state.pilot.level - 1) * .08;
        const distanceScale = 1 + Math.min(2, distance(station, destination) / 6500);
        const traitScale = 1 + (ns.Progression.traitEffects(state).contractReward || 0);
        const reward = ns.Wallet.scale(type.baseReward, levelScale * distanceScale * traitScale * (1 + region.danger * .08));
        return {
            id: `contract:${station.id}:${state.contracts.completed}:${index}`,
            type: type.id, name: type.name, description: `${type.verb} near ${destination.name}.`,
            issuer: station.faction, origin: station.id, destination: destination.id,
            target: { x: destination.x, y: destination.y }, reward, xp: Math.round(55 * type.risk * distanceScale), risk: type.risk,
            progress: 0, required: ['bounty', 'escort', 'assault'].includes(type.id) ? 3 + type.risk : 1,
            status: 'offered', createdAt: state.playTime
        };
    }
    function refreshBoard(state, station) {
        if ((state.progression?.tutorialStep || 0) < 2) {
            state.contracts.board = [tutorialContract(state, station)]; return state.contracts.board;
        }
        state.contracts.board = Array.from({ length: 6 }, (_, i) => generate(state, station, i));
        return state.contracts.board;
    }
    function accept(state, id) {
        if (state.contracts.active) return false;
        const contract = state.contracts.board.find(c => c.id === id);
        if (!contract || contract.status !== 'offered') return false;
        contract.status = 'active'; state.contracts.active = contract; return true;
    }
    function recordProgress(state, event, amount) {
        const c = state.contracts.active;
        if (!c) return false;
        const mapping = { kill: ['bounty', 'assault'], escort: ['escort'], salvage: ['salvage'], scan: ['survey'], rescue: ['rescue'], dock: ['haul', 'smuggle'] };
        if (!(mapping[event] || []).includes(c.type)) return false;
        c.progress = clamp(c.progress + (amount || 1), 0, c.required);
        return c.progress >= c.required;
    }
    function complete(state) {
        const c = state.contracts.active;
        if (!c || c.progress < c.required) return null;
        ns.Wallet.credit(state, c.reward, state.dockedAt ? 'banked' : 'unbanked');
        const repEffect = 4 * (1 + (ns.Progression.traitEffects(state).reputation || 0));
        state.reputations[c.issuer] = clamp(state.reputations[c.issuer] + repEffect, -100, 100);
        const opponent = FACTIONS[c.issuer] && FACTIONS[c.issuer].hostileTo;
        if (c.type === 'assault' && opponent) state.reputations[opponent] = clamp(state.reputations[opponent] - 5, -100, 100);
        ns.State.addExperience(state, c.xp);
        if (!c.tutorialStep) { state.stats.contracts++; state.contracts.completed++; }
        if (c.tutorialStep) {
            state.progression.tutorialStep = Math.max(state.progression.tutorialStep, c.tutorialStep);
            if (c.tutorialStep === 1) {
                if (!state.ship.ownedModules.includes('afterburner')) state.ship.ownedModules.push('afterburner');
                state.ship.slots.abilityShift = 'afterburner';
            } else if (c.tutorialStep === 2) {
                if (!state.ship.ownedModules.includes('shield_scout')) state.ship.ownedModules.push('shield_scout');
                state.ship.slots.defense = 'shield_scout'; state.ship.shield = ns.Progression.calculateShipStats(state).shield;
            }
        }
        const issuerContracts = state.contracts.history.filter(item => !item.tutorialStep && item.issuer === c.issuer && item.status === 'complete').length + 1;
        if (!c.tutorialStep && issuerContracts % 2 === 0 && state.quests[c.issuer] < ns.Data.QUESTS[c.issuer].length - 1) state.quests[c.issuer]++;
        c.status = 'complete'; state.contracts.history.unshift(c); state.contracts.history = state.contracts.history.slice(0, 20); state.contracts.active = null;
        state.contracts.board = [];
        ns.Progression.updateAchievements(state);
        return c;
    }
    function joinFaction(state, factionId) {
        if (!['concord', 'corsairs'].includes(factionId) || state.reputations[factionId] < 15) return false;
        const old = state.pilot.allegiance;
        if (old && old !== factionId) state.reputations[old] = clamp(state.reputations[old] - 35, -100, 100);
        state.pilot.allegiance = factionId; state.reputations[factionId] = Math.max(20, state.reputations[factionId]); return true;
    }
    function leaveFaction(state) {
        if (!state.pilot.allegiance) return false;
        state.reputations[state.pilot.allegiance] = clamp(state.reputations[state.pilot.allegiance] - 25, -100, 100);
        state.pilot.allegiance = null; return true;
    }
    ns.Contracts = { generate, refreshBoard, accept, recordProgress, complete, joinFaction, leaveFaction };
})(window.MiniInvadersV2);
