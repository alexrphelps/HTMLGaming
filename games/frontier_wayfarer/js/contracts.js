(function (ns) {
    const { CONTRACT_TYPES, REGIONS, LANDMARKS, FACTIONS } = ns.Data;
    const { seeded, distance, clamp } = ns.MathUtil;
    const CONTACT_TYPES = {
        survey: { kind: 'anomaly', event: 'scan', name: 'Survey Beacon', instruction: 'Reach the marked beacon and press F to establish a five-second scan link.' },
        salvage: { kind: 'salvage', event: 'salvage', name: 'Claimed Salvage', instruction: 'Reach the marked salvage and press F to begin recovery.' },
        rescue: { kind: 'signal', event: 'rescue', name: 'Distress Contact', instruction: 'Reach the distress contact and press F to begin pilot recovery.' },
        search: { kind: 'signal', event: 'search', name: 'Search Contact', instruction: 'Enter the search area; the exact contact resolves at close sensor range.' },
        pickup: { kind: 'salvage', event: 'pickup', name: 'Lost Cargo', instruction: 'Reach the marked cargo and press F to begin recovery.' }
    };
    const EVENT_RANGES = { kill: 760, escort: 760, salvage: 220, scan: 220, rescue: 220, search: 220, pickup: 220, dock: 220 };
    const BOARD_COOLDOWN_MS = 120000;
    const ESCORT_CONFIG = { rendezvousDistance: 1800, activationRange: 220, escortRange: 760, warningRange: 570, formationRange: 180, graceSeconds: 8, speed: 58, hull: 220, lowHullRatio: .35, enemySpawnDistance: 760 };
    const ADVANCED_TEMPLATES = ['lost_ship_escort', 'multi_haul', 'deep_survey', 'area_search', 'cargo_recovery'];
    const CHOICE_TEMPLATES = ['lost_cargo_choice', 'black_box_choice', 'pilot_asylum_choice', 'survey_rights_choice', 'prototype_custody_choice'];
    const FACTION_TYPE_WEIGHTS = {
        aster_collective: { survey: 4, rescue: 2, salvage: 2 }, orchid_synod: { salvage: 4, smuggle: 2, assault: 2 }, auric_combine: { haul: 4, escort: 2, smuggle: 2 }, cyan_nomads: { salvage: 3, rescue: 3, escort: 3 }, gemini_directorate: { assault: 4, bounty: 3, escort: 2 }
    };
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function point(item) { return { x: item.x, y: item.y }; }
    function stationById(id) { return LANDMARKS.find(item => item.id === id && item.type === 'station'); }
    function stageId(contractId, index) { return `${contractId}:stage:${index}`; }
    function escortState(start, end) { return { phase: 'rendezvous', grace: ESCORT_CONFIG.graceSeconds, ambushes: 0, start: point(start), end: point(end), startRegion: start.region || null, startSector: start.sector || null, endRegion: end.region || null, endSector: end.sector || null, convoy: null }; }
    function escortStart(destination, rand) {
        const endRegion = REGIONS.find(region => region.id === destination.region), regions = endRegion ? REGIONS.filter(region => sectorDistance(region, endRegion) >= 1 && sectorDistance(region, endRegion) <= 2) : [];
        const region = regions[Math.floor(rand() * regions.length)] || endRegion;
        if (region) return Object.assign(pointInRegion(region, rand), { region: region.id, sector: region.grid });
        const angle = rand() * Math.PI * 2, bounds = ns.World.catalogBounds();
        return { x: clamp(destination.x + Math.cos(angle) * ESCORT_CONFIG.rendezvousDistance, bounds.minX + 400, bounds.maxX - 400), y: clamp(destination.y + Math.sin(angle) * ESCORT_CONFIG.rendezvousDistance, bounds.minY + 400, bounds.maxY - 400), region: destination.region || null, sector: null };
    }
    function makeStage(contractId, index, data) {
        return Object.assign({ id: stageId(contractId, index), status: index ? 'pending' : 'active', progress: 0, required: 1 }, data);
    }
    function ensureStages(contract) {
        if (!contract || contract.stages?.length) return contract?.stages || [];
        const meta = CONTACT_TYPES[contract.type];
        contract.stageMode = 'sequential';
        contract.stages = [makeStage(contract.id, 0, {
            type: contract.type, event: meta?.event || (['haul', 'smuggle'].includes(contract.type) ? 'dock' : ['bounty', 'assault'].includes(contract.type) ? 'kill' : contract.type === 'escort' ? 'escort' : contract.type),
            name: contract.name, instruction: objectiveInstructionLegacy(contract), destination: contract.destination, target: contract.target ? point(contract.target) : null,
            progress: contract.progress || 0, required: contract.type === 'escort' ? 1 : contract.required || 1, escort: contract.escort || null
        })];
        return contract.stages;
    }
    function activeStages(contract) {
        const stages = ensureStages(contract);
        return stages.filter(stage => stage.status === 'active');
    }
    function syncContract(contract) {
        if (!contract) return contract;
        const stages = ensureStages(contract), active = activeStages(contract), lead = active[0] || stages[stages.length - 1];
        contract.progress = stages.filter(stage => stage.status === 'complete').length;
        contract.required = stages.length;
        if (lead) {
            const leadTarget = lead.choices?.[0]?.target || lead.target;
            contract.target = leadTarget ? point(leadTarget) : contract.target;
            contract.destination = lead.destination || contract.destination;
            contract.escort = lead.escort || null;
        }
        return contract;
    }
    function isComplete(contract) { return ensureStages(contract).length > 0 && ensureStages(contract).every(stage => stage.status === 'complete'); }
    function activateNext(contract) {
        if (contract.stageMode === 'parallel') return;
        const next = ensureStages(contract).find(stage => stage.status === 'pending'); if (next) next.status = 'active';
    }
    function completeStage(contract, stage) { stage.progress = stage.required; stage.status = 'complete'; activateNext(contract); syncContract(contract); }

    function eligibleTypes(state, faction) {
        const unlocked = ns.Unlocks.evaluate(state).contractTypes;
        return CONTRACT_TYPES.filter(t => unlocked[t.id] && (t.id !== 'smuggle' || faction === 'corsairs' || state.reputations.corsairs >= 10));
    }
    function stationAvailable(state, station) { return Boolean(station && station.type === 'station' && ns.Galaxies.factionAvailable(state, station.faction) && (!station.unlockGalaxy || state.visitedGalaxies.includes(station.unlockGalaxy))); }
    function dockingDenied(state, stationOrFaction) { const faction = typeof stationOrFaction === 'string' ? stationOrFaction : stationOrFaction?.faction; return Boolean(faction && ns.Expansion.dockingDenied(state, faction)); }
    function accessibleLandmarks(state, predicate) {
        const hasLightDrive = state.ship.ownedModules.includes('light_drive');
        const landmarks = ns.Galaxies?.availableLandmarks ? ns.Galaxies.availableLandmarks(state) : LANDMARKS;
        return landmarks.filter(item => (!item.unlockGalaxy || state.visitedGalaxies.includes(item.unlockGalaxy)) && predicate(item) && (hasLightDrive || !(REGIONS.find(region => region.id === item.region)?.travelTier)));
    }
    function tutorialContract(state, station) {
        const first = (state.progression?.tutorialStep || 0) === 0;
        const destinationId = first ? 'cold_start_beacon' : station.id === 'greenline_exchange' ? 'waypoint_zero' : 'greenline_exchange';
        const destination = LANDMARKS.find(l => l.id === destinationId), id = `tutorial:${first ? 'cold_start' : 'parts_run'}`;
        const contract = { id, tutorialStep: first ? 1 : 2, type: first ? 'survey' : 'haul', name: first ? 'Cold Start' : 'Parts Run', description: first ? 'Calibrate the Wayfarer at the nearby Guild beacon.' : 'Deliver a Guild parts package to Greenline Exchange.', issuer: 'independents', origin: station.id, destination: destination.id, target: point(destination), reward: first ? { aetherium: 120, sunshards: 0, helionite: 0 } : { aetherium: 100, sunshards: 0, helionite: 0 }, xp: first ? 60 : 80, risk: 0, progress: 0, required: 1, status: 'offered', createdAt: state.playTime, stageMode: 'sequential' };
        contract.stages = [makeStage(id, 0, { type: contract.type, event: first ? 'scan' : 'dock', name: contract.name, instruction: first ? CONTACT_TYPES.survey.instruction : `Dock at ${destination.name} to complete delivery.`, destination: destination.id, target: point(destination) })];
        return syncContract(contract);
    }
    function rewardFor(state, station, destination, type, stageFactor) {
        const region = REGIONS.find(r => r.id === destination.region) || REGIONS[0];
        const scale = (1 + (state.pilot.level - 1) * .08) * (1 + Math.min(2, distance(station, destination) / 6500)) * (1 + (ns.Progression.traitEffects(state).contractReward || 0)) * (1 + region.danger * .08) * (stageFactor || 1);
        return ns.Wallet.scale(type.baseReward, scale);
    }
    function generateStandard(state, station, index, rand, type) {
        const field = ['survey', 'salvage', 'rescue'].includes(type.id);
        const destinations = accessibleLandmarks(state, item => item.id !== station.id && (field ? item.type !== 'station' : item.type === 'station'));
        const destination = destinations[Math.floor(rand() * destinations.length)] || station;
        const id = `contract:${station.id}:${state.contracts.completed}:${state.contracts.boardRevision}:${index}`;
        const required = ['bounty', 'escort', 'assault'].includes(type.id) ? 3 + type.risk : 1;
        const contract = { id, type: type.id, name: type.name, description: `${type.verb} near ${destination.name}.`, issuer: station.faction, origin: station.id, destination: destination.id, target: point(destination), reward: rewardFor(state, station, destination, type), xp: Math.round(55 * type.risk * (1 + Math.min(2, distance(station, destination) / 6500))), risk: type.risk, progress: 0, required, status: 'offered', createdAt: state.playTime, stageMode: 'sequential' };
        const start = type.id === 'escort' ? escortStart(destination, rand) : null;
        const escort = start ? escortState(start, destination) : null;
        const meta = CONTACT_TYPES[type.id];
        contract.stages = [makeStage(id, 0, { type: type.id, event: meta?.event || (['haul', 'smuggle'].includes(type.id) ? 'dock' : ['bounty', 'assault'].includes(type.id) ? 'kill' : 'escort'), name: type.name, instruction: objectiveInstructionLegacy(Object.assign({}, contract, { escort })), destination: destination.id, target: escort ? point(start) : point(destination), required: type.id === 'escort' ? 1 : required, escort })];
        return syncContract(contract);
    }
    function uniqueStations(state, origin, count, rand) {
        const pool = accessibleLandmarks(state, item => stationAvailable(state, item) && item.id !== origin.id).slice();
        const result = []; while (pool.length && result.length < count) result.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]); return result;
    }
    function fieldPoint(destination, rand, radius) {
        const angle = rand() * Math.PI * 2, offset = (radius || 420) * (.35 + rand() * .65);
        return { x: destination.x + Math.cos(angle) * offset, y: destination.y + Math.sin(angle) * offset };
    }
    function accessibleRegions(state) { const hasLightDrive = state.ship.ownedModules.includes('light_drive'); return REGIONS.filter(region => hasLightDrive || !region.travelTier); }
    function sectorDistance(a, b) { return Math.max(Math.abs(a.column - b.column), Math.abs(a.row - b.row)); }
    function pointInRegion(region, rand) { const inset = 900; return { x: region.x + inset + rand() * (region.w - inset * 2), y: region.y + inset + rand() * (region.h - inset * 2) }; }
    function surveyChainRegions(state, first, rand, count) {
        const pool = accessibleRegions(state), selected = [first];
        while (selected.length < count) {
            const previous = selected[selected.length - 1], candidates = pool.filter(region => !selected.includes(region) && sectorDistance(previous, region) >= 1 && sectorDistance(previous, region) <= 2), fallback = pool.filter(region => !selected.includes(region));
            const choices = candidates.length ? candidates : fallback; if (!choices.length) break; selected.push(choices[Math.floor(rand() * choices.length)]);
        }
        return selected;
    }
    function choiceStations(state, origin, rand) {
        const pool = accessibleLandmarks(state, item => stationAvailable(state, item) && item.id !== origin.id), byFaction = [];
        pool.forEach(station => { if (!byFaction.some(item => item.faction === station.faction)) byFaction.push(station); });
        const choices = [];
        while (byFaction.length && choices.length < 2) choices.push(byFaction.splice(Math.floor(rand() * byFaction.length), 1)[0]);
        return choices;
    }
    function timedDuration(state, origin, contract) {
        let cursor = origin, route = 0, interactions = 0;
        ensureStages(contract).forEach(stage => {
            const targets = stage.choices?.map(choice => choice.target) || (stage.target ? [stage.target] : []);
            if (targets.length) { const target = targets.reduce((best, item) => distance(cursor, item) < distance(cursor, best) ? item : best, targets[0]); route += distance(cursor, target); cursor = target; }
            if (stage.event !== 'dock') interactions++;
        });
        const stats = ns.Progression.calculateShipStats(state), fittedLight = stats.lightSpeed, expectedSpeed = fittedLight ? 900 : Math.max(120, stats.maxSpeed * .7);
        return Math.max(45, Math.ceil(((route / expectedSpeed) + interactions * 8) * 1.3 / 5) * 5);
    }
    function applyTimedModifier(state, origin, contract, rand) {
        if (state.contracts.completed < 5 || contract.risk < 3 || rand() >= .3 || contract.bossType) return contract;
        const duration = timedDuration(state, origin, contract);
        contract.timer = { duration, remaining: duration, started: false, missed: false, hard: rand() < .2 };
        return contract;
    }
    function generateChoice(state, station, index, rand, template) {
        const choices = choiceStations(state, station, rand); if (choices.length < 2) return null;
        const fields = accessibleLandmarks(state, item => item.type !== 'station'), field = fields[Math.floor(rand() * fields.length)] || station, target = fieldPoint(field, rand, 460);
        const id = `choice:${template}:${station.id}:${state.contracts.completed}:${state.contracts.boardRevision}:${index}`;
        const definitions = {
            lost_cargo_choice: ['Lost Cargo Arbitration', 'Recover disputed cargo, then choose which faction receives it.', 'pickup', 'Lost Cargo'],
            black_box_choice: ['Black Box Claim', 'Recover a flight recorder and choose which faction receives its testimony.', 'salvage', 'Flight Recorder'],
            pilot_asylum_choice: ['Pilot Asylum', 'Recover a stranded pilot and choose the faction that grants asylum.', 'rescue', 'Stranded Pilot'],
            survey_rights_choice: ['Survey Rights', 'Scan an unregistered signal and choose which faction receives the chart.', 'scan', 'Unregistered Survey'],
            prototype_custody_choice: ['Prototype Custody', 'Recover an abandoned prototype and choose its new custodian.', 'pickup', 'Prototype Crate']
        };
        const [name, description, event, contactName] = definitions[template], contactType = event === 'scan' ? 'survey' : event === 'rescue' ? 'rescue' : event === 'salvage' ? 'salvage' : 'pickup';
        const base = CONTRACT_TYPES.find(item => item.id === (event === 'scan' ? 'survey' : event === 'rescue' ? 'rescue' : 'salvage'));
        const contract = { id, type: 'choice', template, name, description, issuer: station.faction, origin: station.id, destination: null, target, reward: rewardFor(state, station, choices[0], base, 1.65), xp: 210, risk: template === 'prototype_custody_choice' ? 4 : 3, progress: 0, required: 2, status: 'offered', createdAt: state.playTime, stageMode: 'sequential', missionPayload: { kind: template, quantity: 1 }, stages: [] };
        contract.stages = [makeStage(id, 0, { type: contactType, event, name: contactName, instruction: `Reach the marked ${contactName.toLowerCase()} and press F to establish recovery.`, destination: field.id, target }), makeStage(id, 1, { type: 'choice', event: 'dock', name: 'Choose Recipient', instruction: 'Dock at either available faction station. The chosen faction receives the standing gain.', destination: null, target: point(choices[0]), choices: choices.map(stop => ({ destination: stop.id, faction: stop.faction, name: stop.name, target: point(stop) })) })];
        return syncContract(contract);
    }
    function generateAdvanced(state, station, index, rand, template) {
        const id = `advanced:${template}:${station.id}:${state.contracts.completed}:${state.contracts.boardRevision}:${index}`;
        const stations = uniqueStations(state, station, 3, rand), fields = accessibleLandmarks(state, item => item.type !== 'station');
        const field = fields[Math.floor(rand() * fields.length)] || station, destination = stations[0] || station;
        const base = CONTRACT_TYPES.find(item => item.id === (template === 'deep_survey' ? 'survey' : template === 'lost_ship_escort' ? 'escort' : 'haul'));
        const contract = { id, type: 'advanced', template, name: '', description: '', issuer: station.faction, origin: station.id, destination: destination.id, target: point(destination), reward: rewardFor(state, station, destination, base, 1.55), xp: 150 + Math.round(rand() * 80), risk: Math.max(2, base.risk + 1), progress: 0, required: 1, status: 'offered', createdAt: state.playTime, stageMode: 'sequential', missionPayload: null, stages: [] };
        if (template === 'multi_haul') {
            const stops = stations.slice(0, rand() > .55 ? 3 : 2); contract.name = 'Frontier Circuit'; contract.description = `Deliver sealed manifests to ${stops.length} stations in any order.`; contract.stageMode = 'parallel'; contract.missionPayload = { kind: 'sealed-manifests', quantity: stops.length };
            contract.stages = stops.map((stop, i) => makeStage(id, i, { status: 'active', type: 'haul', event: 'dock', name: `Delivery ${i + 1}`, instruction: `Dock at ${stop.name}.`, destination: stop.id, target: point(stop) }));
        } else if (template === 'deep_survey') {
            contract.name = 'Deep Survey Chain'; contract.description = 'Calibrate a sequence of remote survey checkpoints.';
            const firstRegion = REGIONS.find(region => region.id === field.region) || accessibleRegions(state)[0], sectors = surveyChainRegions(state, firstRegion, rand, 3);
            contract.stages = sectors.map((region, i) => makeStage(id, i, { type: 'survey', event: 'scan', name: `Survey Checkpoint ${i + 1}`, instruction: `Scan checkpoint ${i + 1} of 3 in ${region.name}.`, destination: null, region: region.id, sector: region.grid, target: pointInRegion(region, rand) }));
        } else if (template === 'lost_ship_escort') {
            const fieldRegion = REGIONS.find(region => region.id === field.region), nearby = stations.filter(stop => !fieldRegion || sectorDistance(REGIONS.find(region => region.id === stop.region), fieldRegion) <= 2), safeDestination = nearby[0] || destination;
            const exact = Object.assign(fieldPoint(field, rand, 520), { region: field.region, sector: fieldRegion?.grid || null }), area = fieldPoint(exact, rand, 330); contract.name = 'Lost Flight'; contract.description = 'Locate a missing ship, establish contact, then escort it to safety.'; contract.destination = safeDestination.id;
            contract.stages = [makeStage(id, 0, { type: 'search', event: 'search', name: 'Locate Lost Ship', instruction: CONTACT_TYPES.search.instruction, destination: field.id, target: area, search: { center: area, radius: 1800, exact, revealed: false } }), makeStage(id, 1, { type: 'escort', event: 'escort', name: 'Escort Lost Ship', instruction: 'Protect the recovered ship en route to safety.', destination: safeDestination.id, target: exact, escort: escortState(exact, safeDestination) })];
        } else if (template === 'area_search') {
            const exact = fieldPoint(field, rand, 500), area = fieldPoint(exact, rand, 360); contract.name = 'Blind Search'; contract.description = 'Sweep a broad sensor area and recover the unidentified contact.';
            contract.stages = [makeStage(id, 0, { type: 'search', event: 'search', name: 'Search Area', instruction: CONTACT_TYPES.search.instruction, destination: field.id, target: area, search: { center: area, radius: 1800, exact, revealed: false } })];
        } else {
            const cargo = fieldPoint(field, rand, 420), delivery = rand() < .35 ? station : destination; contract.name = 'Recovery Run'; contract.description = `Recover lost cargo and deliver it to ${delivery.name}.`; contract.missionPayload = { kind: 'recovered-cargo', quantity: 1 };
            contract.stages = [makeStage(id, 0, { type: 'pickup', event: 'pickup', name: 'Recover Lost Cargo', instruction: CONTACT_TYPES.pickup.instruction, destination: field.id, target: cargo }), makeStage(id, 1, { type: 'haul', event: 'dock', name: 'Deliver Recovered Cargo', instruction: `Dock at ${delivery.name}.`, destination: delivery.id, target: point(delivery) })];
        }
        return syncContract(contract);
    }
    function generate(state, station, index) {
        const revision = Math.max(0, Math.round(Number(state.contracts.boardRevision) || 0));
        const rand = seeded((state.worldSeed ^ station.x ^ station.y ^ state.contracts.completed * 97 ^ revision * 193 ^ index * 131) >>> 0);
        const remoteness = REGIONS.find(region => region.id === station.region)?.remoteness || 0;
        let contract;
        if (index === 0 && state.pilot.level >= 6 && state.stats.kills >= 20) contract = generateBoss(state, station, rand);
        else if (state.contracts.completed >= 5 && rand() < .24) contract = generateChoice(state, station, index, rand, CHOICE_TEMPLATES[Math.floor(rand() * CHOICE_TEMPLATES.length)]);
        if (!contract && state.contracts.completed >= 3 && rand() < Math.min(.7, .42 + remoteness * .08)) contract = generateAdvanced(state, station, index, rand, ADVANCED_TEMPLATES[Math.floor(rand() * ADVANCED_TEMPLATES.length)]);
        if (!contract) {
            const types = eligibleTypes(state, station.faction), profile = FACTION_TYPE_WEIGHTS[station.faction] || {}, weighted = types.flatMap(type => Array.from({ length: Math.max(1, Math.round((1 + type.risk * remoteness * .35) * (profile[type.id] || 1))) }, () => type));
            contract = generateStandard(state, station, index, rand, weighted[Math.floor(rand() * weighted.length)]);
        }
        return applyTimedModifier(state, station, contract, rand);
    }
    function generateBoss(state, station, rand) {
        const capitalReady = state.pilot.level >= 10 && Object.keys(state.progression?.bossesDefeated || {}).some(id => !ns.Data.BOSSES[id]?.capital);
        const bossType = capitalReady ? (station.faction === 'concord' ? 'eclipse_cruiser' : station.faction === 'corsairs' ? 'solar_bastion' : 'foundry_ark') : station.faction === 'concord' ? 'void_reaver' : station.faction === 'corsairs' ? 'aegis_frigate' : 'marauder_carrier';
        const boss = ns.Data.BOSSES[bossType], fields = accessibleLandmarks(state, item => item.type !== 'station'), field = fields[Math.floor(rand() * fields.length)] || LANDMARKS.find(item => item.type !== 'station');
        const target = fieldPoint(field, rand, 520), id = `boss:${bossType}:${station.id}:${state.contracts.completed}:${state.contracts.boardRevision}`;
        const contract = { id, type: station.faction === 'independents' ? 'bounty' : 'assault', name: `Priority Target: ${boss.name}`, description: `Break the ${boss.name} operating near ${field.name}.`, issuer: station.faction, origin: station.id, destination: field.id, target, reward: boss.capital ? { aetherium: 1500, sunshards: 30, helionite: 85 } : { aetherium: 900, sunshards: 18, helionite: 55 }, xp: boss.capital ? 520 : 340, risk: boss.capital ? 6 : 5, progress: 0, required: 1, status: 'offered', createdAt: state.playTime, stageMode: 'sequential', bossType, enemyFaction: boss.faction, encounterId: id };
        contract.stages = [makeStage(id, 0, { type: contract.type, event: 'kill', name: boss.name, instruction: `Destroy the ${boss.name}. Deployed escorts are secondary targets.`, destination: field.id, target, required: 1, bossType })];
        contract.briefing = ns.Expansion.briefing(contract, station); return syncContract(contract);
    }
    function boardSize(state, station, revision) {
        const rand = seeded((state.worldSeed ^ station.x ^ station.y ^ revision * 811) >>> 0), min = station.major ? 5 : 3, spread = 4;
        const status = ns.Expansion.patrolStatus(state, station.faction), trust = status === 'FRIENDLY' ? 1 : (state.reputations[station.faction] || 0) < 0 ? -2 : 0;
        return Math.max(1, min + Math.floor(rand() * spread) + trust);
    }
    function refreshBoard(state, station) {
        if ((state.progression?.tutorialStep || 0) < 2) { state.contracts.board = [tutorialContract(state, station)]; return state.contracts.board; }
        state.contracts.boardRevision = Math.max(0, Math.round(Number(state.contracts.boardRevision) || 0)) + 1;
        state.contracts.board = Array.from({ length: boardSize(state, station, state.contracts.boardRevision) }, (_, i) => { const contract = generate(state, station, i); contract.briefing = contract.briefing || ns.Expansion.briefing(contract, station); if (ns.Expansion.patrolStatus(state, station.faction) === 'FRIENDLY' && i === 0) { Object.keys(contract.reward).forEach(key => { contract.reward[key] = Math.round(contract.reward[key] * 1.1); }); contract.priority = true; } return contract; }); return state.contracts.board;
    }
    function refreshRemaining(state, now) { return Math.max(0, BOARD_COOLDOWN_MS - ((Number(now) || Date.now()) - (Number(state.contracts.lastManualRefreshAt) || 0))); }
    function manualRefresh(state, station, now) {
        const time = Number(now) || Date.now(), tutorial = (state.progression?.tutorialStep || 0) < 2, remaining = refreshRemaining(state, time);
        if (tutorial || remaining > 0) return { ok: false, tutorial, remaining, board: state.contracts.board };
        state.contracts.lastManualRefreshAt = time; return { ok: true, tutorial: false, remaining: BOARD_COOLDOWN_MS, board: refreshBoard(state, station) };
    }
    function dockingAccess(state, contract) {
        const denied = [], incomplete = ensureStages(contract).filter(stage => stage.status !== 'complete');
        incomplete.forEach(stage => {
            if (stage.choices?.length) {
                const available = stage.choices.filter(choice => !dockingDenied(state, choice.faction));
                if (!available.length) denied.push(...stage.choices.map(choice => choice.destination));
            } else if (stage.event === 'dock' && stage.destination) {
                const station = stationById(stage.destination); if (station && dockingDenied(state, station)) denied.push(stage.destination);
            }
        });
        return { ok: denied.length === 0, denied };
    }
    function accept(state, id) { if (state.contracts.active) return false; const offer = state.contracts.board.find(c => c.id === id); if (!offer || offer.status !== 'offered' || !dockingAccess(state, offer).ok) return false; const contract = clone(offer); contract.status = 'active'; syncContract(contract); state.contracts.active = contract; return true; }
    function destinationName(contract, stage) { const current = stage || activeStages(contract)[0], choiceNames = current?.choices?.map(choice => choice.name || stationById(choice.destination)?.name).filter(Boolean), stageLandmark = LANDMARKS.find(item => item.id === current?.destination), region = REGIONS.find(item => item.id === current?.region), contractLandmark = LANDMARKS.find(item => item.id === contract?.destination); return choiceNames?.length ? choiceNames.join(' OR ') : stageLandmark?.name || region?.name || contractLandmark?.name || current?.name || 'Unknown Contact'; }
    function objectiveInstructionLegacy(contract) {
        if (CONTACT_TYPES[contract.type]) return CONTACT_TYPES[contract.type].instruction;
        if (['haul', 'smuggle'].includes(contract.type)) return `Dock at ${LANDMARKS.find(item => item.id === contract.destination)?.name || 'the marked station'} to complete delivery.`;
        if (['bounty', 'assault'].includes(contract.type)) return 'Reach the marked combat zone and eliminate the assigned hostiles.';
        if (contract.type === 'escort') return contract.escort?.phase === 'traveling' ? 'Stay within 760 KM and protect the convoy until it reaches the destination.' : 'Reach the marked rendezvous to begin the convoy escort.';
        return contract.description;
    }
    function objectiveInstruction(contract) { const stages = activeStages(contract); return stages.map(stage => stage.instruction || objectiveInstructionLegacy(Object.assign({}, contract, stage))).join(' // '); }
    function targetsFor(contract, state) {
        return activeStages(contract).flatMap(stage => stage.choices?.length ? stage.choices.map((choice, index) => ({ id: `${stage.id}:choice:${index}`, x: choice.target.x, y: choice.target.y, label: choice.name || stationById(choice.destination)?.name || stage.name, denied: state ? dockingDenied(state, choice.faction) : false, choice, stage })) : stage.target ? [{ id: stage.id, x: stage.target.x, y: stage.target.y, label: stage.name || destinationName(contract, stage), stage }] : []);
    }
    function contactsFor(contract) {
        return activeStages(contract).map(stage => {
            const meta = CONTACT_TYPES[stage.type]; if (!meta || !stage.target || (stage.search && !stage.search.revealed)) return null;
            return { id: `contract-contact:${stage.id}`, kind: meta.kind, event: stage.event || meta.event, name: stage.name || meta.name, x: stage.target.x, y: stage.target.y, radius: 24, contractId: contract.id, stageId: stage.id };
        }).filter(Boolean);
    }
    function contactFor(contract) { return contactsFor(contract)[0] || null; }
    function revealSearches(state, position) {
        const contract = state.contracts.active; if (!contract) return [];
        return activeStages(contract).filter(stage => {
            const savant = ns.Progression.traitEffects(state).fieldSavant ? 1.5 : 1;
            if (!stage.search || stage.search.revealed || distance(position, stage.search.center) > stage.search.radius * savant) return false;
            stage.search.entered = true; return distance(position, stage.search.exact) <= 240 * savant;
        }).map(stage => { stage.search.revealed = true; stage.target = point(stage.search.exact); syncContract(contract); return stage; });
    }
    function recordProgress(state, event, amount, position) {
        const contract = state.contracts.active; if (!contract) return false; let changed = false;
        activeStages(contract).slice().forEach(stage => {
            if (stage.event !== event) return;
            if (stage.bossType && position?.bossType !== stage.bossType) return;
            if (event === 'dock' && stage.choices?.length) {
                const choice = stage.choices.find(item => item.destination === position?.id); if (!choice || dockingDenied(state, choice.faction)) return;
                stage.selectedChoice = clone(choice); contract.reputationRecipient = choice.faction; contract.destination = choice.destination; stage.destination = choice.destination; stage.target = point(choice.target);
            } else if (event === 'dock' && stage.destination && position?.id !== stage.destination) return;
            if (event === 'dock' && !stage.destination && (!position || distance(position, stage.target) > EVENT_RANGES.dock)) return;
            if (event !== 'dock' && (!position || distance(position, stage.target) > (EVENT_RANGES[event] || 220))) return;
            stage.progress = clamp(stage.progress + (amount || 1), 0, stage.required); changed = true; if (stage.progress >= stage.required) completeStage(contract, stage);
        });
        if (changed) syncContract(contract); return isComplete(contract);
    }
    function startTimer(state) { const timer = state.contracts.active?.timer; if (!timer || timer.started) return false; timer.started = true; return true; }
    function updateTimer(state, dt) { const timer = state.contracts.active?.timer; if (!timer?.started || timer.missed || timer.remaining <= 0) return false; timer.remaining = Math.max(0, timer.remaining - Math.max(0, dt)); if (timer.remaining > 0) return false; timer.missed = true; return true; }
    function dockingWarning(state) { const contract = state.contracts.active; if (!contract) return null; const access = dockingAccess(state, contract); return access.ok ? null : { denied: access.denied, message: 'DESTINATION DOCKING DENIED // RESTORE STANDING OR USE AN AVAILABLE FACTION' }; }
    function penalizeFailure(state, contract) { if (contract.issuer in state.reputations) state.reputations[contract.issuer] = clamp(state.reputations[contract.issuer] - 1, -100, 100); }
    function abandon(state) { const c = state.contracts.active; if (!c) return null; c.status = 'failed'; penalizeFailure(state, c); state.contracts.active = null; return c; }
    function fail(state, reason) { const c = state.contracts.active; if (!c) return null; c.status = 'failed'; c.failureReason = reason || 'failed'; penalizeFailure(state, c); state.contracts.active = null; state.contracts.board = state.contracts.board.filter(offer => offer.id !== c.id); return c; }
    function startEscort(state) {
        const c = state.contracts.active, stage = activeStages(c).find(item => item.escort), escort = stage?.escort || c?.escort;
        if (!escort || escort.phase !== 'rendezvous') return null;
        escort.phase = 'traveling'; escort.grace = ESCORT_CONFIG.graceSeconds; escort.ambushes = 0;
        escort.convoy = { id: `convoy:${stage?.id || c.id}`, x: escort.start.x, y: escort.start.y, vx: 0, vy: 0, angle: Math.atan2(escort.end.y - escort.start.y, escort.end.x - escort.start.x), radius: 18, hull: ESCORT_CONFIG.hull, maxHull: ESCORT_CONFIG.hull, faction: c.issuer };
        stage.target = point(escort.convoy); syncContract(c); return escort.convoy;
    }
    function complete(state) {
        const c = state.contracts.active; if (!c) return null; const stages = ensureStages(c);
        if (!isComplete(c) && stages.length === 1 && c.progress >= c.required) completeStage(c, stages[0]);
        if (!isComplete(c)) return null;
        const effects = ns.Progression.traitEffects(state), factionCombat = ['assault', 'bounty'].includes(c.type) && c.issuer !== 'independents', marque = effects.letterOfMarque && factionCombat ? 1.2 : 1, recipient = c.reputationRecipient || c.issuer;
        const onTime = c.timer?.started && !c.timer.missed && c.timer.remaining > 0, currencyScale = c.timer?.hard && c.timer.missed ? 0 : onTime ? 1.35 : 1;
        const paidReward = Object.fromEntries(Object.entries(c.reward).map(([key, value]) => [key, Math.round(value * marque * currencyScale)]));
        ns.Wallet.credit(state, paidReward, state.dockedAt ? 'banked' : 'unbanked'); const repBase = c.timer?.hard && c.timer.missed ? 2 : 4, repEffect = repBase * (1 + (effects.reputation || 0)) * marque;
        state.reputations[recipient] = clamp((state.reputations[recipient] || 0) + repEffect, -100, 100);
        if (c.type === 'assault' && c.enemyFaction) state.reputations[c.enemyFaction] = clamp((state.reputations[c.enemyFaction] || 0) - 5 * marque, -100, 100); ns.State.addExperience(state, c.xp);
        const deadline = c.timer ? onTime ? ' Deadline bonus secured.' : c.timer.hard ? ' Hard deadline missed; currency payment forfeited.' : ' Deadline bonus expired; base payment retained.' : '';
        const consequence = c.bossType ? 'Threat boards will treat this kill as proof of capital-grade capability.' : c.reputationRecipient ? `${ns.Data.FACTIONS[recipient]?.short || 'GUILD'} custody claim recorded on the public ledger.` : c.timer ? (onTime ? 'Dispatch logs mark the run as clean and ahead of pressure.' : 'Dispatch logs keep the completion but flag the timing clause.') : ['haul', 'smuggle'].includes(c.type) ? 'Dock crews fold the cargo record into local supply gossip.' : ['bounty', 'assault'].includes(c.type) ? 'Patrol channels repeat the kill signature for the next watch.' : 'Frontier channels archive the result for future board weighting.';
        c.debrief = { outcome: c.bossType ? `${ns.Data.BOSSES[c.bossType].name} confirmed destroyed.${deadline}` : `${c.name} completed to specification.${deadline}`, response: `${ns.Data.FACTIONS[recipient]?.short || 'GUILD'} control acknowledges the result.`, consequence, standing: Math.round(repEffect), payment: paidReward, deadline: c.timer ? { onTime, hard: c.timer.hard, missed: c.timer.missed } : null };
        state.progression.pendingDebrief = c.id;
        if (c.bossType) {
            state.progression.bossesDefeated = state.progression.bossesDefeated || {};
            state.progression.bossesDefeated[c.bossType] = (state.progression.bossesDefeated[c.bossType] || 0) + 1;
        }
        if (effects.quartermaster && ['haul', 'escort', 'advanced', 'choice'].includes(c.type)) state.progression.serviceDiscount = { stationId: c.destination, value: .2, uses: 1 };
        if (!c.tutorialStep) { state.stats.contracts++; state.contracts.completed++; ns.Objectives?.record(state, 'contracts', 1); if ((ns.Objectives?.LOCAL_FACTIONS[state.galaxyId] || []).includes(c.issuer)) ns.Objectives.record(state, 'localContracts', 1); }
        if (c.tutorialStep) { state.progression.tutorialStep = Math.max(state.progression.tutorialStep, c.tutorialStep); if (c.tutorialStep === 1) { if (!state.ship.ownedModules.includes('afterburner')) state.ship.ownedModules.push('afterburner'); state.ship.slots.abilityShift = 'afterburner'; } else { if (!state.ship.ownedModules.includes('shield_scout')) state.ship.ownedModules.push('shield_scout'); state.ship.slots.defense = 'shield_scout'; state.ship.shield = ns.Progression.calculateShipStats(state).shield; } }
        const issuerContracts = state.contracts.history.filter(item => !item.tutorialStep && item.issuer === c.issuer && item.status === 'complete').length + 1;
        if (!c.tutorialStep && ns.Data.QUESTS[c.issuer] && issuerContracts % 2 === 0 && state.quests[c.issuer] < ns.Data.QUESTS[c.issuer].length - 1) state.quests[c.issuer]++;
        c.status = 'complete'; state.contracts.history.unshift(c); state.contracts.history = state.contracts.history.slice(0, 20); state.contracts.active = null; state.contracts.board = []; ns.Progression.updateAchievements(state); return c;
    }
    function joinFaction(state, factionId) { const faction = FACTIONS[factionId]; if (!faction?.joinable || !ns.Galaxies.factionAvailable(state, factionId) || state.reputations[factionId] < 15) return false; const old = state.pilot.allegiance; if (old && old !== factionId) state.reputations[old] = clamp(state.reputations[old] - 35, -100, 100); state.pilot.allegiance = factionId; state.reputations[factionId] = Math.max(20, state.reputations[factionId]); (faction.hostileTo || []).forEach(opponent => { state.reputations[opponent] = Math.min(-20, state.reputations[opponent] || 0); }); return true; }
    function leaveFaction(state) { if (!state.pilot.allegiance) return false; state.reputations[state.pilot.allegiance] = clamp(state.reputations[state.pilot.allegiance] - 25, -100, 100); state.pilot.allegiance = null; return true; }
    ns.Contracts = { BOARD_COOLDOWN_MS, ESCORT_CONFIG, ADVANCED_TEMPLATES, CHOICE_TEMPLATES, generate, generateBoss, generateAdvanced, generateChoice, refreshBoard, refreshRemaining, manualRefresh, dockingAccess, dockingWarning, accept, ensureStages, activeStages, syncContract, isComplete, recordProgress, startTimer, updateTimer, complete, abandon, fail, startEscort, contactFor, contactsFor, targetsFor, revealSearches, destinationName, objectiveInstruction, joinFaction, leaveFaction };
})(window.MiniInvadersV2);
