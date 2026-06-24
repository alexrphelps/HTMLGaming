(function (ns) {
    function hasAnomaly(state) {
        const anomalyIds = ['cold_start_beacon', 'silent_crown', 'glass_wake'];
        const pools = [state.discoveries || [], ...Object.values(state.galaxyCharts || {}).map(chart => chart?.discoveries || [])];
        return pools.some(discoveries => discoveries.some(id => id.includes('signal:') || anomalyIds.includes(id)));
    }
    function evaluate(state) {
        const tutorial = state.progression?.tutorialStep || 0;
        const anomaly = hasAnomaly(state);
        const combat = state.pilot.level >= 3 && state.stats.kills >= 10;
        const factionStanding = state.pilot.allegiance && state.reputations[state.pilot.allegiance] >= 25;
        const rim = state.visitedRegions.includes('anomaly_rim') && state.pilot.level >= 6;
        return {
            tutorial, guildBoard: tutorial >= 1, shields: tutorial >= 2 || Boolean(state.progression?.legacyShield),
            tradeTier: rim ? 3 : state.contracts.completed >= 3 ? 2 : tutorial >= 1 ? 1 : 0,
            anomaly, combat, factionStanding: Boolean(factionStanding), rim,
            lightDrive: state.pilot.level >= 4 && state.contracts.completed >= 5,
            contractTypes: {
                haul: tutorial >= 1, salvage: tutorial >= 1, mining: tutorial >= 1, rescue: tutorial >= 1,
                escort: state.contracts.completed >= 3, survey: anomaly, bounty: combat,
                smuggle: state.reputations.corsairs >= 10, assault: Boolean(factionStanding)
            },
            abilitySlots: {
                abilityShift: tutorial >= 1 || Boolean(state.progression?.legacyCareer),
                abilitySpace: state.contracts.completed >= 3,
                abilityQ: anomaly,
                abilityE: Boolean(state.pilot.allegiance) || state.contracts.completed >= 10
            }
        };
    }
    function requirementMet(state, requirement) {
        if (!requirement || requirement === 'starter') return true;
        const u = evaluate(state);
        const capitalKill = Object.keys(state.progression?.bossesDefeated || {}).some(id => ns.Data.BOSSES[id]?.capital);
        return {
            trade1: u.tradeTier >= 1, contracts3: state.contracts.completed >= 3,
            trade2: u.tradeTier >= 2, concord10: state.reputations.concord >= 10, corsairs10: state.reputations.corsairs >= 10,
            anomaly: u.anomaly, combat: u.combat, shield: u.shields,
            faction25: u.factionStanding, rim: u.rim, lightDrive: u.lightDrive, mechanic: Boolean(state.pilot.achievements.master_mechanic),
            capital: Object.keys(state.progression?.bossesDefeated || {}).some(id => !ns.Data.BOSSES[id]?.capital),
            capitalVeteran: capitalKill,
            asterLate: state.visitedGalaxies.includes('galaxy_c') && state.reputations.aster_collective >= 20,
            orchidLate: state.visitedGalaxies.includes('galaxy_d') && state.reputations.orchid_synod >= 20,
            auricLate: state.visitedGalaxies.includes('galaxy_e') && state.reputations.auric_combine >= 20,
            cyanLate: state.visitedGalaxies.includes('galaxy_f') && state.reputations.cyan_nomads >= 20,
            geminiLate: state.visitedGalaxies.includes('galaxy_g') && state.reputations.gemini_directorate >= 20,
            concordCapital: state.reputations.concord >= 40 && capitalKill,
            allGalaxies: state.pilot.level >= 14 && state.visitedGalaxies.length >= 7 && capitalKill,
            nullCrown: state.stats.kills >= 80 && state.reputations.corsairs >= 45 && capitalKill
        }[requirement] || false;
    }
    function moduleVisible(state, module) { return state.ship.ownedModules.includes(module.id) || requirementMet(state, module.unlock); }
    function commodityVisible(state, commodity) {
        const u = evaluate(state); if (commodity.id === 'relics') return u.tradeTier >= 3 || state.reputations.corsairs >= 10;
        return u.tradeTier >= (commodity.tier || 1);
    }
    function nextMilestone(state) {
        const u = evaluate(state);
        if (u.tutorial === 0) return 'Complete COLD START to unlock contracts, trade, and Afterburner.';
        if (u.tutorial === 1) return 'Complete PARTS RUN to unlock shield generators.';
        if (state.contracts.completed < 3) return `Complete ${3 - state.contracts.completed} more contract(s) to unlock Trade II and Space ability.`;
        if (!u.lightDrive) return `Reach level 4 and complete ${Math.max(0, 5 - state.contracts.completed)} more contract(s) to license the Asterion Light Drive.`;
        if (!u.anomaly) return 'Discover an anomaly to unlock surveys, Sunshard technology, and Q ability.';
        if (!u.combat) return 'Reach level 3 and destroy 10 hostiles to unlock bounties and combat hardware.';
        if (!u.abilitySlots.abilityE) return 'Join a faction or complete 10 independent contracts to unlock E ability.';
        if (!u.rim) return 'Reach level 6 and enter the Anomaly Rim to unlock Trade III.';
        return 'All career licenses unlocked. Raise faction standing for elite hardware.';
    }
    ns.Unlocks = { evaluate, requirementMet, moduleVisible, commodityVisible, nextMilestone, hasAnomaly };
})(window.FrontierWayfarer);
