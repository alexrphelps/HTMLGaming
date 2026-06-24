(function (ns) {
    const CONTROL_SCHEMA = 1;
    const INVASION_RADIUS = 1200;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const hostile = (a, b) => Boolean(a && b && a !== b && ((ns.Data.FACTIONS[a]?.hostileTo || []).includes(b) || (ns.Data.FACTIONS[b]?.hostileTo || []).includes(a)));
    const shortName = id => ns.Data.FACTIONS[id]?.short || String(id || 'UNKNOWN').toUpperCase();

    function ensure(state) {
        state.stationControl = state.stationControl && typeof state.stationControl === 'object' ? state.stationControl : {};
        state.stationControl.schema = CONTROL_SCHEMA;
        state.stationControl.galaxies = state.stationControl.galaxies && typeof state.stationControl.galaxies === 'object' ? state.stationControl.galaxies : {};
        state.stationControl.travelTicks = Math.max(0, Number(state.stationControl.travelTicks) || 0);
        state.stationControl.activeBattle = state.stationControl.activeBattle || null;
        return state.stationControl;
    }
    function galaxyBucket(state, galaxyId) {
        const control = ensure(state), id = galaxyId || state.galaxyId || 'galaxy_a';
        control.galaxies[id] = control.galaxies[id] && typeof control.galaxies[id] === 'object' ? control.galaxies[id] : {};
        return control.galaxies[id];
    }
    function recordFor(state, stationId, galaxyId) {
        if (!stationId) return null;
        return galaxyBucket(state, galaxyId)[stationId] || null;
    }
    function effectiveFaction(state, station, galaxyId) {
        return recordFor(state, station?.id, galaxyId)?.ownerFaction || station?.faction || 'independents';
    }
    function effectiveStation(state, station, galaxyId) {
        if (!station || station.type !== 'station') return station;
        const record = recordFor(state, station.id, galaxyId), owner = record?.ownerFaction || station.faction;
        if (!record || owner === station.faction) return station;
        return Object.assign({}, station, { faction: owner, originalFaction: station.faction, control: Object.assign({}, record) });
    }
    function applyToLandmarks(state, landmarks, galaxyId) {
        ensure(state);
        return (landmarks || []).map(item => item.type === 'station' ? effectiveStation(state, item, galaxyId) : item);
    }
    function availableInvaders(state, station) {
        const owner = effectiveFaction(state, station);
        return ns.Galaxies.availableFactions(state)
            .filter(faction => faction.id !== 'independents' && faction.id !== owner && (hostile(faction.id, owner) || owner === 'independents'))
            .map(faction => faction.id);
    }
    function takeoverChance(region, station) {
        const base = station.faction === 'independents' ? .05 : .07;
        return clamp(base + (region?.danger || 1) * .018 + (region?.remoteness || 0) * .01 + (station.major ? -.018 : .012), .035, .19);
    }
    function chooseCandidate(state, roll) {
        const stations = ns.Galaxies.availableLandmarks(state)
            .filter(item => item.type === 'station' && state.discoveries.includes(item.id))
            .map(station => ({ station, region: ns.Data.REGIONS.find(region => region.id === station.region), invaders: availableInvaders(state, station) }))
            .filter(entry => entry.invaders.length);
        if (!stations.length) return null;
        return stations[Math.floor(roll * stations.length) % stations.length];
    }
    function setOwner(state, stationId, ownerFaction, options) {
        const station = ns.Galaxies.landmarkById(state, stationId) || ns.Data.LANDMARKS.find(item => item.id === stationId);
        if (!station || station.type !== 'station' || !ns.Data.FACTIONS[ownerFaction]) return null;
        const bucket = galaxyBucket(state, options?.galaxyId || state.galaxyId), previous = bucket[stationId]?.ownerFaction || station.faction;
        bucket[stationId] = {
            ownerFaction,
            previousFaction: previous,
            status: options?.status || 'controlled',
            contestedUntil: Math.max(0, Number(options?.contestedUntil) || 0),
            lastChangedAt: Math.max(0, Number(options?.time) || Math.round(state.playTime || 0)),
            source: options?.source || 'war'
        };
        return bucket[stationId];
    }
    function runTravelTick(state, destinationId, rollFn) {
        ensure(state);
        const rolls = typeof rollFn === 'function' ? rollFn : () => Math.random();
        state.stationControl.travelTicks++;
        const candidate = chooseCandidate(state, rolls());
        if (!candidate) return null;
        const chance = takeoverChance(candidate.region, candidate.station);
        if (rolls() > chance) return null;
        const invader = candidate.invaders[Math.floor(rolls() * candidate.invaders.length) % candidate.invaders.length];
        const record = setOwner(state, candidate.station.id, invader, { galaxyId: destinationId || state.galaxyId, source: 'stargate', time: state.playTime });
        return { station: effectiveStation(state, candidate.station, destinationId || state.galaxyId), record, invader, previous: record.previousFaction };
    }
    function invasionTarget(game, entity) {
        const station = (game.world?.config?.landmarks || ns.Galaxies.availableLandmarks(game.state))
            .filter(item => item.type === 'station')
            .sort((a, b) => ns.MathUtil.distance(entity, a) - ns.MathUtil.distance(entity, b))[0];
        if (!station) return null;
        const invaders = availableInvaders(game.state, station);
        if (!invaders.length) return null;
        const roll = ns.MathUtil.hash(game.state.worldSeed, Math.round(entity.x), Math.round(entity.y), String(station.id).length);
        return { station, defender: effectiveFaction(game.state, station), invader: invaders[Math.floor(roll * invaders.length) % invaders.length] };
    }
    function beginInvasion(game, entity) {
        const target = invasionTarget(game, entity);
        if (!target || game.state.stationControl?.activeBattle) return false;
        const angle = Math.atan2(entity.y - target.station.y, entity.x - target.station.x);
        const defenderPoint = { x: target.station.x + Math.cos(angle + Math.PI * .7) * 520, y: target.station.y + Math.sin(angle + Math.PI * .7) * 520 };
        const invaderPoint = { x: target.station.x + Math.cos(angle - Math.PI * .7) * 560, y: target.station.y + Math.sin(angle - Math.PI * .7) * 560 };
        const battle = {
            id: `station-invasion:${game.state.galaxyId}:${target.station.id}:${Math.round(game.state.playTime || 0)}`,
            stationId: target.station.id,
            stationName: target.station.name,
            defenderFaction: target.defender,
            invaderFaction: target.invader,
            allyFaction: null,
            enemyFaction: null,
            status: 'prompt',
            playerKills: 0,
            rewarded: false
        };
        ensure(game.state).activeBattle = battle;
        game.spawnEnemies(3, defenderPoint, target.defender, 'station-defense');
        game.spawnEnemies(3, invaderPoint, target.invader, 'station-invasion');
        game.paused = true;
        game.ui.openInvasionPrompt(game, battle);
        game.notify(`STATION INVASION // ${target.station.name.toUpperCase()}`);
        return true;
    }
    function chooseSide(game, faction) {
        const battle = ensure(game.state).activeBattle;
        if (!battle || battle.status !== 'prompt') return false;
        battle.allyFaction = faction === battle.invaderFaction || faction === battle.defenderFaction ? faction : null;
        battle.enemyFaction = battle.allyFaction === battle.invaderFaction ? battle.defenderFaction : battle.allyFaction === battle.defenderFaction ? battle.invaderFaction : null;
        battle.status = battle.allyFaction ? 'active' : 'observing';
        game.enemies.forEach(enemy => {
            if (enemy.faction === battle.enemyFaction) enemy.aggroed = true;
            if (enemy.faction === battle.allyFaction) enemy.aggroed = false;
        });
        game.ui.closePanel();
        game.paused = false;
        game.notify(battle.allyFaction ? `CHANNEL LOCKED // SUPPORTING ${shortName(battle.allyFaction)}` : 'INVASION CHANNEL CLOSED // NO SIDE SELECTED');
        return true;
    }
    function isPlayerAlly(state, enemy) {
        const battle = state?.stationControl?.activeBattle;
        return Boolean(battle && battle.allyFaction && enemy?.faction === battle.allyFaction);
    }
    function notePlayerKill(game, enemy) {
        const battle = game.state?.stationControl?.activeBattle;
        if (battle && enemy?.faction === battle.enemyFaction) battle.playerKills = Math.max(0, (battle.playerKills || 0) + 1);
    }
    function resolve(game, winnerFaction) {
        const battle = ensure(game.state).activeBattle;
        if (!battle || battle.rewarded) return false;
        battle.rewarded = true;
        const winner = winnerFaction || battle.invaderFaction;
        if (winner === battle.invaderFaction) setOwner(game.state, battle.stationId, battle.invaderFaction, { status: 'captured', source: 'invasion', time: game.state.playTime });
        else setOwner(game.state, battle.stationId, battle.defenderFaction, { status: 'secured', source: 'invasion', time: game.state.playTime });
        if (battle.allyFaction && battle.playerKills > 0) {
            game.state.reputations[battle.allyFaction] = clamp((game.state.reputations[battle.allyFaction] || 0) + 4, -100, 100);
            if (battle.enemyFaction) game.state.reputations[battle.enemyFaction] = clamp((game.state.reputations[battle.enemyFaction] || 0) - 2, -100, 100);
            ns.Wallet.credit(game.state, { aetherium: 85, helionite: 3 });
        }
        ensure(game.state).activeBattle = null;
        game.save();
        game.notify(`${winner === battle.invaderFaction ? 'STATION CAPTURED' : 'STATION HELD'} // ${battle.stationName.toUpperCase()} // ${shortName(winner)}`);
        game.ui.renderAll(game);
        return true;
    }
    function update(game) {
        const battle = game.state?.stationControl?.activeBattle;
        if (!battle || !['active', 'observing'].includes(battle.status)) return false;
        const defenders = game.enemies.filter(enemy => enemy.hull > 0 && enemy.faction === battle.defenderFaction).length;
        const invaders = game.enemies.filter(enemy => enemy.hull > 0 && enemy.faction === battle.invaderFaction).length;
        if (!defenders && !invaders) return resolve(game, battle.allyFaction || battle.defenderFaction);
        if (!defenders) return resolve(game, battle.invaderFaction);
        if (!invaders) return resolve(game, battle.defenderFaction);
        const station = ns.Galaxies.landmarkById(game.state, battle.stationId);
        if (station && ns.MathUtil.distance(game.state.ship, station) > INVASION_RADIUS + 1500) {
            ensure(game.state).activeBattle = null;
            game.notify('INVASION SIGNAL LOST // CHANNEL CLOSED');
        }
        return false;
    }
    function clearBattle(state) { if (state?.stationControl?.activeBattle) state.stationControl.activeBattle = null; }

    ns.StationWar = { ensure, recordFor, effectiveFaction, effectiveStation, applyToLandmarks, setOwner, runTravelTick, beginInvasion, chooseSide, isPlayerAlly, notePlayerKill, resolve, update, clearBattle };
})(window.FrontierWayfarer);
