class AbilitySystem {
    consumePlayerTrinketAbilities(engine) {
        if (!engine.player || !engine.player.pendingTrinketAbilities || engine.player.pendingTrinketAbilities.length === 0) return;
        const abilities = engine.player.pendingTrinketAbilities.splice(0);
        for (const request of abilities) {
            this.resolveTrinketAbility(engine, request);
        }
    }

    resolveTrinketAbility(engine, request) {
        if (!request || !request.ability || !engine.player) return false;
        const ability = request.ability;
        const handlers = {
            scout: () => engine.revealMinimapArea(ability),
            phase_tether: () => engine.phaseTether(ability, request.angle),
            element_bomb: () => engine.throwElementBomb(ability, request.angle),
            lightning_strike: () => engine.castLightningStrike(ability),
            target_dummy: () => engine.spawnTargetDummy(ability, request.angle),
            soul_siphon: () => engine.applySoulSiphon(ability)
        };
        return handlers[ability.type] ? handlers[ability.type]() : false;
    }

    updateRuntimeEffects(engine, dt) {
        if (engine._legacyUpdateTrinketRuntimeEffects) {
            return engine._legacyUpdateTrinketRuntimeEffects(dt);
        }
        return false;
    }

    getEnemyTargetForEnemy(engine, enemy) {
        if (!enemy || !engine.decoys || engine.decoys.length === 0) return engine.player;
        let bestDecoy = null;
        let bestDistance = Infinity;
        for (const decoy of engine.decoys) {
            const dist = Math.hypot(enemy.x - decoy.x, enemy.y - decoy.y);
            if (dist <= decoy.radius && dist < bestDistance) {
                bestDecoy = decoy;
                bestDistance = dist;
            }
        }
        return bestDecoy || engine.player;
    }
}

if (typeof window !== 'undefined') {
    window.AbilitySystem = AbilitySystem;
}
