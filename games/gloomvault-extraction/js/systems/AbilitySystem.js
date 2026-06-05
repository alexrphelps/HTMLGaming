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
            scout: () => this.revealMinimapArea(engine, ability),
            phase_tether: () => this.phaseTether(engine, ability, request.angle),
            element_bomb: () => this.throwElementBomb(engine, ability, request.angle),
            lightning_strike: () => this.castLightningStrike(engine, ability),
            target_dummy: () => this.spawnTargetDummy(engine, ability, request.angle),
            soul_siphon: () => this.applySoulSiphon(engine, ability)
        };
        return handlers[ability.type] ? handlers[ability.type]() : false;
    }

    revealMinimapArea(engine, ability) {
        if (!engine.player || !engine.mapGen || !engine.mapGen.visitedGrid) return false;
        const radius = Math.max(1, ability.revealRadius || 22);
        const pX = Math.floor(engine.player.x / engine.mapGen.tileSize);
        const pY = Math.floor(engine.player.y / engine.mapGen.tileSize);

        for (let y = pY - radius; y <= pY + radius; y++) {
            for (let x = pX - radius; x <= pX + radius; x++) {
                if (x < 0 || x >= engine.mapGen.cols || y < 0 || y >= engine.mapGen.rows) continue;
                if (Math.hypot(x - pX, y - pY) <= radius) {
                    engine.mapGen.visitedGrid[y * engine.mapGen.cols + x] = true;
                }
            }
        }

        if (engine.combatFeedback) engine.combatFeedback.addText('Scouted', engine.player.x, engine.player.y - 36, '#66d9ff', 16, 1.1);
        if (engine.particleSystem) engine.particleSystem.emitImpact(engine.player.x, engine.player.y, '#66d9ff', 26);
        return true;
    }

    phaseTether(engine, ability, angle) {
        if (!engine.player || !engine.mapGen) return false;
        const tileSize = engine.mapGen.tileSize || engine.tileSize || 64;
        const minTiles = Math.max(1, ability.minTiles || 5);
        const maxTiles = Math.max(minTiles, ability.maxTiles || 10);
        const distance = maxTiles * tileSize;
        const rawX = engine.player.x + Math.cos(angle || engine.player.angle || 0) * distance;
        const rawY = engine.player.y + Math.sin(angle || engine.player.angle || 0) * distance;
        const tileX = Math.max(0, Math.min(engine.mapGen.cols - 1, Math.floor(rawX / tileSize)));
        const tileY = Math.max(0, Math.min(engine.mapGen.rows - 1, Math.floor(rawY / tileSize)));
        const destination = engine.findSafePlayerLanding(tileX, tileY, minTiles * tileSize);

        if (!destination) {
            if (engine.combatFeedback) engine.combatFeedback.addText('No Anchor', engine.player.x, engine.player.y - 28, '#ff5555', 14, 0.9);
            return false;
        }

        const oldX = engine.player.x;
        const oldY = engine.player.y;
        engine.player.x = destination.x;
        engine.player.y = destination.y;
        if (engine.player.checkCollision && engine.player.checkCollision(engine.mapGen)) {
            engine.player.x = oldX;
            engine.player.y = oldY;
            return false;
        }

        if (engine.particleSystem) {
            engine.particleSystem.emitDashTrail(oldX, oldY, '#9b7cff');
            engine.particleSystem.emitImpact(destination.x, destination.y, '#9b7cff', 24);
        }
        if (engine.combatFeedback) engine.combatFeedback.addText('Tethered', destination.x, destination.y - 28, '#9b7cff', 15, 0.9);
        return true;
    }

    throwElementBomb(engine, ability, angle) {
        if (!engine.player || typeof Projectile === 'undefined') return false;
        const element = ability.element || 'fire';
        const config = engine.getElementConfig(element) || {};
        const speed = 360;
        const range = ability.range || 420;
        const projectile = new Projectile(engine.player.x, engine.player.y, angle || engine.player.angle || 0, speed, ability.damage || 18, range / speed, true, 'pistol', {
            element,
            color: config.color || engine.getElementFallbackColor(element),
            attackName: `${element} bomb`
        });
        projectile.width = 18;
        projectile.height = 18;
        projectile.abilityEffect = 'element_bomb';
        projectile.bombRadius = ability.radius || 120;
        projectile.cloudDuration = ability.cloudDuration || 3;
        engine.projectiles.push(projectile);
        return true;
    }

    explodeElementBomb(engine, projectile) {
        if (!projectile || projectile._exploded) return false;
        projectile._exploded = true;
        const radius = projectile.bombRadius || 120;
        const isPlayerOwned = projectile.isPlayerOwned !== false;
        const color = projectile.color || engine.getElementFallbackColor(projectile.element);

        if (isPlayerOwned) {
            for (const enemy of engine.enemies || []) {
                if (!enemy || enemy.hp <= 0) continue;
                if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) > radius + enemy.width / 2) continue;
                const damageInfo = enemy.takeDamage(projectile.damage || 0);
                const actualDamage = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
                if (enemy.handleDamagedByPlayer) enemy.handleDamagedByPlayer(engine, projectile, actualDamage);
                else {
                    enemy.hasTakenPlayerDamage = true;
                    enemy.isAggroed = true;
                }
                engine.applyElementalHit(enemy, projectile);
                if (engine.combatFeedback) engine.combatFeedback.addText(`-${Math.round(projectile.damage || 0)}`, enemy.x, enemy.y, color, 14, 0.8);
            }
        } else if (engine.player && Math.hypot(engine.player.x - projectile.x, engine.player.y - projectile.y) <= radius + engine.player.width / 2) {
            const damageInfo = engine.player.takeDamage(projectile.damage || 0);
            engine.applyElementalHit(engine.player, projectile);
            if (projectile.owner && projectile.owner.handleHitPlayer) projectile.owner.handleHitPlayer(engine, damageInfo, projectile);
            if (engine.combatFeedback) {
                const total = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
                if (total > 0) engine.combatFeedback.addText(`-${Math.round(total)}`, engine.player.x, engine.player.y, color, 14, 0.8);
            }
        }

        engine.trinketEffects.push({
            kind: 'element_cloud',
            x: projectile.x,
            y: projectile.y,
            radius,
            element: projectile.element,
            color,
            duration: projectile.cloudDuration || 3,
            owner: isPlayerOwned ? 'player' : 'enemy',
            timer: 0,
            tickTimer: 0
        });

        if (engine.particleSystem) engine.particleSystem.emitImpact(projectile.x, projectile.y, color, 35);
        if (engine.camera) engine.camera.shake(4, 0.12);
        return true;
    }

    castLightningStrike(engine, ability) {
        const firstTarget = engine.findNearestEnemy(engine.player.x, engine.player.y, Infinity, new Set());
        if (!firstTarget) {
            if (engine.combatFeedback) engine.combatFeedback.addText('No Target', engine.player.x, engine.player.y - 28, '#bbbbbb', 14, 0.8);
            return false;
        }

        const hitTargets = new Set();
        let origin = { x: engine.player.x, y: engine.player.y };
        let target = firstTarget;
        let damage = ability.damage || 48;
        const chains = Math.max(0, ability.chains || 3);
        const falloff = ability.falloff || 0.65;
        const range = ability.chainRange || 280;

        for (let jump = 0; target && jump <= chains; jump++) {
            hitTargets.add(target);
            const finalDamage = Math.round(damage);
            const damageInfo = target.takeDamage(finalDamage);
            const actualDamage = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
            if (target.handleDamagedByPlayer) target.handleDamagedByPlayer(engine, { damage: finalDamage, element: 'lightning' }, actualDamage);
            else {
                target.hasTakenPlayerDamage = true;
                target.isAggroed = true;
            }
            target.hitFlashTimer = Math.max(target.hitFlashTimer || 0, 0.1);
            engine.trinketEffects.push({
                kind: 'lightning_arc',
                fromX: origin.x,
                fromY: origin.y - (jump === 0 ? 180 : 0),
                toX: target.x,
                toY: target.y,
                color: '#f5e66b',
                duration: 0.22,
                timer: 0
            });
            if (engine.combatFeedback) engine.combatFeedback.addText(`-${finalDamage}`, target.x, target.y - 12, '#f5e66b', 15, 0.75);
            if (engine.particleSystem) engine.particleSystem.emitImpact(target.x, target.y, '#f5e66b', 18);
            origin = target;
            damage *= falloff;
            target = engine.findNearestEnemy(origin.x, origin.y, range, hitTargets);
        }

        return true;
    }

    spawnTargetDummy(engine, ability, angle) {
        if (!engine.player || !engine.mapGen) return false;
        const distance = Math.min((engine.mapGen.tileSize || engine.tileSize || 64) * 3, ability.radius || 180);
        const rawX = engine.player.x + Math.cos(angle || engine.player.angle || 0) * distance;
        const rawY = engine.player.y + Math.sin(angle || engine.player.angle || 0) * distance;
        const tileX = Math.floor(rawX / engine.mapGen.tileSize);
        const tileY = Math.floor(rawY / engine.mapGen.tileSize);
        const pos = engine.findSafePlayerLanding(tileX, tileY, 0) || { x: engine.player.x, y: engine.player.y };
        const decoy = {
            x: pos.x,
            y: pos.y,
            width: engine.player.width,
            height: engine.player.height,
            hp: 1,
            maxHp: 1,
            angle: engine.player.angle,
            isDecoy: true,
            timer: 0,
            duration: ability.duration || 4,
            radius: ability.radius || 520
        };
        engine.decoys.push(decoy);
        for (const enemy of engine.enemies || []) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - decoy.x, enemy.y - decoy.y) <= decoy.radius) {
                enemy.isAggroed = true;
                enemy.pathTimer = 0;
            }
        }
        if (engine.combatFeedback) engine.combatFeedback.addText('Decoy', decoy.x, decoy.y - 26, '#d8b4ff', 15, 0.9);
        return true;
    }

    applySoulSiphon(engine, ability) {
        if (!engine.player) return false;
        engine.player.soulSiphonTimer = Math.max(engine.player.soulSiphonTimer || 0, ability.duration || 4);
        engine.player.soulSiphonLifesteal = ability.lifesteal || 0.45;
        engine.player.soulSiphonCapBonus = ability.lifesteal || 0.45;
        if (engine.combatFeedback) engine.combatFeedback.addText('Soul Siphon', engine.player.x, engine.player.y - 32, '#b800ff', 16, 1.0);
        if (engine.particleSystem) engine.particleSystem.emitImpact(engine.player.x, engine.player.y, '#b800ff', 22);
        return true;
    }

    updateRuntimeEffects(engine, dt) {
        if (engine.player && engine.player.soulSiphonTimer > 0) {
            engine.player.soulSiphonTimer = Math.max(0, engine.player.soulSiphonTimer - dt);
            if (engine.player.soulSiphonTimer <= 0) {
                engine.player.soulSiphonLifesteal = 0;
                engine.player.soulSiphonCapBonus = 0;
            }
        }

        if (!engine.decoys) engine.decoys = [];
        if (!engine.trinketEffects) engine.trinketEffects = [];

        for (let i = engine.decoys.length - 1; i >= 0; i--) {
            const decoy = engine.decoys[i];
            decoy.timer += dt;
            if (decoy.timer >= decoy.duration) engine.decoys.splice(i, 1);
        }

        for (let i = engine.trinketEffects.length - 1; i >= 0; i--) {
            const effect = engine.trinketEffects[i];
            effect.timer += dt;
            if (effect.kind === 'element_cloud') {
                this.tickElementCloud(engine, effect, dt);
            }
            if (effect.timer >= effect.duration) engine.trinketEffects.splice(i, 1);
        }
    }

    tickElementCloud(engine, effect, dt) {
        effect.tickTimer += dt;
        if (effect.tickTimer < 0.35) return;
        effect.tickTimer = 0;
        if (effect.owner === 'enemy') {
            if (engine.player && Math.hypot(engine.player.x - effect.x, engine.player.y - effect.y) <= effect.radius + engine.player.width / 2) {
                engine.player.takeDamage(8);
                engine.applyElementalHit(engine.player, { element: effect.element });
                if (engine.combatFeedback) engine.combatFeedback.addText('-8', engine.player.x, engine.player.y, effect.color || '#ffffff', 13, 0.6);
            }
            return;
        }

        for (const enemy of engine.enemies || []) {
            if (!enemy || enemy.hp <= 0) continue;
            if (Math.hypot(enemy.x - effect.x, enemy.y - effect.y) <= effect.radius + enemy.width / 2) {
                engine.applyElementalHit(enemy, { element: effect.element });
                enemy.isAggroed = true;
            }
        }
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

    handleAbilityProjectileEnd(engine, projectile) {
        if (!projectile || !projectile.abilityEffect) return false;
        if (projectile.abilityEffect === 'element_bomb') return this.explodeElementBomb(engine, projectile);
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.AbilitySystem = AbilitySystem;
}
