(function (ns) {
    class SimulationRandom {
        constructor(seed) { this.state = (Number(seed) || 1) >>> 0; }
        next() { this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0; return this.state / 0x100000000; }
        range(min, max) { return min + this.next() * (max - min); }
        chance(probability) { return this.next() < probability; }
    }

    class RuntimePipeline {
        constructor(systems) { this.systems = (systems || []).slice(); }
        add(system) { if (!system || typeof system.update !== 'function') throw new Error('Runtime systems must implement update(game, dt)'); this.systems.push(system); return system; }
        init(game) { this.systems.forEach(system => system.init?.(game)); }
        update(game, dt) { this.systems.forEach(system => system.update(game, dt)); }
        destroy(game) { this.systems.slice().reverse().forEach(system => system.destroy?.(game)); }
    }

    const waypointSystem = {
        id: 'waypoints',
        update(game) { game.updateCustomWaypoint(); }
    };
    const autosaveSystem = {
        id: 'autosave',
        update(game) {
            if (game.autosaveTimer < 120 || game.enemies.length) return;
            game.save('AUTOSAVE COMPLETE'); game.autosaveTimer = 0;
        }
    };
    const ambientEncounterSystem = {
        id: 'ambientEncounters',
        update(game, dt) {
            game.encounterTimer -= dt;
            const travel = ns.LightSpeed.ensure(game);
            if (travel.phase === 'idle' && game.encounterTimer <= 0 && game.enemies.length === 0 && !game.state.dockedAt && game.random.chance(.18 + game.region.danger * .09)) {
                const angle = game.random.range(0, Math.PI * 2), center = { x: game.state.ship.x + Math.cos(angle) * 900, y: game.state.ship.y + Math.sin(angle) * 900 };
                const localFactions = [game.region.faction, ...game.world.config.landmarks.filter(item => item.type === 'station' && item.region === game.region.id).map(item => item.faction)].filter((id, index, all) => id !== 'independents' && ns.Galaxies.factionAvailable(game.state, id) && all.indexOf(id) === index);
                const owner = localFactions.length && game.random.chance(.45) ? localFactions[Math.floor(game.random.next() * localFactions.length)] : 'bandits';
                game.spawnEnemies(Math.min(4, 1 + Math.ceil(game.region.danger / 2)), center, owner === 'bandits' ? null : owner);
                if (owner !== 'bandits' && ns.Expansion.patrolStatus(game.state, owner) === 'FRIENDLY') game.spawnEnemies(2, { x: center.x + 180, y: center.y + 100 });
                game.notify(owner === 'bandits' || ns.Expansion.patrolStatus(game.state, owner) === 'HOSTILE' ? 'UNSCHEDULED CONTACTS // WEAPONS HOT' : `${owner.toUpperCase()} PATROL // TRANSPONDER ACKNOWLEDGED`);
            }
            if (game.encounterTimer <= 0) game.encounterTimer = game.random.range(24, 42);
        }
    };

    ns.Runtime = { SimulationRandom, RuntimePipeline, defaultSystems: () => [waypointSystem, autosaveSystem, ambientEncounterSystem] };
})(window.MiniInvadersV2);
