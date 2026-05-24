class ProjectileCombatResolver {
    updateProjectiles(engine, dt) {
        if (!engine || !engine.projectiles) return;

        for (let i = engine.projectiles.length - 1; i >= 0; i--) {
            const projectile = engine.projectiles[i];
            projectile.update(dt, engine.mapGen, engine.particleSystem);

            const hit = projectile.isPlayerOwned
                ? this.resolvePlayerProjectile(engine, projectile)
                : this.resolveEnemyProjectile(engine, projectile);

            if (hit || projectile.markedForDeletion) {
                engine.handleAbilityProjectileEnd(projectile);
                if (!hit && projectile.timer < projectile.lifetime) {
                    engine.particleSystem.emitImpact(projectile.x, projectile.y, '#aaaaaa', 5);
                }
                engine.projectiles.splice(i, 1);
            }
        }
    }

    resolvePlayerProjectile(engine, projectile) {
        for (const enemy of engine.enemies) {
            if (projectile.hitEnemies && projectile.hitEnemies.has(enemy)) continue;
            if (Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y) >= (enemy.width / 2 + projectile.width / 2)) continue;

            if (projectile.abilityEffect === 'element_bomb') {
                return true;
            }

            this.applyPlayerHit(engine, projectile, enemy);

            if (projectile.pierce) {
                if (projectile.hitEnemies) projectile.hitEnemies.add(enemy);
                continue;
            }

            return true;
        }

        return false;
    }

    applyPlayerHit(engine, projectile, enemy) {
        const damageMultiplier = engine.getDamageTakenMultiplier(enemy);
        const finalDamage = Math.round(projectile.damage * damageMultiplier);
        const damageInfo = enemy.takeDamage(finalDamage);
        const actualDamage = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));

        engine.applyElementalHit(enemy, projectile);
        if (enemy.handleDamagedByPlayer) {
            enemy.handleDamagedByPlayer(engine, projectile, actualDamage);
        } else {
            enemy.hasTakenPlayerDamage = true;
            enemy.isAggroed = true;
        }

        if (projectile.isMelee) {
            engine.camera.shake(5, 0.15);
            enemy.hitFlashTimer = 0.1;
        } else {
            engine.camera.shake(3, 0.1);
        }

        engine.combatFeedback.addText(`-${finalDamage}`, enemy.x, enemy.y, projectile.color || '#ffffff', 14, 0.8);
        engine.particleSystem.emitImpact(enemy.x, enemy.y, projectile.color || '#ffffff');
        this.applyLifesteal(engine, projectile, actualDamage);
        this.applyMeleeControl(engine, projectile, enemy);
    }

    applyLifesteal(engine, projectile, actualDamage) {
        const baseCap = typeof CombatConfig !== 'undefined' ? CombatConfig.caps.lifesteal : 0.35;
        const capBonus = (engine.player.stats.lifestealCapBonus || 0) + (engine.player.soulSiphonCapBonus || 0);
        const lifestealCap = baseCap + capBonus;
        let lifestealRate = (engine.player.stats.lifesteal || 0) + (engine.player.soulSiphonLifesteal || 0);
        if (projectile.isMelee) lifestealRate += 0.1;

        const effectiveLifesteal = Math.min(lifestealRate, lifestealCap);
        if (effectiveLifesteal <= 0) return;

        const healAmount = actualDamage * effectiveLifesteal;
        if (healAmount <= 0 || engine.player.hp >= engine.player.maxHp) return;

        engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + healAmount);
        if (healAmount >= 1) {
            engine.combatFeedback.addText(`+${Math.round(healAmount)}`, engine.player.x, engine.player.y - 20, '#00ff00', 14, 0.8);
        }
    }

    applyMeleeControl(engine, projectile, enemy) {
        if (projectile.isMelee && enemy.applyKnockback) {
            const knockAngle = Math.atan2(enemy.y - engine.player.y, enemy.x - engine.player.x);
            const knockForce = projectile.weaponType === 'melee_stab' ? 350 : 250;
            enemy.applyKnockback(knockAngle, knockForce);
        }

        if (projectile.isMelee) {
            enemy.staggerTimer = 0.25;
        }

        if (projectile.weaponVariant === 'overcharged' && Math.hypot(enemy.x - engine.player.x, enemy.y - engine.player.y) <= 105) {
            enemy.staggerTimer = Math.max(enemy.staggerTimer || 0, projectile.staggerDuration || 0.45);
        }
    }

    resolveEnemyProjectile(engine, projectile) {
        if (!engine.player) return false;
        if (Math.hypot(engine.player.x - projectile.x, engine.player.y - projectile.y) >= (engine.player.width / 2 + projectile.width / 2)) {
            return false;
        }

        let incomingDamage = projectile.damage;
        const weapon1Attacking = engine.player.weapon1 &&
            (engine.player.weapon1.weaponType === 'melee_stab' || engine.player.weapon1.weaponType === 'melee_cleave') &&
            engine.player.weapon1.cooldownTimer > 0;
        const weapon2Attacking = engine.player.weapon2 &&
            (engine.player.weapon2.weaponType === 'melee_stab' || engine.player.weapon2.weaponType === 'melee_cleave') &&
            engine.player.weapon2.cooldownTimer > 0;
        if (weapon1Attacking || weapon2Attacking) {
            incomingDamage = Math.round(incomingDamage * 0.7);
        }

        const damageInfo = engine.player.takeDamage(incomingDamage);
        engine.applyElementalHit(engine.player, projectile);
        engine.camera.shake(8, 0.2);
        if (projectile.owner && projectile.owner.handleHitPlayer) {
            projectile.owner.handleHitPlayer(engine, damageInfo, projectile);
        }

        if (damageInfo.shield > 0) {
            engine.combatFeedback.addText(`-${Math.round(damageInfo.shield)}`, engine.player.x, engine.player.y - 10, '#3498db', 16, 1.0);
            engine.particleSystem.emitImpact(engine.player.x, engine.player.y, '#3498db');
        }
        if (damageInfo.hp > 0) {
            engine.combatFeedback.addText(`-${Math.round(damageInfo.hp)}`, engine.player.x, engine.player.y, '#ff0000', 16, 1.0);
            engine.particleSystem.emitImpact(engine.player.x, engine.player.y, '#ff0000');
        }

        if (engine.player.stats.thorns > 0 && projectile.owner) {
            projectile.owner.takeDamage(engine.player.stats.thorns);
            engine.combatFeedback.addText(`-${Math.round(engine.player.stats.thorns)}`, projectile.owner.x, projectile.owner.y, '#ff00ff', 12, 0.8);
        }

        return true;
    }
}

if (typeof window !== 'undefined') {
    window.ProjectileCombatResolver = ProjectileCombatResolver;
}
